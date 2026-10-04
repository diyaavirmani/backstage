"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { setQueryValues, useWorkspaceView } from "@/lib/workspace-navigation";

const views: Record<string, [string, string, string, IconName][]> = {
  organizer: [
    ["brief", "Event brief", "01", "brief"],
    ["research", "Venue research", "02", "search"],
    ["drafts", "Private drafts", "03", "drafts"],
  ],
  host: [
    ["requests", "Requests", "01", "inbox"],
    ["calendar", "Resource calendar", "02", "calendar"],
    ["preparation", "Preparation", "03", "checklist"],
  ],
  venues: [["catalog", "Venue catalog", "01", "building"]],
};
const workspaces = {
  organizer: {
    label: "Organizer workspace",
    detail: "Delhi NCR · Bengaluru",
    icon: "brief",
  },
  host: {
    label: "Host demonstration",
    detail: "Fictional hosts",
    icon: "inbox",
  },
  venues: {
    label: "Published research",
    detail: "Research leads",
    icon: "building",
  },
} as const;

export function WorkspaceShell({
  kind,
  children,
}: {
  kind: keyof typeof workspaces;
  children: ReactNode;
}) {
  const view = useWorkspaceView(kind);
  const path = kind === "venues" ? "/venues" : `/${kind}`;
  const workspace = workspaces[kind];
  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <div className="workspace-switch">
          <span className="workspace-icon" aria-hidden="true">
            <Icon name={workspace.icon} size={16} />
          </span>
          <span>
            <span className="sidebar-label">{workspace.label}</span>
            <small>{workspace.detail}</small>
          </span>
        </div>
        <p className="sidebar-section" aria-hidden="true">
          Views
        </p>
        <nav aria-label={`${kind} views`}>
          {views[kind].map(([id, label, number, icon]) => (
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
              <Icon name={icon} size={16} />
              {label}
              <span aria-hidden="true">{number}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-note">
            <Icon name="shield" size={18} />
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
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </aside>
      <div className="workspace-content">{children}</div>
    </div>
  );
}
