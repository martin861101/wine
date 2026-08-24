export interface BookSearchResult {
  externalProvider: string;
  externalId: string;
  title: string;
  subtitle?: string;
  author: string;
  description?: string;
  isbn10?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  categories: string[];
  coverUrl?: string;
  metadata: Record<string, unknown>;
}

export interface BookProvider {
  searchBooks(query: string): Promise<BookSearchResult[]>;
  getBook(id: string): Promise<BookSearchResult | null>;
}
