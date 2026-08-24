export interface VideoAsset {
  src: string;
  caption: string;
}

export const aboutStoryVideos = [
  {
    src: "/videos/1.mp4",
    caption: "A quiet place to slow down and find yourself in a story.",
  },
  {
    src: "/videos/2.mp4",
    caption: "The feeling of a good book is better when it is shared.",
  },
  {
    src: "/videos/3.mp4",
    caption: "Connection is the chapter that keeps unfolding.",
  },
  {
    src: "/videos/4.mp4",
    caption: "There is room at the table for every kind of reader.",
  },
  {
    src: "/videos/5.mp4",
    caption: "The next chapter begins whenever you are ready to join us.",
  },
] as const satisfies readonly VideoAsset[];
