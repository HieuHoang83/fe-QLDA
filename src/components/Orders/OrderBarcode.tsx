"use client";

import { useMemo } from "react";

/**
 * Mã vạch Code 39 dạng SVG (không cần thư viện ngoài).
 * Bảng ký tự chuẩn Code 39: mỗi ký tự 9 phần tử (bar/space xen kẽ),
 * bắt đầu bằng bar, ký tự hỗ trợ thêm * dùng làm start/stop.
 */
const PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

const NARROW = 2;
const WIDE = 4;

function sanitize(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .map((char) => (PATTERNS[char] ? char : "-"))
    .join("");
}

/** Trả về width/height + toạ độ các cột bar để render SVG. */
function encode(value: string) {
  const text = sanitize(value);
  const sequence = `*${text}*`;
  const bars: Array<{ x: number; width: number }> = [];
  let x = 0;
  for (const char of sequence) {
    const pattern = PATTERNS[char] ?? PATTERNS["-"];
    pattern.split("").forEach((element, index) => {
      const width = element === "w" ? WIDE : NARROW;
      if (index % 2 === 0) bars.push({ x, width });
      x += width;
    });
    x += NARROW; // khoảng cách giữa 2 ký tự
  }
  return { bars, width: x, text };
}

export function OrderBarcode({
  value,
  height = 56,
  className = "",
}: {
  value: string;
  height?: number;
  className?: string;
}) {
  const { bars, width } = useMemo(() => encode(value), [value]);
  return (
    <svg
      role="img"
      aria-label={`Mã vạch ${value}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={width} height={height} fill="#ffffff" />
      {bars.map((bar, index) => (
        <rect key={index} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
      ))}
    </svg>
  );
}
