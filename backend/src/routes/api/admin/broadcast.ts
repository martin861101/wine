import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { adminService } from "@/modules/admin/adminService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";

const broadcastSchema = z.object({
  audience: z.enum(["MEMBERS", "SUBSCRIBERS", "ALL"]),
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(20_000),
});

export const Route = createFileRoute("/api/admin/broadcast")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, broadcastSchema);
          return Response.json(await adminService.broadcast(body));
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
