import { lazy, useMemo } from "react";
import { TabWrapper } from "./tab-wrapper";
import { TabContainer } from "./tab-container";
import { TabContentArea } from "./tab-content-area";
import { ConversationTabContentCrossfade } from "./conversation-tab-content-crossfade";
import { useConversationStore } from "#/stores/conversation-store";
import { useConversationId } from "#/hooks/use-conversation-id";

// Lazy load all tab components, including the terminal — xterm + addon-fit +
// xterm.css are large enough that we don't want them in the conversation
// route's eager graph just because the terminal tab might be selected later.
const FilesTab = lazy(() => import("#/routes/files-tab"));
const BrowserTab = lazy(() => import("#/routes/browser-tab"));
const PlannerTab = lazy(() => import("#/routes/planner-tab"));
const TaskListTab = lazy(() => import("#/routes/task-list-tab"));
const Terminal = lazy(() => import("#/components/features/terminal/terminal"));

const TAB_CONFIG = {
  tasklist: { component: TaskListTab },
  files: { component: FilesTab },
  browser: { component: BrowserTab },
  terminal: { component: Terminal },
  planner: { component: PlannerTab },
};

export function ConversationTabContent() {
  // Scope the store subscription to exactly the slices this component reads.
  // A bare `useConversationStore()` subscribes to the *entire* store, so
  // unrelated state churn (notably `messageToSend`, which the chat input
  // updates on every keystroke) would re-render this whole subtree —
  // including the lazily-mounted FilesTab and its (un-memoized) Prism
  // syntax highlighter. That re-rendered the Files tab's file contents on
  // every keystroke, which re-tokenized large single-line files (e.g. a
  // 90k-char minified JSON) and caused multi-second input lag.
  const selectedTab = useConversationStore((s) => s.selectedTab);
  const shouldShownAgentLoading = useConversationStore(
    (s) => s.shouldShownAgentLoading,
  );
  const { conversationId } = useConversationId();

  const activeTab = useMemo(
    () =>
      TAB_CONFIG[selectedTab as keyof typeof TAB_CONFIG] ?? TAB_CONFIG.files,
    [selectedTab],
  );

  const ActiveComponent = activeTab.component;

  const tabWrapperKey =
    selectedTab === "terminal"
      ? `${selectedTab}-${conversationId}`
      : (selectedTab ?? "files");

  return (
    <TabContainer>
      <TabContentArea>
        <ConversationTabContentCrossfade
          showAgentLoading={shouldShownAgentLoading}
          tabKey={tabWrapperKey}
        >
          <TabWrapper key={tabWrapperKey}>
            <ActiveComponent />
          </TabWrapper>
        </ConversationTabContentCrossfade>
      </TabContentArea>
    </TabContainer>
  );
}
