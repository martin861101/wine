import {
  assertTrustedOrigin,
  cleanText,
  corsHeaders,
  handleError,
  HttpError,
  json,
} from "../_shared/http.ts";
import { requireMember } from "../_shared/supabase.ts";
import { callGemini, type GeminiContent } from "./gemini.ts";
import {
  buildModelContents,
  RECENT_MESSAGE_LIMIT,
  UUID_PATTERN,
  type PersistedMessage,
} from "./memory.ts";
import {
  executeTool,
  functionDeclarations,
  type AIAction,
  type ToolContext,
} from "./tools/registry.ts";
import { runToolLoop } from "./tool-loop.ts";

const systemInstruction = `You are Books, the Wine & Chapters website companion. You live inside a warm Johannesburg women's book club website.

Personality: warm, playful, book-obsessed, occasionally cheeky, concise, and genuinely helpful. Never sound like customer-support software. Do not mention tool names, function calls, schemas, or technical actions.

Use get_club_context whenever the member asks about the current or previous read, gatherings, RSVP timing, polls, announcements, reviews, ratings, reading history, or their own participation state. Never guess live club facts.

Choose book tools by intent. Use search_books for known titles, authors, structured discovery, and bibliographic metadata. Use get_book_details after identifying a specific book when its description, edition, ISBN, page count, subjects, or publication information would help. Use search_web for current trends, popularity, recent releases, recommendations, reader sentiment, online discussion, comparisons, or facts structured data cannot answer. Do not use live web search for a simple known-title or author lookup that search_books can answer. Use read_webpage only on a promising public result when the search snippet is insufficient. You may combine tools when the question genuinely needs both current research and structured metadata. For web-researched claims, include the real source URLs returned by the tools; never invent a source or imply that live research occurred when it did not.

When a visual book preview would be better than a long chat dump, search first and then show it. Use find_audio only after the member asks for audio or accepts an audio offer; describe Spotify destinations honestly and never imply playback has begun.

Use navigate or open_widget naturally when it improves the experience. Say things like “Come, I'll show you.” instead of giving menu instructions. Moods, toasts, and effects are treats, not confetti cannons: use them sparingly and only when they clearly fit. Use surprise_me only when the member asks to be surprised or wants a blind date with a book.

Never request or reveal private member data, credentials, raw SQL, internal database details, or secrets. You cannot execute JavaScript, CSS, DOM selectors, SQL, URLs, or arbitrary browser commands. Only the predefined tools can alter the experience. Clearly warn before spoilers.`;

function parseUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new HttpError(`${label} must be a valid UUID.`, 400);
  }
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);

  let persistedContext: { conversationId: string; userMessageId: string } | null = null;
  let requestIdForLog: string | null = null;
  let failureStage = "request";
  let retryCount = 0;
  let markPersistedFailure:
    ((errorId: string, category: string, retryable: boolean) => Promise<void>) | null = null;
  try {
    assertTrustedOrigin(request);
    const { client, member } = await requireMember(request);
    const body = (await request.json()) as Record<string, unknown>;
    const message = cleanText(body.message, "Message", 1, 4000);
    const requestId = parseUuid(body.requestId, "Request ID");
    requestIdForLog = requestId;
    const suppliedConversationId =
      body.conversationId == null ? null : parseUuid(body.conversationId, "Conversation ID");
    const ownerId = String(member.id);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

    let conversationId = suppliedConversationId;
    if (conversationId) {
      const { data: ownedConversation, error: conversationError } = await client
        .from("ai_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (conversationError) throw new HttpError("The conversation could not be loaded.", 500);
      if (!ownedConversation) throw new HttpError("Conversation not found.", 404);
    } else {
      const { data: createdConversation, error: createConversationError } = await client
        .from("ai_conversations")
        .insert({ owner_id: ownerId, initial_request_id: requestId })
        .select("id,owner_id")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (createConversationError || !createdConversation) {
        const { data: existingConversation, error: existingConversationError } = await client
          .from("ai_conversations")
          .select("id")
          .eq("owner_id", ownerId)
          .eq("initial_request_id", requestId)
          .maybeSingle();
        if (existingConversationError || !existingConversation) {
          throw new HttpError("The conversation could not be created.", 500);
        }
        conversationId = String(existingConversation.id);
      } else {
        conversationId = String(createdConversation.id);
      }
    }

    const loadRequestMessages = async () => {
      const { data, error } = await client
        .from("ai_messages")
        .select(
          "id,role,content,status,request_id,sequence,created_at,metadata,ai_conversations!inner(owner_id)",
        )
        .eq("conversation_id", conversationId)
        .eq("request_id", requestId)
        .eq("ai_conversations.owner_id", ownerId)
        .order("sequence", { ascending: true });
      if (error) throw new HttpError("The conversation could not be loaded.", 500);
      return data ?? [];
    };

    let requestMessages = await loadRequestMessages();
    let userRow = requestMessages.find((item) => item.role === "user");
    const existingAssistant = requestMessages.find((item) => item.role === "assistant");

    if (userRow && String(userRow.content) !== message) {
      throw new HttpError("This request ID was already used for a different message.", 409);
    }
    if (existingAssistant) {
      if (userRow?.status !== "complete") {
        await client.from("ai_messages").update({ status: "complete" }).eq("id", userRow?.id);
      }
      const metadata =
        existingAssistant.metadata && typeof existingAssistant.metadata === "object"
          ? (existingAssistant.metadata as Record<string, unknown>)
          : {};
      return json(request, {
        reply: String(existingAssistant.content),
        actions: Array.isArray(metadata.actions) ? metadata.actions : [],
        model: typeof metadata.model === "string" ? metadata.model : model,
        conversationId,
        userMessageId: String(userRow?.id ?? ""),
        assistantMessageId: String(existingAssistant.id),
      });
    }

    if (userRow?.status === "complete") {
      throw new HttpError("This message is already being processed.", 409);
    }
    if (userRow?.status === "pending") {
      throw new HttpError("This message is already being processed.", 409);
    }
    if (userRow?.status === "failed") {
      const priorRetryCount = Number(
        (userRow.metadata as Record<string, unknown> | null)?.retryCount ?? 0,
      );
      retryCount = Number.isFinite(priorRetryCount) ? priorRetryCount + 1 : 1;
      const { data: retriedUser, error: retryError } = await client
        .from("ai_messages")
        .update({
          status: "pending",
          metadata: { retryCount, retryOf: String(userRow.id) },
        })
        .eq("id", userRow.id)
        .eq("status", "failed")
        .select("id,role,content,sequence")
        .single();
      if (retryError || !retriedUser) {
        throw new HttpError("This message is already being processed.", 409);
      }
      userRow = retriedUser;
    } else if (!userRow) {
      const { data: insertedUser, error: insertUserError } = await client
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: message,
          status: "pending",
          request_id: requestId,
        })
        .select("id,role,content,sequence")
        .single();
      if (insertUserError || !insertedUser) {
        requestMessages = await loadRequestMessages();
        const racedUser = requestMessages.find((item) => item.role === "user");
        if (racedUser) throw new HttpError("This message is already being processed.", 409);
        throw new HttpError("The message could not be saved.", 500);
      }
      userRow = insertedUser;
    }

    const currentUserMessage: PersistedMessage = {
      id: String(userRow.id),
      role: "user",
      content: String(userRow.content),
      sequence: Number(userRow.sequence),
    };
    persistedContext = { conversationId, userMessageId: currentUserMessage.id };
    markPersistedFailure = async (errorId, category, retryable) => {
      const { error: failureUpdateError } = await client
        .from("ai_messages")
        .update({
          status: "failed",
          metadata: {
            failureStage,
            failureCategory: category,
            errorId,
            retryable,
            retryCount,
          },
        })
        .eq("id", currentUserMessage.id)
        .eq("status", "pending");
      if (failureUpdateError) {
        console.error("AI chat failure metadata could not be persisted.", {
          requestId: requestIdForLog,
          conversationId,
          userMessageId: currentUserMessage.id,
          errorType: failureUpdateError.name,
          errorMessage: failureUpdateError.message,
        });
      }
    };

    failureStage = "history_load";
    const { data: priorRows, error: historyError } = await client
      .from("ai_messages")
      .select("id,role,content,sequence,ai_conversations!inner(owner_id)")
      .eq("conversation_id", conversationId)
      .eq("status", "complete")
      .eq("ai_conversations.owner_id", ownerId)
      .lt("sequence", currentUserMessage.sequence)
      .order("sequence", { ascending: false })
      .limit(RECENT_MESSAGE_LIMIT - 1);
    if (historyError) {
      throw new HttpError("The conversation history could not be loaded.", 500, {
        retryable: true,
        category: "history_load",
      });
    }
    const priorMessages = (priorRows ?? []).map((item): PersistedMessage => ({
      id: String(item.id),
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content),
      sequence: Number(item.sequence),
    }));
    const contents: GeminiContent[] = buildModelContents(priorMessages, currentUserMessage);
    const toolContext: ToolContext = {
      client,
      member: { id: ownerId, role: String(member.role) },
      bookCache: new Map(),
    };
    failureStage = "provider_inference";
    if (!apiKey) {
      throw new HttpError("The AI service is not configured.", 503, {
        retryable: false,
        category: "provider_configuration",
      });
    }
    const { reply, actions, toolNames } = await runToolLoop(
      contents,
      toolContext,
      (nextContents, allowTools) =>
        callGemini(apiKey, model, nextContents, {
          allowTools,
          functionDeclarations,
          systemInstruction,
        }),
      executeTool,
    );

    failureStage = "assistant_persistence";
    const { data: insertedAssistant, error: assistantError } = await client
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: reply,
        status: "complete",
        request_id: requestId,
        metadata: { model, actions, toolNames },
      })
      .select("id")
      .single();
    let assistantMessageId = insertedAssistant ? String(insertedAssistant.id) : "";
    let responseReply = reply;
    let responseActions = actions;
    let responseModel = model;

    if (assistantError || !insertedAssistant) {
      const { data: completedAssistant, error: completedAssistantError } = await client
        .from("ai_messages")
        .select("id,content,metadata,ai_conversations!inner(owner_id)")
        .eq("conversation_id", conversationId)
        .eq("request_id", requestId)
        .eq("role", "assistant")
        .eq("ai_conversations.owner_id", ownerId)
        .maybeSingle();
      if (completedAssistantError || !completedAssistant) {
        throw new HttpError("The reply could not be saved.", 500, {
          retryable: true,
          category: "assistant_persistence",
        });
      }
      const completedMetadata =
        completedAssistant.metadata && typeof completedAssistant.metadata === "object"
          ? (completedAssistant.metadata as Record<string, unknown>)
          : {};
      assistantMessageId = String(completedAssistant.id);
      responseReply = String(completedAssistant.content);
      responseActions = Array.isArray(completedMetadata.actions)
        ? (completedMetadata.actions as AIAction[])
        : [];
      responseModel = typeof completedMetadata.model === "string" ? completedMetadata.model : model;
    }

    const { error: completeUserError } = await client
      .from("ai_messages")
      .update({ status: "complete" })
      .eq("id", userRow.id)
      .neq("status", "complete");
    if (completeUserError) {
      console.error("AI chat user message completion update failed.", {
        requestId,
        conversationId,
        userMessageId: String(userRow.id),
        assistantMessageId,
        errorType: completeUserError.name,
        errorMessage: completeUserError.message,
      });
    }

    return json(request, {
      reply: responseReply,
      actions: responseActions,
      model: responseModel,
      conversationId,
      userMessageId: String(userRow.id),
      assistantMessageId,
    });
  } catch (error) {
    if (persistedContext) {
      const errorId = crypto.randomUUID();
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : "Something went wrong.";
      const retryable = error instanceof HttpError ? error.retryable : true;
      const category =
        error instanceof HttpError ? (error.category ?? failureStage) : "unexpected_exception";
      if (markPersistedFailure) {
        try {
          await markPersistedFailure(errorId, category, retryable);
        } catch (metadataError) {
          console.error("AI chat failure metadata update threw an exception.", {
            requestId: requestIdForLog,
            conversationId: persistedContext.conversationId,
            userMessageId: persistedContext.userMessageId,
            errorId,
            errorType: metadataError instanceof Error ? metadataError.name : typeof metadataError,
            errorMessage:
              metadataError instanceof Error ? metadataError.message : String(metadataError),
            errorStack: metadataError instanceof Error ? metadataError.stack : undefined,
          });
        }
      }
      console.error("AI chat request failed.", {
        status,
        requestId: requestIdForLog,
        conversationId: persistedContext.conversationId,
        userMessageId: persistedContext.userMessageId,
        errorId,
        failureStage,
        failureCategory: category,
        retryable,
        errorType: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        upstreamStatus: error instanceof HttpError ? error.upstreamStatus : undefined,
        upstreamRequestId: error instanceof HttpError ? error.upstreamRequestId : undefined,
      });
      return json(request, { message, errorId, ...persistedContext, retryable }, status);
    }
    return handleError(request, error);
  }
});
