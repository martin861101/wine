import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { adminService } from "@/modules/admin/adminService";
import { handleApiError, parseBody } from "@/lib/validation";

const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const Route = createFileRoute("/api/newsletter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, newsletterSchema);
          return Response.json(await adminService.subscribe(body.email), { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
