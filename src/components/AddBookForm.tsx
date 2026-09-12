import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addBook, type Bookshelf } from "../api/microblog";
import { coverUrlFor, looksLikeIsbn, normalizeIsbn } from "../api/openlibrary";
import { showError } from "../lib/errors";

export interface BookDraft {
  title?: string;
  author?: string;
  isbn?: string;
  coverUrl?: string;
}

interface Props {
  shelves: Bookshelf[];
  defaultShelfId?: number;
  draft?: BookDraft;
  onDone: () => void;
}

export function AddBookForm({ shelves, defaultShelfId, draft, onDone }: Props): React.JSX.Element {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(draft?.title ?? "");
  const [author, setAuthor] = useState(draft?.author ?? "");
  const [isbn, setIsbn] = useState(draft?.isbn ?? "");
  const [coverUrl, setCoverUrl] = useState(draft?.coverUrl ?? "");
  const [shelfId, setShelfId] = useState(String(defaultShelfId ?? shelves[0]?.id ?? ""));
  const [titleError, setTitleError] = useState<string | undefined>();
  const [isbnError, setIsbnError] = useState<string | undefined>();

  function validate(): boolean {
    let ok = true;
    if (!title.trim()) {
      setTitleError("Title is required");
      ok = false;
    }
    if (isbn.trim() && !looksLikeIsbn(isbn)) {
      setIsbnError("Enter a 10 or 13 digit ISBN, or leave blank");
      ok = false;
    }
    if (!shelfId) {
      void showToast({ style: Toast.Style.Failure, title: "Pick a bookshelf" });
      ok = false;
    }
    return ok;
  }

  async function submit(): Promise<void> {
    if (!validate()) return;
    const shelf = shelves.find((s) => String(s.id) === shelfId);
    const cleanIsbn = isbn.trim() ? normalizeIsbn(isbn) : undefined;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Adding to ${shelf?.title ?? "shelf"}…`,
    });
    try {
      await addBook({
        title: title.trim(),
        author: author.trim() || undefined,
        isbn: cleanIsbn,
        coverUrl: coverUrl.trim() || coverUrlFor(cleanIsbn, "L"),
        bookshelfId: Number(shelfId),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Added “${title.trim()}”`;
      toast.message = shelf?.title;
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showError("Add failed", error);
    }
  }

  return (
    <Form
      navigationTitle="Add Book"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Book" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Project Hail Mary"
        value={title}
        error={titleError}
        onChange={(v) => {
          setTitle(v);
          if (titleError && v.trim()) setTitleError(undefined);
        }}
        autoFocus
      />
      <Form.TextField id="author" title="Author" placeholder="Andy Weir" value={author} onChange={setAuthor} />
      <Form.TextField
        id="isbn"
        title="ISBN"
        placeholder="9780593395561 (optional, used to find the cover)"
        value={isbn}
        error={isbnError}
        onChange={(v) => {
          setIsbn(v);
          if (isbnError) setIsbnError(undefined);
        }}
      />
      <Form.TextField
        id="coverUrl"
        title="Cover URL"
        placeholder="Optional. Defaults to the Open Library cover for the ISBN"
        value={coverUrl}
        onChange={setCoverUrl}
      />
      <Form.Dropdown id="shelf" title="Bookshelf" value={shelfId} onChange={setShelfId}>
        {shelves.map((shelf) => (
          <Form.Dropdown.Item key={shelf.id} value={String(shelf.id)} title={shelf.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
