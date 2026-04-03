-- Gás Rápido — Backup SQL
-- Gerado em: 2026-04-03T19:03:05.324Z
-- Banco: dpRSAxcrbEujxqJpWZaMs9
-- Host: gateway05.us-east-1.prod.aws.tidbcloud.com

SET FOREIGN_KEY_CHECKS=0;

-- Tabela: __drizzle_migrations
DROP TABLE IF EXISTS `__drizzle_migrations`;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=119488;

INSERT INTO `__drizzle_migrations` (`id`, `hash`, `created_at`) VALUES
(1, '24982a8c3e77b63d9e882170b43bbefcb40272cc66c1f51e6f3d3999925971bf', 1775132333647),
(2, '8a294787fbe3695c071d31b410e358bc496c585b90df971da7b92a513d177619', 1775175295262),
(3, 'bd63d43b68db732e62612ab007e9c57c3346a48965989c8c10a34ba5b5c43ef3', 1775238024532);

-- Tabela: admin_users
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(320) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `resetToken` varchar(64) DEFAULT NULL,
  `resetTokenExpiry` timestamp NULL DEFAULT NULL,
  `lastLogin` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `admin_users_username_unique` (`username`),
  UNIQUE KEY `admin_users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

INSERT INTO `admin_users` (`id`, `username`, `email`, `passwordHash`, `name`, `isActive`, `resetToken`, `resetTokenExpiry`, `lastLogin`, `createdAt`, `updatedAt`) VALUES
(1, 'Patrick', 'admin@gasrapido.com', '$2b$12$UQXW7QrRVLjq6TMvdR7FeebpxKvug5KapV32I7GSSQJBkBJnnasJC', 'Patrick GÁS RAPIDO', 1, NULL, NULL, '2026-04-03 22:21:28', '2026-03-16 22:47:30', '2026-04-03 22:21:27');

-- Tabela: audit_logs
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(100) NOT NULL,
  `entity` varchar(100) DEFAULT NULL,
  `entityId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userRole` varchar(50) DEFAULT NULL,
  `ipAddress` varchar(45) DEFAULT NULL,
  `userAgent` text DEFAULT NULL,
  `oldData` json DEFAULT NULL,
  `newData` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `severity` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `sessionId` varchar(100) DEFAULT NULL,
  `changes` text DEFAULT NULL,
  `resourceType` varchar(100) DEFAULT NULL,
  `resourceId` int DEFAULT NULL,
  `resourceName` varchar(255) DEFAULT NULL,
  `actionType` varchar(100) DEFAULT NULL,
  `userEmail` varchar(255) DEFAULT NULL,
  `success` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: backup_files
DROP TABLE IF EXISTS `backup_files`;
CREATE TABLE `backup_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `size` int NOT NULL,
  `sizeFormatted` varchar(50) NOT NULL,
  `url` text DEFAULT NULL,
  `createdBy` varchar(255) NOT NULL,
  `backupType` enum('manual','auto') NOT NULL DEFAULT 'manual',
  `backupStatus` enum('success','failed') NOT NULL DEFAULT 'success',
  `errorMessage` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: backup_schedules
DROP TABLE IF EXISTS `backup_schedules`;
CREATE TABLE `backup_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `hour` int NOT NULL,
  `minute` int NOT NULL DEFAULT '0',
  `label` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: benefits
DROP TABLE IF EXISTS `benefits`;
CREATE TABLE `benefits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` enum('desconto','vale_gas','frete_gratis','brinde','outro') NOT NULL DEFAULT 'outro',
  `value` decimal(10,2) DEFAULT NULL,
  `minOrders` int DEFAULT NULL,
  `minSpent` decimal(10,2) DEFAULT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `usageLimit` int DEFAULT NULL,
  `usedCount` int DEFAULT '0',
  `imageUrl` text DEFAULT NULL,
  `terms` text DEFAULT NULL,
  `discountType` enum('fixo','percentual') DEFAULT 'fixo',
  `discountValue` decimal(10,2) DEFAULT '0',
  `voucherProductId` int DEFAULT NULL,
  `voucherProductName` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `requiresMinOrder` decimal(10,2) DEFAULT '0',
  `maxUsesPerCustomer` int DEFAULT '1',
  `totalUses` int NOT NULL DEFAULT '0',
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

INSERT INTO `benefits` (`id`, `name`, `description`, `type`, `value`, `minOrders`, `minSpent`, `expiresAt`, `usageLimit`, `usedCount`, `imageUrl`, `terms`, `discountType`, `discountValue`, `voucherProductId`, `voucherProductName`, `isActive`, `requiresMinOrder`, `maxUsesPerCustomer`, `totalUses`, `notes`, `createdAt`, `updatedAt`) VALUES
(1, 'gas normal', '', 'vale_gas', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, 'fixo', '0.00', NULL, 'Botijão P13 (13kg)', 1, '0.00', 1, 0, '', '2026-04-03 04:04:21', '2026-04-03 04:04:21');

-- Tabela: chat_messages
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerId` int DEFAULT NULL,
  `delivererId` int DEFAULT NULL,
  `orderId` int DEFAULT NULL,
  `senderType` varchar(50) DEFAULT NULL,
  `senderRole` enum('admin','deliverer','customer') DEFAULT NULL,
  `message` text NOT NULL,
  `messageType` varchar(50) DEFAULT NULL,
  `attachmentUrl` text DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT '0',
  `readAt` timestamp NULL DEFAULT NULL,
  `customerPhone` varchar(20) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: coupons
