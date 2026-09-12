import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { addBook, listBookshelves, type Bookshelf } from "./api/microblog";
import { searchBooks, type SearchResult } from "./api/openlibrary";
import { AddBookForm } from "./components/AddBookForm";
import { showError } from "./lib/errors";

export default function Command(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const shelvesState = useCachedPromise(listBookshelves, [], {
    onError: (error) => void showError("Could not load bookshelves", error),
  });
  const shelves: Bookshelf[] = shelvesState.data ?? [];

  const abortable = useRef<AbortController>(null);
  const { data, isLoading } = usePromise(async (q: string) => searchBooks(q, abortable.current?.signal), [query], {
    abortable,
    execute: query.trim().length > 1,
    onError: (error) => {
      if (error.name !== "AbortError") void showError("Open Library search failed", error);
    },
  });
  const results = query.trim().length > 1 ? (data ?? []) : [];

  function manualAddAction(result?: SearchResult): React.JSX.Element {
    return (
      <Action.Push
        title={result ? "Edit and Add…" : "Add Manually…"}
        icon={result ? Icon.Pencil : Icon.Plus}
        shortcut={result ? Keyboard.Shortcut.Common.Edit : Keyboard.Shortcut.Common.New}
        target={
          <AddBookForm
            shelves={shelves}
            draft={
              result
                ? {
                    title: result.title,
                    author: result.authors.join(", "),
                    isbn: result.isbn,
                    coverUrl: result.coverUrl,
                  }
                : { title: query.trim() }
            }
            onDone={shelvesState.revalidate}
          />
        }
      />
    );
  }

  async function add(result: SearchResult, shelf: Bookshelf): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding to ${shelf.title}…`,
    });
    try {
      await addBook({
        title: result.title,
        author: result.authors.join(", ") || undefined,
        isbn: result.isbn,
        coverUrl: result.coverUrl,
        bookshelfId: shelf.id,
      });
      toast.style = Toast.Style.Success;
      toast.title = `Added “${result.title}”`;
      toast.message = shelf.title;
      shelvesState.revalidate();
    } catch (error) {
      toast.hide();
      await showError("Add failed", error);
    }
  }

  return (
    <List
      isLoading={isLoading || shelvesState.isLoading}
      searchBarPlaceholder="Search Open Library by title, author, or ISBN…"
      onSearchTextChange={setQuery}
      throttle
      filtering={false}
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.trim().length > 1 ? (isLoading ? "Searching…" : "No results") : "Search for a book"}
        description="Results come from Open Library. Pick one and choose a shelf, or press ⌘N to add a book by hand."
        actions={
          <ActionPanel>
            {manualAddAction()}
            <Action title="Reload Bookshelves" icon={Icon.ArrowClockwise} onAction={shelvesState.revalidate} />
          </ActionPanel>
        }
      />
      {results.map((result) => (
        <List.Item
          key={result.key}
          icon={result.coverUrl ?? Icon.Book}
          title={result.title}
          subtitle={result.authors.join(", ")}
          accessories={[
            ...(result.year ? [{ text: String(result.year), tooltip: "First published" }] : []),
            ...(result.isbn
              ? [{ tag: result.isbn, tooltip: "ISBN" }]
              : [{ tag: { value: "no ISBN", color: "#999999" } }]),
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {shelves.length > 0 ? (
                  <ActionPanel.Submenu title="Add to Shelf" icon={Icon.Plus}>
                    {shelves.map((shelf) => (
                      <Action
                        key={shelf.id}
                        title={shelf.title}
                        icon={Icon.Bookmark}
                        onAction={() => add(result, shelf)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                ) : (
                  <Action title="Reload Bookshelves" icon={Icon.ArrowClockwise} onAction={shelvesState.revalidate} />
                )}
                {manualAddAction(result)}
                <Action.OpenInBrowser title="Open on Open Library" url={result.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>{manualAddAction()}</ActionPanel.Section>
              <ActionPanel.Section>
                {result.isbn && (
                  <Action.CopyToClipboard
                    title="Copy ISBN"
                    content={result.isbn}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                )}
                <Action.CopyToClipboard title="Copy Title" content={result.title} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
