"use client";

import { useSyncExternalStore } from "react";

const changeEvent = "backstage:navigation";
function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("hashchange", callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(changeEvent, callback);
  };
}
export function setQueryValues(
  values: Record<string, string | null>,
  replace = false,
) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  // Next's supported native history integration retains mounted form state.
  window.history[replace ? "replaceState" : "pushState"](
    null,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
  window.dispatchEvent(new Event(changeEvent));
}
function useLocation() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search + window.location.hash,
    () => "",
  );
}
export function useQueryValues() {
  return new URLSearchParams(useLocation().split("#")[0]);
}
export function useWorkspaceView(kind: "organizer" | "host" | "venues") {
  const location = useLocation();
  const params = new URLSearchParams(location.split("#")[0]);
  const allowed =
    kind === "organizer"
      ? ["brief", "research", "drafts"]
      : kind === "host"
        ? ["requests", "calendar", "preparation"]
        : ["catalog"];
  const hash = location.includes("#") ? "#" + location.split("#")[1] : "";
  const legacy =
    hash === "#venue-leads"
      ? "research"
      : [
            "#application-workspace",
            "#application-builder",
            "#application-workspace-disclosure",
          ].includes(hash)
        ? "drafts"
        : allowed[0];
  const view = params.get("view") || legacy;
  return allowed.includes(view) ? view : allowed[0];
}
