import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { setCover, type Book } from "../api/microblog";
import { coverUrlFor } from "../api/openlibrary";
import { showError } from "../lib/errors";

interface Props {
  shelfId: number;
  book: Book;
  onDone: () => void;
}

export function CoverForm({ shelfId, book, onDone }: Props): React.JSX.Element {
  const { pop } = useNavigation();
  const [url, setUrl] = useState(book.image ?? coverUrlFor(book.isbn, "L") ?? "");

  async function submit(): Promise<void> {
    const trimmed = url.trim();
    if (!/^https?:\/\//.test(trimmed)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter an http(s) URL" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating cover…" });
    try {
      await setCover(shelfId, book.id, trimmed);
      toast.style = Toast.Style.Success;
      toast.title = "Cover updated";
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showError("Cover update failed", error);
    }
  }

  return (
    <Form
      navigationTitle={`Cover for “${book.title}”`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Cover" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Changes the cover on your copy only. Open Library covers are prefilled when an ISBN is known." />
      <Form.TextField id="coverUrl" title="Cover URL" value={url} onChange={setUrl} autoFocus />
    </Form>
  );
}
