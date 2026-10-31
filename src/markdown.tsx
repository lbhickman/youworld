// Markdown rendering with tables, images, and math ($...$ and $$...$$) via KaTeX.

import { useMemo } from "react";
import { Marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { AssetMap } from "./storage";

const marked = new Marked({ gfm: true, breaks: false });

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
  } catch {
    return tex;
  }
}

/** Pull math out before markdown parsing so underscores/asterisks inside math survive. */
function protectMath(src: string): { text: string; math: string[] } {
  const math: string[] = [];
  const stash = (html: string) => {
    math.push(html);
    return `\u0000M${math.length - 1}\u0000`;
  };
  let text = src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, t) => stash(renderMath(t.trim(), true)));
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, t) => stash(renderMath(t.trim(), true)));
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_m, t) => stash(renderMath(t.trim(), false)));
  // Inline $...$: require non-space right inside the dollars, and not followed by a digit (avoids "$5 and $10").
  text = text.replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (_m, pre, t) => pre + stash(renderMath(t, false)));
  return { text, math };
}

export function renderMarkdown(src: string, assets: AssetMap): string {
  const { text, math } = protectMath(src || "");
  let html = marked.parse(text, { async: false }) as string;
  html = html.replace(/\u0000M(\d+)\u0000/g, (_m, i) => math[Number(i)]);
  html = html.replace(/(src=")asset:([a-z0-9]+)(")/g, (_m, a, key, b) => a + (assets[key] || "") + b);
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|data|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function Markdown({
  text,
  assets,
  className,
  inline,
}: {
  text: string;
  assets: AssetMap;
  className?: string;
  inline?: boolean;
}) {
  const html = useMemo(() => {
    const h = renderMarkdown(text, assets);
    // For answer choices: unwrap a single paragraph so it sits inline with the radio button.
    return inline ? h.replace(/^<p>([\s\S]*)<\/p>\s*$/, "$1") : h;
  }, [text, assets, inline]);
  return <div className={"md " + (className || "")} dangerouslySetInnerHTML={{ __html: html }} />;
}
