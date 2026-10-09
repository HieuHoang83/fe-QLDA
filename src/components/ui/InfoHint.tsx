"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Icon i kèm nhãn form: hover (hoặc click trên mobile) để hiện tooltip
 * giải thích field đó dùng để nhập gì.
 */
export function InfoHint({ text, label }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label ? `${label}: ${text}` : text}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="grid h-4 w-4 place-items-center rounded-full text-[#969b91] transition hover:text-[#527b49] focus:outline-none focus:ring-2 focus:ring-[#7c9f70]/40"
      >
        <i className="pi pi-info-circle text-xs" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        id={tipId}
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-xl bg-[#20231f] px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-lg transition dark:bg-[#f4f5ef] dark:text-[#20231f] ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

/** Nhãn form kèm tooltip giải thích. */
export function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
      <span>{children}</span>
      {hint ? <InfoHint text={hint} label={String(children)} /> : null}
    </span>
  );
}
