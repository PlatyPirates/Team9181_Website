"use client";
import { useState } from "react";
import { btnSmall, inputCls, labelCls } from "../styles";

export default function CopyField({ label, value, hideLabel }: { label: string; value: string; hideLabel?: boolean }) {
  const [copied, setCopied] = useState(false);
  const id = `copy-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : labelCls}>{label}</label>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} className={`${inputCls} font-mono text-xs`} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className={btnSmall}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked; the field is selectable */
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
