import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backstage — find the right space for your event",
  description:
    "Source-backed venue research, private application drafts, and fictional host coordination demonstrations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
