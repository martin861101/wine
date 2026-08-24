import { createFileRoute } from "@tanstack/react-router";

import { profilesService } from "@/modules/profiles/profilesService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/members/$memberId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params, context }) => {
        try {
          const profile = await profilesService.getById(params.memberId);
          if (profile.profileVisibility === "PRIVATE" && profile.userId !== context.auth.user.id) {
            return Response.json(
              { message: "This member keeps their profile private." },
              { status: 403 },
            );
          }
          // Never expose private email addresses or internal flags to non-admins.
          if (context.auth.user.role !== "ADMIN") {
            const { email, approved, ...publicProfile } = profile;
            return Response.json(publicProfile);
          }
          return Response.json(profile);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
