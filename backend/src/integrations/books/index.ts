import type { BookProvider } from "./BookProvider";
import { OpenLibraryProvider } from "./OpenLibraryProvider";

export function getBookProvider(): BookProvider {
  return new OpenLibraryProvider();
}
