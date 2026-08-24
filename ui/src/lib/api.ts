import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import { parseAIActions, type AIAction } from "./ai-actions";

export type Role = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: boolean;
  approved: boolean;
  region?: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  region: string;
  instagram?: string;
}

export class ApiError extends Error {}

export class BooksChatError extends ApiError {
  constructor(
    message: string,
    readonly conversationId: string,
    readonly userMessageId: string,
  ) {
    super(message);
  }
}

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  email_verified: boolean;
  approved: boolean;
  region: string | null;
};

function throwApiError(error: { message: string } | null, fallback: string): never {
  throw new ApiError(error?.message || fallback);
}

async function throwFunctionError(
  error: { message: string; context?: unknown } | null,
  fallback: string,
): Promise<never> {
  if (error?.context instanceof Response) {
    const payload = (await error.context
      .clone()
      .json()
      .catch(() => null)) as { message?: unknown } | null;
    if (typeof payload?.message === "string" && payload.message.trim()) {
      throw new ApiError(payload.message);
    }
  }
  throw new ApiError(error?.message || fallback);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    emailVerified: row.email_verified,
    approved: row.approved,
    ...(row.region ? { region: row.region } : {}),
  };
}

async function loadApplicationUser(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,first_name,last_name,role,email_verified,approved,region")
    .eq("auth_user_id", userId)
    .single();
  if (error || !data) throwApiError(error, "Your membership profile could not be loaded.");
  return mapUser(data as UserRow);
}

