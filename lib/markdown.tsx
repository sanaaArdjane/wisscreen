import { Fragment, type ReactNode } from "react";

/**
 * A small Markdown renderer for demo instructions — **React elements, never an
 * HTML string**, so there is no `dangerouslySetInnerHTML` anywhere and nothing
 * the author types can become markup.
 *
 * It covers what instructions actually use: `#`–`###` headings, paragraphs,
 * `-`/`*` and `1.` lists, `**bold**`, `*italic*`, `` `code` ``, fenced code
 * blocks, `> quotes`, `---` rules, and `[text](url)` links. Links are filtered
 * to `http(s)`, `mailto:` and site-relative paths; a `javascript:` URL renders as
 * its text. No dependency, for the same reason the repo skips `dotenv`: this is
 * seventy lines, and a Markdown library is an attack surface to keep patched.
 */

const LINK_OK = /^(https?:\/\/|mailto:|\/(?!\/))/i;

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Order matters: code first, so `**` inside backticks stays literal.
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (m[1]) {
      out.push(
        <code key={key} className="rounded-md bg-soft px-1.5 py-0.5 font-mono text-[0.9em] text-fg">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      out.push(
        <strong key={key} className="font-[650] text-fg">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (m[3]) {
      out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    } else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok) ?? [];
      out.push(
        href && LINK_OK.test(href) ? (
          <a
            key={key}
            href={href}
            target={href.startsWith("/") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className="font-[650] text-signal-fg underline underline-offset-2"
          >
            {label}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        ),
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++; // the closing fence (or EOF)
      blocks.push(
        <pre
          key={key}
          className="overflow-x-auto rounded-2xl bg-soft px-4 py-3 font-mono text-[13px] leading-relaxed text-fg"
        >
          <code>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1
          ? "text-xl font-[650] text-fg"
          : level === 2
            ? "text-lg font-[650] text-fg"
            : "text-base font-[650] text-fg";
      const Tag = (`h${level + 2}` as "h3" | "h4" | "h5");
      blocks.push(
        <Tag key={key} className={cls}>
          {inline(heading[2], key)}
        </Tag>,
      );
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={key} className="border-fg/10" />);
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={key} className="border-l-2 border-fg/25 pl-4 text-fg/80">
          {inline(body.join(" "), key)}
        </blockquote>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const ordered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line);
      const re = isOrdered ? ordered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const List = isOrdered ? "ol" : "ul";
      blocks.push(
        <List
          key={key}
          className={`flex flex-col gap-1.5 pl-5 ${isOrdered ? "list-decimal" : "list-disc"}`}
        >
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    // A paragraph runs until a blank line or the start of another block.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key} className="leading-relaxed">
        {inline(para.join(" "), key)}
      </p>,
    );
  }

  return <div className="flex flex-col gap-3 text-sm text-fg">{blocks}</div>;
}
