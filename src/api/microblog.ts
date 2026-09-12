import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://micro.blog";

export type ShelfType = "reading" | "to-read" | "finished" | "dnf" | "loans" | "holds" | (string & {});

export interface Bookshelf {
  id: number;
  title: string;
  url: string;
  booksCount: number;
  type: ShelfType;
}

export interface Book {
  id: number;
  title: string;
  url: string;
  image?: string;
  authors: string[];
  isbn?: string;
  dateAdded: string;
}

export interface ReadingGoal {
  id: number;
  title: string;
  url: string;
  year?: number;
  value: number;
  progress: number;
}

export interface NewBook {
  title: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
  bookshelfId: number;
}

interface JsonFeed<Item> {
  items?: Item[];
}

interface ShelfItem {
  id: number;
  title: string;
  url: string;
  date_published?: string;
  _microblog?: { books_count?: number; type?: string };
}

interface BookItem {
  id: number;
  title: string;
  url: string;
  image?: string;
  date_published?: string;
  authors?: { name?: string }[];
  _microblog?: { isbn?: string; author_id?: number };
}

interface GoalItem {
  id: number;
  title?: string;
  url?: string;
  _microblog?: { year?: number; value?: number; progress?: number; goal?: number };
}

export class MicroblogError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MicroblogError";
  }
}

function appToken(): string {
  return getPreferenceValues<Preferences>().appToken.trim();
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${appToken()}`,
      Accept: "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    const detail = text.slice(0, 200) || response.statusText;
    const hint = response.status === 401 ? "Check your app token in the extension preferences. " : "";
    throw new MicroblogError(response.status, `${hint}Micro.blog returned ${response.status}: ${detail}`);
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

function formBody(fields: Record<string, string | number | undefined>): RequestInit {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  };
}

export async function listBookshelves(): Promise<Bookshelf[]> {
  const feed = await request<JsonFeed<ShelfItem>>("/books/bookshelves");
  return (feed?.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    booksCount: item._microblog?.books_count ?? 0,
    type: item._microblog?.type ?? "",
  }));
}

export async function listBooks(shelfId: number): Promise<Book[]> {
  const feed = await request<JsonFeed<BookItem>>(`/books/bookshelves/${shelfId}`);
  return (feed?.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    image: item.image || undefined,
    authors: (item.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
    isbn: item._microblog?.isbn || undefined,
    dateAdded: item.date_published ?? "",
  }));
}

export async function createBookshelf(name: string): Promise<void> {
  await request("/books/bookshelves", formBody({ name }));
}

export async function renameBookshelf(shelfId: number, name: string): Promise<void> {
  await request(`/books/bookshelves/${shelfId}`, formBody({ name }));
}

export async function addBook(book: NewBook): Promise<void> {
  await request(
    "/books",
    formBody({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      cover_url: book.coverUrl,
      bookshelf_id: book.bookshelfId,
    }),
  );
}

/** Micro.blog's assign endpoint copies or moves depending on context. */
export async function assignBook(shelfId: number, bookId: number): Promise<void> {
  await request(`/books/bookshelves/${shelfId}/assign`, formBody({ book_id: bookId }));
}

export async function removeBook(shelfId: number, bookId: number): Promise<void> {
  await request(`/books/bookshelves/${shelfId}/remove/${bookId}`, { method: "DELETE" });
}

/** Assign to the target shelf, then remove from the source if Micro.blog left a copy behind. */
export async function moveBook(fromShelfId: number, toShelfId: number, bookId: number): Promise<void> {
  await assignBook(toShelfId, bookId);
  const remaining = await listBooks(fromShelfId);
  if (remaining.some((book) => book.id === bookId)) {
    await removeBook(fromShelfId, bookId);
  }
}

export async function setCover(shelfId: number, bookId: number, coverUrl: string): Promise<void> {
  await request(`/books/bookshelves/${shelfId}/cover/${bookId}`, formBody({ cover_url: coverUrl }));
}

function toGoal(item: GoalItem): ReadingGoal {
  const meta = item._microblog ?? {};
  return {
    id: item.id,
    title: item.title ?? String(meta.year ?? item.id),
    url: item.url ?? "https://micro.blog/account/bookshelves",
    year: meta.year,
    value: meta.value ?? meta.goal ?? 0,
    progress: meta.progress ?? 0,
  };
}

export async function listGoals(): Promise<ReadingGoal[]> {
  const feed = await request<JsonFeed<GoalItem>>("/books/goals");
  return (feed?.items ?? []).map(toGoal);
}

export async function updateGoal(goalId: number, value: number, progress?: number): Promise<void> {
  await request(`/books/goals/${goalId}`, formBody({ value, progress }));
}