export async function toAuthSession(session: Session): Promise<AuthSession> {
  return {
    user: await loadApplicationUser(session.user.id),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.rpc("app_user_id");
  if (error || !data) throwApiError(error, "Please sign in to continue.");
  return String(data);
}

function browserOrigin(): string {
  return typeof window === "undefined" ? "https://wineandchapters.co.za" : window.location.origin;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.session) {
      throwApiError(error, "That email and password combination doesn't match our records.");
    }

    const session = await toAuthSession(data.session);
    if (!session.user.emailVerified) {
      await supabase.auth.signOut();
      throw new ApiError("Please verify your email address before signing in.");
    }
    if (!session.user.approved) {
      await supabase.auth.signOut();
      throw new ApiError("Your membership application is still awaiting approval.");
    }
    return session;
  },

  async register(input: RegisterInput): Promise<{ message: string }> {
    const { error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo: `${browserOrigin()}/verify-email`,
        data: {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          region: input.region.trim(),
          instagram: input.instagram?.trim() || null,
        },
      },
    });
    if (error) throwApiError(error, "Unable to create your membership application.");
    return { message: "Application received. Check your inbox to verify your email address." };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${browserOrigin()}/reset-password`,
    });
    if (error) throwApiError(error, "Unable to send the reset link.");
    return { message: "If that email is registered, a reset link is on its way." };
  },

  async resetPassword(code: string, password: string): Promise<{ message: string }> {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throwApiError(error, "That reset link is invalid or has expired.");
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throwApiError(error, "That reset link is invalid or has expired.");
    return { message: "Your password has been updated. You can sign in now." };
  },

  async verifyEmail(code: string): Promise<{ message: string }> {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throwApiError(error, "That verification link is invalid or has expired.");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError("That verification link is invalid or has expired.");
    return { message: "Your email address is verified. Welcome to Wine & Chapters." };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throwApiError(error, "Unable to sign out.");
  },
};

export const contactApi = {
  async send(input: { name: string; email: string; subject: string; message: string }) {
    const { data, error } = await supabase.functions.invoke<{ message: string }>("contact", {
      body: input,
    });
    if (error || !data) return await throwFunctionError(error, "Your message could not be sent.");
    return data;
  },
};

export const aiApi = {
  async chat(
    message: string,
    conversationId: string | null,
    requestId: string,
  ): Promise<{
    reply: string;
    actions: AIAction[];
    model: string;
    conversationId: string;
    userMessageId: string;
    assistantMessageId: string;
  }> {
    const { data, error } = await supabase.functions.invoke<{
      reply: string;
      actions?: unknown;
      model: string;
      conversationId: string;
      userMessageId: string;
      assistantMessageId: string;
    }>("ai-chat", {
      body: {
        message,
        conversationId,
        requestId,
      },
    });
    if (error?.context instanceof Response) {
      const payload = (await error.context
        .clone()
        .json()
        .catch(() => null)) as {
        message?: unknown;
        conversationId?: unknown;
        userMessageId?: unknown;
      } | null;
      if (
        typeof payload?.conversationId === "string" &&
        typeof payload.userMessageId === "string"
      ) {
        throw new BooksChatError(
          typeof payload.message === "string"
            ? payload.message
            : "The reading-room assistant is unavailable.",
          payload.conversationId,
          payload.userMessageId,
        );
      }
    }
    if (error || !data) {
      return await throwFunctionError(error, "The reading-room assistant is unavailable.");
    }
    return {
      reply: data.reply,
      actions: parseAIActions(data.actions),
      model: data.model,
      conversationId: data.conversationId,
      userMessageId: data.userMessageId,
      assistantMessageId: data.assistantMessageId,
    };
  },

  async restoreConversation(preferredConversationId: string | null): Promise<{
    conversationId: string | null;
    messages: Array<{
      id: string;
      role: "assistant" | "user";
      text: string;
      status: "pending" | "complete" | "failed";
      requestId: string;
    }>;
  }> {
    let conversation: { id: string } | null = null;
    if (
      preferredConversationId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        preferredConversationId,
      )
    ) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("id", preferredConversationId)
        .maybeSingle();
      if (error) throwApiError(error, "Your Books conversation could not be restored.");
      conversation = data;
    }
    if (!conversation) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id")
        .order("last_message_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throwApiError(error, "Your Books conversation could not be restored.");
      conversation = data;
    }
    if (!conversation) return { conversationId: null, messages: [] };

    const { data, error } = await supabase
      .from("ai_messages")
      .select("id,role,content,status,request_id,sequence")
      .eq("conversation_id", conversation.id)
      .order("sequence", { ascending: true });
    if (error) throwApiError(error, "Your Books messages could not be restored.");
    return {
      conversationId: conversation.id,
      messages: (data ?? []).map((item) => ({
        id: String(item.id),
        role: item.role === "assistant" ? "assistant" : "user",
        text: String(item.content),
        status: item.status === "pending" || item.status === "failed" ? item.status : "complete",
        requestId: String(item.request_id),
      })),
    };
  },
};

export const newsletterApi = {
  async subscribe(email: string) {
    const { data, error } = await supabase.rpc("subscribe_newsletter", {
      input_email: email.trim().toLowerCase(),
    });
    if (error) throwApiError(error, "Unable to subscribe right now.");
    return data as { message: string };
  },
};

export const membershipApi = {
  async checkout(tier: "CHAPTER_MEMBER" | "PATRON", email: string) {
    const { data, error } = await supabase.functions.invoke<{
      checkoutUrl: string;
      reference: string;
    }>("paystack-checkout", {
      body: { action: "checkout", tier, email: email.trim().toLowerCase() },
    });
    if (error || !data?.checkoutUrl)
      return await throwFunctionError(error, "Paystack checkout could not start.");
    return data;
  },

  async verify(reference: string) {
    const { data, error } = await supabase.functions.invoke<{
      paid: boolean;
      tier: string;
    }>("paystack-checkout", { body: { action: "verify", reference } });
    if (error || !data)
      return await throwFunctionError(error, "The membership payment could not be verified.");
    return data;
  },
};

export const contributionApi = {
  async checkout(amountInRands: number, email: string) {
    const { data, error } = await supabase.functions.invoke<{
      checkoutUrl: string;
      reference: string;
    }>("paystack-checkout", {
      body: {
        action: "contribution",
        amount: Math.round(amountInRands * 100),
        email: email.trim().toLowerCase(),
      },
    });
    if (error || !data?.checkoutUrl)
      return await throwFunctionError(error, "Paystack checkout could not start.");
    return data;
  },
};

export interface BookReviewInput {
  rating: number;
  bookTitle: string;
  author: string;
  genre: string;
  pickedBy: string;
  startDate: string;
  endDate: string;
  format: "Paperback" | "Hardback" | "E-book" | "Audiobook";
  spiceLevel: number;
  tearLevel: number;
  mood: "Happy" | "Laughing" | "Loved" | "Sad" | "Emotional";
  thoughts: string;
  favoriteQuotes: string;
  recommend: "Yes" | "No" | "Maybe";
  containsSpoilers: boolean;
}

export const bookReviewsApi = {
  async publish(input: BookReviewInput): Promise<{ message: string }> {
    const details = [
      `Author: ${input.author}`,
      `Genre: ${input.genre}`,
      `Format: ${input.format}`,
      input.pickedBy ? `Picked by: ${input.pickedBy}` : null,
      input.startDate ? `Started: ${input.startDate}` : null,
      input.endDate ? `Finished: ${input.endDate}` : null,
      `Spice level: ${input.spiceLevel}/5`,
      `Tear level: ${input.tearLevel}/5`,
      `Made me feel: ${input.mood}`,
      `Would recommend: ${input.recommend}`,
    ].filter(Boolean);
    const body = [
      input.thoughts.trim(),
      input.favoriteQuotes.trim() ? `Favourite quotes\n${input.favoriteQuotes.trim()}` : null,
      `Review details\n${details.join("\n")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.rpc("submit_book_review", {
      input_book_title: input.bookTitle.trim(),
      input_author: input.author.trim(),
      input_genre: input.genre.trim(),
      input_rating: input.rating,
      input_body: body,
      input_contains_spoilers: input.containsSpoilers,
    });
    if (error) throwApiError(error, "Your review could not be submitted.");
    return { message: "Review submitted for moderation. Thank you for sharing your chapter." };
  },
};

