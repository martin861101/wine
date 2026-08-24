import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/site/legal-page";
import { site } from "@/data/site";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Wine & Chapters" },
      {
        name: "description",
        content: "How Wine & Chapters collects, uses and protects personal information.",
      },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      description="A plain-language guide to the information we handle when you visit Wine & Chapters or join the community."
      lastUpdated="19 August 2026"
      sections={[
        {
          title: "Who this policy covers",
          paragraphs: [
            "This policy applies to the Wine & Chapters website, member areas, event registrations, contact forms and related community services operated by Wine & Chapters in Johannesburg, South Africa.",
            `If you have a question about your information, contact us at ${site.email}.`,
          ],
        },
        {
          title: "Information we collect",
          paragraphs: [
            "We may collect information you choose to provide, such as your name, email address, membership details, messages, event responses and book-club contributions. We also receive basic technical information needed to keep the website secure and working, such as device, browser and access details.",
            "Please avoid sharing sensitive personal information in public reviews, discussion areas or messages unless it is necessary for the conversation.",
          ],
        },
        {
          title: "How we use information",
          paragraphs: [
            "We use information to create and manage accounts, review membership applications, communicate with members, organise events, publish member content where you have chosen to share it, provide the reading-room assistant, and protect the website and community.",
            "Wine & Chapters is a non-profit community. We do not sell personal information or use it to build advertising profiles for third parties.",
          ],
        },
        {
          title: "When information is shared",
          paragraphs: [
            "We share information only when needed to operate the service, for example with trusted hosting, authentication, email, payment or infrastructure providers, or when required by law. Providers are expected to protect information and use it only for the service they provide.",
            "Member names, photographs, reviews or other contributions are shared publicly only where the relevant feature and your choices make that clear.",
          ],
        },
        {
          title: "Your choices and rights",
          paragraphs: [
            "You may ask us to access, correct or delete personal information we hold about you, or to explain how it is being used. You may also unsubscribe from non-essential messages. We will verify requests where appropriate and respond within the time required by applicable law, including South Africa's Protection of Personal Information Act (POPIA).",
            `To make a request, email ${site.email} with the subject “Privacy request”.`,
          ],
        },
        {
          title: "Retention and changes",
          paragraphs: [
            "We keep information only for as long as it is needed for the purpose collected, to maintain a safe membership record, or to meet legal and operational requirements. We may update this policy when the service changes. The date at the top will show when the latest version was published.",
          ],
        },
      ]}
    />
  );
}
