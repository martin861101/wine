# Contact email delivery fix — 2026-08-25

- Routed the public contact form to the deployed `send-email` Supabase Edge Function.
- Added the `send-email` function definition and contact payload validation, database persistence, SMTP delivery, acknowledgement, CORS/origin checks, and privacy-safe failure logging.
- Changed SMTP configuration and recipient rejection failures to return a non-2xx response instead of a false success.
- Made partial broadcast delivery failures return a non-2xx response and removed recipient addresses from failure logs.
- Documented required secret names and the exact production deployment command in the README.