DROP TABLE IF EXISTS `coupons`;
CREATE TABLE `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` enum('percentual','fixo') NOT NULL,
  `value` decimal(10,2) NOT NULL,
  `minOrderValue` decimal(10,2) DEFAULT '0',
  `maxUses` int DEFAULT NULL,
  `usedCount` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `validFrom` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `validUntil` timestamp NULL DEFAULT NULL,
  `maxDiscount` decimal(10,2) DEFAULT NULL,
  `expiryDate` timestamp NULL DEFAULT NULL,
  `usageLimit` int DEFAULT NULL,
  `expiryAt` timestamp NULL DEFAULT NULL,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `startDate` timestamp NULL DEFAULT NULL,
  `maxUsesPerCustomer` int DEFAULT NULL,
  `applicableProducts` text DEFAULT NULL,
  `applicableCategories` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `coupons_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=60002;

INSERT INTO `coupons` (`id`, `code`, `description`, `type`, `value`, `minOrderValue`, `maxUses`, `usedCount`, `isActive`, `validFrom`, `validUntil`, `maxDiscount`, `expiryDate`, `usageLimit`, `expiryAt`, `expiresAt`, `startDate`, `maxUsesPerCustomer`, `applicableProducts`, `applicableCategories`, `createdAt`, `updatedAt`) VALUES
(30001, 'PAX', '', 'fixo', '5.00', '0.00', NULL, 0, 1, '2026-03-18 04:00:00', '2030-12-15 05:00:00', '2026.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-02 22:18:35');

-- Tabela: credit_note_payments
DROP TABLE IF EXISTS `credit_note_payments`;
CREATE TABLE `credit_note_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creditNoteId` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paymentMethod` enum('dinheiro','pix','debito','credito') NOT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: credit_notes
DROP TABLE IF EXISTS `credit_notes`;
CREATE TABLE `credit_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerId` int DEFAULT NULL,
  `customerName` varchar(255) NOT NULL,
  `customerPhone` varchar(20) DEFAULT NULL,
  `orderId` int DEFAULT NULL,
  `orderNumber` varchar(20) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paidAmount` decimal(10,2) NOT NULL DEFAULT '0',
  `remainingAmount` decimal(10,2) DEFAULT NULL,
  `dueDate` timestamp NOT NULL,
  `status` enum('pendente','pago','vencido','parcial') NOT NULL DEFAULT 'pendente',
  `description` text DEFAULT NULL,
  `notifiedAt` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `paidAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: customer_benefits
