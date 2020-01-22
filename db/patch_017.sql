ALTER TABLE `users` CHANGE `role` `role` ENUM('super','admin','cashier','customer','partner') CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT 'cashier';

