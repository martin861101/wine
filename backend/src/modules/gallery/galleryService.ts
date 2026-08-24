import { randomUUID } from "node:crypto";
import path from "node:path";
import { db } from "../../db/db";
import { AppError } from "../../lib/errors";
import { getStorageProvider } from "../../integrations/storage";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

function extractStorageKey(url: string): string {
  const supabaseMarker = "/storage/v1/object/public/";
  const supabaseIndex = url.indexOf(supabaseMarker);
  if (supabaseIndex !== -1) {
    const segments = url.slice(supabaseIndex + supabaseMarker.length).split("/");
    return segments.slice(1).map(decodeURIComponent).join("/");
  }
  const oIndex = url.indexOf("/o/");
  if (oIndex !== -1) {
    return decodeURIComponent(url.slice(oIndex + 3).split("?")[0] ?? "").replace(/^\/+/, "");
  }
  const localMarker = "/uploads/";
  const localIndex = url.indexOf(localMarker);
  if (localIndex !== -1) return decodeURIComponent(url.slice(localIndex + localMarker.length));
  return url.split("/").slice(-3).join("/");
}

function matchesImageSignature(body: Uint8Array, contentType: string): boolean {
  const bytes = Array.from(body.slice(0, 12));
  if (contentType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.join(",") === "137,80,78,71,13,10,26,10";
  if (contentType === "image/gif")
    return (
      String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a" ||
      String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a"
    );
  if (contentType === "image/webp")
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}

export const galleryService = {
  async uploadPhoto(
    eventId: string,
    uploadedBy: string,
    file: { body: Uint8Array; contentType: string; name: string },
    caption?: string,
    isAdmin = false,
  ) {
    const ext = ALLOWED_MIME[file.contentType];
    if (!ext) {
      throw new AppError("Unsupported image type. Use JPEG, PNG, WebP or GIF.", 415);
    }
    if (file.body.byteLength > MAX_SIZE) {
      throw new AppError("Image is too large. Maximum size is 8MB.", 413);
    }
    if (!matchesImageSignature(file.body, file.contentType)) {
      throw new AppError("The uploaded file is not a valid image.", 415);
    }
    // Verify the extension matches the declared MIME type.
    const declaredExt = path.extname(file.name).toLowerCase();
    if (declaredExt && declaredExt !== ext) {
      throw new AppError("File extension does not match its image type.", 415);
    }

    const event = await db.query("SELECT 1 FROM events WHERE id = $1", [eventId]);
    if (!event.rowCount || event.rowCount === 0) throw new AppError("Event not found", 404);
    if (!isAdmin) {
      const attendee = await db.query(
        `SELECT 1 FROM event_rsvps WHERE event_id = $1 AND user_id = $2 AND status = 'ATTENDING'`,
        [eventId, uploadedBy],
      );
      if (!attendee.rowCount) throw new AppError("Only attendees can upload event photos.", 403);
    }

    const storage = getStorageProvider();
    const key = `events/${eventId}/${randomUUID()}${ext}`;
    const uploaded = await storage.uploadFile({
      key,
      body: file.body,
      contentType: file.contentType,
    });

    const result = await db.query(
      `INSERT INTO event_photos (event_id, uploaded_by, image_url, thumbnail_url, caption)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [eventId, uploadedBy, uploaded.url, uploaded.url, caption ?? null],
    );
    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      eventId: String(row.event_id),
      imageUrl: String(row.image_url),
      thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
      caption: row.caption ? String(row.caption) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  },

  async listForEvent(eventId: string) {
    const result = await db.query(
      `SELECT * FROM event_photos WHERE event_id = $1 ORDER BY created_at DESC`,
      [eventId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      eventId: String(row.event_id),
      imageUrl: String(row.image_url),
      thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null,
      caption: row.caption ? String(row.caption) : null,
      uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  },

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const result = await db.query("SELECT * FROM event_photos WHERE id = $1", [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Photo not found", 404);
    if (!isAdmin && String(row.uploaded_by) !== userId) {
      throw new AppError("You can only delete your own uploads.", 403);
    }
    await db.query("DELETE FROM event_photos WHERE id = $1", [id]);
    try {
      const storage = getStorageProvider();
      const key = extractStorageKey(String(row.image_url));
      await storage.deleteFile(key);
    } catch (error) {
      console.error("[gallery] storage delete failed", error);
    }
  },
};
