import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { discussionsService } from "@/modules/discussions/discussionsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const threadSchema = z.object({
  title: z.string().trim().min(2, "Add a title with at least 2 characters.").max(200),
  body: z.string().trim().min(1, "Write something to start the conversation.").max(5000),
});

export const Route = createFileRoute("/api/discussions/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async () => {
        try {
          return Response.json(await discussionsService.list());
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, threadSchema);
          const thread = await discussionsService.createThread(context.auth.user.id, body);
          return Response.json(thread, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
