CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivererId` int NOT NULL,
	`orderId` int,
	`senderRole` enum('admin','deliverer') NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliverer_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivererId` int NOT NULL,
	`lat` decimal(10,7) NOT NULL,
	`lng` decimal(10,7) NOT NULL,
	`accuracy` decimal(8,2),
	`speed` decimal(6,2),
	`heading` decimal(6,2),
	`altitude` decimal(8,2),
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliverer_locations_id` PRIMARY KEY(`id`)
);
