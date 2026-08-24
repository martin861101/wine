Inspect the Wine & Chapters repository and implement two focused admin improvements:

1. Replace book-review image URL entry with image uploads.
2. Add admin moderation controls for removing user posts.

Do not modify Books AI, the shop, payments, unrelated admin features or the wider site design.

PART 1 — BOOK-REVIEW IMAGE UPLOADS

Replace the current image URL field in the admin book-review form with a proper image-upload interface.

Requirements:
- Follow existing Supabase Storage and admin-upload conventions.
- Use a dedicated review-images bucket or appropriate existing media bucket.
- Allow common safe image formats only.
- Enforce a reasonable maximum file size.
- Show an image preview before saving.
- Display the existing image when editing a review.
- Allow an admin to replace or remove an image.
- Save the Storage path or resulting public URL using the repository’s existing media conventions.
- Never store base64 image data in the database.
- Do not expose service-role credentials in the frontend.
- Enforce admin-only upload, replacement and deletion through Storage policies or trusted backend logic.
- Safely clean up replaced images when they are no longer referenced.
- Preserve compatibility with existing reviews that already contain external image URLs.
- Do not break existing review display, comments or moderation.
- Add polished loading, upload-progress, success and error states.
- Ensure the interface works on mobile.

If a migration or Storage policy is required, add it using existing Supabase conventions.

PART 2 — ADMIN POST MODERATION

Keep the Reading Room and its Posts section. Do not remove the member-facing posting or commenting feature.

Add the ability for authorised admins to moderate and remove posts created by members.

Admin interface:
- Show existing posts in the relevant admin section.
- Display author, publication date, post content and comment count.
- Add a clearly labelled “Remove post” moderation action.
- Require confirmation before removal.
- Allow an optional moderation reason where practical.
- Show themed success and error notifications.
- Remove the post from the admin list and member Reading Room immediately after a successful action.
- Prevent duplicate submissions while removal is processing.

Use soft deletion unless the existing schema already has a better moderation pattern.

Suggested fields:
- deleted_at
- deleted_by
- deletion_reason

Behaviour:
- Soft-deleted posts must no longer appear in normal member/public queries.
- Associated comments must also be hidden when the parent post is removed.
- Do not physically delete comments or post content in the normal moderation flow.
- If practical within the existing admin design, allow an admin to view removed posts and restore one accidentally removed.
- Restoration must make the post and its comments visible again.
- Preserve the original author and timestamps.
- Do not expose the moderation reason publicly.

Security:
- Only authorised admins may remove or restore posts belonging to other users.
- Enforce this through RLS, an existing trusted API or a Supabase Edge Function.
- A hidden frontend button is not sufficient authorization.
- Normal members must not be able to set or clear moderation fields.
- Verify direct database/API attempts by ordinary members are rejected.
- Follow the repository’s verified admin-role model exactly.

Queries:
- Update every normal Reading Room query to exclude soft-deleted posts.
- Ensure comments cannot be displayed independently when their parent post is removed.
- Preserve pagination, ordering and comment counts.
- Avoid breaking historical data.

VERIFICATION

Test:
- Creating a review with an uploaded image.
- Editing a review without replacing its image.
- Replacing and removing a review image.
- Existing URL-based review images still render.
- Invalid file type and oversized-file rejection.
- Unauthorised upload/delete attempts.
- Admin removal of a member post.
- Removed post disappears from the Reading Room.
- Comments under a removed post are hidden.
- Normal member cannot remove another member’s post.
- Restore behaviour, if implemented.
- Mobile admin layout.
- Existing posting and commenting still work.

Run:
- Relevant tests
- Type-check
- Lint for affected files
- Production build
- git diff --check

Do not deploy, push or apply remote migrations unless explicitly instructed.

Finish with:
- Files changed
- Migration and RLS changes
- Storage bucket/policy changes
- Image lifecycle behaviour
- Post moderation behaviour
- Tests and build results
- Existing unrelated warnings
- Exact Supabase migration, Storage and deployment steps Martin must run

Complete only these two improvements and then stop.
