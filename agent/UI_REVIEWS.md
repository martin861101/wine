Implement the Wine & Chapters frontend changes for published reviews and Admin → Members.

First inspect the existing components, responsive behaviour, design system, API client, and TypeScript types. Use the backend contract produced by the backend agent. Do not invent alternative endpoint names if the backend already defines them.

PUBLISHED REVIEW UI

The form captures rich review information, but the published card currently shows only the title, reviewer, and truncated thoughts.

Update it to display:
- Book title and author
- Overall star rating
- Reviewer name/avatar
- Genre and format
- Picked by
- Start and end dates
- Spice level
- Tear level
- “Made me feel” selections
- Recommendation: Yes / No / Maybe
- Thoughts
- Favourite quotes
- Spoiler status

Design requirements:
1. Preserve the elegant Wine & Chapters typography, spacing, cream background, and pink accents.
2. Present secondary metadata as refined, readable pills.
3. Do not render empty labels or placeholders for missing legacy data.
4. Keep the default carousel card compact.
5. Clamp thoughts to approximately 4–5 lines.
6. Only show “Read full review” when content is actually truncated or additional details require expansion.
7. Never leave an unexplained “...” at the bottom.
8. Desktop: use a polished modal or expanded review panel.
9. Mobile: use a full-screen or bottom-sheet-style review view.
10. The full view must contain all metadata, full thoughts, favourite quotes, and the existing conversation/comments section.
11. Include a clear close or “Show less” action.
12. Preserve carousel pause/rotation behaviour and commenting.
13. If the review contains spoilers, conceal the review text and quotes behind a warning with a “Reveal review” action.
14. Add proper dialog semantics, focus management, keyboard closing, labels, and readable contrast.
15. Test short, long, legacy, incomplete, and spoiler reviews.

ADMIN MEMBERS UI

Replace the current Revoke-oriented interface.

1. Remove the “Approved” badge and admin-approval wording.
2. Display useful statuses:
   - Verified
   - Unverified
   - Blocked
3. Keep the MEMBER/ADMIN role visible.
4. Replace the current Revoke button with a compact three-dot action menu containing:
   - Send password reset
   - Resend confirmation email
   - Block user
   - Unblock user when blocked
   - Remove user
5. Hide or disable “Resend confirmation” for already verified users, with clear behaviour.
6. Disable block/remove actions for the currently signed-in admin.
7. Respect backend protection for the last active administrator and display returned errors clearly.
8. Show progress states and prevent duplicate requests.
9. Show themed success/error notifications.
10. Refresh the member row after a successful action rather than requiring a page reload.
11. Use confirmation dialogs for:
   - Blocking, explaining the user will lose access
   - Removing, clearly explaining whether content will be retained/anonymised
12. The remove confirmation must show the member’s name and email and require an intentional destructive confirmation.
13. Ensure the action menu does not widen or overflow the mobile table.
14. Improve mobile presentation if necessary by converting rows into compact member cards, while preserving the desktop table.
15. Ensure menus and dialogs support keyboard navigation, focus handling, Escape, and accessible labels.

REGISTRATION UI

1. Remove all messaging suggesting that new accounts require administrator approval.
2. After registration, show the correct next step:
   - If email confirmation is required: tell the user to check their email.
   - Otherwise: allow the normal signed-in/member flow.
3. Preserve current branding and authentication behaviour.

INTEGRATION AND VERIFICATION

- Update frontend types to match the actual backend contract.
- Do not call Supabase Admin APIs or use the service-role key from the browser.
- Handle unauthorised, invalid-user, self-action, last-admin, email-delivery, and network errors.
- Run frontend linting, type-checking, tests, and production build.
- Verify desktop and mobile layouts.
- Verify published reviews show all submitted information.
- Verify long reviews open completely.
- Verify member actions update the UI correctly.
- Report changed files, tests run, and any integration assumptions.