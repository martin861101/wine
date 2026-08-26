Implement the backend and Supabase work for Wine & Chapters review publishing and admin member management.

Inspect the current database schema, migrations, RLS policies, Supabase Auth configuration, Edge Functions, API/query layer, and generated TypeScript types before changing anything. Preserve existing users and content.

BOOK REVIEW BACKEND

1. Confirm the review schema stores every field captured by the form:
   - Book title
   - Author
   - Overall star rating
   - Genre
   - Format
   - Picked by
   - Start and end dates
   - Spice level
   - Tear level
   - “Made me feel” selections
   - Thoughts
   - Favourite quotes
   - Recommendation: Yes / No / Maybe
   - Spoiler status
   - Reviewer identity
2. Add a safe migration for any missing fields.
3. Ensure review creation, moderation, approval, and published-review queries retain and return all fields.
4. Update backend types and mappings. Do not silently discard optional values.
5. Ensure comments continue working and published reviews only expose appropriate member information.
6. Preserve compatibility with existing reviews containing null or legacy values.
7. Ensure RLS allows intended review submission/reading while preventing unauthorised modification.

MEMBER REGISTRATION

1. Remove the custom administrator-approval requirement.
2. New registrations must receive normal MEMBER access automatically.
3. Keep Supabase email confirmation behaviour if it is enabled.
4. Remove approval/revoke checks that prevent otherwise valid users from accessing the member area.
5. Safely migrate existing users so nobody unintentionally loses access.
6. Do not confuse “email unverified” with “awaiting admin approval”.
7. Do not alter Supabase dashboard email-confirmation settings unless explicitly required; report dashboard-only changes.

ADMIN MEMBER OPERATIONS

Create protected server-side endpoints or Supabase Edge Functions for:
- Send password-reset email
- Resend confirmation email
- Block user
- Unblock user
- Remove user

Security requirements:
1. Never expose the service-role key to the frontend.
2. Verify the caller’s JWT server-side.
3. Confirm the caller has the ADMIN role using trusted database data.
4. Never accept the caller’s claimed role from the request body.
5. Validate target user IDs and actions.
6. Prevent admins from blocking or deleting themselves.
7. Prevent blocking or deleting the last active administrator.
8. Use Supabase Admin Auth APIs for privileged account operations.
9. Password reset must send a secure reset link; admins must never view or set passwords.
10. Confirmation resend must use the proper Supabase confirmation flow.
11. Blocking must prevent authentication while retaining the account and content.
12. Unblocking must restore authentication access.
13. Removing a member requires a deliberate server-side delete operation.

Before implementing deletion, inspect foreign keys and related records such as:
- Profiles
- Reviews
- Comments
- Event attendance
- Contributions
- Suggestions or votes

Prefer preserving community content with anonymised “Former member” attribution unless the existing schema already supports intentional safe cascading deletion. Do not introduce destructive cascades casually.

STATUS AND AUDITING

1. Return enough data for the UI to derive:
   - Verified
   - Unverified
   - Blocked
   - Role
2. Add admin-action audit logging if none exists:
   - Actor user ID
   - Target user ID/email
   - Action
   - Timestamp
   - Success/failure
   - Non-sensitive metadata
3. Never log tokens, passwords, secret keys, or email-link contents.

BACKEND CONTRACT

Document for the UI agent:
- Endpoint/function names
- HTTP methods
- Request payloads
- Response payloads
- Error codes/messages
- Member-list status fields
- Review response shape

VERIFICATION

- Run migrations safely.
- Deploy updated Edge Functions if deployment access is available.
- Run backend tests, linting, type-checking, and production build where applicable.
- Verify standard members cannot invoke admin operations.
- Verify registration no longer requires approval.
- Verify password-reset and confirmation-resend flows.
- Verify block/unblock behaviour.
- Verify last-admin and self-protection rules.
- Verify published review queries return every review field.
- Report changed files, migrations, deployed functions, tests, and manual Supabase dashboard steps.