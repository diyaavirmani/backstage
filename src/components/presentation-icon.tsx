import type { CSSProperties } from "react";

// Small repo-native line icons. Presentation only; no application state.
const strokes: Record<string, string> = {
  brief: "M7 3h10v3h3v15H4V6h3M8 10h8M8 14h8M8 18h5M9 3v3h6V3",
  research: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6",
  drafts: "M4 5h6l2 3h8v12H4V5M8 12h8M8 16h5",
  requests: "M4 4h16v16H4V4M4 14h5l2 3h2l2-3h5",
  calendar: "M4 6h16v15H4V6M8 3v6M16 3v6M4 11h16M8 15h2M14 15h2",
  preparation: "M4 6l2 2 4-4M13 6h7M4 13l2 2 4-4M13 13h7M4 20l2 2 4-4M13 20h7",
  catalog:
    "M4 21V7h9v14M13 11h7v10M2 21h20M7 10h3M7 14h3M7 18h3M16 14h1M16 18h1",
};
export function PresentationIcon({
  name,
  style,
}: {
  name: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="presentation-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={strokes[name] || strokes.catalog} />
    </svg>
  );
}
