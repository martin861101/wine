import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { adminService } from "@/modules/admin/adminService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";

const memberSchema = z
  .object({
    approved: z.boolean().optional(),
    role: z.enum(["ADMIN", "MEMBER"]).optional(),
  })
  .refine((value) => value.approved !== undefined || value.role !== undefined, {
    message: "Provide a member status or role to update.",
  });

export const Route = createFileRoute("/api/admin/members/$memberId")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      PATCH: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, memberSchema);
          return Response.json(
            await adminService.updateMember(
              params.memberId,
              stripUndefined(body),
              context.auth.user.id,
            ),
          );
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
