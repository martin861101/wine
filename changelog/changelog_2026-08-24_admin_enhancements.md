# Admin enhancements — 2026-08-24

- Replaced the admin current-read book-cover URL input with validated image uploads to the `review-images` Supabase Storage bucket. Existing external cover URLs remain supported; replacing or removing an uploaded cover cleans up its previous Storage object after the database update succeeds.
- Added admin Reading Room post moderation with optional internal reasons, confirmation, duplicate-submission prevention, and restore support.
- Added Supabase migration `20260824193000_review_images_and_discussion_moderation.sql` for the bucket policies, soft-delete fields, member query filtering, and admin moderation RPC.

## Required release steps

1. Run `supabase db push` from `backend/` (or apply the migration through the Supabase dashboard SQL editor).
2. Verify the `review-images` bucket and its policies were created by the migration.
3. Deploy the frontend after the migration is applied. No service-role key or Edge Function deployment is required.
