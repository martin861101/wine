import { db } from "../../db/db";
import { AppError } from "../../lib/errors";

export type ProfileVisibility = "PUBLIC" | "MEMBERS" | "PRIVATE";

export const profilesService = {
  async getByUserId(userId: string) {
    const result = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, u.approved, u.region
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Profile not found", 404);
    return {
      userId: String(row.user_id),
      displayName: row.display_name ? String(row.display_name) : null,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      bio: row.bio ? String(row.bio) : null,
      favouriteBook: row.favourite_book ? String(row.favourite_book) : null,
      favouriteGenres: Array.isArray(row.favourite_genres)
        ? (row.favourite_genres as string[])
        : [],
      profileVisibility: String(row.profile_visibility),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      region: row.region ? String(row.region) : null,
    };
  },

  async getById(id: string) {
    const result = await db.query(
      `SELECT p.*, u.first_name, u.last_name, u.email, u.approved, u.region
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE u.id = $1`,
      [id],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Profile not found", 404);
    const profile = {
      userId: String(row.user_id),
      displayName: row.display_name ? String(row.display_name) : null,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      bio: row.bio ? String(row.bio) : null,
      favouriteBook: row.favourite_book ? String(row.favourite_book) : null,
      favouriteGenres: Array.isArray(row.favourite_genres)
        ? (row.favourite_genres as string[])
        : [],
      profileVisibility: String(row.profile_visibility),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      region: row.region ? String(row.region) : null,
      email: String(row.email),
      approved: Boolean(row.approved),
    };
    return profile;
  },

  async update(
    userId: string,
    input: {
      displayName?: string;
      avatarUrl?: string;
      bio?: string;
      favouriteBook?: string;
      favouriteGenres?: string[];
      profileVisibility?: ProfileVisibility;
    },
  ) {
    const existing = await db.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    const current = existing.rows[0] as Record<string, unknown> | undefined;

    const values = {
      displayName:
        input.displayName ?? (current?.display_name ? String(current.display_name) : null),
      avatarUrl: input.avatarUrl ?? (current?.avatar_url ? String(current.avatar_url) : null),
      bio: input.bio ?? (current?.bio ? String(current.bio) : null),
      favouriteBook:
        input.favouriteBook ?? (current?.favourite_book ? String(current.favourite_book) : null),
      favouriteGenres:
        input.favouriteGenres ??
        (Array.isArray(current?.favourite_genres) ? (current.favourite_genres as string[]) : []),
      profileVisibility:
        input.profileVisibility ?? String(current?.profile_visibility ?? "MEMBERS"),
    };

    await db.query(
      `INSERT INTO profiles (user_id, display_name, avatar_url, bio, favourite_book, favourite_genres, profile_visibility, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now())
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         bio = EXCLUDED.bio,
         favourite_book = EXCLUDED.favourite_book,
         favourite_genres = EXCLUDED.favourite_genres,
         profile_visibility = EXCLUDED.profile_visibility,
         updated_at = now()`,
      [
        userId,
        values.displayName,
        values.avatarUrl,
        values.bio,
        values.favouriteBook,
        JSON.stringify(values.favouriteGenres),
        values.profileVisibility,
      ],
    );
    return this.getByUserId(userId);
  },
};
