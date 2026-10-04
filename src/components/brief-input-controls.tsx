"use client";
import {
  audienceChoices,
  parseAudience,
  serializeAudience,
  deduplicateRequirements,
} from "../../scripts/brief-controls.mjs";
export function AudienceInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const audience = parseAudience(value);
  const update = (patch: Partial<typeof audience>) =>
    onChange(serializeAudience({ ...audience, ...patch }));
  return (
    <fieldset className="field-stack">
      <legend>Audience and community</legend>
      <label className="field">
        <span>
          Audience <span className="required-label">Required</span>
        </span>
        <select
          id="brief-audience"
          value={audience.choice}
          onChange={(e) =>
            update({
              choice: e.target.value,
              details: e.target.value === "Other" ? audience.details : "",
            })
          }
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? "audience-help error-audience" : "audience-help"
          }
        >
          <option value="">Choose an audience</option>
          {audienceChoices.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      {audience.choice === "Other" && (
        <label className="field">
          <span>Audience or community — custom details</span>
          <input
            id="brief-audience-details"
            value={audience.details}
            maxLength={120}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "error-audience" : undefined}
            onChange={(e) => update({ details: e.target.value })}
          />
        </label>
      )}
      <label className="field">
        <span>
          Community/organization name <small>Optional</small>
        </span>
        <input
          value={audience.community}
          disabled={!audience.choice}
          maxLength={100}
          onChange={(e) => update({ community: e.target.value })}
        />
      </label>
      <small id="audience-help">
        A selected audience does not establish venue eligibility or sponsored
        access. The combined audience must fit 120 characters.
      </small>
      {error && (
        <small className="field-error" id="error-audience">
          {error}
        </small>
      )}
    </fieldset>
  );
}
const equipment = [
  "Projector",
  "Display/screen",
  "Microphones",
  "Whiteboard",
  "Reliable Wi-Fi",
  "Power outlets",
];
const conditions = [
  "Seating",
  "Accessible access",
  "Outside-food permission",
  "Catering",
  "Parking",
];
const list = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
export function RequirementPicker({
  equipmentValue,
  essentialValue,
  onEquipment,
  onEssential,
}: {
  equipmentValue: string;
  essentialValue: string;
  onEquipment: (v: string) => void;
  onEssential: (v: string) => void;
}) {
  const toggle = (value: string, option: string, checked: boolean) =>
    deduplicateRequirements(
      checked
        ? [...list(value), option]
        : list(value).filter((v) => v.toLowerCase() !== option.toLowerCase()),
    ).join(", ");
  const known = list(equipmentValue).filter((v) =>
    equipment.some((option) => option.toLowerCase() === v.trim().toLowerCase()),
  );
  const custom = equipmentValue
    .split(",")
    .filter(
      (v) =>
        !equipment.some(
          (option) => option.toLowerCase() === v.trim().toLowerCase(),
        ),
    );
  return (
    <>
      <fieldset className="requirement-picker">
        <legend>Equipment and connectivity</legend>
        <p className="helper-text">
          Selections describe your needs, not venue inventory. Add quantities
          and connection details below.
        </p>
        <div className="requirement-options">
          {equipment.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={list(equipmentValue).some(
                  (v) => v.toLowerCase() === option.toLowerCase(),
                )}
                onChange={(e) =>
                  onEquipment(toggle(equipmentValue, option, e.target.checked))
                }
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Equipment and setup — custom details</span>
        <input
          id="brief-equipment"
          value={custom.join(",").trimStart()}
          onChange={(e) =>
            onEquipment(
              `${known.join(", ")}${known.length && e.target.value ? ", " : ""}${e.target.value}`,
            )
          }
        />
        <small>
          Comma-separated, e.g. 2 projectors with HDMI, wireless microphone.
        </small>
      </label>
      <fieldset className="requirement-picker">
        <legend>Essential policies, services and access</legend>
        <div className="requirement-options">
          {conditions.map((option) => (
            <label key={option}>
              <input
                type="checkbox"
                checked={list(essentialValue).some(
                  (v) => v.toLowerCase() === option.toLowerCase(),
                )}
                onChange={(e) =>
                  onEssential(toggle(essentialValue, option, e.target.checked))
                }
              />
              {option}
            </label>
          ))}
        </div>
        <p className="helper-text">
          Food permission does not establish catering or dietary guarantees.
          Selected conditions are essential; optional extras go below.
        </p>
      </fieldset>
    </>
  );
}