export interface PublicHome {
  currentBook: WidgetHome["currentBook"] | null;
  upcomingEvent: ClubEvent | null;
}

export interface PublishedReview {
  id: string;
  bookId: string;
  title: string;
  body: string;
  containsSpoilers: boolean;
  createdAt: string;
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  author: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  comments: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string };
}

export const publicApi = {
  async getHome(): Promise<PublicHome> {
    const { data, error } = await supabase.rpc("get_public_home");
    if (error || !data) throwApiError(error, "The latest club details could not be loaded.");
    return data as PublicHome;
  },

  async getEvents(): Promise<ClubEvent[]> {
    const { data, error } = await supabase.rpc("get_public_events");
    if (error) throwApiError(error, "Events could not be loaded.");
    return (data ?? []) as ClubEvent[];
  },

  async getReviews(): Promise<PublishedReview[]> {
    const { data, error } = await supabase.rpc("get_published_reviews");
    if (error) throwApiError(error, "Member reviews could not be loaded.");
    return (data ?? []) as PublishedReview[];
  },
};

export interface WidgetHome {
  currentBook: {
    id: string;
    book: {
      id: string;
      title: string;
      author: string | null;
      description: string | null;
      coverUrl: string | null;
      categories?: string[];
    };
    startDate: string;
    endDate: string;
    averageRating: number;
    ratingCount: number;
    reviews: number;
    myRating: number | null;
    progressPercent: number;
  } | null;
  upcomingEvent: {
    id: string;
    title: string;
    description: string | null;
    eventDate: string;
    startTime: string;
    venueName: string;
    capacity: number;
    attendingCount: number;
    capacityRemaining: number;
    myRsvp: { status: string; guestCount: number } | null;
  } | null;
  activeBallot: PollResult | null;
  activePoll: PollResult | null;
  announcement: { id: string; title: string; body: string; type: string } | null;
  giveaway: {
    id: string;
    title: string;
    description: string | null;
    prize: string;
    entries: number;
  } | null;
  member: {
    rating: number | null;
    rsvpStatus: string | null;
    pollVoted: boolean;
    pollId: string | null;
    myVoteId: string | null;
  };
  stats: { members: number; booksRead: number };
}

export interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  venueName: string;
  venueAddress: string | null;
  theme: string | null;
  coverImage: string | null;
  capacity: number;
  contributionAmount: number | null;
  rsvpDeadline: string | null;
  attendingCount: number;
  myRsvp: { status: string; guestCount: number } | null;
}

interface PollResult {
  id: string;
  title: string;
  endsAt: string | null;
  options: Array<{ id: string; label: string; count: number; percentage: number }>;
  myVoteId: string | null;
}

export interface DiscussionComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

export interface DiscussionThread {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; firstName: string; lastName: string };
  comments: DiscussionComment[];
}

export interface BookSearchResult {
  externalProvider: string;
  externalId: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  isbn10?: string;
  isbn13?: string;
  categories: string[];
  metadata: Record<string, unknown>;
}

export interface CommunityActivity {
  id: string;
  kind: "suggestion" | "review" | "poll";
  text: string;
  occurredAt: string;
}

export const memberApi = {
  async getWidgetHome(): Promise<WidgetHome> {
    const { data, error } = await supabase.rpc("get_widget_home");
    if (error || !data) throwApiError(error, "The member hub could not be loaded.");
    return data as WidgetHome;
  },

  async getDiscussions(): Promise<DiscussionThread[]> {
    const { data, error } = await supabase.rpc("get_discussions");
    if (error) throwApiError(error, "Discussions could not be loaded.");
    return (data ?? []) as DiscussionThread[];
  },

  async getEvents(): Promise<ClubEvent[]> {
    const { data, error } = await supabase.rpc("get_events");
    if (error) throwApiError(error, "Events could not be loaded.");
    return (data ?? []) as ClubEvent[];
  },

  async searchBooks(query: string): Promise<BookSearchResult[]> {
    const { data, error } = await supabase.functions.invoke<{ results: BookSearchResult[] }>(
      "open-library-search",
      { body: { query: query.trim() } },
    );
    if (error || !data)
      return await throwFunctionError(error, "Book discovery is unavailable right now.");
    return data.results;
  },

  async suggestBook(book: BookSearchResult) {
    const userId = await requireUserId();
    const identity = book.isbn13 ?? book.isbn10 ?? `${book.externalProvider}:${book.externalId}`;
    const { error } = await supabase.from("suggestions").insert({
      user_id: userId,
      type: "BOOK",
      title: book.title,
      book_identity: identity,
      description: JSON.stringify({
        identity,
        author: book.author,
        coverUrl: book.coverUrl ?? null,
        externalProvider: book.externalProvider,
        externalId: book.externalId,
        isbn10: book.isbn10 ?? null,
        isbn13: book.isbn13 ?? null,
      }),
    });
    if (error?.code === "23505") throw new ApiError("You have already suggested this book.");
    if (error) throwApiError(error, "Your suggestion could not be saved.");
  },

  async getCommunityActivity(): Promise<CommunityActivity[]> {
    const { data, error } = await supabase.rpc("get_community_activity");
    if (error) throwApiError(error, "Community activity could not be loaded.");
    return (data ?? []) as CommunityActivity[];
  },

  async commentOnReview(reviewId: string, body: string) {
    const userId = await requireUserId();
    const { error } = await supabase.from("review_comments").insert({
      review_id: reviewId,
      user_id: userId,
      body: body.trim(),
    });
    if (error) throwApiError(error, "Your comment could not be added.");
  },

  async createDiscussion(input: { title: string; body: string }) {
    const authorId = await requireUserId();
    const { data, error } = await supabase
      .from("discussion_threads")
      .insert({ author_id: authorId, title: input.title, body: input.body })
      .select("id")
      .single();
    if (error || !data) throwApiError(error, "The discussion could not be created.");
    return { id: String(data.id) };
  },

  async commentOnDiscussion(threadId: string, body: string) {
    const authorId = await requireUserId();
    const { data, error } = await supabase
      .from("discussion_comments")
      .insert({ thread_id: threadId, author_id: authorId, body })
      .select("id")
      .single();
    if (error || !data) throwApiError(error, "The comment could not be added.");
    return { id: String(data.id) };
  },

  async rateBook(bookId: string, rating: number) {
    const userId = await requireUserId();
    const { error } = await supabase
      .from("ratings")
      .upsert(
        { book_id: bookId, user_id: userId, rating, updated_at: new Date().toISOString() },
        { onConflict: "book_id,user_id" },
      );
    if (error) throwApiError(error, "Your rating could not be saved.");
  },

  async rsvp(eventId: string, status = "ATTENDING", guestCount = 1) {
    const userId = await requireUserId();
    const { error } = await supabase.from("event_rsvps").upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
        guest_count: guestCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" },
    );
    if (error) throwApiError(error, "Your RSVP could not be saved.");
  },

  async vote(pollId: string, optionId: string) {
    const userId = await requireUserId();
    const { error } = await supabase
      .from("poll_votes")
      .upsert(
        { poll_id: pollId, option_id: optionId, user_id: userId },
        { onConflict: "poll_id,user_id" },
      );
    if (error) throwApiError(error, "Your vote could not be saved.");
  },
};

