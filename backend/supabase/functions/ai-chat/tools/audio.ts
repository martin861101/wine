import type { RegisteredTool } from "./types.ts";
import { objectArgs, optionalString, requiredString } from "./validation.ts";

export const findAudioTool: RegisteredTool = {
  declaration: {
    name: "find_audio",
    description:
      "Find a legitimate Spotify destination for an audiobook. Use only when the member asks for audio or accepts an audio offer; never claim playback has begun.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        author: { type: "STRING" },
      },
      required: ["title"],
    },
  },
  execute(args) {
    const record = objectArgs(args);
    const title = requiredString(record, "title", 1, 180);
    const author = optionalString(record, "author", 140);
    const query = [title, author, "audiobook"].filter(Boolean).join(" ");
    const url = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
    return {
      output: {
        found: true,
        provider: "spotify",
        note: "This is a Spotify search destination. The member must choose and start available content.",
      },
      action: {
        type: "SHOW_AUDIO",
        title,
        ...(author ? { author } : {}),
        url,
        provider: "spotify",
      },
    };
  },
};
