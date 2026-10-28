ALTER TABLE resellers ADD COLUMN router_id INT NULL AFTER user_id;
ALTER TABLE resellers ADD COLUMN location_id INT NULL AFTER router_id;
