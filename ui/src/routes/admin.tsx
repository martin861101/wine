import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarPlus,
  Check,
  ImagePlus,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Section } from "@/components/site/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminApi, type AdminEvent } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — Wine & Chapters" },
      {
        name: "description",
        content: "Manage Wine & Chapters members, reads, events and communication.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <AdminMessage text="Opening the admin room…" />;
  if (!isAuthenticated) {
    return <AdminMessage text="Sign in as an administrator to continue." link />;
  }
  if (user?.role !== "ADMIN")
    return <AdminMessage text="This area is reserved for administrators." />;
  return <AdminDashboard />;
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: adminApi.getOverview,
    retry: 1,
  });
  const adminEvents = useQuery({ queryKey: ["admin-events"], queryFn: adminApi.getEvents });
  const [broadcast, setBroadcast] = useState({
    audience: "MEMBERS" as "MEMBERS" | "SUBSCRIBERS" | "ALL",
    subject: "",
    body: "",
  });
  const [event, setEvent] = useState({
    title: "",
    description: "",
    eventDate: "",
    startTime: "18:30",
    endTime: "21:00",
    venueName: "",
    venueAddress: "",
    theme: "",
    capacity: "24",
    contributionAmount: "",
    rsvpDeadline: "",
    status: "PUBLISHED" as "DRAFT" | "PUBLISHED",
  });
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [existingEventImage, setExistingEventImage] = useState<string | null>(null);
  const [removeEventImage, setRemoveEventImage] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: "",
    body: "",
    type: "GENERAL" as "GENERAL" | "EVENT" | "BOOK" | "URGENT",
  });
  const [read, setRead] = useState({
    bookId: "",
    title: "",
    author: "",
    coverUrl: "",
    startDate: "",
    endDate: "",
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const current = overview.data?.currentBook;
    if (current) {
      setProgress(current.progressPercent);
      setRead((old) => ({
        ...old,
        bookId: current.book.id,
        startDate: current.startDate,
        endDate: current.endDate,
      }));
    }
  }, [overview.data?.currentBook]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    void queryClient.invalidateQueries({ queryKey: ["public-home"] });
    void queryClient.invalidateQueries({ queryKey: ["club-events"] });
  };
  const memberMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      adminApi.updateMember(id, { approved }),
    onSuccess: () => {
      invalidate();
      toast.success("Member status updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Member update failed."),
  });
  const broadcastMutation = useMutation({
    mutationFn: () => adminApi.broadcast(broadcast),
    onSuccess: (result) => {
      setBroadcast((old) => ({ ...old, subject: "", body: "" }));
      toast.success(`Sent to ${result.sent} of ${result.recipients} recipients.`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The email could not be sent."),
  });
  const eventMutation = useMutation({
    mutationFn: async () => {
      const input = {
        ...event,
        capacity: Number(event.capacity),
        contributionAmount: event.contributionAmount ? Number(event.contributionAmount) : undefined,
        description: event.description || undefined,
        venueAddress: event.venueAddress || undefined,
        theme: event.theme || undefined,
        endTime: event.endTime || undefined,
        rsvpDeadline: event.rsvpDeadline || undefined,
        image: eventImage ?? undefined,
      };
      if (editingEventId)
        await adminApi.updateEvent(editingEventId, { ...input, removeImage: removeEventImage });
      else await adminApi.createEvent(input);
    },
    onSuccess: () => {
      setEvent((old) => ({
        ...old,
        title: "",
        description: "",
        venueName: "",
        venueAddress: "",
        theme: "",
      }));
      setEventImage(null);
      setEditingEventId(null);
      setExistingEventImage(null);
      setRemoveEventImage(false);
      invalidate();
      toast.success(editingEventId ? "Event updated." : "Event created.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The event could not be created."),
  });
  const deleteEventMutation = useMutation({
    mutationFn: adminApi.deleteEvent,
    onSuccess: () => {
      invalidate();
      toast.success("Event removed.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The event could not be removed."),
  });
  const readMutation = useMutation({
    mutationFn: async () => {
      let bookId = read.bookId;
      if (read.title.trim()) {
        const imported = await adminApi.importBook({
          externalProvider: "manual",
          externalId: `manual-${read.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
          title: read.title.trim(),
          author: read.author.trim() || "Unknown author",
          coverUrl: read.coverUrl.trim() || undefined,
          categories: [],
          metadata: { source: "admin" },
        });
        bookId = imported.databaseId;
      }
      if (!bookId || !read.startDate || !read.endDate)
        throw new Error("Choose a book and reading dates.");
      return adminApi.setCurrentRead({ bookId, startDate: read.startDate, endDate: read.endDate });
    },
    onSuccess: () => {
      setRead((old) => ({ ...old, title: "", author: "", coverUrl: "" }));
      invalidate();
      toast.success("Current monthly read updated.");
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "The monthly read could not be updated.",
      ),
  });
  const progressMutation = useMutation({
    mutationFn: () => adminApi.updateProgress(progress),
    onSuccess: () => {
      invalidate();
      toast.success("Reading progress updated.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Progress could not be updated."),
  });
  const announcementMutation = useMutation({
    mutationFn: () => adminApi.createAnnouncement(announcement),
    onSuccess: () => {
      setAnnouncement({ title: "", body: "", type: "GENERAL" });
      toast.success("Club announcement published.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Announcement could not be published."),
  });

  if (overview.isPending) return <AdminMessage text="Loading the admin dashboard…" />;
  if (overview.isError || !overview.data)
    return <AdminMessage text="The admin dashboard could not load. Refresh and try again." />;
  const data = overview.data;

  function submitBroadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!broadcast.subject.trim() || !broadcast.body.trim()) return;
    broadcastMutation.mutate();
  }
  function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    eventMutation.mutate();
  }
  function submitRead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    readMutation.mutate();
  }
  function submitProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    progressMutation.mutate();
  }
  function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    announcementMutation.mutate();
  }

  function editEvent(item: AdminEvent) {
    setEditingEventId(item.id);
    setExistingEventImage(item.coverImage);
    setRemoveEventImage(false);
    setEventImage(null);
    setEvent({
      title: item.title,
      description: item.description ?? "",
      eventDate: item.eventDate,
      startTime: item.startTime.slice(0, 5),
      endTime: item.endTime?.slice(0, 5) ?? "",
      venueName: item.venueName,
      venueAddress: item.venueAddress ?? "",
      theme: item.theme ?? "",
      capacity: String(item.capacity),
      contributionAmount: item.contributionAmount ? String(item.contributionAmount) : "",
      rsvpDeadline: item.rsvpDeadline ?? "",
      status: item.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    });
    document.getElementById("event-details")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <div className="gradient-hero">
        <Section className="py-14 sm:py-20">
          <p className="eyebrow">Administrator workspace</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-5xl">
            Run the club from one calm room.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Members, monthly reads, events, announcements and email communication all live here.
          </p>
        </Section>
      </div>

      <Section className="space-y-6 py-10 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Members" value={data.stats.members} />
          <Stat label="Approved" value={data.stats.approvedMembers} />
          <Stat label="Subscribers" value={data.stats.subscribers} />
          <Stat label="Books" value={data.stats.books} />
          <Stat label="Events" value={data.stats.events} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-4xl border-border/60 bg-card/80">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="eyebrow">Communication</p>
                  <h2 className="mt-2 font-display text-2xl">Send a club email</h2>
                </div>
              </div>
              <form onSubmit={submitBroadcast} className="mt-6 space-y-4">
                <select
                  value={broadcast.audience}
                  onChange={(event) =>
                    setBroadcast((old) => ({
                      ...old,
                      audience: event.target.value as typeof old.audience,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  aria-label="Email audience"
                >
                  <option value="MEMBERS">Approved members</option>
                  <option value="SUBSCRIBERS">Newsletter subscribers</option>
                  <option value="ALL">Members and subscribers</option>
                </select>
                <Input
                  value={broadcast.subject}
                  onChange={(event) =>
                    setBroadcast((old) => ({ ...old, subject: event.target.value }))
                  }
                  placeholder="Subject"
                  maxLength={200}
                  required
                />
                <Textarea
                  value={broadcast.body}
                  onChange={(event) =>
                    setBroadcast((old) => ({ ...old, body: event.target.value }))
                  }
                  placeholder="Write your message…"
                  className="min-h-36"
                  maxLength={20000}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Delivery uses the configured email provider. In development, messages are printed
                  to the server console.
                </p>
                <Button type="submit" variant="hero" disabled={broadcastMutation.isPending}>
                  {broadcastMutation.isPending ? "Sending…" : "Send email"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card id="event-details" className="rounded-4xl border-border/60 bg-card/80">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="eyebrow">Current read</p>
                  <h2 className="mt-2 font-display text-2xl">Update the monthly book</h2>
                </div>
              </div>
              <form onSubmit={submitRead} className="mt-6 space-y-4">
                <select
                  value={read.bookId}
                  onChange={(event) => setRead((old) => ({ ...old, bookId: event.target.value }))}
                  className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  aria-label="Existing book"
                >
                  <option value="">Select an existing book or add one below</option>
                  {data.books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                      {book.author ? ` — ${book.author}` : ""}
                    </option>
                  ))}
                </select>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    value={read.title}
                    onChange={(event) => setRead((old) => ({ ...old, title: event.target.value }))}
                    placeholder="New book title"
                  />
                  <Input
                    value={read.author}
                    onChange={(event) => setRead((old) => ({ ...old, author: event.target.value }))}
                    placeholder="Author"
                  />
                </div>
                <Input
                  value={read.coverUrl}
                  onChange={(event) => setRead((old) => ({ ...old, coverUrl: event.target.value }))}
                  placeholder="Cover image URL (optional)"
                  type="url"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    value={read.startDate}
                    onChange={(event) =>
                      setRead((old) => ({ ...old, startDate: event.target.value }))
                    }
                    type="date"
                    aria-label="Read start date"
                    required
                  />
                  <Input
                    value={read.endDate}
                    onChange={(event) =>
                      setRead((old) => ({ ...old, endDate: event.target.value }))
                    }
                    type="date"
                    aria-label="Read end date"
                    required
                  />
                </div>
                <Button type="submit" variant="hero" disabled={readMutation.isPending}>
                  {readMutation.isPending ? "Updating…" : "Set current read"}
                </Button>
              </form>
              <form onSubmit={submitProgress} className="mt-8 border-t border-border/60 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="reading-progress" className="text-sm font-medium">
                    Reading progress
                  </label>
                  <span className="font-display text-2xl text-primary">{progress}%</span>
                </div>
                <input
                  id="reading-progress"
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="mt-4 w-full accent-primary"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="mt-4"
                  disabled={!data.currentBook || progressMutation.isPending}
                >
                  Update progress
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-4xl border-border/60 bg-card/80">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="eyebrow">Calendar</p>
                  <h2 className="mt-2 font-display text-2xl">
                    {editingEventId ? "Edit event details" : "Add an event"}
                  </h2>
                </div>
              </div>
              <form onSubmit={submitEvent} className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 rounded-3xl border border-dashed border-border bg-background/60 p-4">
                  {eventImage || (existingEventImage && !removeEventImage) ? (
                    <img
                      src={eventImage ? URL.createObjectURL(eventImage) : existingEventImage!}
                      alt="Event preview"
                      className="mb-4 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <ImagePlus className="h-5 w-5 text-primary" />
                    <span className="flex-1">
                      <span className="block font-medium">
                        {existingEventImage ? "Replace event image" : "Add event image"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {eventImage?.name ?? "JPG, PNG, WebP or GIF · maximum 8 MB"}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        setEventImage(event.target.files?.[0] ?? null);
                        setRemoveEventImage(false);
                      }}
                    />
                  </label>
                  {eventImage || existingEventImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setEventImage(null);
                        setRemoveEventImage(true);
                      }}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </div>
                <Input
                  className="sm:col-span-2"
                  value={event.title}
                  onChange={(e) => setEvent((old) => ({ ...old, title: e.target.value }))}
                  placeholder="Event title"
                  required
                />
                <Textarea
                  className="sm:col-span-2"
                  value={event.description}
                  onChange={(e) => setEvent((old) => ({ ...old, description: e.target.value }))}
                  placeholder="Description"
                  maxLength={5000}
                />
                <Input
                  value={event.eventDate}
                  onChange={(e) => setEvent((old) => ({ ...old, eventDate: e.target.value }))}
                  type="date"
                  aria-label="Event date"
                  required
                />
                <Input
                  value={event.venueName}
                  onChange={(e) => setEvent((old) => ({ ...old, venueName: e.target.value }))}
                  placeholder="Venue name"
                  required
                />
                <Input
                  value={event.startTime}
                  onChange={(e) => setEvent((old) => ({ ...old, startTime: e.target.value }))}
                  type="time"
                  aria-label="Start time"
                  required
                />
                <Input
                  value={event.endTime}
                  onChange={(e) => setEvent((old) => ({ ...old, endTime: e.target.value }))}
                  type="time"
                  aria-label="End time"
                />
                <Input
                  value={event.venueAddress}
                  onChange={(e) => setEvent((old) => ({ ...old, venueAddress: e.target.value }))}
                  placeholder="Venue address"
                />
                <Input
                  value={event.theme}
                  onChange={(e) => setEvent((old) => ({ ...old, theme: e.target.value }))}
                  placeholder="Theme"
                />
                <Input
                  value={event.capacity}
                  onChange={(e) => setEvent((old) => ({ ...old, capacity: e.target.value }))}
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="Capacity"
                  required
                />
                <Input
                  value={event.contributionAmount}
                  onChange={(e) =>
                    setEvent((old) => ({ ...old, contributionAmount: e.target.value }))
                  }
                  type="number"
                  min="0"
                  placeholder="Contribution (ZAR)"
                />
                <Input
                  value={event.rsvpDeadline}
                  onChange={(e) => setEvent((old) => ({ ...old, rsvpDeadline: e.target.value }))}
                  type="date"
                  aria-label="RSVP deadline"
                />
                <select
                  value={event.status}
                  onChange={(e) =>
                    setEvent((old) => ({ ...old, status: e.target.value as typeof old.status }))
                  }
                  className="h-10 rounded-xl border border-input bg-card px-3 text-sm"
                  aria-label="Event status"
                >
                  <option value="PUBLISHED">Publish now</option>
                  <option value="DRAFT">Save as draft</option>
                </select>
                <Button
                  type="submit"
                  variant="hero"
                  className="sm:col-span-2"
                  disabled={eventMutation.isPending}
                >
                  {eventMutation.isPending
                    ? "Saving…"
                    : editingEventId
                      ? "Update event"
                      : "Create event"}
                </Button>
                {editingEventId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="sm:col-span-2"
                    onClick={() => {
                      setEditingEventId(null);
                      setExistingEventImage(null);
                      setEventImage(null);
                      setRemoveEventImage(false);
                    }}
                  >
                    Cancel editing
                  </Button>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-4xl border-border/60 bg-card/80">
            <CardContent className="p-7 sm:p-8">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="eyebrow">Club note</p>
                  <h2 className="mt-2 font-display text-2xl">Publish an announcement</h2>
                </div>
              </div>
              <form onSubmit={submitAnnouncement} className="mt-6 space-y-4">
                <Input
                  value={announcement.title}
                  onChange={(e) => setAnnouncement((old) => ({ ...old, title: e.target.value }))}
                  placeholder="Announcement title"
                  required
                />
                <Textarea
                  value={announcement.body}
                  onChange={(e) => setAnnouncement((old) => ({ ...old, body: e.target.value }))}
                  placeholder="Announcement message"
                  className="min-h-36"
                  maxLength={5000}
                  required
                />
                <select
                  value={announcement.type}
                  onChange={(e) =>
                    setAnnouncement((old) => ({ ...old, type: e.target.value as typeof old.type }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  aria-label="Announcement type"
                >
                  <option value="GENERAL">General</option>
                  <option value="EVENT">Event</option>
                  <option value="BOOK">Book</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <Button type="submit" variant="hero" disabled={announcementMutation.isPending}>
                  {announcementMutation.isPending ? "Publishing…" : "Publish note"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <MembersPanel
          members={data.members}
          onToggle={(id, approved) => memberMutation.mutate({ id, approved })}
          pending={memberMutation.isPending}
        />
        <EventAdminList
          events={adminEvents.data ?? []}
          onEdit={editEvent}
          onDelete={(id) => deleteEventMutation.mutate(id)}
          pending={deleteEventMutation.isPending}
        />
        <AdminModeration />
        <div className="grid gap-6 lg:grid-cols-2">
          <ListPanel
            title="Newsletter subscribers"
            items={data.subscribers
              .filter((item) => item.subscribed)
              .slice(0, 12)
              .map((item) => item.email)}
            empty="No subscribers yet."
          />
        </div>
      </Section>
    </>
  );
}

function EventAdminList({
  events,
  onEdit,
  onDelete,
  pending,
}: {
  events: AdminEvent[];
  onEdit: (event: AdminEvent) => void;
  onDelete: (id: string) => void;
  pending: boolean;
}) {
  return (
    <Card className="rounded-4xl border-border/60 bg-card/80">
      <CardContent className="p-7 sm:p-8">
        <p className="eyebrow">Event management</p>
        <h2 className="mt-2 font-display text-2xl">Published and draft events</h2>
        {events.length ? (
          <div className="mt-6 divide-y divide-border/60">
            {events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.eventDate} · {event.venueName} · {event.status.toLowerCase()}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onEdit(event)}>
                  <Pencil /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{event.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the event and its RSVPs. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep event</AlertDialogCancel>
                      <AlertDialogAction disabled={pending} onClick={() => onDelete(event.id)}>
                        Delete event
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">No events yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AdminModeration() {
  const queryClient = useQueryClient();
  const content = useQuery({ queryKey: ["admin-content"], queryFn: adminApi.getContent });
  const [poll, setPoll] = useState({ title: "", options: "", endsAt: "", hideResults: true });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    void queryClient.invalidateQueries({ queryKey: ["published-reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["widget-home"] });
  };
  const reviewStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PENDING" | "PUBLISHED" | "HIDDEN" }) =>
      adminApi.setReviewStatus(id, status),
    onSuccess: () => {
      refresh();
      toast.success("Review moderation updated.");
    },
  });
  const removeReview = useMutation({
    mutationFn: adminApi.deleteReview,
    onSuccess: () => {
      refresh();
      toast.success("Review removed.");
    },
  });
  const removeComment = useMutation({
    mutationFn: adminApi.deleteReviewComment,
    onSuccess: () => {
      refresh();
      toast.success("Comment removed.");
    },
  });
  const suggestionStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "NEW" | "REVIEWED" | "ACCEPTED" | "DECLINED";
    }) => adminApi.updateSuggestionStatus(id, status),
    onSuccess: () => {
      refresh();
      toast.success("Suggestion updated.");
    },
  });
  const createPoll = useMutation({
    mutationFn: () =>
      adminApi.createPoll({
        title: poll.title.trim(),
        optionLabels: poll.options
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        ...(poll.endsAt ? { endsAt: poll.endsAt } : {}),
        hideResults: poll.hideResults,
      }),
    onSuccess: () => {
      setPoll({ title: "", options: "", endsAt: "", hideResults: true });
      refresh();
      toast.success("Book vote opened.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The poll could not be created."),
  });
  const data = content.data;
  if (content.isPending)
    return (
      <Card className="rounded-4xl">
        <CardContent className="p-8 text-sm text-muted-foreground">
          Loading moderation tools…
        </CardContent>
      </Card>
    );
  if (!data)
    return (
      <Card className="rounded-4xl">
        <CardContent className="p-8 text-sm text-destructive">
          Moderation tools could not load.
        </CardContent>
      </Card>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="rounded-4xl border-border/60 bg-card/80">
        <CardContent className="p-7">
          <p className="eyebrow">Reviews & comments</p>
          <h2 className="mt-2 font-display text-2xl">Moderation queue</h2>
          <div className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto">
            {data.reviews.map((review) => (
              <div key={review.id} className="rounded-2xl bg-accent/40 p-4">
                <p className="text-sm font-medium">
                  {review.bookTitle} · {review.memberName}
                </p>
                <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{review.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{review.status.toLowerCase()}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewStatus.mutate({ id: review.id, status: "PUBLISHED" })}
                  >
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewStatus.mutate({ id: review.id, status: "HIDDEN" })}
                  >
                    Hide
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The review and all of its comments will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeReview.mutate(review.id)}>
                          Delete review
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
            {data.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 rounded-2xl border border-border/60 p-4">
                <div className="flex-1">
                  <p className="text-xs font-medium">{comment.memberName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{comment.body}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label="Remove comment">
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        It will disappear from the published review conversation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removeComment.mutate(comment.id)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card className="rounded-4xl border-border/60 bg-card/80">
          <CardContent className="p-7">
            <p className="eyebrow">Suggestion box</p>
            <h2 className="mt-2 font-display text-2xl">Member ideas</h2>
            <div className="mt-5 space-y-3">
              {data.suggestions.slice(0, 12).map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl bg-accent/40 p-4">
                  <p className="font-medium">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.memberName} · {suggestion.status.toLowerCase()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setPoll((old) => ({
                          ...old,
                          options: [old.options.trim(), suggestion.title]
                            .filter(Boolean)
                            .join("\n"),
                        }))
                      }
                    >
                      Add to poll
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        suggestionStatus.mutate({ id: suggestion.id, status: "ACCEPTED" })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        suggestionStatus.mutate({ id: suggestion.id, status: "DECLINED" })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-4xl border-border/60 bg-card/80">
          <CardContent className="p-7">
            <p className="eyebrow">Book voting</p>
            <h2 className="mt-2 font-display text-2xl">Open a community poll</h2>
            <form
              className="mt-5 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const options = poll.options.split("\n").filter((value) => value.trim());
                if (poll.title.trim() && options.length >= 2) createPoll.mutate();
                else toast.error("Add a title and at least two options.");
              }}
            >
              <Input
                value={poll.title}
                onChange={(event) => setPoll((old) => ({ ...old, title: event.target.value }))}
                placeholder="Poll title"
              />
              <Textarea
                value={poll.options}
                onChange={(event) => setPoll((old) => ({ ...old, options: event.target.value }))}
                placeholder={"One candidate book per line\nBook two\nBook three"}
              />
              <Input
                type="datetime-local"
                value={poll.endsAt}
                onChange={(event) => setPoll((old) => ({ ...old, endsAt: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={poll.hideResults}
                  onChange={(event) =>
                    setPoll((old) => ({ ...old, hideResults: event.target.checked }))
                  }
                />{" "}
                Hide results until the poll closes
              </label>
              <Button type="submit" variant="hero" disabled={createPoll.isPending}>
                Open vote
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-3xl border-border/60 bg-card/80">
      <CardContent className="p-5">
        <p className="font-display text-3xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function MembersPanel({
  members,
  onToggle,
  pending,
}: {
  members: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
    approved: boolean;
  }>;
  onToggle: (id: string, approved: boolean) => void;
  pending: boolean;
}) {
  return (
    <Card className="rounded-4xl border-border/60 bg-card/80">
      <CardContent className="p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="eyebrow">People</p>
            <h2 className="mt-2 font-display text-2xl">Members</h2>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border/60 text-xs text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Member</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/40 last:border-0">
                  <td className="py-4">
                    <p className="font-medium">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={member.approved ? "secondary" : "outline"}>
                        {member.approved ? "Approved" : "Pending"}
                      </Badge>
                      {member.emailVerified ? (
                        <Badge variant="secondary">Verified</Badge>
                      ) : (
                        <Badge variant="outline">Unverified</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-muted-foreground">{member.role}</td>
                  <td className="py-4 text-right">
                    <Button
                      size="sm"
                      variant={member.approved ? "outline" : "hero"}
                      disabled={pending}
                      onClick={() => onToggle(member.id, !member.approved)}
                    >
                      {member.approved ? (
                        <>
                          <X className="mr-1 h-3.5 w-3.5" />
                          Revoke
                        </>
                      ) : (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Approve
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ListPanel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <Card className="rounded-4xl border-border/60 bg-card/80">
      <CardContent className="p-7">
        <p className="eyebrow">Overview</p>
        <h2 className="mt-2 font-display text-2xl">{title}</h2>
        {items.length ? (
          <ul className="mt-5 space-y-3">
            {items.map((item) => (
              <li
                key={item}
                className="rounded-2xl bg-accent/50 px-4 py-3 text-sm text-muted-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl bg-accent/50 p-4 text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AdminMessage({ text, link = false }: { text: string; link?: boolean }) {
  return (
    <Section className="flex min-h-[60dvh] items-center justify-center">
      <Card className="max-w-xl rounded-4xl border-border/60 bg-card/80">
        <CardContent className="p-10 text-center">
          <p className="eyebrow">Admin area</p>
          <h1 className="mt-4 font-display text-3xl tracking-tight">{text}</h1>
          {link ? (
            <Button variant="hero" className="mt-7" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </Section>
  );
}
