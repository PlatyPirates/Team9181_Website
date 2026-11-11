"use client";

import { useState } from "react";

export default function CopyBlock({ text, label = "Copy script" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-2 top-2 rounded border border-[color:var(--p-border-strong)] bg-[color:var(--p-surface)] px-2 py-1 text-xs text-[color:var(--p-accent)]"
      >
        {copied ? "Copied!" : label}
      </button>
      <pre className="max-h-72 overflow-auto rounded border border-[color:var(--p-border)] bg-[color:var(--p-input-bg)] p-4 pr-24 text-xs text-[color:var(--p-text)]">
        <code>{text}</code>
      </pre>
    </div>
  );
}