export interface AdminMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  emailVerified: boolean;
  approved: boolean;
  region: string | null;
  createdAt: string;
}

export interface AdminOverview {
  members: AdminMember[];
  subscribers: Array<{ id: string; email: string; subscribed: boolean; createdAt: string }>;
  books: Array<{
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    eventDate: string;
    startTime: string;
    venueName: string;
    capacity: number;
    status: string;
  }>;
  currentBook: WidgetHome["currentBook"];
  stats: {
    members: number;
    approvedMembers: number;
    subscribers: number;
    books: number;
    events: number;
  };
}

export interface AdminContent {
  suggestions: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    createdAt: string;
    memberName: string;
  }>;
  reviews: Array<{
    id: string;
    title: string;
    body: string;
    status: "PENDING" | "PUBLISHED" | "HIDDEN";
    bookTitle: string;
    memberName: string;
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    reviewId: string;
    body: string;
    memberName: string;
    createdAt: string;
  }>;
  polls: Array<{
    id: string;
    title: string;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
    endsAt: string | null;
    hideResults: boolean;
  }>;
}

export type AdminEvent = Omit<ClubEvent, "attendingCount" | "myRsvp"> & {
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
};

export const adminApi = {
  async getOverview(): Promise<AdminOverview> {
    const { data, error } = await supabase.rpc("get_admin_overview");
    if (error || !data) throwApiError(error, "The admin dashboard could not be loaded.");
    return data as AdminOverview;
  },

  async getContent(): Promise<AdminContent> {
    const { data, error } = await supabase.rpc("get_admin_content");
    if (error || !data) throwApiError(error, "Managed content could not be loaded.");
    return data as AdminContent;
  },

  async getEvents(): Promise<AdminEvent[]> {
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,title,description,event_date,start_time,end_time,venue_name,venue_address,theme,cover_image,capacity,contribution_amount,rsvp_deadline,status",
      )
      .order("event_date", { ascending: false });
    if (error) throwApiError(error, "Admin events could not be loaded.");
    return (data ?? []).map((event) => ({
      id: String(event.id),
      title: String(event.title),
      description: event.description,
      eventDate: String(event.event_date),
      startTime: String(event.start_time),
      endTime: event.end_time,
      venueName: String(event.venue_name),
      venueAddress: event.venue_address,
      theme: event.theme,
      coverImage: event.cover_image,
      capacity: Number(event.capacity),
      contributionAmount: event.contribution_amount,
      rsvpDeadline: event.rsvp_deadline,
      status: event.status as AdminEvent["status"],
    }));
  },

  async updateMember(memberId: string, input: { approved?: boolean; role?: Role }) {
    const { data, error } = await supabase.rpc("admin_update_member", {
      member_id: memberId,
      new_approved: input.approved ?? null,
      new_role: input.role ?? null,
    });
    if (error || !data) throwApiError(error, "The member could not be updated.");
    return data as AdminMember;
  },

  async broadcast(input: {
    audience: "MEMBERS" | "SUBSCRIBERS" | "ALL";
    subject: string;
    body: string;
  }) {
    const { data, error } = await supabase.functions.invoke<{
      audience: string;
      recipients: number;
      sent: number;
      failed: number;
    }>("broadcast", { body: input });
    if (error || !data) return await throwFunctionError(error, "The broadcast could not be sent.");
    return data;
  },

  async createEvent(input: {
    title: string;
    description?: string | undefined;
    eventDate: string;
    startTime: string;
    endTime?: string | undefined;
    venueName: string;
    venueAddress?: string | undefined;
    theme?: string | undefined;
    capacity: number;
    contributionAmount?: number | undefined;
    rsvpDeadline?: string | undefined;
    status: "DRAFT" | "PUBLISHED";
    image?: File | undefined;
  }) {
    const { data: created, error } = await supabase
      .from("events")
      .insert({
        title: input.title,
        description: input.description ?? null,
        event_date: input.eventDate,
        start_time: input.startTime,
        end_time: input.endTime ?? null,
        venue_name: input.venueName,
        venue_address: input.venueAddress ?? null,
        theme: input.theme ?? null,
        capacity: input.capacity,
        contribution_amount: input.contributionAmount ?? null,
        rsvp_deadline: input.rsvpDeadline ?? null,
        status: input.status,
      })
      .select("id")
      .single();
    if (error || !created) throwApiError(error, "The event could not be created.");

    let coverImage: string | null = null;
    if (input.image) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(input.image.type)) {
        throw new ApiError("Choose a JPG, PNG, WebP, or GIF event image.");
      }
      if (input.image.size > 8 * 1024 * 1024) {
        throw new ApiError("The event image must be smaller than 8 MB.");
      }
      const extension =
        input.image.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const storagePath = `events/${created.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(storagePath, input.image, { contentType: input.image.type, upsert: false });
      if (uploadError) throwApiError(uploadError, "The event image could not be uploaded.");

      coverImage = supabase.storage.from("event-photos").getPublicUrl(storagePath).data.publicUrl;
      const uploadedBy = await requireUserId();
      const { error: imageRecordError } = await supabase.from("event_photos").insert({
        event_id: created.id,
        uploaded_by: uploadedBy,
        image_url: coverImage,
      });
      const { error: eventImageError } = await supabase
        .from("events")
        .update({ cover_image: coverImage, updated_at: new Date().toISOString() })
        .eq("id", created.id);
      if (imageRecordError || eventImageError) {
        await supabase.storage.from("event-photos").remove([storagePath]);
        throwApiError(
          imageRecordError ?? eventImageError,
          "The event was created, but its image could not be attached.",
        );
      }
    }
    return { id: String(created.id), coverImage };
  },

  async updateEvent(
    eventId: string,
    input: {
      title: string;
      description?: string | undefined;
      eventDate: string;
      startTime: string;
      endTime?: string | undefined;
      venueName: string;
      venueAddress?: string | undefined;
      theme?: string | undefined;
      capacity: number;
      contributionAmount?: number | undefined;
      rsvpDeadline?: string | undefined;
      status: "DRAFT" | "PUBLISHED";
      image?: File | undefined;
      removeImage?: boolean;
    },
  ) {
    let coverImage: string | null | undefined = input.removeImage ? null : undefined;
    if (input.image) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(input.image.type))
        throw new ApiError("Choose a JPG, PNG, WebP, or GIF event image.");
      if (input.image.size > 8 * 1024 * 1024)
        throw new ApiError("The event image must be smaller than 8 MB.");
      const extension =
        input.image.name
          .split(".")
          .pop()
          ?.replace(/[^a-z0-9]/gi, "") || "jpg";
      const storagePath = `events/${eventId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(storagePath, input.image);
      if (uploadError) throwApiError(uploadError, "The replacement image could not be uploaded.");
      coverImage = supabase.storage.from("event-photos").getPublicUrl(storagePath).data.publicUrl;
    }
    const update: Record<string, unknown> = {
      title: input.title,
      description: input.description ?? null,
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime ?? null,
      venue_name: input.venueName,
      venue_address: input.venueAddress ?? null,
      theme: input.theme ?? null,
      capacity: input.capacity,
      contribution_amount: input.contributionAmount ?? null,
      rsvp_deadline: input.rsvpDeadline ?? null,
      status: input.status,
      updated_at: new Date().toISOString(),
    };
    if (coverImage !== undefined) update.cover_image = coverImage;
    const { error } = await supabase.from("events").update(update).eq("id", eventId);
    if (error) throwApiError(error, "The event could not be updated.");
  },

  async deleteEvent(eventId: string) {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) throwApiError(error, "The event could not be deleted.");
  },

  async setReviewStatus(reviewId: string, status: "PENDING" | "PUBLISHED" | "HIDDEN") {
    const { error } = await supabase
      .from("reviews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) throwApiError(error, "The review status could not be changed.");
  },

  async deleteReview(reviewId: string) {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
    if (error) throwApiError(error, "The review could not be deleted.");
  },

  async deleteReviewComment(commentId: string) {
    const { error } = await supabase.from("review_comments").delete().eq("id", commentId);
    if (error) throwApiError(error, "The comment could not be removed.");
  },

  async updateSuggestionStatus(
    suggestionId: string,
    status: "NEW" | "REVIEWED" | "ACCEPTED" | "DECLINED",
  ) {
    const { error } = await supabase.from("suggestions").update({ status }).eq("id", suggestionId);
    if (error) throwApiError(error, "The suggestion could not be updated.");
  },

  async createPoll(input: {
    title: string;
    optionLabels: string[];
    endsAt?: string | undefined;
    hideResults: boolean;
  }) {
    const createdBy = await requireUserId();
    const { data: poll, error } = await supabase
      .from("polls")
      .insert({
        type: "BOOK_BALLOT",
        title: input.title,
        status: "ACTIVE",
        created_by: createdBy,
        ends_at: input.endsAt || null,
        hide_results: input.hideResults,
      })
      .select("id")
      .single();
    if (error || !poll) throwApiError(error, "The poll could not be created.");
    const { error: optionsError } = await supabase
      .from("poll_options")
      .insert(
        input.optionLabels.map((label, index) => ({ poll_id: poll.id, label, sort_order: index })),
      );
    if (optionsError) throwApiError(optionsError, "The poll options could not be saved.");
  },

  async importBook(input: {
    externalProvider: string;
    externalId: string;
    title: string;
    author: string;
    coverUrl?: string | undefined;
    categories: string[];
    metadata: Record<string, unknown>;
  }) {
    const { data, error } = await supabase
      .from("books")
      .upsert(
        {
          external_provider: input.externalProvider,
          external_id: input.externalId,
          title: input.title,
          author: input.author,
          cover_url: input.coverUrl ?? null,
          categories: input.categories,
          metadata: input.metadata,
        },
        { onConflict: "external_provider,external_id" },
      )
      .select("id")
      .single();
    if (error || !data) throwApiError(error, "The book could not be imported.");
    return { databaseId: String(data.id) };
  },

  async setCurrentRead(input: { bookId: string; startDate: string; endDate: string }) {
    const { error } = await supabase.rpc("admin_set_current_read", {
      selected_book_id: input.bookId,
      selected_start_date: input.startDate,
      selected_end_date: input.endDate,
    });
    if (error) throwApiError(error, "The current read could not be updated.");
  },

  async updateProgress(progressPercent: number) {
    const { error } = await supabase
      .from("club_books")
      .update({ progress_percent: progressPercent, updated_at: new Date().toISOString() })
      .eq("status", "CURRENT");
    if (error) throwApiError(error, "Reading progress could not be updated.");
  },

  async createAnnouncement(input: {
    title: string;
    body: string;
    type: "GENERAL" | "EVENT" | "BOOK" | "URGENT";
  }) {
    const userId = await requireUserId();
    const { error } = await supabase.from("announcements").insert({
      title: input.title,
      body: input.body,
      type: input.type,
      created_by: userId,
    });
    if (error) throwApiError(error, "The announcement could not be created.");
  },
};
