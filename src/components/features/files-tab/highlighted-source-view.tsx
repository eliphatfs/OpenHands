import { memo } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { SyntaxHighlighter } from "#/components/features/markdown/syntax-highlighter";
import { getPrismLanguageForFile } from "#/utils/file-language";

interface HighlightedSourceViewProps {
  path: string;
  text: string;
  mimeType?: string;
}

/**
 * Hard ceiling above which we stop running Prism and fall back to a plain
 * `<pre>`. react-syntax-highlighter (Prism) has no token cache: it re-parses
 * the whole string into a token tree on *every render*. For a normal source
 * file that's cheap, but a single minified line (e.g. a 90k-character
 * one-line JSON) builds tens of thousands of span nodes and re-deriving
 * that tree — plus the resulting style recalc/layout — pegs the main
 * thread for seconds per render. Since the Files tab is mounted even
 * while the right panel is collapsed, any keystroke that re-renders the
 * tab tree would re-trigger that work and freeze the chat input.
 *
 * The fallback keeps the bytes readable (just un-highlighted) while making
 * pathological files effectively free to render. The two guards are
 * independent so a huge-but-normal multi-line file still gets highlighting
 * via the total-size ceiling, and a small-but-single-giant-line file is
 * caught by the longest-line ceiling.
 */
const MAX_TOKENIZE_CHARS = 200_000;
const MAX_LINE_LENGTH = 20_000;

function longestLineLength(text: string): number {
  let max = 0;
  let start = 0;
  for (let i = 0; i <= text.length; i += 1) {
    if (i === text.length || text.charCodeAt(i) === 10) {
      const len = i - start;
      if (len > max) max = len;
      start = i + 1;
    }
  }
  return max;
}

/**
 * Renders the raw bytes of a workspace text file with Prism syntax
 * highlighting. Used both in:
 *   - Rich mode for actual source files (.ts, .py, .yaml, …) — there is
 *     no "rich" rendering of source code, so highlighted source IS the
 *     rich view.
 *   - Plain mode for source code AND for the source form of markdown /
 *     HTML files (so users can inspect the markup behind a rich preview).
 *
 * When we don't have a Prism grammar for the file we fall through to a
 * plain `<pre>` so the bytes still show. We also fall through to a plain
 * `<pre>` for files that would make Prism pathologically expensive (see
 * `MAX_TOKENIZE_CHARS` / `MAX_LINE_LENGTH`) — the bytes stay readable,
 * just un-highlighted. The wrapper styling matches the right-pane
 * background so the highlighted block reads as part of the surrounding
 * chrome instead of a floating card.
 */
function HighlightedSourceViewImpl({
  path,
  text,
  mimeType,
}: HighlightedSourceViewProps) {
  const language = getPrismLanguageForFile(path, mimeType);

  if (
    !language ||
    text.length > MAX_TOKENIZE_CHARS ||
    longestLineLength(text) > MAX_LINE_LENGTH
  ) {
    return (
      <pre
        data-testid="file-content-viewer-plain"
        className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-[var(--oh-surface)] p-4 text-xs leading-5 text-white custom-scrollbar-always"
      >
        {text}
      </pre>
    );
  }

  return (
    <div
      data-testid="file-content-viewer-highlighted"
      data-language={language}
      className="h-full w-full overflow-auto bg-[var(--oh-surface)] custom-scrollbar-always"
    >
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLongLines={false}
        // Override the theme's hard-coded background so the highlighter
        // blends with the right-pane chrome instead of painting a slab
        // of a slightly-different dark color.
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.75rem",
          lineHeight: "1.25rem",
          minHeight: "100%",
        }}
        codeTagProps={{
          style: { background: "transparent", fontFamily: "inherit" },
        }}
        lineNumberStyle={{
          color: "var(--oh-border)",
          minWidth: "2.5em",
          paddingRight: "1em",
          userSelect: "none",
        }}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * Memoized so a parent re-render (e.g. the conversation tab tree refreshing
 * for an unrelated store update) does not re-run Prism over the same file
 * contents. `path` + `text` + `mimeType` fully describe the output, so an
 * identity-equal props comparison is sufficient and correct.
 */
export const HighlightedSourceView = memo(HighlightedSourceViewImpl);
