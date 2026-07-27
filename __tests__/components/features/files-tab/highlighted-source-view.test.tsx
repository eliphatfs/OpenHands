import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { HighlightedSourceView } from "#/components/features/files-tab/highlighted-source-view";

// Stub the Prism wrapper so the test never runs the real tokenizer (slow, and
// not the unit under test). Record the props we forward so the "highlighted"
// branch asserts what we passed through. Use a distinct inner testid so it
// doesn't collide with the wrapper's own `file-content-viewer-highlighted`.
const highlighterMock = vi.fn();
vi.mock("#/components/features/markdown/syntax-highlighter", () => ({
  SyntaxHighlighter: (props: { language?: string; children?: string }) => {
    highlighterMock(props);
    return (
      <div data-testid="prism-mock-inner" data-language={props.language}>
        {props.children}
      </div>
    );
  },
}));

// Controlled language resolution: tests flip this to simulate "has a Prism
// grammar" vs "no grammar".
let mockLanguage: string | undefined = "json";
vi.mock("#/utils/file-language", () => ({
  getPrismLanguageForFile: () => mockLanguage,
}));

describe("HighlightedSourceView", () => {
  beforeEach(() => {
    highlighterMock.mockClear();
    mockLanguage = "json";
  });

  it("highlights a normal file when a Prism grammar is available", () => {
    render(<HighlightedSourceView path="src/config.json" text='{ "a": 1 }' />);

    expect(
      screen.getByTestId("file-content-viewer-highlighted"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("file-content-viewer-highlighted"),
    ).toHaveAttribute("data-language", "json");
    expect(highlighterMock).toHaveBeenCalledOnce();
  });

  it("falls back to a plain <pre> when no Prism grammar matches", () => {
    mockLanguage = undefined;
    render(<HighlightedSourceView path="weird.xyz" text="hello" />);

    expect(screen.getByTestId("file-content-viewer-plain")).toBeInTheDocument();
    expect(
      screen.queryByTestId("file-content-viewer-highlighted"),
    ).not.toBeInTheDocument();
    expect(highlighterMock).not.toHaveBeenCalled();
  });

  it("falls back to a plain <pre> for a single very long line (no re-tokenize)", () => {
    // Mirrors the real-world regression: a 90k-char one-line JSON made Prism
    // build ~26k span nodes on every render and freeze the chat input.
    const giant = " ".repeat(25_000);
    expect(giant.length).toBeGreaterThan(20_000);
    // single line — no newlines
    expect(giant.includes("\n")).toBe(false);

    render(<HighlightedSourceView path="big.json" text={giant} />);

    expect(screen.getByTestId("file-content-viewer-plain")).toBeInTheDocument();
    expect(
      screen.queryByTestId("file-content-viewer-highlighted"),
    ).not.toBeInTheDocument();
    expect(highlighterMock).not.toHaveBeenCalled();
  });

  it("falls back to a plain <pre> for a huge total file size even across many lines", () => {
    // Many short lines, but the total exceeds the size ceiling.
    const line = "x".repeat(1000);
    const huge = Array.from({ length: 300 }, () => line).join("\n");
    expect(huge.length).toBeGreaterThan(200_000);

    render(<HighlightedSourceView path="big.txt" text={huge} />);

    expect(screen.getByTestId("file-content-viewer-plain")).toBeInTheDocument();
    expect(highlighterMock).not.toHaveBeenCalled();
  });

  it("does not re-tokenize when re-rendered with identical props (memo)", () => {
    const text = '{ "a": 1 }';
    const { rerender } = render(
      <HighlightedSourceView path="src/config.json" text={text} />,
    );
    expect(highlighterMock).toHaveBeenCalledOnce();

    // Same props — memo should bail and Prism must NOT run again.
    rerender(<HighlightedSourceView path="src/config.json" text={text} />);
    expect(highlighterMock).toHaveBeenCalledOnce();

    // Different text — re-render is expected.
    rerender(
      <HighlightedSourceView path="src/config.json" text='{ "b": 2 }' />,
    );
    expect(highlighterMock).toHaveBeenCalledTimes(2);
  });
});
