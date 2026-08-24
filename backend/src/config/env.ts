import "dotenv/config";

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4010),

    DATABASE_URL: z.string().default("postgres://wine:wine_local_dev@127.0.0.1:5432/wine_chapters"),
    SUPABASE_DB_URL: z.string().optional(),

    JWT_ACCESS_SECRET: z.string().min(16).default("wc_dev_access_secret_change_me_12345"),
    JWT_REFRESH_SECRET: z.string().min(16).default("wc_dev_refresh_secret_change_me_67890"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().default(30),

    CORS_ORIGIN: z.string().default("http://127.0.0.1:5178"),
    PUBLIC_APP_URL: z.string().url().default("http://127.0.0.1:5178"),

    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Wine & Chapters <hello@wineandchapters.co.za>"),

    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),

    PAYSTACK_SECRET_KEY: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["local", "supabase", "firebase"]).default("local"),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().default("event-photos"),
    FIREBASE_STORAGE_BUCKET: z.string().optional(),
    PUBLIC_STORAGE_URL: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") return;

    if (
      value.JWT_ACCESS_SECRET.startsWith("wc_dev_") ||
      value.JWT_REFRESH_SECRET.startsWith("wc_dev_")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_ACCESS_SECRET"],
        message: "Production JWT secrets must be explicitly configured.",
      });
    }
    if (!value.PUBLIC_APP_URL.startsWith("https://")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PUBLIC_APP_URL"],
        message: "Production PUBLIC_APP_URL must use HTTPS.",
      });
    }
    if (value.EMAIL_PROVIDER !== "resend" || !value.RESEND_API_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["EMAIL_PROVIDER"],
        message: "Production email delivery requires EMAIL_PROVIDER=resend and RESEND_API_KEY.",
      });
    }
    if (value.STORAGE_PROVIDER === "local") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["STORAGE_PROVIDER"],
        message: "Production storage must use Supabase Storage or Firebase Storage.",
      });
    } else if (value.STORAGE_PROVIDER === "supabase") {
      if (!value.SUPABASE_URL || !value.SUPABASE_SERVICE_ROLE_KEY) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SUPABASE_SERVICE_ROLE_KEY"],
          message: "Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        });
      }
    } else if (!value.FIREBASE_STORAGE_BUCKET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["FIREBASE_STORAGE_BUCKET"],
        message: "Firebase storage requires FIREBASE_STORAGE_BUCKET.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse({
    ...source,
    DATABASE_URL: source.DATABASE_URL || source.SUPABASE_DB_URL,
  });
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  return parsed.data;
}

const cached = loadEnv();

export const env: Env = cached;
