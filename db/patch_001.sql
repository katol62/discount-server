ALTER TABLE `cards` ADD `transh` INT NULL AFTER `servicetime`;
ALTER TABLE `cards` ADD `company_id` INT NULL AFTER `transh`;
ALTER TABLE `cards` ADD `owner` INT NOT NULL AFTER `company_id`;