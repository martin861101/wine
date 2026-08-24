import { db } from "./db";
import { hashPassword } from "../lib/password";
import { runMigrations } from "./migrate";

async function main() {
  await runMigrations();

  // Admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@wineandchapters.co.za";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!";
  const adminHash = await hashPassword(adminPassword);
  const admin = await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, approved, region)
     VALUES ($1, $2, 'Wine', 'Admin', 'ADMIN', true, true, 'Johannesburg')
     ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', approved = true
     RETURNING id`,
    [adminEmail, adminHash],
  );
  const adminId = String((admin.rows[0] as { id: string }).id);
  console.log(`Admin ready: ${adminEmail} / ${adminPassword}`);

  // A few demo members
  const members = [
    {
      email: "member@wineandchapters.co.za",
      password: "Member12345!",
      first: "Demo",
      last: "Member",
    },
    { email: "nadia@example.com", password: "Nadia12345!", first: "Nadia", last: "Bekker" },
    { email: "lena@example.com", password: "Lena12345!", first: "Lena", last: "Botha" },
  ];
  for (const m of members) {
    const hash = await hashPassword(m.password);
    await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, approved, region)
       VALUES ($1, $2, $3, $4, 'MEMBER', true, true, 'Johannesburg')
       ON CONFLICT (email) DO NOTHING`,
      [m.email, hash, m.first, m.last],
    );
    console.log(`Member ready: ${m.email} / ${m.password}`);
  }

  // Seed a book (The Nightingale is a placeholder in the UI)
  const bookResult = await db.query(
    `INSERT INTO books (external_provider, external_id, isbn_13, title, author, description, cover_url, publisher, published_date, categories)
     VALUES ('seed', 'nightingale', '9781250080400', 'The Nightingale', 'Kristin Hannah',
       'The epic story of two sisters separated by years and experience, whose bonds are tested by the dark days of World War II.',
       NULL, 'St. Martin''s Press', '2015-02-03', '["Historical Fiction","War"]')
     ON CONFLICT (external_provider, external_id) WHERE external_id IS NOT NULL
     DO UPDATE SET title = EXCLUDED.title
     RETURNING id`,
  );
  const bookId = String((bookResult.rows[0] as { id: string }).id);

  // Current club book (12 Aug — 8 Sep)
  await db.query(`UPDATE club_books SET status = 'PAST' WHERE status = 'CURRENT'`);
  await db.query(
    `INSERT INTO club_books (book_id, start_date, end_date, selected_by, status)
     VALUES ($1, '2026-08-12', '2026-09-08', $2, 'CURRENT')`,
    [bookId, adminId],
  );
  console.log("Current book seeded: The Nightingale (12 Aug — 8 Sep)");

  // Upcoming event
  await db.query(
    `INSERT INTO events (title, description, event_date, start_time, end_time, venue_name, venue_address, theme, capacity, contribution_amount, rsvp_deadline, status)
     VALUES ('Wine, Chapters & Conversation', 'An evening of wine and discussion about this month''s read.',
       '2026-08-29', '18:30', '21:00', 'The Reading Room', 'Johannesburg, SA', 'Golden Hour', 24, 150,
       '2026-08-25', 'PUBLISHED')
     ON CONFLICT DO NOTHING`,
  );
  console.log("Event seeded: Wine, Chapters & Conversation (29 Aug 18:30)");

  // Poll: next book ballot
  const pollResult = await db.query(
    `INSERT INTO polls (type, title, description, starts_at, ends_at, hide_results, status, created_by)
     VALUES ('BOOK_BALLOT', 'Vote for our next read', 'Pick the book you want to read next month.',
       now(), now() + interval '14 days', false, 'ACTIVE', $1)
     RETURNING id`,
    [adminId],
  );
  const pollId = String((pollResult.rows[0] as { id: string }).id);
  const ballotBooks = [
    "Beach Read",
    "The Vanishing Half",
    "Lessons in Chemistry",
    "The Seven Husbands of Evelyn Hugo",
  ];
  for (let i = 0; i < ballotBooks.length; i++) {
    await db.query(
      `INSERT INTO poll_options (poll_id, label, book_id, sort_order) VALUES ($1,$2,NULL,$3)`,
      [pollId, ballotBooks[i], i],
    );
  }
  console.log("Book ballot seeded with 4 options");

  // Announcement
  await db.query(
    `INSERT INTO announcements (title, body, type, priority, created_by)
     VALUES ('Welcome to the club', 'New member hub is live — rate the current read, RSVP to events and vote on the next book.', 'GENERAL', 1, $1)`,
    [adminId],
  );
  console.log("Announcement seeded");

  await db.end();
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
