# Review submission

The `/reviews` form accepts a member's latest read even when that title is not already in the curated club catalogue.

## Submission flow

The browser assembles the structured reading notes and calls the authenticated `submit_book_review` PostgreSQL function. The function:

1. verifies the current user is an active Wine & Chapters member;
2. validates the title, author, rating, and review body;
3. reuses a matching book or creates a minimal member-supplied catalogue record;
4. upserts the member's rating; and
5. creates a `PENDING` review for moderation.

The database operation is atomic, so a failed review cannot leave behind a partial rating or book entry. The function is not granted to anonymous users.

## Form feedback

Invalid fields now produce a focusable form-level message in addition to the existing inline field messages. Database submission failures remain visible in the form and in the existing toast notification. The submit button remains disabled while membership is loading or a submission is in progress.

## Deployment

Apply `backend/supabase/migrations/20260824185500_submit_book_review.sql` before deploying the updated frontend.
