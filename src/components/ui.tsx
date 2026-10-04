"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      {...props}
      className={`button ${variant === "primary" ? "button-dark" : variant === "secondary" ? "button-light" : "text-button"} ${className}`}
    />
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?:
    "neutral" | "supported" | "unknown" | "conflicting" | "demo" | "historical";
}) {
  return <span className={`status-chip ${tone}`}>{children}</span>;
}
const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
/** Deterministic date text; locale month abbreviations differ between runtimes. */
export function formatEvidenceDate(value?: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match
    ? `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`
    : value || "";
}
export function FactBadge({
  evidenceType,
  historicalDate,
}: {
  evidenceType: string;
  historicalDate?: string | null;
}) {
  return evidenceType === "historical-event" ? (
    <Badge tone="historical">
      Historical event
      {historicalDate ? ` · ${formatEvidenceDate(historicalDate)}` : ""}
    </Badge>
  ) : (
    <Badge tone="supported">Documented</Badge>
  );
}
export function Notice({
  children,
  tone = "info",
  role,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error" | "warning";
  role?: "alert" | "status";
}) {
  return (
    <div className={`notice notice-${tone}`} role={role}>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function PageHeader({
  title,
  description,
  label,
  children,
  illustration,
}: {
  title: string;
  description: string;
  label?: string;
  children?: ReactNode;
  illustration?: "organizer" | "venues" | "host";
}) {
  return (
    <header
      className={`page-heading${illustration ? ` page-heading-cover cover-${illustration}` : ""}`}
    >
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        {label && <p className="page-context">{label}</p>}
      </div>
      {children}
    </header>
  );
}
export function DetailDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const callback = useRef(onClose);
  useEffect(() => {
    callback.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0],
          last = controls.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        callback.current();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <Button
          variant="secondary"
          type="button"
          onClick={onClose}
          autoFocus
          aria-label="Close details"
        >
          Close <span aria-hidden="true">×</span>
        </Button>
      </div>
      <div className="dialog-body">{open ? children : null}</div>
    </dialog>
  );
}
export function SourceLink({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  let safe = false;
  try {
    safe = ["https:", "http:"].includes(new URL(url).protocol);
  } catch {
    /* Display unlinked if malformed. */
  }
  return safe ? (
    <a className="source-link" href={url} target="_blank" rel="noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  ) : (
    <span>{children}</span>
  );
}
