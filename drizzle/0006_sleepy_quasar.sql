ALTER TABLE `packs` ADD `position` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Keep the order existing packs had: oldest first.
UPDATE `packs` SET `position` = `id`;
