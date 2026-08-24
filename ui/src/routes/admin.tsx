import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarPlus,
  Check,
  CreditCard,
  ImagePlus,
  LayoutDashboard,
  Lightbulb,
  Mail,
  Menu,
  MessageSquare,
  Pencil,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Vote,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Section } from "@/components/site/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { adminApi, type AdminEvent, type PaymentMethodSettings } from "@/lib/api";
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

type AdminSectionId =
  | "overview"
  | "members"
  | "monthly-book"
  | "events"
  | "announcements"
  | "reviews"
  | "reading-room"
  | "suggestions"
  | "polls"
  | "broadcasts"
  | "subscribers"
  | "payment-settings";

const adminNavigation: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ id: AdminSectionId; label: string; icon: LucideIcon }>;
}> = [
  {
    label: "Club management",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "members", label: "Members", icon: Users },
      { id: "monthly-book", label: "Monthly Book", icon: BookOpen },
      { id: "events", label: "Events", icon: CalendarPlus },
      { id: "announcements", label: "Announcements", icon: Mail },
    ],
  },
  {
    label: "Community",
    items: [
      { id: "reviews", label: "Reviews", icon: Star },
      { id: "reading-room", label: "Reading Room", icon: MessageSquare },
      { id: "suggestions", label: "Suggestions", icon: Lightbulb },
      { id: "polls", label: "Polls", icon: Vote },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "broadcasts", label: "Broadcasts", icon: Send },
      { id: "subscribers", label: "Subscribers", icon: Users },
      { id: "payment-settings", label: "Payment Settings", icon: CreditCard },
    ],
  },
];

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
  const paymentSettings = useQuery({
    queryKey: ["admin-payment-settings"],
    queryFn: adminApi.getPaymentSettings,
  });
  const [paymentForm, setPaymentForm] = useState<PaymentMethodSettings | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSectionId>("overview");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
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
    startDate: "",
    endDate: "",
  });
  const [readCoverImage, setReadCoverImage] = useState<File | null>(null);
  const [existingReadCover, setExistingReadCover] = useState<string | null>(null);
  const [removeReadCover, setRemoveReadCover] = useState(false);
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

  useEffect(() => {
    if (paymentSettings.data) setPaymentForm(paymentSettings.data);
  }, [paymentSettings.data]);

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
  const paymentSettingsMutation = useMutation({
    mutationFn: () => {
      if (!paymentForm) throw new Error("Payment settings are not ready.");
      return adminApi.updatePaymentSettings(paymentForm);
    },
    onSuccess: (settings) => {
      setPaymentForm(settings);
      void queryClient.invalidateQueries({ queryKey: ["admin-payment-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-method-settings"] });
      toast.success("Payment settings saved.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Payment settings could not be saved."),
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
      let previousUrl = existingReadCover;
      if (read.title.trim()) {
        const imported = await adminApi.importBook({
          externalProvider: "manual",
          externalId: `manual-${read.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
          title: read.title.trim(),
          author: read.author.trim() || "Unknown author",
          categories: [],
          metadata: { source: "admin" },
        });
        bookId = imported.databaseId;
        previousUrl = null;
      }
      if (!bookId || !read.startDate || !read.endDate)
        throw new Error("Choose a book and reading dates.");
      if (readCoverImage || removeReadCover) {
        await adminApi.updateBookCover(bookId, {
          remove: removeReadCover,
          previousUrl,
          ...(readCoverImage ? { image: readCoverImage } : {}),
        });
      }
      return adminApi.setCurrentRead({ bookId, startDate: read.startDate, endDate: read.endDate });
    },
    onSuccess: () => {
      setRead((old) => ({ ...old, title: "", author: "" }));
      setReadCoverImage(null);
      setExistingReadCover(null);
      setRemoveReadCover(false);
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
    setActiveSection("events");
    requestAnimationFrame(() =>
      document
        .getElementById("admin-content")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const activeLabel = adminNavigation
    .flatMap((group) => group.items)
    .find((item) => item.id === activeSection)?.label;
  const selectSection = (section: AdminSectionId) => {
    setActiveSection(section);
    setMobileNavigationOpen(false);
    requestAnimationFrame(() => document.getElementById("admin-content")?.focus());
  };

  return (
    <div className="min-h-dvh bg-background lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-y-auto border-r border-border/60 bg-card/95 px-5 py-7 shadow-soft lg:block">
        <AdminNavigation activeSection={activeSection} onSelect={selectSection} />
      </aside>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open admin navigation"
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(19rem,88vw)] p-5">
              <SheetHeader className="sr-only">
                <SheetTitle>Admin navigation</SheetTitle>
              </SheetHeader>
              <AdminNavigation activeSection={activeSection} onSelect={selectSection} />
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="eyebrow">Administrator workspace</p>
            <h1 className="font-display text-xl tracking-tight sm:text-2xl">{activeLabel}</h1>
          </div>
        </div>
      </header>

      <main id="admin-content" tabIndex={-1} className="outline-none">
        <Section className="space-y-6 py-7 sm:py-10">
          {activeSection === "overview" ? (
            <>
              <div>
                <p className="eyebrow">Club at a glance</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight">
                  Run the club from one calm room.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  Choose a section from the navigation to manage members, gatherings, community
                  activity and communications.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat label="Members" value={data.stats.members} />
                <Stat label="Approved" value={data.stats.approvedMembers} />
                <Stat label="Subscribers" value={data.stats.subscribers} />
                <Stat label="Books" value={data.stats.books} />
                <Stat label="Events" value={data.stats.events} />
              </div>
            </>
          ) : null}

          <div className="space-y-6">
            {activeSection === "payment-settings" ? (
              <Card className="rounded-4xl border-border/60 bg-card/80">
                <CardContent className="p-7 sm:p-8">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <p className="eyebrow">Payments</p>
                      <h2 className="mt-2 font-display text-2xl">Payment method</h2>
                    </div>
                  </div>
                  {paymentSettings.isPending ? (
                    <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
                      Loading payment settings…
                    </p>
                  ) : paymentSettings.isError ? (
                    <p className="mt-6 text-sm text-destructive" role="alert">
                      Payment settings could not be loaded. Refresh and try again.
                    </p>
                  ) : !paymentForm ? (
                    <p className="mt-6 text-sm text-destructive" role="alert">
                      Payment settings could not be loaded. Refresh and try again.
                    </p>
                  ) : (
                    <form
                      className="mt-6 space-y-5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        paymentSettingsMutation.mutate();
                      }}
                    >
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 p-4">
                        <div>
                          <label htmlFor="online-payments" className="text-sm font-medium">
                            Online payments enabled
                          </label>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Enable secure online checkout for contributions and paid memberships.
                          </p>
                        </div>
                        <Switch
                          id="online-payments"
                          checked={paymentForm.onlinePaymentsEnabled}
                          onCheckedChange={(checked) =>
                            setPaymentForm((current) =>
                              current ? { ...current, onlinePaymentsEnabled: checked } : current,
                            )
                          }
                          aria-label="Online payments enabled"
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-payment-message" className="text-sm font-medium">
                          Manual-payment message
                        </label>
                        <Textarea
                          id="manual-payment-message"
                          value={paymentForm.manualPaymentMessage}
                          onChange={(event) =>
                            setPaymentForm((current) =>
                              current
                                ? { ...current, manualPaymentMessage: event.target.value }
                                : current,
                            )
                          }
                          className="mt-2 min-h-40 whitespace-pre-wrap"
                          maxLength={5000}
                          required
                          aria-describedby="manual-payment-message-help"
                        />
                        <p
                          id="manual-payment-message-help"
                          className="mt-2 text-xs text-muted-foreground"
                        >
                          Shown when online payments are off. Line breaks are preserved. Do not
                          include provider secrets, API keys, or passwords.
                        </p>
                      </div>
                      <Button
                        type="submit"
                        variant="hero"
                        disabled={paymentSettingsMutation.isPending}
                      >
                        {paymentSettingsMutation.isPending ? "Saving…" : "Save payment settings"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "broadcasts" ? (
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
                      Delivery uses the configured email provider. In development, messages are
                      printed to the server console.
                    </p>
                    <Button type="submit" variant="hero" disabled={broadcastMutation.isPending}>
                      {broadcastMutation.isPending ? "Sending…" : "Send email"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "monthly-book" ? (
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
                      onChange={(event) => {
                        const selected = data.books.find((book) => book.id === event.target.value);
                        setRead((old) => ({ ...old, bookId: event.target.value }));
                        setExistingReadCover(selected?.coverUrl ?? null);
                        setReadCoverImage(null);
                        setRemoveReadCover(false);
                      }}
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
                        onChange={(event) =>
                          setRead((old) => ({ ...old, title: event.target.value }))
                        }
                        placeholder="New book title"
                      />
                      <Input
                        value={read.author}
                        onChange={(event) =>
                          setRead((old) => ({ ...old, author: event.target.value }))
                        }
                        placeholder="Author"
                      />
                    </div>
                    <div className="rounded-3xl border border-dashed border-border bg-background/60 p-4">
                      {readCoverImage || (existingReadCover && !removeReadCover) ? (
                        <img
                          src={
                            readCoverImage
                              ? URL.createObjectURL(readCoverImage)
                              : existingReadCover!
                          }
                          alt="Book cover preview"
                          className="mb-4 h-48 w-32 rounded-2xl object-cover shadow-soft"
                        />
                      ) : null}
                      <label className="flex cursor-pointer items-center gap-3 text-sm">
                        <ImagePlus className="h-5 w-5 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {existingReadCover ? "Replace book cover" : "Upload a book cover"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {readCoverImage?.name ?? "JPG, PNG, WebP or GIF · maximum 8 MB"}
                          </span>
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (
                              file &&
                              !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
                                file.type,
                              )
                            ) {
                              toast.error("Choose a JPG, PNG, WebP, or GIF book cover.");
                              event.target.value = "";
                              return;
                            }
                            if (file && file.size > 8 * 1024 * 1024) {
                              toast.error("The book cover must be smaller than 8 MB.");
                              event.target.value = "";
                              return;
                            }
                            setReadCoverImage(file);
                            setRemoveReadCover(false);
                          }}
                        />
                      </label>
                      {readCoverImage || existingReadCover ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => {
                            setReadCoverImage(null);
                            setRemoveReadCover(true);
                          }}
                        >
                          Remove cover
                        </Button>
                      ) : null}
                    </div>
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
                      {readMutation.isPending
                        ? readCoverImage
                          ? "Uploading cover…"
                          : "Updating…"
                        : "Set current read"}
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
            ) : null}
          </div>

          <div className="space-y-6">
            {activeSection === "events" ? (
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
                      onChange={(e) =>
                        setEvent((old) => ({ ...old, venueAddress: e.target.value }))
                      }
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
                      onChange={(e) =>
                        setEvent((old) => ({ ...old, rsvpDeadline: e.target.value }))
                      }
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
            ) : null}

            {activeSection === "announcements" ? (
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
                      onChange={(e) =>
                        setAnnouncement((old) => ({ ...old, title: e.target.value }))
                      }
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
                        setAnnouncement((old) => ({
                          ...old,
                          type: e.target.value as typeof old.type,
                        }))
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
            ) : null}
          </div>

          {activeSection === "members" ? (
            <MembersPanel
              members={data.members}
              onToggle={(id, approved) => memberMutation.mutate({ id, approved })}
              pending={memberMutation.isPending}
            />
          ) : null}
          {activeSection === "events" ? (
            <EventAdminList
              events={adminEvents.data ?? []}
              onEdit={editEvent}
              onDelete={(id) => deleteEventMutation.mutate(id)}
              pending={deleteEventMutation.isPending}
            />
          ) : null}
          {(["reviews", "reading-room", "suggestions", "polls"] as AdminSectionId[]).includes(
            activeSection,
          ) ? (
            <AdminModeration
              activeSection={activeSection as "reviews" | "reading-room" | "suggestions" | "polls"}
            />
          ) : null}
          {activeSection === "subscribers" ? (
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
          ) : null}
        </Section>
      </main>
    </div>
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

function AdminModeration({
  activeSection,
}: {
  activeSection: "reviews" | "reading-room" | "suggestions" | "polls";
}) {
  const queryClient = useQueryClient();
  const content = useQuery({ queryKey: ["admin-content"], queryFn: adminApi.getContent });
  const [poll, setPoll] = useState({ title: "", options: "", endsAt: "", hideResults: true });
  const [moderationReason, setModerationReason] = useState("");
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    void queryClient.invalidateQueries({ queryKey: ["published-reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["widget-home"] });
    void queryClient.invalidateQueries({ queryKey: ["discussions"] });
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
  const moderateDiscussion = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "remove" | "restore" }) =>
      adminApi.moderateDiscussion(id, {
        action,
        ...(action === "remove" ? { reason: moderationReason } : {}),
      }),
    onSuccess: (_data, variables) => {
      setModerationReason("");
      refresh();
      toast.success(
        variables.action === "remove" ? "Post removed from the Reading Room." : "Post restored.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "The post could not be moderated."),
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
    <div className="space-y-6">
      {activeSection === "reviews" ? (
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
                <div
                  key={comment.id}
                  className="flex gap-3 rounded-2xl border border-border/60 p-4"
                >
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
      ) : null}
      {activeSection === "reading-room" ? (
        <Card className="rounded-4xl border-border/60 bg-card/80">
          <CardContent className="p-7">
            <p className="eyebrow">Reading Room posts</p>
            <h2 className="mt-2 font-display text-2xl">Member post moderation</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Removed posts and their comments are hidden from members. You can restore a post if it
              was removed accidentally.
            </p>
            <div className="mt-5 max-h-[32rem] space-y-3 overflow-y-auto">
              {data.discussions.map((discussion) => (
                <div key={discussion.id} className="rounded-2xl bg-accent/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{discussion.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {discussion.memberName} ·{" "}
                        {new Date(discussion.createdAt).toLocaleDateString()} ·{" "}
                        {discussion.commentCount}{" "}
                        {discussion.commentCount === 1 ? "comment" : "comments"}
                      </p>
                    </div>
                    <Badge>{discussion.deletedAt ? "removed" : "visible"}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {discussion.body}
                  </p>
                  {discussion.deletedAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      disabled={moderateDiscussion.isPending}
                      onClick={() =>
                        moderateDiscussion.mutate({ id: discussion.id, action: "restore" })
                      }
                    >
                      {moderateDiscussion.isPending ? "Saving…" : "Restore post"}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="mt-4"
                          disabled={moderateDiscussion.isPending}
                        >
                          Remove post
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove “{discussion.title}”?</AlertDialogTitle>
                          <AlertDialogDescription>
                            The post and its comments will be hidden from the Reading Room. This can
                            be restored later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <label className="grid gap-2 text-sm font-medium">
                          Moderation reason{" "}
                          <span className="font-normal text-muted-foreground">
                            (optional, never public)
                          </span>
                          <Textarea
                            value={moderationReason}
                            onChange={(event) => setModerationReason(event.target.value)}
                            maxLength={500}
                            placeholder="Optional internal note"
                          />
                        </label>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep post</AlertDialogCancel>
                          <AlertDialogAction
                            disabled={moderateDiscussion.isPending}
                            onClick={() =>
                              moderateDiscussion.mutate({ id: discussion.id, action: "remove" })
                            }
                          >
                            {moderateDiscussion.isPending ? "Removing…" : "Remove post"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
              {!data.discussions.length ? (
                <p className="rounded-2xl bg-accent/40 p-4 text-sm text-muted-foreground">
                  No Reading Room posts yet.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
      {activeSection === "suggestions" || activeSection === "polls" ? (
        <div className="space-y-6">
          {activeSection === "suggestions" ? (
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
          ) : null}
          {activeSection === "polls" ? (
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
                    onChange={(event) =>
                      setPoll((old) => ({ ...old, options: event.target.value }))
                    }
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
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AdminNavigation({
  activeSection,
  onSelect,
}: {
  activeSection: AdminSectionId;
  onSelect: (section: AdminSectionId) => void;
}) {
  return (
    <nav aria-label="Admin sections" className="flex h-full flex-col">
      <div className="mb-8 px-3">
        <p className="eyebrow">Wine & Chapters</p>
        <p className="mt-2 font-display text-2xl tracking-tight">Admin room</p>
      </div>
      <div className="space-y-6">
        {adminNavigation.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = item.id === activeSection;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={selected ? "page" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                      selected
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
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
