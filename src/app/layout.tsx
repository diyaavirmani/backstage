import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage — make room for what matters",
  description: "A thoughtful way to find a place where your event can actually work.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
