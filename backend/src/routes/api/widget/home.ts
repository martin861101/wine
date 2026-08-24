import { createFileRoute } from "@tanstack/react-router";

import { widgetService } from "@/modules/widget/widgetService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/widget/home")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const data = await widgetService.home(context.auth.user.id);
          return Response.json(data);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
