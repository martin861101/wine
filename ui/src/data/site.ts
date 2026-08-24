/**
 * Static marketing content for the public site.
 * Kept in one place so copy can be edited without touching layout code.
 */

export const site = {
  name: "Wine & Chapters",
  tagline: "A women's book club for slow evenings, good wine and better stories.",
  city: "Johannesburg, South Africa",
  email: "hello@wineandchapters.co.za",
  instagram: "@wine_and_chapters_bookclub",
  instagramUrl: "https://instagram.com/wine_and_chapters_bookclub",
  whatsapp: "Members receive a WhatsApp community invite after approval.",
  meetingCadence: "Last Saturday of every month",
} as const;

export const benefits = [
  {
    icon: "BookOpen",
    title: "A curated read each month",
    body: "Members nominate and vote. One book, one month, and a room full of women who actually finished it.",
  },
  {
    icon: "Wine",
    title: "Beautiful meetups",
    body: "Wine lounges, garden courtyards and quiet bookstores. Every gathering is hosted with intention.",
  },
  {
    icon: "MessagesSquare",
    title: "Reviews worth reading",
    body: "Write long, spoiler-tagged reviews. Favourite quotes, characters and scenes — not star ratings alone.",
  },
  {
    icon: "Trophy",
    title: "Reading challenges",
    body: "Set a yearly goal, keep your streak alive and collect badges as your shelf grows.",
  },
  {
    icon: "Users",
    title: "A real community",
    body: "A member directory, a WhatsApp circle and friendships that outlast the book of the month.",
  },
  {
    icon: "Sparkles",
    title: "Member-only extras",
    body: "Author evenings, book swaps, early RSVP access and partner discounts at local bookshops.",
  },
] as const;

export const stats = [
  { value: "120+", label: "Members" },
  { value: "48", label: "Books read" },
  { value: "36", label: "Meetups hosted" },
  { value: "4.9", label: "Member rating" },
] as const;

export const testimonials = [
  {
    quote:
      "Wine & Chapters came about when I needed it most. Moving to Fourways without knowing anyone, I saw Shix’s post asking if anyone would join a book club. I jumped at the chance to meet like-minded people, and it became the beginning of a new chapter filled with bookish chats, wine, laughter and, most importantly, genuine friendships. I’m so glad I commented on that first post — it led me to an incredible community where everyone is welcomed with open arms.",
    name: "Nici",
    image: "/img/nici.jpg",
  },
  {
    quote:
      "I joined for the books and stayed for the women. It's the one evening a month I protect fiercely.",
    name: "Lerato D.",
    image: null,
  },
  {
    quote: "Every meetup feels like it was planned for you personally. The detail is unmatched.",
    name: "Chiara B.",
    image: null,
  },
] as const;

export const membershipTiers = [
  {
    id: "READER",
    name: "Reader",
    amount: 0,
    price: "Free",
    period: "",
    description: "For curious readers finding their footing.",
    features: [
      "Monthly book announcement",
      "Read the public review feed",
      "Newsletter & event previews",
      "Two guest meetups a year",
    ],
    cta: "Create an account",
    featured: false,
  },
] as const;

export const faqs = [
  {
    q: "Do I have to finish the book?",
    a: "We'd love you to, but nobody is turned away at the door. Come for the conversation — spoilers are always tagged.",
  },
  {
    q: "How are members approved?",
    a: "Applications are reviewed by the committee within 48 hours. We keep chapters intimate, so intake is capped each month.",
  },
  {
    q: "Where do meetups happen?",
    a: "Around Johannesburg — wine lounges, bookstores, garden venues and the occasional member's home.",
  },
  {
    q: "Does membership cost anything?",
    a: "No. Wine & Chapters membership is free. Some special events may ask for an optional contribution, which is always shown clearly in advance.",
  },
] as const;
