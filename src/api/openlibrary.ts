const SEARCH_URL = "https://openlibrary.org/search.json";
const FIELDS = "key,title,author_name,isbn,cover_i,first_publish_year,editions,editions.isbn";

export interface SearchResult {
  key: string;
  title: string;
  authors: string[];
  isbn?: string;
  coverUrl?: string;
  year?: number;
  url: string;
}

interface SearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  first_publish_year?: number;
  editions?: { docs?: { isbn?: string[] }[] };
}

interface SearchResponse {
  docs?: SearchDoc[];
}

export function normalizeIsbn(input: string): string {
  return input.replace(/[-\s]/g, "").toUpperCase();
}

export function looksLikeIsbn(input: string): boolean {
  const cleaned = normalizeIsbn(input);
  return /^(\d{13}|\d{9}[\dX])$/.test(cleaned);
}

function pickIsbn(doc: SearchDoc): string | undefined {
  const candidates = [...(doc.editions?.docs?.flatMap((e) => e.isbn ?? []) ?? []), ...(doc.isbn ?? [])];
  return candidates.find((i) => /^97[89]\d{10}$/.test(i)) ?? candidates.find((i) => /^\d{9}[\dX]$/.test(i));
}

export function coverUrlFor(isbn: string | undefined, size: "S" | "M" | "L" = "M"): string | undefined {
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg` : undefined;
}

export async function searchBooks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams({ fields: FIELDS, limit: "25" });
  if (looksLikeIsbn(trimmed)) {
    params.set("isbn", normalizeIsbn(trimmed));
  } else {
    params.set("q", trimmed);
  }
  const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    signal,
    headers: { "User-Agent": "raycast-microblog-bookshelves (https://luther.io)" },
  });
  if (!response.ok) throw new Error(`Open Library returned ${response.status}`);
  const data = (await response.json()) as SearchResponse;
  return (data.docs ?? []).map((doc) => {
    const isbn = pickIsbn(doc);
    return {
      key: doc.key,
      title: doc.title,
      authors: doc.author_name ?? [],
      isbn,
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : coverUrlFor(isbn),
      year: doc.first_publish_year,
      url: `https://openlibrary.org${doc.key}`,
    };
  });
}
