import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listBookshelves, type Bookshelf, type ShelfType } from "./api/microblog";
import { BookshelfForm } from "./components/BookshelfForm";
import { ShelfBooks } from "./components/ShelfBooks";
import { showError } from "./lib/errors";

const SHELF_ICONS: Record<string, { icon: Icon; color: Color }> = {
  reading: { icon: Icon.Book, color: Color.Green },
  "to-read": { icon: Icon.Bookmark, color: Color.Blue },
  finished: { icon: Icon.CheckCircle, color: Color.Purple },
  dnf: { icon: Icon.XMarkCircle, color: Color.Red },
  loans: { icon: Icon.ArrowRight, color: Color.Orange },
  holds: { icon: Icon.Clock, color: Color.Yellow },
};

function shelfIcon(type: ShelfType): { source: Icon; tintColor: Color } {
  const entry = SHELF_ICONS[type] ?? { icon: Icon.List, color: Color.SecondaryText };
  return { source: entry.icon, tintColor: entry.color };
}

export default function Command(): React.JSX.Element {
  const { data, isLoading, revalidate } = useCachedPromise(listBookshelves, [], {
    onError: (error) => void showError("Could not load bookshelves", error),
  });
  const shelves: Bookshelf[] = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookshelves…">
      <List.EmptyView
        icon={Icon.Book}
        title={isLoading ? "Loading…" : "No bookshelves"}
        description="Create one with ⌘N."
        actions={
          <ActionPanel>
            <NewShelfAction onDone={revalidate} />
          </ActionPanel>
        }
      />
      {shelves.map((shelf) => (
        <List.Item
          key={shelf.id}
          icon={shelfIcon(shelf.type)}
          title={shelf.title}
          subtitle={shelf.type || undefined}
          accessories={[{ text: `${shelf.booksCount}`, icon: Icon.Book, tooltip: "Books on shelf" }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Books"
                  icon={Icon.List}
                  target={<ShelfBooks shelf={shelf} shelves={shelves} onChanged={revalidate} />}
                />
                <Action.OpenInBrowser title="Open on Micro.blog" url={shelf.url} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <NewShelfAction onDone={revalidate} />
                <Action.Push
                  title="Rename Bookshelf…"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<BookshelfForm shelf={shelf} onDone={revalidate} />}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Shelf URL"
                  content={shelf.url}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function NewShelfAction({ onDone }: { onDone: () => void }): React.JSX.Element {
  return (
    <Action.Push
      title="New Bookshelf…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<BookshelfForm onDone={onDone} />}
    />
  );
}
