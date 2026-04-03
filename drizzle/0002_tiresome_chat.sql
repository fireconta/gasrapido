CREATE TABLE `whatsapp_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumberId` varchar(100) NOT NULL DEFAULT '',
	`accessToken` text NOT NULL DEFAULT (''),
	`businessAccountId` varchar(100) NOT NULL DEFAULT '',
	`phoneNumber` varchar(30) NOT NULL DEFAULT '',
	`isActive` boolean NOT NULL DEFAULT false,
	`notifyOnNewOrder` boolean NOT NULL DEFAULT true,
	`notifyOnConfirmed` boolean NOT NULL DEFAULT true,
	`notifyOnOutForDelivery` boolean NOT NULL DEFAULT true,
	`notifyOnDelivered` boolean NOT NULL DEFAULT true,
	`notifyOnCancelled` boolean NOT NULL DEFAULT true,
	`notifyOnCreditDue` boolean NOT NULL DEFAULT true,
	`templateNewOrder` text DEFAULT ('Olá {nome}! 🛢️ Seu pedido #{numero} foi recebido com sucesso. Total: R$ {total}. Aguarde a confirmação!'),
	`templateConfirmed` text DEFAULT ('Olá {nome}! ✅ Seu pedido #{numero} foi *confirmado* e está sendo preparado para entrega.'),
	`templateOutForDelivery` text DEFAULT ('Olá {nome}! 🚴 Seu pedido #{numero} *saiu para entrega* com {entregador}. Em breve chegará até você!'),
	`templateDelivered` text DEFAULT ('Olá {nome}! 🎉 Seu pedido #{numero} foi *entregue*. Obrigado pela preferência! Qualquer dúvida, estamos à disposição.'),
	`templateCancelled` text DEFAULT ('Olá {nome}! ❌ Seu pedido #{numero} foi *cancelado*. Entre em contato conosco para mais informações.'),
	`templateCreditDue` text DEFAULT ('Olá {nome}! 💰 Lembrete: sua nota de fiado de *R$ {valor}* vence em *{data}*. Entre em contato para regularizar.'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_message_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`toPhone` varchar(30) NOT NULL,
	`toName` varchar(255),
	`messageBody` text NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`referenceId` int,
	`referenceType` varchar(50),
	`status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
	`whatsappMessageId` varchar(100),
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_message_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deliverers` DROP INDEX `deliverers_email_unique`;--> statement-breakpoint
ALTER TABLE `deliverers` MODIFY COLUMN `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `deliverers` MODIFY COLUMN `email` varchar(320) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `deliverers` ADD `username` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `deliverers` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `deliverers` ADD `lastLogin` timestamp;--> statement-breakpoint
ALTER TABLE `deliverers` ADD CONSTRAINT `deliverers_username_unique` UNIQUE(`username`);