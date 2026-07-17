import { useActiveConversation } from "#/hooks/query/use-active-conversation";

/**
 * Returns whether the user explicitly attached a "source" to the active
 * conversation — i.e. picked a repository on the home page *or* picked a
 * local workspace folder. From the Files tab's point of view those two
 * cases are equivalent: both mean there's an existing working tree the
 * user came in to inspect, so the diff view is the more useful default.
 *
 * We deliberately do *not* probe the filesystem here — the agent-server
 * can initialise conversations without an explicit selection in generated git
 * worktrees, so a positive `git status` does not by itself imply the user
 * attached a real source. That's why we read the explicit selection signals
 * (`selected_repository` and `selected_workspace` on the conversation) instead.
 *
 * Both are hydrated in `toAppConversation`: `selected_repository` from stored
 * metadata, and `selected_workspace` from stored metadata *or* — when the
 * metadata is absent (e.g. the list loaded on a different device) — derived
 * from the server-reported `working_dir`. Reading them off the conversation
 * object (not the localStorage store directly) means this hook recovers the
 * attachment across devices, not just on the device that created the
 * conversation.
 */
export function useHasAttachedSource(): {
  hasAttachedSource: boolean;
  isLoading: boolean;
} {
  const { data: conversation, isLoading } = useActiveConversation();
  return {
    hasAttachedSource:
      !!conversation?.selected_repository || !!conversation?.selected_workspace,
    isLoading,
  };
}
