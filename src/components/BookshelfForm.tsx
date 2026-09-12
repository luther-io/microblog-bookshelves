import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createBookshelf, renameBookshelf, type Bookshelf } from "../api/microblog";
import { showError } from "../lib/errors";

interface Props {
  shelf?: Bookshelf;
  onDone: () => void;
}

export function BookshelfForm({ shelf, onDone }: Props): React.JSX.Element {
  const { pop } = useNavigation();
  const [name, setName] = useState(shelf?.title ?? "");
  const [nameError, setNameError] = useState<string | undefined>();

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: shelf ? "Renaming…" : "Creating…",
    });
    try {
      if (shelf) {
        await renameBookshelf(shelf.id, trimmed);
      } else {
        await createBookshelf(trimmed);
      }
      toast.style = Toast.Style.Success;
      toast.title = shelf ? "Bookshelf renamed" : "Bookshelf created";
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showError(shelf ? "Rename failed" : "Create failed", error);
    }
  }

  return (
    <Form
      navigationTitle={shelf ? `Rename “${shelf.title}”` : "New Bookshelf"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={shelf ? "Rename Bookshelf" : "Create Bookshelf"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Want to read"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (nameError && value.trim()) setNameError(undefined);
        }}
        autoFocus
      />
    </Form>
  );
}
