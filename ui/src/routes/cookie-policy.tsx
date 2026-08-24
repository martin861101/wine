import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Notice — Wine & Chapters" },
      {
        name: "description",
        content: "How Wine & Chapters uses cookies and similar browser storage.",
      },
    ],
  }),
  component: CookiePolicyPage,
});

function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie notice"
      description="A short explanation of the small pieces of browser storage that help Wine & Chapters work."
      lastUpdated="19 August 2026"
      sections={[
        {
          title: "What cookies are",
          paragraphs: [
            "Cookies are small text files stored by your browser. Similar technologies, such as local storage, can remember a setting or keep a secure session active.",
          ],
        },
        {
          title: "How we use them",
          paragraphs: [
            "Wine & Chapters uses essential storage for authentication, security, routing and basic preferences. These items are needed for features such as signing in and keeping the member portal working.",
            "If we introduce optional analytics or other non-essential technologies, we will describe them here and provide an appropriate choice before using them where required.",
          ],
        },
        {
          title: "Managing cookies",
          paragraphs: [
            "Most browsers let you view, block or delete cookies through their privacy settings. Blocking essential storage may prevent sign-in or other parts of the website from working correctly.",
          ],
        },
        {
          title: "Questions",
          paragraphs: [
            "For questions about browser storage or privacy at Wine & Chapters, please use the contact details in the footer or read our Privacy Policy.",
          ],
        },
      ]}
    />
  );
}
