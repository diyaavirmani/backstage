import type { Metadata } from "next";
import { IBM_Plex_Mono, Mona_Sans } from "next/font/google";
import "./globals.css";

const sans = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mona",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Backstage — find the right space for your event",
  description:
    "Source-backed venue research, private application drafts, and fictional host coordination demonstrations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <noscript>
          <style>{`.pixel-img{opacity:1!important}.pixel-canvas{display:none}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
