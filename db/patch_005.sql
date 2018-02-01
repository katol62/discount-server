ALTER TABLE `users` CHANGE `role` `role` ENUM('super','admin','cashier','customer') CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT 'cashier';

--
-- Table structure for table `usercards`
--

CREATE TABLE `usercards` (
  `user` int(11) NOT NULL,
  `card` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Indexes for table `reference`
--
ALTER TABLE `usercards`
  ADD UNIQUE KEY `usercard` (`user`,`card`);
