import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";
import { site } from "@/data/site";

export const Route = createFileRoute("/terms-of-use")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Wine & Chapters" },
      {
        name: "description",
        content: "The terms for using the Wine & Chapters website and community.",
      },
    ],
  }),
  component: TermsOfUsePage,
});

function TermsOfUsePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      description="The simple ground rules for a warm, respectful and bookish Wine & Chapters community."
      lastUpdated="19 August 2026"
      sections={[
        {
          title: "Using the site",
          paragraphs: [
            "By using this website, you agree to use it lawfully, honestly and in a way that does not harm the community, our systems or another person's rights. You must provide accurate information for your account and keep your login details private.",
            "We may limit or suspend access when it is reasonably necessary to protect members, investigate misuse or keep the service secure.",
          ],
        },
        {
          title: "Community conduct",
          paragraphs: [
            "Wine & Chapters is built around kindness and curiosity. Do not harass, threaten, discriminate against, impersonate or deliberately expose another member. Do not upload unlawful, invasive, defamatory or malicious material, or use the site to promote unrelated commercial activity without permission.",
            "We may remove content or take account action when it conflicts with these standards. If something in the community feels unsafe, contact the committee at the address below.",
          ],
        },
        {
          title: "Your content",
          paragraphs: [
            "You keep ownership of reviews, photographs, messages and other material you submit. You give Wine & Chapters permission to store, display and format that material as needed to run the feature you used. Please only share content you have the right to share and respect spoiler warnings and other members' privacy.",
          ],
        },
        {
          title: "Events and third-party services",
          paragraphs: [
            "Event details, venues, dates and availability can change. Please check the event information before attending and follow the venue's rules. Some features may rely on third-party services; their own terms and privacy notices may also apply.",
          ],
        },
        {
          title: "Reading-room assistant",
          paragraphs: [
            "The AI reading-room assistant is a conversation aid for book-club use. Its suggestions may be incomplete or incorrect and are not professional, medical, legal or financial advice. Do not use it for urgent decisions or share confidential information with it.",
          ],
        },
        {
          title: "Intellectual property and availability",
          paragraphs: [
            "The Wine & Chapters name, design, logos and original site content belong to Wine & Chapters or the relevant rights holder. You may use the site for personal, non-commercial community participation only. We work to keep the service available, but cannot promise that every feature will always be uninterrupted or error-free.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            `Questions about these terms can be sent to ${site.email}. We may update these terms as the community or website develops; continued use after an update means you accept the revised terms.`,
          ],
        },
      ]}
    />
  );
}
