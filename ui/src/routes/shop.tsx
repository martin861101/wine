import { createFileRoute } from "@tanstack/react-router";

import { Section } from "@/components/site/section";
import { WatercolorSplash } from "@/components/site/watercolor-splash";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Wine & Chapters" },
      {
        name: "description",
        content:
          "The Wine & Chapters shop is coming soon, with books, reading favourites and lovely things for your next chapter.",
      },
      { property: "og:title", content: "Shop — Wine & Chapters" },
      {
        property: "og:description",
        content: "Something lovely is coming to Wine & Chapters.",
      },
    ],
  }),
  component: ShopComingSoonPage,
});

function ShopComingSoonPage() {
  return (
    <div className="shop-coming-soon">
      <WatercolorSplash side="left" />
      <WatercolorSplash side="right" />
      <Section className="flex justify-center py-16 sm:py-24">
        <div className="shop-coming-soon__card">
          <img
            src="/img/wine-chapters-logo-2-transparent.png"
            alt=""
            aria-hidden="true"
            width={144}
            height={96}
            className="mx-auto h-20 w-32 object-contain"
          />
          <p className="eyebrow mt-6">Wine &amp; Chapters Shop</p>
          <h1 className="mx-auto mt-5 max-w-xl text-4xl leading-tight tracking-tight sm:text-5xl">
            Something lovely is coming.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            Books, reading favourites and a few lovely things for your next chapter. We are
            preparing the shelves now.
          </p>
        </div>
      </Section>
    </div>
  );
}
