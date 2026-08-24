CREATE TABLE `resourceServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` varchar(36) NOT NULL,
	`serviceId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resourceServices_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_service_unique` UNIQUE(`resourceId`,`serviceId`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` varchar(600),
	`durationMinutes` int NOT NULL DEFAULT 30,
	`capacity` int NOT NULL DEFAULT 1,
	`priceCents` int,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_business_name_unique` UNIQUE(`businessId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `serviceId` varchar(36);--> statement-breakpoint
ALTER TABLE `queueEntries` ADD `serviceId` varchar(36);--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD `serviceId` varchar(36);--> statement-breakpoint
ALTER TABLE `slots` ADD `serviceId` varchar(36);--> statement-breakpoint
ALTER TABLE `resourceServices` ADD CONSTRAINT `resourceServices_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceServices` ADD CONSTRAINT `resourceServices_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resource_service_service_idx` ON `resourceServices` (`serviceId`);--> statement-breakpoint
CREATE INDEX `service_business_status_idx` ON `services` (`businessId`,`status`);--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queueEntries_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD CONSTRAINT `serviceSessions_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `slots` ADD CONSTRAINT `slots_serviceId_services_id_fk` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_service_idx` ON `bookings` (`serviceId`);--> statement-breakpoint
CREATE INDEX `queue_service_idx` ON `queueEntries` (`serviceId`,`status`);--> statement-breakpoint
CREATE INDEX `session_service_idx` ON `serviceSessions` (`serviceId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `slot_service_idx` ON `slots` (`serviceId`);