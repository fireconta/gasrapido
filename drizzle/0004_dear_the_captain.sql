CREATE TABLE `benefits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('desconto','vale_gas','frete_gratis','brinde','outro') NOT NULL DEFAULT 'outro',
	`discountType` enum('fixo','percentual') DEFAULT 'fixo',
	`discountValue` decimal(10,2) DEFAULT '0',
	`voucherProductId` int,
	`voucherProductName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`requiresMinOrder` decimal(10,2) DEFAULT '0',
	`maxUsesPerCustomer` int DEFAULT 1,
	`totalUses` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `benefits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_benefits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`customerName` varchar(255),
	`benefitId` int NOT NULL,
	`benefitName` varchar(255),
	`status` enum('pendente','ativo','usado','expirado','cancelado') NOT NULL DEFAULT 'ativo',
	`orderId` int,
	`usedOrderId` int,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_benefits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gas_vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(20) NOT NULL,
	`customerId` int,
	`customerName` varchar(255),
	`customerPhone` varchar(20),
	`benefitId` int,
	`productId` int,
	`productName` varchar(255) NOT NULL DEFAULT 'Botijão P13 (13kg)',
	`status` enum('ativo','usado','expirado','cancelado') NOT NULL DEFAULT 'ativo',
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	`usedAt` timestamp,
	`expiresAt` timestamp,
	`usedOrderId` int,
	`issuedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gas_vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `gas_vouchers_code_unique` UNIQUE(`code`)
);
