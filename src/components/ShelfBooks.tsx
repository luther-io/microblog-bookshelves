import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { assignBook, listBooks, moveBook, removeBook, type Book, type Bookshelf } from "../api/microblog";
import { showError } from "../lib/errors";
import { AddBookForm } from "./AddBookForm";
import { CoverForm } from "./CoverForm";

interface Props {
  shelf: Bookshelf;
  shelves: Bookshelf[];
  onChanged: () => void;
}

export function ShelfBooks({ shelf, shelves, onChanged }: Props): React.JSX.Element {
  const { data, isLoading, revalidate } = useCachedPromise(listBooks, [shelf.id], {
    onError: (error) => void showError("Could not load books", error),
  });
  const books = data ?? [];
  const otherShelves = shelves.filter((s) => s.id !== shelf.id);

  function refresh(): void {
    revalidate();
    onChanged();
  }

  async function runAction(title: string, success: string, task: () => Promise<void>): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await task();
      toast.style = Toast.Style.Success;
      toast.title = success;
      refresh();
    } catch (error) {
      toast.hide();
      await showError(`${title.replace("…", "")} failed`, error);
    }
  }

  async function remove(book: Book): Promise<void> {
    const confirmed = await confirmAlert({
      title: `Remove “${book.title}”?`,
      message: `This removes the book from “${shelf.title}” on Micro.blog.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await runAction("Removing…", "Book removed", () => removeBook(shelf.id, book.id));
  }

  const addAction = (
    <Action.Push
      title="Add Book to This Shelf…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddBookForm shelves={shelves} defaultShelfId={shelf.id} onDone={refresh} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={shelf.title}
      searchBarPlaceholder={`Search ${shelf.title}…`}
      isShowingDetail={books.length > 0}
    >
      <List.EmptyView
        icon={Icon.Book}
        title={isLoading ? "Loading…" : "No books on this shelf"}
        description="Press ⌘N to add one by hand, or use the Add Book command to search Open Library."
        actions={<ActionPanel>{addAction}</ActionPanel>}
      />
      {books.map((book) => (
        <List.Item
          key={book.id}
          icon={book.image ?? Icon.Book}
          title={book.title}
          subtitle={book.authors.join(", ")}
          keywords={[...book.authors, book.isbn ?? ""]}
          detail={<BookDetail book={book} shelf={shelf} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open on Micro.blog" url={book.url} />
                {otherShelves.length > 0 && (
                  <ActionPanel.Submenu
                    title="Move to Shelf"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  >
                    {otherShelves.map((target) => (
                      <Action
                        key={target.id}
                        title={target.title}
                        icon={Icon.Bookmark}
                        onAction={() =>
                          runAction("Moving…", `Moved to ${target.title}`, () => moveBook(shelf.id, target.id, book.id))
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                {otherShelves.length > 0 && (
                  <ActionPanel.Submenu
                    title="Copy to Shelf"
                    icon={Icon.Duplicate}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  >
                    {otherShelves.map((target) => (
                      <Action
                        key={target.id}
                        title={target.title}
                        icon={Icon.Bookmark}
                        onAction={() =>
                          runAction("Copying…", `Copied to ${target.title}`, () => assignBook(target.id, book.id))
                        }
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                <Action.Push
                  title="Set Cover…"
                  icon={Icon.Image}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                  target={<CoverForm shelfId={shelf.id} book={book} onDone={refresh} />}
                />
                <Action
                  title="Remove from Shelf"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(book)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {book.isbn && (
                  <Action.CopyToClipboard
                    title="Copy ISBN"
                    content={book.isbn}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                )}
                <Action.CopyToClipboard title="Copy Title" content={book.title} />
                <Action.CopyToClipboard
                  title="Copy Markdown Link"
                  content={`[${book.title}](${book.url})${book.authors.length ? ` by ${book.authors.join(", ")}` : ""}`}
                />
                {book.isbn && (
                  <Action.OpenInBrowser
                    title="Open on Open Library"
                    url={`https://openlibrary.org/isbn/${book.isbn}`}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function BookDetail({ book, shelf }: { book: Book; shelf: Bookshelf }): React.JSX.Element {
  const markdown = book.image ? `![${book.title}](${book.image})` : `# ${book.title}`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Title" text={book.title} />
          {book.authors.length > 0 && <List.Item.Detail.Metadata.Label title="Author" text={book.authors.join(", ")} />}
          {book.isbn && <List.Item.Detail.Metadata.Label title="ISBN" text={book.isbn} />}
          <List.Item.Detail.Metadata.TagList title="Shelf">
            <List.Item.Detail.Metadata.TagList.Item text={shelf.title} color={Color.Orange} />
          </List.Item.Detail.Metadata.TagList>
          {book.dateAdded && (
            <List.Item.Detail.Metadata.Label title="Added" text={new Date(book.dateAdded).toLocaleDateString()} />
          )}
          <List.Item.Detail.Metadata.Link title="Micro.blog" text="Open" target={book.url} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
