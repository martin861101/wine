import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { profilesService } from "@/modules/profiles/profilesService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const profileSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  avatarUrl: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(1000).optional(),
  favouriteBook: z.string().trim().max(200).optional(),
  favouriteGenres: z.array(z.string().trim().max(60)).max(10).optional(),
  profileVisibility: z.enum(["PUBLIC", "MEMBERS", "PRIVATE"]).optional(),
});

export const Route = createFileRoute("/api/me/profile")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const profile = await profilesService.getByUserId(context.auth.user.id);
          return Response.json(profile);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PUT: async ({ request, context }) => {
        try {
          const body = await parseBody(request, profileSchema);
          const profile = await profilesService.update(context.auth.user.id, stripUndefined(body));
          return Response.json(profile);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
