import type { CSSProperties, ElementType, ReactNode } from "react";

// Word-by-word entrance for headings. Pure CSS (no client JS); each word
// gets a staggered delay. Text content stays intact for accessible names.
export function RevealWords({
  text,
  delay = 0,
  step = 0.06,
}: {
  text: string;
  delay?: number;
  step?: number;
}) {
  return (
    <>
      {text.split(" ").map((word, index, words) => (
        <span
          key={`${word}-${index}`}
          className="reveal-word"
          style={{ "--d": `${delay + index * step}s` } as CSSProperties}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

// Fade/rise on load with an explicit delay (seconds).
export function Rise({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
  [key: string]: unknown;
}) {
  return (
    <Tag
      {...rest}
      className={`rise ${className}`}
      style={{ "--d": `${delay}s` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