DROP TABLE IF EXISTS `customer_benefits`;
CREATE TABLE `customer_benefits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerId` int NOT NULL,
  `benefitId` int NOT NULL,
  `grantedAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NULL DEFAULT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `status` enum('pendente','ativo','usado','expirado','cancelado') NOT NULL DEFAULT 'ativo',
  `orderId` int DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `grantedBy` varchar(255) DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `benefitName` varchar(255) DEFAULT NULL,
  `benefitType` varchar(50) DEFAULT NULL,
  `benefitValue` decimal(10,2) DEFAULT NULL,
  `usedOrderId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: customers
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `addressNumber` varchar(20) DEFAULT NULL,
  `neighborhood` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `totalOrders` int NOT NULL DEFAULT '0',
  `totalSpent` decimal(12,2) NOT NULL DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastOrderDate` timestamp NULL DEFAULT NULL,
  `complement` varchar(100) DEFAULT NULL,
  `zipCode` varchar(10) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `source` varchar(50) DEFAULT NULL,
  `loyaltyPoints` int DEFAULT '0',
  `isBlocked` tinyint(1) DEFAULT '0',
  `referralCode` varchar(20) DEFAULT NULL,
  `cpf` varchar(14) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=150004;

INSERT INTO `customers` (`id`, `name`, `phone`, `whatsapp`, `email`, `address`, `addressNumber`, `neighborhood`, `city`, `notes`, `totalOrders`, `totalSpent`, `createdAt`, `updatedAt`, `lastOrderDate`, `complement`, `zipCode`, `state`, `lat`, `lng`, `isActive`, `source`, `loyaltyPoints`, `isBlocked`, `referralCode`, `cpf`) VALUES
(1, 'Naiguel (Stop Grill)', '64984452281', '64984452281', '', 'Av. Garibaldi Teixeira', 'São Francisco', 'Quirinópolis', '', '0', 0, '0.00', '2026-04-03 04:38:33', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, '123.4560000', 0, NULL, NULL, 1, NULL, '0'),
(30001, 'GIZELE FERREIRA DE FARIAS', '', '', '', '21 DE ABRIL', 'SANTA CLARA', 'Quirinópolis', '89 A', '0', 0, '0.00', '2026-04-02 16:29:44', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(60001, 'BETH DO SALGADO', '', '', '', 'DOMINGOS BATISTA DE SOUZA', 'HELIO LEÃO 3', 'Quirinópolis', '08', '0', 0, '0.00', '2026-04-02 16:29:44', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(60002, 'GILVANEA PRIMA', '', '', '', 'RUA 01', 'TALISMÃ', 'Quirinópolis', 'QD 34 LT09', '0', 0, '0.00', '2026-04-02 16:29:44', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(60003, 'PANIFICADORA AMERIA', '64 99641-4767', '', '', 'RUA 18', 'JARDIM VITORIA', 'Quirinópolis', '78', '0', 0, '0.00', '2026-04-02 16:29:44', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(60004, 'PÃO DE MEL', '64 99260-5304', '', '', 'R. Domingos Jacinto da Luz, 207', 'MUNICIPAL', 'Quirinópolis', '207', '0', 0, '0.00', '2026-04-02 16:29:44', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(60005, 'CLEIDIVALDO VENDEDOR', '64 99202-8658', NULL, '', 'PROFESSOR GLICERIO DA CUNHA', 'CENTRO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:32:25', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60006, 'CARLIN SUJEIRA', '64 98455-9179', NULL, '', 'RUA 12', 'ELDORADO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:33:52', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60007, 'DONA RITA', '64 98445-8832', NULL, '', 'RUA 04', 'ELDORADO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:35:53', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60008, 'ELIEL PEDREIRO', '64 98461-4575', NULL, '', 'PROFESSOR GLICERIO DA CUNHA', 'MUNICIPAL', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:37:56', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60009, 'ELIENE OU WILIAN RAPIDO CAR', '64 98139-9917', NULL, '', 'JOSE QUINTILIANO LEÃO', 'CENTRO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:41:25', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60010, 'FRANCISCO DE CASTRO', '', NULL, '', 'ALMINDA LUZIA CABRAL', 'PEDRO CARDOSO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:43:03', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60011, 'LUIZ FELIPE VIZINHO MONTADOR DE MOVEIS', '64 98421-0349', NULL, '', 'JOSE QUINTILIANO LEÃO', 'SÃO FRANCISCO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:44:37', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(60012, 'GUSTAVO CABRAL', '64 98127-3202', NULL, '', '21 DE ABRIL', 'PEDRO CARDOSO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 16:46:06', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90001, 'JOSE WALTER DA CAIXA', '64 98441-5052', NULL, '', 'JOSÉ QUINTILIANO LEÃO', 'CENTRO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:03:49', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90002, 'JOSÉ MARCIO DE OLIVEIRA', '64 98427-3512', NULL, '', 'JOSÉ QUINTILIANO LEÃO', 'SÃO FRANCISCO', 'QUIRINOPOLIS', '', '0', 0, '0.00', '2026-03-18 20:05:43', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90003, 'LEANDRIN PINTOR', '64 98432-2875', NULL, '', 'JOSE VICENTE DE PAULA', 'SOL NASCENTE', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:07:39', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90004, 'MARIA DIAS', '64 98429-9379', NULL, '', 'MANOEL JOSE CABRAL QUITO', 'CADEIA', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:09:55', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90005, 'LILIAN (MARIA APARECIDA)', '64 99289-2341', NULL, '', 'ONICIO RESENDE', 'ALEXANDRINA', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:12:08', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90006, 'MARIA AMELIO', '64 98443-4385', NULL, '', 'FABIO GARCIA', 'CENTRO', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:13:32', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90007, 'MARIA HELENA MÃE DO GUIL', '64 98427-2148', NULL, '', 'LAZARO XAVIER', 'HELIO LEÃO 3', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:15:33', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90008, 'MARIA APARECIA (NINA)', '64 98405-1115', NULL, '', 'APRIJIO DE ANDRADE', 'CHICO JUNQUEIRA', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:17:29', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(90009, 'RENATA DA EDICULA', '64 98406-8882', NULL, '', 'JOÃO GONÇALVES RODRIGUES', 'GRANVILLE', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 20:21:15', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 0, NULL, NULL, 1, NULL, '0'),
(120001, 'SIRLENE DO JAMIL', '64 98415-9408', NULL, '', 'RUA 03', 'ALPHAVILLE', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 22:38:04', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(120002, 'SONIA MARIA', '64 98442-7745', NULL, '', 'ANTONIO JOAQUIN DE ANDRADE', 'CHICO JUNQUEIRA', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 22:40:00', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0'),
(120003, 'SILVANA DA ZILDA', '64 99320-5893', NULL, '', 'LAZARO XAVIER', 'HELIO LEÃO 3', 'Quirinópolis', '', '0', 0, '0.00', '2026-03-18 22:41:27', '2026-04-03 22:31:43', NULL, NULL, NULL, '0', NULL, NULL, 1, NULL, NULL, 1, NULL, '0');

-- Tabela: deliverer_locations
DROP TABLE IF EXISTS `deliverer_locations`;
CREATE TABLE `deliverer_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `delivererId` int NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `accuracy` decimal(8,2) DEFAULT NULL,
  `speed` decimal(6,2) DEFAULT NULL,
  `heading` decimal(6,2) DEFAULT NULL,
  `altitude` decimal(8,2) DEFAULT NULL,
  `orderId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: deliverers
DROP TABLE IF EXISTS `deliverers`;
CREATE TABLE `deliverers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(320) NOT NULL DEFAULT '',
  `username` varchar(100) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isOnline` tinyint(1) NOT NULL DEFAULT '0',
  `lastSeen` timestamp NULL DEFAULT NULL,
  `vehicle` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `lastLogin` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `totalDeliveries` int DEFAULT '0',
  `rating` decimal(3,2) DEFAULT NULL,
  `currentOrderId` int DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `deliverers_username_unique` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: discount_coupons
DROP TABLE IF EXISTS `discount_coupons`;
CREATE TABLE `discount_coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discountType` varchar(50) DEFAULT NULL,
  `discountValue` decimal(10,2) DEFAULT NULL,
  `minOrderValue` decimal(10,2) DEFAULT NULL,
  `maxUses` int DEFAULT NULL,
  `currentUses` int DEFAULT '0',
  `isActive` tinyint(1) DEFAULT '1',
  `expiresAt` timestamp NULL DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `value` decimal(10,2) DEFAULT NULL,
  `usedCount` int DEFAULT '0',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `discount_coupons_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: gas_count
