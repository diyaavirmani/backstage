import type { SVGProps } from "react";

// Small stroke icon set (24px grid, 1.75 stroke) so the UI does not need an
// icon dependency. Icons are decorative; label the surrounding control.
const paths = {
  brief: (
    <>
      <path d="M8 4h8l3 3v13H5V4h3Z" />
      <path d="M9 11h6M9 15h6M9 7h2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  drafts: (
    <>
      <path d="M4 7h16v12H4z" />
      <path d="m4 8 8 6 8-6" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13 6.5 5h11L20 13v6H4z" />
      <path d="M4 13h5l1 2h4l1-2h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  checklist: (
    <>
      <path d="m4.5 7 1.5 1.5L9 5.5M4.5 15l1.5 1.5L9 13.5" />
      <path d="M12 7.5h7.5M12 15.5h7.5" />
    </>
  ),
  building: (
    <>
      <path d="M5 20V5l8-2v17M13 9h6v11" />
      <path d="M3 20h18M8.5 8h1.5M8.5 12h1.5M8.5 16h1.5M16 13h.5M16 16.5h.5" />
    </>
  ),
  arrowRight: <path d="M5 12h14m-5-5 5 5-5 5" />,
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  sparkle: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  shield: (
    <>
      <path d="M12 3.5 19 6v6c0 4.2-3 7.4-7 8.5-4-1.1-7-4.3-7-8.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

// Brand mark: a proscenium arch (the "stage") with a lit floor.
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className="logo-mark"
    >
      <rect width="32" height="32" rx="8" fill="#14402d" />
      <path
        d="M9 23V14.5a7 7 0 0 1 14 0V23"
        fill="none"
        stroke="#c5ec6f"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <rect x="7" y="22" width="18" height="3" rx="1.5" fill="#f6f7f2" />
    </svg>
  );
}
