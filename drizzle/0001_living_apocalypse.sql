CREATE TABLE `bookings` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`customerId` int NOT NULL,
	`resourceId` varchar(36) NOT NULL,
	`slotId` varchar(36),
	`status` enum('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'confirmed',
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`bookingCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`bookingConfirmedAt` timestamp,
	`bookingCancelledAt` timestamp,
	`bookingRescheduledAt` timestamp,
	`bookingCompletedAt` timestamp,
	`cancellationReason` varchar(500),
	`notes` varchar(800),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `businessMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','manager','staff') NOT NULL DEFAULT 'staff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_member_unique` UNIQUE(`businessId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` varchar(36) NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` varchar(1200),
	`address` varchar(500),
	`area` varchar(120),
	`phone` varchar(40),
	`timezone` varchar(80) NOT NULL DEFAULT 'Asia/Kolkata',
	`defaultServiceDurationMinutes` int NOT NULL DEFAULT 30,
	`settings` json,
	`isActive` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `businesses_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `eventLogs` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36),
	`actorId` int,
	`resourceId` varchar(36),
	`bookingId` varchar(36),
	`queueEntryId` varchar(36),
	`eventType` varchar(100) NOT NULL,
	`metadata` json,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`businessId` varchar(36),
	`type` varchar(80) NOT NULL,
	`title` varchar(160) NOT NULL,
	`message` varchar(800) NOT NULL,
	`metadata` json,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `queueEntries` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`customerId` int NOT NULL,
	`resourceId` varchar(36),
	`bookingId` varchar(36),
	`status` enum('waiting','called','in_service','completed','no_show','cancelled') NOT NULL DEFAULT 'waiting',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`calledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`noShowAt` timestamp,
	`cancelledAt` timestamp,
	`estimatedWaitMinutes` int,
	`estimationBasis` varchar(120),
	`notes` varchar(800),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queueEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resourceSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`resourceId` varchar(36),
	`dayOfWeek` int NOT NULL,
	`opensAt` varchar(5) NOT NULL,
	`closesAt` varchar(5) NOT NULL,
	`isOpen` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resourceSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`resourceType` varchar(100) NOT NULL,
	`description` varchar(600),
	`capacity` int NOT NULL DEFAULT 1,
	`status` enum('available','busy','offline','maintenance') NOT NULL DEFAULT 'available',
	`configuredServiceDurationMinutes` int NOT NULL DEFAULT 30,
	`isPublic` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resource_business_name_unique` UNIQUE(`businessId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `serviceSessions` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`queueEntryId` varchar(36) NOT NULL,
	`resourceId` varchar(36) NOT NULL,
	`customerId` int NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`durationMinutes` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `serviceSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `serviceSessions_queueEntryId_unique` UNIQUE(`queueEntryId`)
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` varchar(36) NOT NULL,
	`businessId` varchar(36) NOT NULL,
	`resourceId` varchar(36) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`capacity` int NOT NULL DEFAULT 1,
	`status` enum('available','blocked','closed') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `slots_id` PRIMARY KEY(`id`),
	CONSTRAINT `slot_resource_window_unique` UNIQUE(`resourceId`,`startsAt`,`endsAt`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(160);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','customer','merchant','admin') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_slotId_slots_id_fk` FOREIGN KEY (`slotId`) REFERENCES `slots`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessMembers` ADD CONSTRAINT `businessMembers_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessMembers` ADD CONSTRAINT `businessMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventLogs` ADD CONSTRAINT `eventLogs_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventLogs` ADD CONSTRAINT `eventLogs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventLogs` ADD CONSTRAINT `eventLogs_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventLogs` ADD CONSTRAINT `eventLogs_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `eventLogs` ADD CONSTRAINT `eventLogs_queueEntryId_queueEntries_id_fk` FOREIGN KEY (`queueEntryId`) REFERENCES `queueEntries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queueEntries_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queueEntries_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queueEntries_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queueEntries_bookingId_bookings_id_fk` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceSchedules` ADD CONSTRAINT `resourceSchedules_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resourceSchedules` ADD CONSTRAINT `resourceSchedules_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resources` ADD CONSTRAINT `resources_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD CONSTRAINT `serviceSessions_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD CONSTRAINT `serviceSessions_queueEntryId_queueEntries_id_fk` FOREIGN KEY (`queueEntryId`) REFERENCES `queueEntries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD CONSTRAINT `serviceSessions_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `serviceSessions` ADD CONSTRAINT `serviceSessions_customerId_users_id_fk` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `slots` ADD CONSTRAINT `slots_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `slots` ADD CONSTRAINT `slots_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_business_time_idx` ON `bookings` (`businessId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `booking_customer_idx` ON `bookings` (`customerId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `booking_resource_time_idx` ON `bookings` (`resourceId`,`startsAt`);--> statement-breakpoint
CREATE INDEX `member_user_idx` ON `businessMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `business_owner_idx` ON `businesses` (`ownerId`);--> statement-breakpoint
CREATE INDEX `business_category_idx` ON `businesses` (`category`);--> statement-breakpoint
CREATE INDEX `event_business_time_idx` ON `eventLogs` (`businessId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `event_entity_idx` ON `eventLogs` (`queueEntryId`,`bookingId`);--> statement-breakpoint
CREATE INDEX `notification_user_read_idx` ON `notifications` (`userId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notification_business_idx` ON `notifications` (`businessId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `queue_business_status_idx` ON `queueEntries` (`businessId`,`status`,`joinedAt`);--> statement-breakpoint
CREATE INDEX `queue_customer_idx` ON `queueEntries` (`customerId`,`joinedAt`);--> statement-breakpoint
CREATE INDEX `queue_resource_idx` ON `queueEntries` (`resourceId`,`status`);--> statement-breakpoint
CREATE INDEX `schedule_business_idx` ON `resourceSchedules` (`businessId`);--> statement-breakpoint
CREATE INDEX `schedule_resource_idx` ON `resourceSchedules` (`resourceId`);--> statement-breakpoint
CREATE INDEX `resource_business_idx` ON `resources` (`businessId`);--> statement-breakpoint
CREATE INDEX `session_business_time_idx` ON `serviceSessions` (`businessId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `session_resource_idx` ON `serviceSessions` (`resourceId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `slot_business_time_idx` ON `slots` (`businessId`,`startsAt`);