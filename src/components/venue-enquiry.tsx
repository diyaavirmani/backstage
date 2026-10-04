"use client";
import { useRef, useState } from "react";
import type { EventBrief, VenueContact } from "@/types";
import {
  Button,
  DetailDialog,
  SourceLink,
  formatEvidenceDate,
} from "@/components/ui";
import { composeEnquiry } from "../../scripts/evidence-presentation.mjs";
import {
  contactHref,
  formatContactValue,
} from "../../scripts/venue-contacts.mjs";

const typeLabels: Record<VenueContact["type"], string> = {
  phone: "Phone",
  email: "Email",
  "enquiry-page": "Enquiry page",
};

export function ContactRoutes({ contacts }: { contacts: VenueContact[] }) {
  return (
    <ul className="contact-routes">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <span className="contact-line">
            <span className="contact-type">{typeLabels[contact.type]}</span>
            {contact.type === "enquiry-page" ? (
              <SourceLink url={contact.value}>
                Enquiry form on {new URL(contact.value).hostname}
              </SourceLink>
            ) : (
              <a href={contactHref(contact)}>{formatContactValue(contact)}</a>
            )}
            <span className="contact-scope">
              {contact.scope === "organization-wide"
                ? "Organization-wide"
                : "This venue"}
            </span>
          </span>
          <p>{contact.purpose}</p>
          <small>
            {contact.sourceReferences.map((source) => (
              <SourceLink key={source.id} url={source.url}>
                Source: {source.title}
              </SourceLink>
            ))}{" "}
            · checked {formatEvidenceDate(contact.checkedAt)}
          </small>
        </li>
      ))}
    </ul>
  );
}

/** “How to ask”: published routes plus an editable enquiry that is copied, never sent. */
export function VenueEnquiry({
  name,
  contacts = [],
  brief,
  questions = [],
  headingLevel: Heading = "h5",
}: {
  name: string;
  contacts?: VenueContact[];
  brief?: EventBrief;
  questions?: string[];
  headingLevel?: "h4" | "h5";
}) {
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState<{ key: string; text: string } | null>(
    null,
  );
  const [copyStatus, setCopyStatus] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const briefKey = brief ? `${brief.id}:${brief.savedAt}` : "";
  const generated = brief
    ? composeEnquiry({ venueName: name, brief, questions })
    : "";
  const text = edited?.key === briefKey ? edited.text : generated;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Enquiry copied. Nothing was sent.");
    } catch {
      textRef.current?.select();
      setCopyStatus(
        "Copying is unavailable here. The text is selected; press Ctrl+C or ⌘C. Nothing was sent.",
      );
    }
  }
  return (
    <div className="venue-enquiry">
      <Heading>How to ask</Heading>
      {contacts.length ? (
        <ContactRoutes contacts={contacts} />
      ) : (
        <p className="contact-missing">
          No public event-enquiry route was found in the reviewed sources. Use
          the original source above; general customer-support lines are not
          venue-booking contacts.
        </p>
      )}
      {contacts.length > 0 && (
        <p className="contact-caveat">
          Published routes only. They are not verified as active or able to
          confirm bookings, capacity, eligibility or availability.
        </p>
      )}
      {brief && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setCopyStatus("");
            setOpen(true);
          }}
        >
          Prepare enquiry
        </Button>
      )}
      {brief && (
        <DetailDialog
          open={open}
          onClose={() => setOpen(false)}
          title={`Enquiry for ${name}`}
        >
          <p>
            Built from your discovery brief and this venue’s open questions.
            Edit it, then copy it into a route you choose. Backstage does not
            send it or contact the venue.
          </p>
          <label className="field enquiry-text">
            <span>Editable enquiry</span>
            <textarea
              ref={textRef}
              rows={14}
              value={text}
              onChange={(event) => {
                setEdited({ key: briefKey, text: event.target.value });
                setCopyStatus("");
              }}
            />
          </label>
          <div className="card-actions">
            <Button type="button" onClick={copy}>
              Copy enquiry
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={text === generated}
              onClick={() => {
                setEdited(null);
                setCopyStatus("");
              }}
            >
              Reset text
            </Button>
          </div>
          <p role="status" className="helper-text">
            {copyStatus}
          </p>
          {contacts.length > 0 && <ContactRoutes contacts={contacts} />}
        </DetailDialog>
      )}
    </div>
  );
}
