ALTER TABLE `cards` ADD `date_pass` DATETIME NULL AFTER `updated_by`, ADD `date_pass_update` DATETIME NULL AFTER `date_pass`, ADD `date_discount` DATETIME NULL AFTER `date_pass_update`, ADD `pass_count` INT NOT NULL DEFAULT '0' AFTER `date_discount`;