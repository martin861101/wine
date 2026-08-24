import { createFileRoute } from "@tanstack/react-router";

import { adminService } from "@/modules/admin/adminService";
import { handleApiError } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";

export const Route = createFileRoute("/api/admin/overview")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      GET: async () => {
        try {
          return Response.json(await adminService.overview());
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
