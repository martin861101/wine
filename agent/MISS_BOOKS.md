Implement a compact **“Meet Miss Books”** homepage section for Wine & Chapters.

* Use the new transparent Miss Books artwork provided as the main visual (ui/public/img/missbooks.png).
* Place the section after the member testimonials and before **This Month’s Read**.
* Give it a visually distinct soft pink/cream background with a subtle decorative paint/splash treatment consistent with the other alternating sections.
* Desktop: artwork and content side-by-side.
* Mobile: content first, artwork below, correctly scaled with no clipping.
* Heading: **Meet Miss Books**
* Copy: **Your bookish AI companion with access to the wider web. Discover your next read, compare prices, find trusted reviews, explore authors, check club events, and navigate Wine & Chapters—all through a simple conversation.**
* Add four compact capability items:

  * Find books and authors
  * Compare prices and availability
  * Discover reviews and recommendations
  * Explore club reads and events
* Add an **Ask Miss Books** CTA that opens the existing Books AI widget and focuses its input.
* Preserve **Books** as the widget’s compact label, but refer to the assistant as **Miss Books** everywhere else.
* Ensure the section does not make external API calls when loading.
* Miss Books should use live web search for external book information instead of Google Books. Clearly distinguish web results from Wine & Chapters/Supabase club data.
* Add accessible alt text, keyboard support, responsive styling and respect reduced-motion preferences.
* Remove any remaining Google Books API dependencies only if they are directly connected to the assistant’s book-search flow.
* Reuse existing theme components and styling patterns; do not redesign unrelated sections.
* Verify desktop and mobile layouts and run the existing lint/build checks.
