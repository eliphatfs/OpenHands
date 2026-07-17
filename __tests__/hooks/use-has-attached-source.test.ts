import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useHasAttachedSource } from "#/hooks/use-has-attached-source";

const useActiveConversationMock = vi.fn();

vi.mock("#/hooks/query/use-active-conversation", () => ({
  useActiveConversation: () => useActiveConversationMock(),
}));

describe("useHasAttachedSource", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useActiveConversationMock.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns true when the conversation has a selected_repository", () => {
    useActiveConversationMock.mockReturnValue({
      data: {
        id: "conv-1",
        selected_repository: "octocat/hello-world",
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useHasAttachedSource());

    expect(result.current.hasAttachedSource).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns true when the conversation carries selected_workspace directly (no repo)", () => {
    useActiveConversationMock.mockReturnValue({
      data: {
        id: "conv-2",
        selected_repository: null,
        selected_workspace: "/home/me/code/foo",
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useHasAttachedSource());

    expect(result.current.hasAttachedSource).toBe(true);
  });

  it("recovers the attachment across devices via the conversation object, not localStorage", () => {
    // Cross-device scenario: this device's localStorage is empty (it never
    // created the conversation), but toAppConversation derived
    // selected_workspace from the server-reported working_dir and stamped it
    // onto the conversation object. The hook reads the conversation field, so
    // the Files tab defaults to diff view here too.
    window.localStorage.setItem(
      "openhands-agent-server-conversation-metadata",
      JSON.stringify({}),
    );

    useActiveConversationMock.mockReturnValue({
      data: {
        id: "conv-remote",
        selected_repository: null,
        selected_workspace: "/workspace/agent-canvas",
      },
      isLoading: false,
    });

    const { result } = renderHook(() => useHasAttachedSource());

    expect(result.current.hasAttachedSource).toBe(true);
  });

  it("returns false when neither a repo nor a workspace is attached", () => {
    useActiveConversationMock.mockReturnValue({
      data: { id: "conv-3", selected_repository: null },
      isLoading: false,
    });

    const { result } = renderHook(() => useHasAttachedSource());

    expect(result.current.hasAttachedSource).toBe(false);
  });

  it("propagates the active-conversation isLoading flag", () => {
    useActiveConversationMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useHasAttachedSource());

    expect(result.current.hasAttachedSource).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
