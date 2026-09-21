import DOMPurify from "dompurify";
import mermaid from "mermaid";
import React from "react";
import { useTranslation } from "react-i18next";

import { I18nKey } from "#/i18n/declaration";
import { CopyableContentWrapper } from "#/components/shared/buttons/copyable-content-wrapper";

// Mermaid's `render` mints a DOM id for the temp node it parses into; without
// a counter, two copies of the same diagram on one page would collide on it.
let mermaidSeq = 0;

// `render` throws if the global config is never set, so initialize lazily before
// first use. `startOnLoad: false` stops mermaid from scanning the DOM (we feed
// it charts explicitly); `securityLevel: "strict"` is defense in depth behind
// the DOMPurify pass on the produced SVG. `useMaxWidth` keeps wide diagrams
// inside the preview pane instead of overflowing the chat column.
mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  flowchart: { useMaxWidth: true },
  sequence: { useMaxWidth: true },
  journey: { useMaxWidth: true },
  gantt: { useMaxWidth: true },
  state: { useMaxWidth: true },
});

// The diagrams we ship to the browser are authored by the agent or the user, so
// the rendered SVG is untrusted by construction. Mermaid sanitizes internally
// too, but `securityLevel` is a library-wide setting rather than a per-render
// contract, so we sanitize the output ourselves before it touches the DOM.
const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true, mathMl: true },
  FORBID_ATTR: ["onmouseover", "onload", "onclick", "onerror"],
  FORBID_TAGS: ["script", "foreignObject"],
};

export default function MermaidRenderer({ chart }: { chart: string }) {
  const { t } = useTranslation("openhands");
  const [svg, setSvg] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    mermaid
      .render(`mermaid-svg-${++mermaidSeq}`, chart)
      .then(({ svg }) => {
        if (!cancelled)
          setSvg(DOMPurify.sanitize(svg, PURIFY_CONFIG) as unknown as string);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (failed) {
    // A half-streamed or mistyped diagram still shows its source so the user
    // can see what was attempted; the translated note explains why it didn't
    // render.
    return (
      <div data-testid="mermaid-error">
        <p className="text-xs text-[var(--oh-warning)] m-0 mb-1">
          {t(I18nKey.MERMAID$INVALID_DIAGRAM)}
        </p>
        <CopyableContentWrapper text={chart}>
          <pre className="my-0 bg-surface-raised text-foreground border border-surface-raised rounded-lg p-3 overflow-auto text-xs">
            <code className="language-mermaid">{chart}</code>
          </pre>
        </CopyableContentWrapper>
      </div>
    );
  }

  if (svg === null) {
    // The lazy chunk has landed but parsing is asynchronous; keep showing the
    // source until the SVG resolves.
    return (
      <pre
        className="my-0 bg-surface-raised text-foreground border border-surface-raised rounded-lg p-3 overflow-auto text-xs"
        data-testid="mermaid-loading"
      >
        <code className="language-mermaid">{chart}</code>
      </pre>
    );
  }

  return (
    <div
      className="mermaid-diagram overflow-x-auto [&_svg]:max-w-full"
      data-testid="mermaid-diagram"
      // The diagram is an inline SVG document produced by mermaid and
      // sanitized above; `html-react-parser`-style DOM injection would lose
      // mermaid's CSS class hooks, so we set the sanitized string directly.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
