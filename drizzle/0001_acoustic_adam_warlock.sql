CREATE TABLE `admin_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`resetToken` varchar(64),
	`resetTokenExpiry` timestamp,
	`lastLogin` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_unique` UNIQUE(`username`),
	CONSTRAINT `admin_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(100) NOT NULL,
	`action_type` varchar(50) NOT NULL,
	`user_id` int,
	`user_role` varchar(50),
	`user_name` varchar(255),
	`user_email` varchar(320),
	`resource_type` varchar(100),
	`resource_id` int,
	`resource_name` varchar(255),
	`old_data` json,
	`new_data` json,
	`changes` text,
	`ip_address` varchar(45),
	`user_agent` text,
	`success` int DEFAULT 1,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` varchar(255),
	`type` enum('percentual','fixo') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`minOrderValue` decimal(10,2) DEFAULT '0',
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `credit_note_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creditNoteId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`paymentMethod` enum('dinheiro','pix','debito','credito') NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_note_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int,
	`customerName` varchar(255) NOT NULL,
	`customerPhone` varchar(20),
	`orderId` int,
	`orderNumber` varchar(20),
	`amount` decimal(10,2) NOT NULL,
	`paidAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`dueDate` timestamp NOT NULL,
	`status` enum('pendente','pago','vencido','parcial') NOT NULL DEFAULT 'pendente',
	`description` text,
	`notifiedAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`whatsapp` varchar(20),
	`email` varchar(320),
	`address` text,
	`neighborhood` varchar(100),
	`city` varchar(100),
	`notes` text,
	`totalOrders` int NOT NULL DEFAULT 0,
	`totalSpent` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliverers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`vehicle` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`isOnline` boolean NOT NULL DEFAULT false,
	`lastSeen` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliverers_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliverers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `gas_count` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countDate` varchar(10) NOT NULL,
	`productId` int,
	`productName` varchar(255) NOT NULL,
	`fullQty` int NOT NULL DEFAULT 0,
	`emptyQty` int NOT NULL DEFAULT 0,
	`soldQty` int NOT NULL DEFAULT 0,
	`returnedQty` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gas_count_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gas_replenishment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`replenishmentDate` timestamp NOT NULL DEFAULT (now()),
	`distributorName` varchar(255) NOT NULL,
	`truckPlate` varchar(20),
	`driverName` varchar(255),
	`status` enum('planejado','em_transito','chegou','processando','concluido','cancelado') NOT NULL DEFAULT 'planejado',
	`totalEmptySent` int NOT NULL DEFAULT 0,
	`totalFullReceived` int NOT NULL DEFAULT 0,
	`notes` text,
	`arrivedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gas_replenishment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gas_replenishment_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`replenishmentId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`emptySent` int NOT NULL DEFAULT 0,
	`fullReceived` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gas_replenishment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adjustmentDate` timestamp NOT NULL DEFAULT (now()),
	`type` enum('contagem_diaria','entrega_caminhao','devolucao_cliente','perda','ajuste_manual') NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`quantityBefore` int NOT NULL,
	`quantityAfter` int NOT NULL,
	`difference` int NOT NULL,
	`reason` varchar(255),
	`truckDeliveryId` int,
	`orderId` int,
	`createdBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productName` varchar(255) NOT NULL,
	`productImageUrl` text,
	`unitPrice` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20) NOT NULL,
	`customerId` int,
	`customerName` varchar(255),
	`customerPhone` varchar(20),
	`deliveryAddress` text,
	`neighborhood` varchar(100),
	`status` enum('novo','em_preparo','aguardando_entregador','saiu_entrega','entregue','cancelado') NOT NULL DEFAULT 'novo',
	`paymentMethod` enum('dinheiro','pix','debito','credito','fiado') NOT NULL,
	`paymentConfirmed` boolean NOT NULL DEFAULT false,
	`paymentConfirmedAt` timestamp,
	`delivererId` int,
	`delivererName` varchar(255),
	`subtotal` decimal(10,2) NOT NULL,
	`deliveryFee` decimal(10,2) NOT NULL DEFAULT '0',
	`discount` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`couponCode` varchar(50),
	`notes` text,
	`deliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `payment_discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`paymentMethod` enum('dinheiro','pix','debito','credito','fiado') NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`discountReason` varchar(255),
	`appliedBy` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`costPrice` decimal(10,2),
	`imageUrl` text,
	`category` varchar(50) NOT NULL DEFAULT 'gas',
	`unit` varchar(20) NOT NULL DEFAULT 'unidade',
	`stockQty` int NOT NULL DEFAULT 0,
	`minStock` int NOT NULL DEFAULT 5,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivererId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dhKey` text NOT NULL,
	`authKey` text NOT NULL,
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`type` enum('entrada','saida','ajuste') NOT NULL,
	`quantity` int NOT NULL,
	`previousQty` int NOT NULL,
	`newQty` int NOT NULL,
	`reason` varchar(255),
	`orderId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `truck_deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deliveryDate` timestamp NOT NULL DEFAULT (now()),
	`truckPlate` varchar(20) NOT NULL,
	`driverId` int,
	`driverName` varchar(255),
	`status` enum('planejado','em_transito','chegou','processando','concluido','cancelado') NOT NULL DEFAULT 'planejado',
	`totalEmptyReceived` int NOT NULL DEFAULT 0,
	`totalFullDelivered` int NOT NULL DEFAULT 0,
	`notes` text,
	`arrivedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `truck_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `truck_delivery_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`truckDeliveryId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`emptyReceived` int NOT NULL DEFAULT 0,
	`fullDelivered` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `truck_delivery_items_id` PRIMARY KEY(`id`)
);
