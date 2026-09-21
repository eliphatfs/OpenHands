import React from "react";

// Declared at module scope: `React.lazy` must not be created during render (a
// fresh lazy component per render would reset its own Suspense state), and the
// dynamic import is what keeps the ~1 MB mermaid bundle out of the
// eagerly-loaded markdown graphs (chat bubbles, plan preview, files preview).
const MermaidRenderer = React.lazy(() => import("./mermaid-renderer"));

/**
 * Renders a `mermaid` fenced code block as an SVG diagram.
 */
export function MermaidBlock({ chart }: { chart: string }) {
  return (
    <div className="my-2" data-testid="mermaid-block">
      <React.Suspense fallback={<MermaidLoading chart={chart} />}>
        <MermaidRenderer chart={chart} />
      </React.Suspense>
    </div>
  );
}

function MermaidLoading({ chart }: { chart: string }) {
  // Keep the source visible while the renderer chunk downloads so the
  // diagram's text is never replaced by an empty box.
  return (
    <pre
      className="my-0 bg-surface-raised text-foreground border border-surface-raised rounded-lg p-3 overflow-auto text-xs"
      data-testid="mermaid-loading"
    >
      <code className="language-mermaid">{chart}</code>
    </pre>
  );
}
