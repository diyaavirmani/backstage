"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, DetailDialog } from "@/components/ui";
import { Icon, LogoMark } from "@/components/icons";

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
      <header className={active ? "site-header site-header-app" : "site-header"}>
        <div className="header-inner">
          <Link className="wordmark" href="/" aria-label="Backstage home">
            <LogoMark />
            <span>backstage</span>
          </Link>
          <nav
            className="header-nav desktop-navigation"
            aria-label="Main navigation"
          >
            {links}
          </nav>
          <div className="header-actions desktop-navigation">
            <span className="header-region">
              <Icon name="pin" size={14} />
              Delhi NCR · Bengaluru
            </span>
            <Link className="header-action button button-dark" href="/organizer">
              Plan an event <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <Button
            className="mobile-menu-button"
            variant="secondary"
            type="button"
            aria-expanded={menu}
            aria-haspopup="dialog"
            onClick={() => setMenu(true)}
          >
            <Icon name="menu" size={16} />
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
