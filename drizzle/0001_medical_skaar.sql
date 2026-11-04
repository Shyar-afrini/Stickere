-- The 0000 stickers table was a placeholder with no data; recreate it because
-- SQLite cannot add NOT NULL columns without defaults.
DROP TABLE `stickers`;
--> statement-breakpoint
CREATE TABLE `packs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`author` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stickers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pack_id` integer,
	`name` text NOT NULL,
	`uri` text NOT NULL,
	`mime_type` text DEFAULT 'image/webp' NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`is_animated` integer DEFAULT false NOT NULL,
	`emojis` text DEFAULT '[]' NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pack_id`) REFERENCES `packs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sticker_tags` (
	`sticker_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`sticker_id`, `tag_id`),
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sticker_tags_tag_id_idx` ON `sticker_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `stickers_pack_id_position_idx` ON `stickers` (`pack_id`,`position`);
--> statement-breakpoint
CREATE INDEX `stickers_is_favorite_idx` ON `stickers` (`is_favorite`);