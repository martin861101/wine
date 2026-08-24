import { db } from "../../db/db";

export const leaderboardService = {
  async get(limit = 20) {
    const result = await db.query(
      `SELECT
         u.id AS user_id,
         u.first_name,
         u.last_name,
         p.display_name,
         p.avatar_url,
         COALESCE((
           SELECT COUNT(DISTINCT activity.book_id) FROM (
             SELECT r.book_id FROM reviews r
             JOIN club_books cb ON cb.book_id = r.book_id AND cb.status = 'PAST'
             WHERE r.user_id = u.id AND r.status = 'PUBLISHED'
             UNION
             SELECT ra.book_id FROM ratings ra
             JOIN club_books cb ON cb.book_id = ra.book_id AND cb.status = 'PAST'
             WHERE ra.user_id = u.id
           ) activity
         ), 0) AS books_participated,
         (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = u.id AND r.status = 'PUBLISHED') AS reviews,
         (SELECT COUNT(*)::int FROM ratings ra WHERE ra.user_id = u.id) AS ratings,
         (SELECT COUNT(*)::int FROM event_rsvps er2
          JOIN events e2 ON e2.id = er2.event_id
          WHERE er2.user_id = u.id AND er2.status = 'ATTENDING' AND e2.event_date < CURRENT_DATE) AS events_attended,
         (SELECT COUNT(*)::int FROM poll_votes pv WHERE pv.user_id = u.id) AS polls_participated,
         (
           (SELECT COUNT(*)::int FROM reviews r WHERE r.user_id = u.id AND r.status = 'PUBLISHED') * 5
           + (SELECT COUNT(*)::int FROM ratings ra WHERE ra.user_id = u.id) * 3
           + (SELECT COUNT(*)::int FROM event_rsvps er3 WHERE er3.user_id = u.id AND er3.status = 'ATTENDING') * 10
           + (SELECT COUNT(*)::int FROM poll_votes pv2 WHERE pv2.user_id = u.id) * 4
           + (SELECT COUNT(*)::int FROM club_books cb
              JOIN ratings ra ON ra.book_id = cb.book_id AND ra.user_id = u.id
              WHERE cb.status = 'PAST') * 3
         ) AS score
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.approved = true
       ORDER BY score DESC, u.first_name ASC
       LIMIT $1`,
      [limit],
    );

    const entries = result.rows.map((row: Record<string, unknown>, index: number) => ({
      rank: index + 1,
      userId: String(row.user_id),
      name:
        (row.display_name ? String(row.display_name) : "") ||
        `${String(row.first_name)} ${String(row.last_name)}`,
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      stats: {
        booksParticipated: Number(row.books_participated),
        reviews: Number(row.reviews),
        ratings: Number(row.ratings),
        eventsAttended: Number(row.events_attended),
        pollsParticipated: Number(row.polls_participated),
      },
      score: Number(row.score),
    }));

    return { entries };
  },
};
