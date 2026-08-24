import { readFile } from "node:fs/promises";
import path from "node:path";
import { createFileRoute } from "@tanstack/react-router";

const uploadRoot = path.resolve(process.cwd(), "storage", "uploads");
const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const relative = (params as Record<string, string | undefined>)["_splat"] ?? "";
        const target = path.resolve(uploadRoot, relative);
        if (target !== uploadRoot && !target.startsWith(`${uploadRoot}${path.sep}`)) {
          return new Response("Invalid path", { status: 400 });
        }
        try {
          const body = await readFile(target);
          return new Response(body, {
            headers: {
              "Content-Type":
                contentTypes[path.extname(target).toLowerCase()] ?? "application/octet-stream",
              "Cache-Control": "public, max-age=31536000, immutable",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
