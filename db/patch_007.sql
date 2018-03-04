ALTER TABLE `terminal` DROP `type`;
ALTER TABLE `tariff` ADD `discountType` ENUM('pass','discount') NOT NULL DEFAULT 'pass' AFTER `type`, ADD `price` INT NOT NULL DEFAULT '0' AFTER `discountType`;
