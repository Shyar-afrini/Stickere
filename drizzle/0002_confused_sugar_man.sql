ALTER TABLE `stickers` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `stickers` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `stickers` ADD `radius_meters` real;--> statement-breakpoint
ALTER TABLE `stickers` ADD `place_name` text;--> statement-breakpoint
ALTER TABLE `stickers` ADD `locality` text;--> statement-breakpoint
ALTER TABLE `stickers` ADD `country` text;--> statement-breakpoint
CREATE INDEX `stickers_location_idx` ON `stickers` (`latitude`,`longitude`);