DROP TABLE IF EXISTS `gas_count`;
CREATE TABLE `gas_count` (
  `id` int NOT NULL AUTO_INCREMENT,
  `countDate` varchar(10) NOT NULL,
  `productId` int DEFAULT NULL,
  `productName` varchar(255) NOT NULL,
  `initialQty` int DEFAULT '0',
  `soldQty` int NOT NULL DEFAULT '0',
  `finalQty` int DEFAULT '0',
  `difference` int DEFAULT '0',
  `fullQty` int DEFAULT '0',
  `emptyQty` int DEFAULT '0',
  `returnedQty` int DEFAULT '0',
  `notes` text DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: gas_replenishment
DROP TABLE IF EXISTS `gas_replenishment`;
CREATE TABLE `gas_replenishment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` timestamp NULL DEFAULT NULL,
  `supplierName` varchar(255) DEFAULT NULL,
  `invoiceNumber` varchar(100) DEFAULT NULL,
  `totalCost` decimal(10,2) DEFAULT NULL,
  `receivedBy` varchar(255) DEFAULT NULL,
  `receivedAt` timestamp NULL DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `delivererId` int DEFAULT NULL,
  `replenishmentDate` timestamp NULL DEFAULT NULL,
  `distributorName` varchar(255) DEFAULT NULL,
  `truckPlate` varchar(20) DEFAULT NULL,
  `driverName` varchar(255) DEFAULT NULL,
  `status` enum('planejado','em_transito','chegou','processando','concluido','cancelado') NOT NULL DEFAULT 'planejado',
  `totalEmptySent` int DEFAULT '0',
  `totalFullReceived` int DEFAULT '0',
  `notes` text DEFAULT NULL,
  `arrivedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: gas_replenishment_items
DROP TABLE IF EXISTS `gas_replenishment_items`;
CREATE TABLE `gas_replenishment_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `replenishmentId` int NOT NULL,
  `productId` int NOT NULL,
  `productName` varchar(255) NOT NULL,
  `quantity` int DEFAULT '0',
  `unitCost` decimal(10,2) DEFAULT NULL,
  `totalCost` decimal(10,2) DEFAULT NULL,
  `emptyQty` int DEFAULT NULL,
  `fullQty` int DEFAULT NULL,
  `emptySent` int DEFAULT '0',
  `fullReceived` int DEFAULT '0',
  `notes` text DEFAULT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: gas_vouchers
DROP TABLE IF EXISTS `gas_vouchers`;
CREATE TABLE `gas_vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `customerId` int DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(20) DEFAULT NULL,
  `productId` int DEFAULT NULL,
  `productName` varchar(255) NOT NULL DEFAULT 'Botijão P13 (13kg)',
  `quantity` int DEFAULT '1',
  `usedQuantity` int DEFAULT '0',
  `status` enum('ativo','usado','expirado','cancelado') NOT NULL DEFAULT 'ativo',
  `expiresAt` timestamp NULL DEFAULT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `orderId` int DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `value` decimal(10,2) DEFAULT NULL,
  `usedAmount` decimal(10,2) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `benefitId` int DEFAULT NULL,
  `issuedAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `usedOrderId` int DEFAULT NULL,
  `issuedBy` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `gas_vouchers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: inventory_adjustments
DROP TABLE IF EXISTS `inventory_adjustments`;
CREATE TABLE `inventory_adjustments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adjustmentDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `type` varchar(100) NOT NULL,
  `productId` int NOT NULL,
  `productName` varchar(255) NOT NULL,
  `previousQty` int NOT NULL,
  `newQty` int NOT NULL,
  `difference` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `referenceId` int DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdBy` varchar(255) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: order_items
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `productId` int DEFAULT NULL,
  `productName` varchar(255) NOT NULL,
  `unitPrice` decimal(10,2) NOT NULL,
  `quantity` int NOT NULL,
  `totalPrice` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0',
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: orders
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderNumber` varchar(20) NOT NULL,
  `customerId` int DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(20) DEFAULT NULL,
  `customerWhatsapp` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `deliveryAddress` text DEFAULT NULL,
  `neighborhood` varchar(100) DEFAULT NULL,
  `status` enum('novo','em_preparo','aguardando_entregador','saiu_entrega','entregue','cancelado') NOT NULL DEFAULT 'novo',
  `paymentMethod` enum('dinheiro','pix','debito','credito','fiado') NOT NULL,
  `paymentStatus` varchar(50) DEFAULT NULL,
  `paymentConfirmed` tinyint(1) NOT NULL DEFAULT '0',
  `paymentConfirmedAt` timestamp NULL DEFAULT NULL,
  `delivererId` int DEFAULT NULL,
  `delivererName` varchar(255) DEFAULT NULL,
  `totalAmount` decimal(10,2) DEFAULT NULL,
  `discountAmount` decimal(10,2) DEFAULT '0',
  `deliveryFee` decimal(10,2) NOT NULL DEFAULT '0',
  `finalAmount` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `discount` decimal(10,2) DEFAULT '0',
  `total` decimal(10,2) DEFAULT NULL,
  `couponCode` varchar(50) DEFAULT NULL,
  `couponDiscount` decimal(10,2) DEFAULT NULL,
  `change` decimal(10,2) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `cancelReason` text DEFAULT NULL,
  `estimatedDelivery` timestamp NULL DEFAULT NULL,
  `deliverBy` timestamp NULL DEFAULT NULL,
  `deliveredAt` timestamp NULL DEFAULT NULL,
  `cancelledAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `orders_orderNumber_unique` (`orderNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=180005;

INSERT INTO `orders` (`id`, `orderNumber`, `customerId`, `customerName`, `customerPhone`, `customerWhatsapp`, `address`, `deliveryAddress`, `neighborhood`, `status`, `paymentMethod`, `paymentStatus`, `paymentConfirmed`, `paymentConfirmedAt`, `delivererId`, `delivererName`, `totalAmount`, `discountAmount`, `deliveryFee`, `finalAmount`, `subtotal`, `discount`, `total`, `couponCode`, `couponDiscount`, `change`, `notes`, `source`, `cancelReason`, `estimatedDelivery`, `deliverBy`, `deliveredAt`, `cancelledAt`, `completedAt`, `createdAt`, `updatedAt`) VALUES
(150004, 'GR20260403004042', NULL, 'Naiguel (Stop Grill)', '64984452281', 'Av. Garibaldi Teixei', 'São Francisco', 'aguardando_entregador', 'credito', '', '', '1', 0, '2000-01-20 05:00:00', 0, '0.00', '120.00', NULL, '0.00', NULL, '2026.00', '2026.00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- Tabela: payment_discounts
DROP TABLE IF EXISTS `payment_discounts`;
CREATE TABLE `payment_discounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` int NOT NULL,
  `paymentMethod` enum('dinheiro','pix','debito','credito','fiado') NOT NULL,
  `originalAmount` decimal(10,2) DEFAULT NULL,
  `discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
  `finalAmount` decimal(10,2) DEFAULT NULL,
  `discountPercentage` decimal(5,2) DEFAULT NULL,
  `appliedAt` timestamp NULL DEFAULT NULL,
  `appliedBy` varchar(255) DEFAULT NULL,
  `discountType` varchar(50) DEFAULT NULL,
  `discountValue` decimal(10,2) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `discountReason` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: products
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `costPrice` decimal(10,2) DEFAULT NULL,
  `imageUrl` text DEFAULT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'gas',
  `unit` varchar(20) NOT NULL DEFAULT 'unidade',
  `stockQty` int NOT NULL DEFAULT '0',
  `fullStockQty` int NOT NULL DEFAULT '0',
  `emptyStockQty` int NOT NULL DEFAULT '0',
  `minStock` int NOT NULL DEFAULT '5',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `weight` decimal(8,3) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `isVisible` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30002;

INSERT INTO `products` (`id`, `name`, `description`, `price`, `costPrice`, `imageUrl`, `category`, `unit`, `stockQty`, `fullStockQty`, `emptyStockQty`, `minStock`, `isActive`, `createdAt`, `updatedAt`, `weight`, `barcode`, `supplier`, `notes`, `isVisible`) VALUES
(1, 'Botíjão de Gás 13kg', 'Botíjão GLP 13kg. Ideal para uso doméstico. Entrega rápida na sua porta.', '120.00', NULL, NULL, 'gas', 'unidade', 129, 10, 1, 10, 1, '2000-01-30 05:00:00', '2026-04-03 22:33:12', NULL, NULL, NULL, NULL, 1),
(2, 'Botíjão de Gás 20kg', 'Botíjão GLP 20kg. Ideal para comércios e restaurantes.', '180.00', NULL, NULL, 'gas', 'unidade', 3, 5, 1, 3, 1, NULL, '2026-04-03 22:33:12', NULL, NULL, NULL, NULL, 1),
(3, 'Botíjão de Gás 45kg', 'Botíjão GLP 45kg. Para grandes estabelecimentos e indústrias.', '380.00', NULL, NULL, 'gas', 'unidade', 1, 3, 1, 2, 1, NULL, '2026-04-03 22:33:12', NULL, NULL, NULL, NULL, 1),
(4, 'Água Mineral 20L', 'Galão de água mineral natural 20 litros. Entrega com troca de vasilhame.', '18.00', NULL, NULL, 'agua', 'galão', 40, 10, 1, 5, 1, NULL, '2026-04-03 22:33:12', NULL, NULL, NULL, NULL, 1),
(5, 'Mangueira de Gás 1,20m', 'Mangueira de gás com 1,20m. Alta resistência e segurança.', '28.00', NULL, NULL, 'acessorio', 'unidade', 20, 5, 1, 5, 1, NULL, '2026-04-03 22:33:12', NULL, NULL, NULL, NULL, 1),
(6, 'Regulador de Gás', 'Regulador de pressão para botíjão. Homologado pelo INMETRO.', '35.00', NULL, NULL, 'acessorio', 'unidade', 15, 5, 1, 5, 1, NULL, '2026-04-03 22:33:13', NULL, NULL, NULL, NULL, 1);

-- Tabela: promotions
DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `value` decimal(10,2) DEFAULT NULL,
  `minOrderValue` decimal(10,2) DEFAULT '0',
  `maxDiscount` decimal(10,2) DEFAULT NULL,
  `productIds` text DEFAULT NULL,
  `categoryIds` text DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `startDate` timestamp NULL DEFAULT NULL,
  `endDate` timestamp NULL DEFAULT NULL,
  `usageLimit` int DEFAULT NULL,
  `usedCount` int DEFAULT '0',
  `imageUrl` text DEFAULT NULL,
  `terms` text DEFAULT NULL,
  `priority` int DEFAULT '0',
  `buyQuantity` int DEFAULT NULL,
  `getQuantity` int DEFAULT NULL,
  `discountType` enum('percentual','fixo','frete_gratis') DEFAULT NULL,
  `discountValue` decimal(10,2) DEFAULT '0',
  `appliesTo` enum('todos','categoria','produto') DEFAULT 'todos',
  `appliesToCategory` varchar(50) DEFAULT NULL,
  `appliesToProductId` int DEFAULT NULL,
  `minQuantity` int DEFAULT '1',
  `validFrom` timestamp NULL DEFAULT NULL,
  `validUntil` timestamp NULL DEFAULT NULL,
  `maxUses` int DEFAULT NULL,
  `maxUsesPerCustomer` int DEFAULT NULL,
  `isFeatured` tinyint(1) DEFAULT '0',
  `notes` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: push_subscriptions
DROP TABLE IF EXISTS `push_subscriptions`;
CREATE TABLE `push_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `endpoint` text NOT NULL,
  `p256dh` text DEFAULT NULL,
  `auth` text DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `userType` varchar(50) DEFAULT NULL,
  `delivererId` int DEFAULT NULL,
  `p256dhKey` text DEFAULT NULL,
  `authKey` text DEFAULT NULL,
  `userAgent` varchar(500) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: settings
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=270089;

INSERT INTO `settings` (`id`, `key`, `value`, `createdAt`, `updatedAt`) VALUES
(1, 'storeName', 'Gás Rápido', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(2, 'phone', '(64) 3651-1874', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(3, 'whatsapp', '(64) 98456-5616', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(4, 'address', 'Av. José Quintiliano Leão, 346 B', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(5, 'city', 'Quirinópolis', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(6, 'state', 'GO', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(7, 'openingHours', 'Seg-Sáb: 07:00 - 19:00 | Dom: 08:00 - 12:00', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(8, 'deliveryFee', '0.00', '2026-03-17 15:18:37', '2026-04-02 16:35:49'),
(9, 'minOrderValue', '0.00', '2026-03-16 22:47:31', '2026-04-02 16:35:49'),
(240088, 'zipCode', '', '2026-03-17 15:09:06', '2026-04-02 16:35:49'),
(240092, 'deliveryRadius', '10', '2026-03-17 15:09:06', '2026-04-02 16:35:49'),
(240093, 'adminEmail', 'admin@gasrapido.com', '2026-03-17 15:09:07', '2026-04-02 16:35:49'),
(240094, 'lowStockThreshold', '10', '2026-03-17 15:09:07', '2026-04-02 16:35:49');

-- Tabela: stock_movements
DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `productName` varchar(255) NOT NULL,
  `type` enum('entrada','saida','ajuste') NOT NULL,
  `quantity` int NOT NULL,
  `previousQty` int NOT NULL,
  `newQty` int NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `referenceId` int DEFAULT NULL,
  `orderId` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: truck_deliveries
DROP TABLE IF EXISTS `truck_deliveries`;
CREATE TABLE `truck_deliveries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deliveryDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `licensePlate` varchar(20) DEFAULT NULL,
  `driverName` varchar(255) DEFAULT NULL,
  `status` enum('planejado','em_transito','chegou','processando','concluido','cancelado') NOT NULL DEFAULT 'planejado',
  `emptyBottlesReceived` int DEFAULT '0',
  `fullBottlesDelivered` int DEFAULT '0',
  `truckPlate` varchar(20) DEFAULT NULL,
  `driverId` int DEFAULT NULL,
  `totalEmptyReceived` int DEFAULT NULL,
  `totalFullDelivered` int DEFAULT NULL,
  `arrivedAt` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: truck_delivery_items
DROP TABLE IF EXISTS `truck_delivery_items`;
CREATE TABLE `truck_delivery_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `deliveryId` int DEFAULT NULL,
  `truckDeliveryId` int DEFAULT NULL,
  `productId` int NOT NULL,
  `productName` varchar(255) NOT NULL,
  `quantity` int DEFAULT '0',
  `quantityDelivered` int DEFAULT NULL,
  `quantityReturned` int DEFAULT NULL,
  `unitCost` decimal(10,2) DEFAULT NULL,
  `emptyReceived` int DEFAULT NULL,
  `fullDelivered` int DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  UNIQUE KEY `users_openId_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=90005;

INSERT INTO `users` (`id`, `openId`, `name`, `email`, `loginMethod`, `role`, `createdAt`, `updatedAt`, `lastSignedIn`) VALUES
(1, '3E89xUFEF5iYryRohJhYZS', 'Daniela Marques', 'cemeem054@gmail.com', 'google', 'admin', '2026-04-03 21:42:10', '2026-04-03 23:03:05', '2026-04-03 23:03:06'),
(2, 'nzWT8cozuahnUBeBAXwMhL', 'Felipe Gomes', 'cemeem047@gmail.com', 'google', 'admin', '2026-04-02 16:30:07', '2026-04-03 04:59:16', '2026-04-03 04:59:16'),
(60004, 'admin-test-1775153358701', 'Admin Teste', 'admin@gasrapido.local', 'test', 'admin', '2026-04-02 22:09:18', '2026-04-02 22:09:18', '2026-04-02 22:09:18');

-- Tabela: whatsapp_config
DROP TABLE IF EXISTS `whatsapp_config`;
CREATE TABLE `whatsapp_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) DEFAULT NULL,
  `apiUrl` text DEFAULT NULL,
  `apiKey` text DEFAULT NULL,
  `instanceName` varchar(100) DEFAULT NULL,
  `phoneNumber` varchar(30) NOT NULL DEFAULT '',
  `isActive` tinyint(1) NOT NULL DEFAULT '0',
  `webhookUrl` text DEFAULT NULL,
  `webhookSecret` varchar(255) DEFAULT NULL,
  `autoReply` tinyint(1) DEFAULT '0',
  `autoReplyMessage` text DEFAULT NULL,
  `orderConfirmationTemplate` text DEFAULT NULL,
  `orderDeliveredTemplate` text DEFAULT NULL,
  `orderCancelledTemplate` text DEFAULT NULL,
  `newOrderNotification` tinyint(1) DEFAULT '1',
  `adminPhone` varchar(30) DEFAULT NULL,
  `connectionStatus` varchar(50) DEFAULT NULL,
  `phoneNumberId` varchar(100) DEFAULT NULL,
  `accessToken` text DEFAULT NULL,
  `businessAccountId` varchar(100) DEFAULT NULL,
  `notifyOnNewOrder` tinyint(1) DEFAULT '1',
  `notifyOnConfirmed` tinyint(1) DEFAULT '1',
  `notifyOnOutForDelivery` tinyint(1) DEFAULT '1',
  `notifyOnDelivered` tinyint(1) DEFAULT '1',
  `notifyOnCancelled` tinyint(1) DEFAULT '1',
  `notifyOnCreditDue` tinyint(1) DEFAULT '1',
  `templateNewOrder` text DEFAULT NULL,
  `templateConfirmed` text DEFAULT NULL,
  `templateOutForDelivery` text DEFAULT NULL,
  `templateDelivered` text DEFAULT NULL,
  `templateCancelled` text DEFAULT NULL,
  `templateCreditDue` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Tabela: whatsapp_message_log
DROP TABLE IF EXISTS `whatsapp_message_log`;
CREATE TABLE `whatsapp_message_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone` varchar(30) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
  `orderId` int DEFAULT NULL,
  `customerId` int DEFAULT NULL,
  `errorMessage` text DEFAULT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `messageId` varchar(100) DEFAULT NULL,
  `error` text DEFAULT NULL,
  `whatsappMessageId` varchar(100) DEFAULT NULL,
  `sentAt` timestamp NULL DEFAULT NULL,
  `toPhone` varchar(30) DEFAULT NULL,
  `toName` varchar(255) DEFAULT NULL,
  `messageBody` text DEFAULT NULL,
  `eventType` varchar(50) DEFAULT NULL,
  `referenceId` int DEFAULT NULL,
  `referenceType` varchar(50) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

SET FOREIGN_KEY_CHECKS=1;

-- Fim do backup