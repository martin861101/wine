import { db } from "../../db/db";
import { clubBooksService } from "../club-books/clubBooksService";
import { eventsService } from "../events/eventsService";
import { pollsService } from "../polls/pollsService";
import { announcementsService } from "../announcements/announcementsService";
import { giveawaysService } from "../giveaways/giveawaysService";
import { ratingsService } from "../ratings/ratingsService";

export const widgetService = {
  async home(userId: string) {
    const [currentBook, upcomingEventRaw, activePolls, announcements, giveaways, statsResult] =
      await Promise.all([
        clubBooksService.getWithMyRating(userId),
        eventsService.upcoming(),
        pollsService.listActive(),
        announcementsService.listActive(),
        giveawaysService.listActive(),
        db.query(
          `SELECT
             (SELECT COUNT(*)::int FROM users WHERE approved = true) AS members,
             (SELECT COUNT(*)::int FROM club_books) AS books_read`,
        ),
      ]);

    const upcomingEvent = upcomingEventRaw
      ? await eventsService
          .getWithStats(upcomingEventRaw.id, userId)
          .then((stats) => stats)
          .catch(() => null)
      : null;

    const activeBallotId = activePolls.find((p) => p.type === "BOOK_BALLOT")?.id ?? null;
    const activePollId = activePolls.find((p) => p.type === "MONTHLY_POLL")?.id ?? null;

    const resultsPollId = activeBallotId ?? activePollId;
    const results = resultsPollId
      ? await pollsService.getResults(resultsPollId, userId).catch(() => null)
      : null;

    const activeBallot =
      activeBallotId && results && resultsPollId === activeBallotId ? results : null;
    const activePoll = activePollId && results && resultsPollId === activePollId ? results : null;

    let memberRating: number | null = null;
    if (currentBook) {
      memberRating = await ratingsService.getUserRating(userId, currentBook.book.id);
    }

    const statsRow = statsResult.rows[0] as { members: number; books_read: number } | undefined;

    const myRsvpStatus = upcomingEvent && upcomingEvent.myRsvp ? upcomingEvent.myRsvp.status : null;

    return {
      currentBook,
      upcomingEvent,
      activeBallot,
      activePoll,
      announcement: announcements[0] ?? null,
      giveaway: giveaways[0] ?? null,
      member: {
        rating: memberRating,
        rsvpStatus: myRsvpStatus,
        pollVoted: results?.myVoteId != null,
        pollId: resultsPollId,
        myVoteId: results?.myVoteId ?? null,
      },
      stats: {
        members: statsRow ? Number(statsRow.members) : 0,
        booksRead: statsRow ? Number(statsRow.books_read) : 0,
      },
    };
  },
};
