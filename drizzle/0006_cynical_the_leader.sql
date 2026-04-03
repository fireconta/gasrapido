CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`discountType` enum('percentual','fixo','frete_gratis') NOT NULL,
	`discountValue` decimal(10,2) NOT NULL DEFAULT '0',
	`appliesTo` enum('todos','categoria','produto') NOT NULL DEFAULT 'todos',
	`appliesToCategory` varchar(50),
	`appliesToProductId` int,
	`minOrderValue` decimal(10,2) DEFAULT '0',
	`minQuantity` int DEFAULT 1,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`maxUsesPerCustomer` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `fullStockQty` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `emptyStockQty` int DEFAULT 0 NOT NULL;