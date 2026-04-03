CREATE TABLE `backup_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`sizeFormatted` varchar(50) NOT NULL,
	`url` text,
	`createdBy` varchar(255) NOT NULL,
	`backupType` enum('manual','auto') NOT NULL DEFAULT 'manual',
	`backupStatus` enum('success','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backup_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `backup_schedules` ADD `hour` int NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_schedules` ADD `minute` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `backup_schedules` ADD `label` varchar(255);--> statement-breakpoint
ALTER TABLE `backup_schedules` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `backup_schedules` DROP COLUMN `cronExpression`;--> statement-breakpoint
ALTER TABLE `backup_schedules` DROP COLUMN `lastRun`;--> statement-breakpoint
ALTER TABLE `backup_schedules` DROP COLUMN `nextRun`;