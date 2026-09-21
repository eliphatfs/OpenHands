import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";

import { code as Code } from "#/components/features/markdown/code";

// The lazy renderer chunk pulls in the real `mermaid` npm package, which is
// browser-only (its layout pass needs `getBBox`, which jsdom lacks). Stub the
// whole module so this test exercises the dispatch in `code.tsx` without ever
// loading it.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

vi.mock("./mermaid-renderer", () => ({
  default: function FakeRenderer({ chart }: { chart: string }) {
    return <div data-testid="fake-renderer">{chart}</div>;
  },
}));

describe("code (markdown) mermaid dispatch", () => {

  it("renders a `mermaid` fence as a diagram block, not a syntax-highlighted block", () => {
    render(<Code className="language-mermaid">{"graph TD\nA-->B"}</Code>);

    expect(screen.getByTestId("mermaid-block")).toBeInTheDocument();
    // The source still ships as the Suspense fallback while the renderer chunk
    // loads, so the raw diagram text stays visible (and unescaped) for the user.
    const fallback = screen.getByTestId("mermaid-loading");
    expect(fallback.textContent).toContain("A-->B");
    // A diagram is a picture, not a copyable blob of source.
    expect(screen.queryByTestId("copy-to-clipboard")).not.toBeInTheDocument();
  });

  it("keeps highlighter behavior for other languages", () => {
    render(<Code className="language-js">{"console.log('hi')"}</Code>);

    expect(screen.getByTestId("copy-to-clipboard")).toBeInTheDocument();
    expect(screen.queryByTestId("mermaid-block")).not.toBeInTheDocument();
  });

  it("keeps inline and unmarked blocks untouched", () => {
    render(<Code>{"inline"}</Code>);
    expect(screen.getByText("inline")).toBeInTheDocument();
    expect(screen.queryByTestId("mermaid-block")).not.toBeInTheDocument();
  });
});
