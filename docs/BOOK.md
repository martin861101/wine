**Implement a “Modern Book Cover” component inspired by cuicui.day/other/books.**

Goal:
Create a reusable 3D book-cover component with:
- size variants: sm, md, lg
- radius variants: sm, md, lg
- color variants: at least neutral, amber, blue, plus the broader palette from the source
- hover rotation around the Y axis
- front face, spine, and back face
- composable subcomponents for title/header/description

Use this public API:
- ModernBookCover
  - props:
    - size?: "sm" | "md" | "lg"
    - radius?: "sm" | "md" | "lg"
    - color?: string
    - isStatic?: boolean
    - className?: string
    - children: ReactNode
- BookHeader
- BookTitle
- BookDescription

Implementation requirements:
- Match the 3D card illusion using CSS transforms and perspective
- Front face should use a gradient background
- Spine should be a separate absolutely positioned element
- Back face should sit behind the front face
- Hover should animate smoothly to rotateY(-30deg)
- Default styling should resemble a polished product component, not a generic card
- Use Tailwind utilities where appropriate
- Keep the component self-contained and reusable
- Avoid external image assets
- Include a small preview/demo with 3 examples:
  - size="sm" color="neutral" title “Cuicui”
  - size="md" color="amber" title “Cuicui”
  - size="lg" color="blue" title “Modul”

Suggested file structure:
- src/components/modern-book-cover.tsx
- src/components/modern-book-cover-preview.tsx

**Code & Installation:**

1. npm install lucide-react

2. import {
  ModernBookCover,
  BookHeader,
  BookTitle,
  BookDescription,
} from "@/cuicui/other/books/modern-book-cover/modern-book-cover";
import { BookIcon } from "lucide-react";

export function ModernBookCoverPreview() {
  return (
    <div className="flex flex-col gap-8 p-12">
      <ModernBookCover size="sm" color="neutral">
        <BookHeader>
          <BookIcon size={20} />
        </BookHeader>
        <BookTitle>Cuicui</BookTitle>
        <BookDescription>
          Learn CSS, by the creator of the language.
        </BookDescription>
      </ModernBookCover>
      <ModernBookCover size="md" color="amber">
        <BookHeader>
          <BookIcon size={20} />
        </BookHeader>
        <BookTitle>Cuicui</BookTitle>
        <BookDescription>
          Learn CSS, by the creator of the language.
        </BookDescription>
      </ModernBookCover>
      <ModernBookCover size="lg" color="blue">
        <BookHeader>
          <BookIcon size={20} />
        </BookHeader>
        <BookTitle>Modul</BookTitle>
        <BookDescription>The best all in one productivity tool</BookDescription>
      </ModernBookCover>
    </div>
  );
}

export default ModernBookCoverPreview;
