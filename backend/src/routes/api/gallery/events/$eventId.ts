import { createFileRoute } from "@tanstack/react-router";

import { galleryService } from "@/modules/gallery/galleryService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/gallery/events/$eventId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params }) => {
        try {
          const photos = await galleryService.listForEvent(params.eventId);
          return Response.json({ photos });
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request, params, context }) => {
        try {
          const formData = await request.formData().catch(() => null);
          if (!formData) {
            return Response.json({ message: "Expected multipart form data." }, { status: 400 });
          }
          const fileEntry = formData.get("file");
          const caption = formData.get("caption");
          if (!(fileEntry instanceof File)) {
            return Response.json({ message: "Upload a file." }, { status: 400 });
          }
          const bytes = new Uint8Array(await fileEntry.arrayBuffer());
          const photo = await galleryService.uploadPhoto(
            params.eventId,
            context.auth.user.id,
            {
              body: bytes,
              contentType: fileEntry.type || "application/octet-stream",
              name: fileEntry.name,
            },
            typeof caption === "string" && caption.trim() ? caption.trim() : undefined,
            context.auth.user.role === "ADMIN",
          );
          return Response.json(photo, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
