-- Repair only incomplete milestone-4 checklist tasks. Completed timestamps and
-- their checklist_history rows remain untouched. Add the fictional hosts' explicit
-- cleanup window to pre-existing demo workspaces without replacing other policies.
UPDATE venues
SET policy_json = json_set(policy_json, '$.cleanupBufferMinutes', 30)
WHERE kind='demo'
  AND json_extract(policy_json, '$.cleanupRequired')=1
  AND json_type(policy_json, '$.cleanupBufferMinutes') IS NULL;

UPDATE checklist_items
SET due_at = (
  SELECT CASE checklist_items.label
    WHEN 'Confirm room layout and prepare the selected room' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.startTime') || ':00', '-5 hours', '-30 minutes', '-30 minutes')
    WHEN 'Share arrival, access, and host contact details' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.startTime') || ':00', '-5 hours', '-30 minutes', '-30 minutes')
    WHEN 'Complete room setup before guest arrival' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.startTime') || ':00', '-5 hours', '-30 minutes')
    WHEN 'Confirm permitted food arrangements with the host' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.startTime') || ':00', '-5 hours', '-30 minutes', '-30 minutes')
    WHEN 'Test allocated AV and shared equipment before doors open' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.startTime') || ':00', '-5 hours', '-30 minutes', '-15 minutes')
    WHEN 'Restore the room and complete cleanup' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.endTime') || ':00', '-5 hours', '-30 minutes', printf('+%d minutes', max(CAST(json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.cleanupMinutes') AS INTEGER), CAST(json_extract(v.policy_json, '$.cleanupBufferMinutes') AS INTEGER))))
    WHEN 'Return shared equipment after the event' THEN strftime('%Y-%m-%dT%H:%M:%fZ', json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.date') || 'T' || json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.endTime') || ':00', '-5 hours', '-30 minutes', printf('+%d minutes', max(CAST(json_extract(COALESCE(a.accepted_brief_json, a.brief_json), '$.cleanupMinutes') AS INTEGER), CAST(json_extract(v.policy_json, '$.cleanupBufferMinutes') AS INTEGER))))
    ELSE checklist_items.due_at
  END
  FROM applications a
  JOIN venues v ON v.workspace_id=a.workspace_id AND v.id=a.venue_id
  WHERE a.workspace_id=checklist_items.workspace_id AND a.id=checklist_items.application_id
)
WHERE completed_at IS NULL
  AND label IN (
    'Confirm room layout and prepare the selected room',
    'Share arrival, access, and host contact details',
    'Complete room setup before guest arrival',
    'Confirm permitted food arrangements with the host',
    'Test allocated AV and shared equipment before doors open',
    'Restore the room and complete cleanup',
    'Return shared equipment after the event'
  );
