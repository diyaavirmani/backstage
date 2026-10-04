"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { setQueryValues, useWorkspaceView } from "@/lib/workspace-navigation";

const views = {
  organizer: [
    ["brief", "Event brief", "01"],
    ["research", "Venue research", "02"],
    ["drafts", "Private drafts", "03"],
  ],
  host: [
    ["requests", "Requests", "01"],
    ["calendar", "Resource calendar", "02"],
    ["preparation", "Preparation", "03"],
  ],
  venues: [["catalog", "Venue catalog", "01"]],
};
export function WorkspaceShell({
  kind,
  children,
}: {
  kind: keyof typeof views;
  children: ReactNode;
}) {
  const view = useWorkspaceView(kind);
  const path = kind === "venues" ? "/venues" : `/${kind}`;
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <p className="sidebar-label">
          {kind === "host"
            ? "Host demonstration"
            : kind === "organizer"
              ? "Organizer workspace"
              : "Published research"}
        </p>
        <nav aria-label={`${kind} views`}>
          {views[kind].map(([id, label, number]) => (
            <a
              key={id}
              href={`${path}?view=${id}`}
              aria-current={view === id ? "page" : undefined}
              onClick={(event) => {
                if (
                  event.button ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                event.preventDefault();
                setQueryValues({ view: id });
              }}
            >
              <span aria-hidden="true">{number}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="brand-spark" aria-hidden="true">
            ✳
          </span>
          <strong>
            {kind === "host"
              ? "Fictional hosts. Real workflow."
              : "Evidence before assumptions."}
          </strong>
          <p>
            {kind === "host"
              ? "A private demo workspace with simulated roles."
              : "Current availability and booking authority require host confirmation."}
          </p>
        </div>
        <Link
          className="text-link"
          href={kind === "host" ? "/organizer?view=drafts" : "/host"}
        >
          {kind === "host"
            ? "Prepare a demo request"
            : "Try the host demonstration"}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
