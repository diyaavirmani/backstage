ALTER TABLE venues ADD COLUMN access_model TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE venues ADD COLUMN fulfillment_model TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE resources ADD COLUMN capacity_layout TEXT;
UPDATE venues SET access_model=json_extract(policy_json,'$.accessModel'),fulfillment_model=json_extract(policy_json,'$.approval') WHERE kind='demo';
UPDATE resources SET capacity_layout=CASE name WHEN 'Workshop Studio' THEN 'classroom rows' WHEN 'Gathering Salon' THEN 'circle seating' WHEN 'Forum Room' THEN 'theatre seating' WHEN 'Maker Lab' THEN 'workbench layout' END WHERE kind='room' AND capacity_layout IS NULL AND venue_id LIKE '%:demo-%';
CREATE TABLE IF NOT EXISTS checklist_history (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, checklist_item_id TEXT NOT NULL REFERENCES checklist_items(id), actor TEXT NOT NULL, completed INTEGER NOT NULL, created_at TEXT NOT NULL);
