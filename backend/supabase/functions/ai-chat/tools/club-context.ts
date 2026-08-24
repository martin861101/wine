import { HttpError } from "../../_shared/http.ts";

import type { RegisteredTool } from "./types.ts";
import { objectArgs } from "./validation.ts";

export const getClubContextTool: RegisteredTool = {
  declaration: {
    name: "get_club_context",
    description:
      "Get trustworthy current Wine & Chapters club information, including reads, events, polls, announcements, ratings, and the signed-in member's relevant participation state.",
    parameters: { type: "OBJECT", properties: {} },
  },
  async execute(args, { client, member }) {
    objectArgs(args);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const [readsResult, eventsResult, pollsResult, announcementResult] = await Promise.all([
      client
        .from("club_books")
        .select(
          "id,status,start_date,end_date,progress_percent,book:books(id,title,author,description,cover_url,categories)",
        )
        .in("status", ["CURRENT", "PAST"])
        .order("start_date", { ascending: false })
        .limit(6),
      client
        .from("events")
        .select(
          "id,title,description,event_date,start_time,end_time,venue_name,venue_address,rsvp_deadline,capacity,event_rsvps(status,guest_count,user_id)",
        )
        .eq("status", "PUBLISHED")
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(5),
      client
        .from("polls")
        .select("id,type,title,description,ends_at,hide_results,poll_options(id,label,sort_order)")
        .eq("status", "ACTIVE")
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(3),
      client
        .from("announcements")
        .select("id,title,body,type,priority")
        .lte("starts_at", now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const firstError =
      readsResult.error ?? eventsResult.error ?? pollsResult.error ?? announcementResult.error;
    if (firstError) {
      console.error("get_club_context failed", firstError.message);
      throw new HttpError("Club information is unavailable right now.", 502);
    }

    const reads = readsResult.data ?? [];
    const currentRow = reads.find((read) => read.status === "CURRENT");
    const currentBook = currentRow?.book as
      | {
          id: string;
          title: string;
          author: string | null;
          description: string | null;
          cover_url: string | null;
          categories: unknown;
        }
      | null
      | undefined;

    const [ratingsResult, reviewsResult, votesResult] = await Promise.all([
      currentBook
        ? client.from("ratings").select("rating,user_id").eq("book_id", currentBook.id)
        : Promise.resolve({ data: [], error: null }),
      currentBook
        ? client
            .from("reviews")
            .select("id", { count: "exact", head: true })
            .eq("book_id", currentBook.id)
            .eq("status", "PUBLISHED")
        : Promise.resolve({ data: null, error: null, count: 0 }),
      pollsResult.data?.length
        ? client
            .from("poll_votes")
            .select("poll_id,option_id")
            .eq("user_id", member.id)
            .in(
              "poll_id",
              pollsResult.data.map((poll) => poll.id),
            )
        : Promise.resolve({ data: [], error: null }),
    ]);
    const ratings = ratingsResult.data ?? [];
    const averageRating = ratings.length
      ? Math.round(
          (ratings.reduce((sum, row) => sum + Number(row.rating), 0) / ratings.length) * 10,
        ) / 10
      : 0;
    const memberVotes = new Map(
      (votesResult.data ?? []).map((vote) => [vote.poll_id, vote.option_id]),
    );

    const context = {
      currentRead:
        currentRow && currentBook
          ? {
              id: currentBook.id,
              title: currentBook.title,
              author: currentBook.author,
              description: currentBook.description?.slice(0, 1200) ?? null,
              cover: currentBook.cover_url,
              categories: Array.isArray(currentBook.categories) ? currentBook.categories : [],
              startDate: currentRow.start_date,
              endDate: currentRow.end_date,
              progressPercent: currentRow.progress_percent,
              averageRating,
              ratingCount: ratings.length,
              reviewCount: reviewsResult.count ?? 0,
              memberRating: ratings.find((row) => row.user_id === member.id)?.rating ?? null,
            }
          : null,
      previousReads: reads
        .filter((read) => read.status === "PAST")
        .slice(0, 5)
        .map((read) => {
          const book = read.book as { id: string; title: string; author: string | null } | null;
          return book
            ? { id: book.id, title: book.title, author: book.author, finishedOn: read.end_date }
            : null;
        })
        .filter(Boolean),
      upcomingEvents: (eventsResult.data ?? []).map((event) => {
        const rsvps = Array.isArray(event.event_rsvps) ? event.event_rsvps : [];
        const memberRsvp = rsvps.find((rsvp) => rsvp.user_id === member.id);
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.event_date,
          startTime: event.start_time,
          endTime: event.end_time,
          venue: event.venue_name,
          address: event.venue_address,
          rsvpDeadline: event.rsvp_deadline,
          capacity: event.capacity,
          attending: rsvps
            .filter((rsvp) => rsvp.status === "ATTENDING")
            .reduce((sum, rsvp) => sum + Number(rsvp.guest_count), 0),
          memberRsvp: memberRsvp?.status ?? null,
        };
      }),
      activePolls: (pollsResult.data ?? []).map((poll) => ({
        id: poll.id,
        type: poll.type,
        title: poll.title,
        description: poll.description,
        endsAt: poll.ends_at,
        options: (Array.isArray(poll.poll_options) ? poll.poll_options : [])
          .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
          .map((option) => ({ id: option.id, label: option.label })),
        memberVoteId: memberVotes.get(poll.id) ?? null,
      })),
      announcements: announcementResult.data ?? [],
      member: { authenticated: true, role: member.role },
    };
    return { output: context };
  },
};
