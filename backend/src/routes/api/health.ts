import { createFileRoute } from "@tanstack/react-router";

import { ping } from "@/db/pool";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const database = await ping();
        return Response.json(
          { status: database ? "ok" : "degraded", database },
          { status: database ? 200 : 503 },
        );
      },
    },
  },
});
