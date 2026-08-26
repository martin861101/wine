# Published reviews and member administration UI

The review journal uses the existing `get_published_reviews` contract to show book and reviewer identity, star rating, only-present metadata pills, spoiler protection, and compact review text. Reviews with extra details or longer text offer a full-detail dialog: it is a desktop modal and fills the mobile viewport. The full view includes complete thoughts, quotes, review metadata, comments, and a clear “Show less” action. Spoiler text and quotes remain concealed until the member selects “Reveal review”.

Admin → Members uses the existing `admin-members` Edge Function. Each desktop table row and mobile member card has an accessible three-dot menu for password reset, confirmation resend (unverified members only), block/unblock, and removal. Self block/removal is disabled. Block and removal have confirmation dialogs; removal names the member, includes their email, and explains content anonymisation. Successful actions invalidate the admin query to refresh the row and show a themed toast; backend protection and delivery errors are surfaced through the same toast path.

Registration no longer refers to applications or administrator approval. It directs new members to verify their email before signing in.

## Verification

- `npm --prefix ui run typecheck`
- `npm --prefix ui run lint` (existing Fast Refresh warnings only)
- `npm --prefix ui run build`
