import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import mermaid, { type RenderResult } from "mermaid";

// `mermaid` is browser-only: its layout pass calls `getBBox`, which jsdom does
// not implement, so even a syntactically valid diagram rejects here. Mock the
// package and drive the component's real state machine through its branches —
// the promise plumbing and the error fallback are the code under test; the
// real mermaid library is exercised in the browser.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

const MermaidRenderer = React.lazy(
  () => import("#/components/features/markdown/mermaid-renderer"),
);

const SUCCESS_SVG = '<svg id="ok"><circle r="1" /></svg>';
const ARROW_CHART = "sequenceDiagram\nA->>B: hi";
const LAZY_TIMEOUT = 5000;

describe("MermaidRenderer", () => {
  afterEach(() => {
    vi.mocked(mermaid.render).mockReset();
  });

  it("renders the sanitized SVG once mermaid resolves", async () => {
    vi.mocked(mermaid.render).mockResolvedValueOnce({
      svg: SUCCESS_SVG,
    } as never);
    render(
      <React.Suspense fallback={null}>
        <MermaidRenderer chart={ARROW_CHART} />
      </React.Suspense>,
    );

    await waitFor(
      () => {
        const diagram = screen.getByTestId("mermaid-diagram");
        expect(diagram.querySelector("svg")).not.toBeNull();
      },
      { timeout: LAZY_TIMEOUT },
    );
    // The chart reaches mermaid intact; React's text escaping never applies
    // here because the diagram never renders as children.
    expect(mermaid.render).toHaveBeenCalledWith(
      expect.any(String),
      ARROW_CHART,
    );
  });

  it("falls back to the source when the diagram cannot be parsed", async () => {
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error("syntax error"));
    render(
      <React.Suspense fallback={null}>
        <MermaidRenderer chart={"sequenceDiagram\nA-x- B"} />
      </React.Suspense>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("mermaid-error")).toBeInTheDocument();
      },
      { timeout: LAZY_TIMEOUT },
    );
    // The source stays visible and copyable so the user can see what failed.
    expect(screen.getByTestId("copy-to-clipboard")).toBeInTheDocument();
  });

  it("falls back when mermaid resolves with its internal error diagram", async () => {
    vi.mocked(mermaid.render).mockResolvedValueOnce({
      svg: '<svg><g class="error"><text>Syntax error in text</text></g></svg>',
    } as RenderResult);
    render(
      <React.Suspense fallback={null}>
        <MermaidRenderer chart={"sequenceDiagram\nA-x- B"} />
      </React.Suspense>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("mermaid-error")).toBeInTheDocument();
      },
      { timeout: LAZY_TIMEOUT },
    );
  });

  it("removes the scratch node mermaid leaves in document.body", async () => {
    // Mermaid appends `<div id="d{renderId}">` to the page and only drops it on
    // success; on failure the error diagram would otherwise linger at the
    // bottom of the page.
    vi.mocked(mermaid.render).mockImplementation(async (id: string) => {
      const scratch = document.createElement("div");
      scratch.id = `d${id}`;
      scratch.textContent = "Syntax error in text";
      document.body.appendChild(scratch);
      throw new Error("syntax error");
    });
    render(
      <React.Suspense fallback={null}>
        <MermaidRenderer chart={"sequenceDiagram\nA-x- B"} />
      </React.Suspense>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId("mermaid-error")).toBeInTheDocument();
      },
      { timeout: LAZY_TIMEOUT },
    );
    expect(document.body.textContent).not.toContain("Syntax error in text");
  });
});
