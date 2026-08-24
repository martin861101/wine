import { createFileRoute } from "@tanstack/react-router";

import { galleryService } from "@/modules/gallery/galleryService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/gallery/photos/$photoId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      DELETE: async ({ params, context }) => {
        try {
          const isAdmin = context.auth.user.role === "ADMIN";
          await galleryService.remove(params.photoId, context.auth.user.id, isAdmin);
          return Response.json({ message: "Photo deleted." });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
