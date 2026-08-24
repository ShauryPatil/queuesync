ALTER TABLE `queueEntries` ADD `activeKey` varchar(80);--> statement-breakpoint
ALTER TABLE `queueEntries` ADD CONSTRAINT `queue_active_customer_unique` UNIQUE(`activeKey`);