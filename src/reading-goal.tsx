import { Action, ActionPanel, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listGoals, updateGoal, type ReadingGoal } from "./api/microblog";
import { showError } from "./lib/errors";

export default function Command(): React.JSX.Element {
  const { data, isLoading, revalidate } = useCachedPromise(listGoals, [], {
    onError: (error) => void showError("Could not load reading goals", error),
  });
  const goals = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search goals…">
      <List.EmptyView
        icon={Icon.Trophy}
        title={isLoading ? "Loading…" : "No reading goals"}
        description="Set a yearly goal on micro.blog/account/bookshelves first."
      />
      {goals.map((goal) => {
        const pct = goal.value > 0 ? Math.min(100, Math.round((goal.progress / goal.value) * 100)) : 0;
        return (
          <List.Item
            key={goal.id}
            icon={Icon.Trophy}
            title={goal.title}
            subtitle={goal.year ? String(goal.year) : undefined}
            accessories={[{ text: `${goal.progress} / ${goal.value}` }, { tag: `${pct}%` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Goal…"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<GoalForm goal={goal} onDone={revalidate} />}
                />
                <Action.OpenInBrowser title="Open on Micro.blog" url={goal.url} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function GoalForm({ goal, onDone }: { goal: ReadingGoal; onDone: () => void }): React.JSX.Element {
  const { pop } = useNavigation();
  const [value, setValue] = useState(String(goal.value || ""));
  const [progress, setProgress] = useState("");

  async function submit(): Promise<void> {
    const target = Number.parseInt(value, 10);
    if (!Number.isFinite(target) || target < 0) {
      await showToast({ style: Toast.Style.Failure, title: "Goal must be a whole number" });
      return;
    }
    const manualProgress = progress.trim() ? Number.parseInt(progress, 10) : undefined;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Updating goal…" });
    try {
      await updateGoal(goal.id, target, manualProgress);
      toast.style = Toast.Style.Success;
      toast.title = "Goal updated";
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showError("Update failed", error);
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${goal.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Goal" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="value" title="Books to read" value={value} onChange={setValue} autoFocus />
      <Form.TextField
        id="progress"
        title="Progress override"
        placeholder="Leave blank — Micro.blog tracks this automatically"
        value={progress}
        onChange={setProgress}
      />
    </Form>
  );
}
