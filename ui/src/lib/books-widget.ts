export const BOOKS_WIDGET_OPEN_EVENT = "wine-and-chapters:books-widget-open";

export function openBooksWidget(): void {
  window.dispatchEvent(new Event(BOOKS_WIDGET_OPEN_EVENT));
}
