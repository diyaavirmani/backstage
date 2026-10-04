"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, DetailDialog } from "@/components/ui";

export function SiteHeader({
  active,
}: {
  active?: "organizer" | "host" | "venues";
}) {
  const [menu, setMenu] = useState(false);
  const links = (
    <>
      <Link
        aria-current={active === "organizer" ? "page" : undefined}
        className={active === "organizer" ? "nav-link active" : "nav-link"}
        href="/organizer"
        onClick={() => setMenu(false)}
      >
        Organizer
      </Link>
      <Link
        aria-current={active === "venues" ? "page" : undefined}
        className={active === "venues" ? "nav-link active" : "nav-link"}
        href="/venues"
        onClick={() => setMenu(false)}
      >
        Venue research
      </Link>
      <Link
        aria-current={active === "host" ? "page" : undefined}
        className={active === "host" ? "nav-link active" : "nav-link"}
        href="/host"
        onClick={() => setMenu(false)}
      >
        Host demo
      </Link>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="wordmark" href="/" aria-label="Backstage home">
            <span className="wordmark-icon" aria-hidden="true">
              <span />
            </span>
            <span>backstage</span>
          </Link>
          <nav
            className="header-nav desktop-navigation"
            aria-label="Main navigation"
          >
            {links}
          </nav>
          <Link
            className="header-action button button-dark desktop-navigation"
            href="/organizer"
          >
            Plan an event <span aria-hidden="true">↗</span>
          </Link>
          <Button
            className="mobile-menu-button"
            variant="secondary"
            type="button"
            aria-expanded={menu}
            aria-haspopup="dialog"
            onClick={() => setMenu(true)}
          >
            Menu
          </Button>
        </div>
      </header>
      <DetailDialog
        open={menu}
        title="Navigation"
        onClose={() => setMenu(false)}
      >
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links}
          <Link
            className="button button-dark"
            href="/organizer"
            onClick={() => setMenu(false)}
          >
            Plan an event
          </Link>
        </nav>
      </DetailDialog>
    </>
  );
}
