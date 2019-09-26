CREATE TABLE `purchased_pass` (
                                  `id` int(11) NOT NULL,
                                  `card` int(11) NOT NULL,
                                  `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  `pass` int(11) NOT NULL,
                                  `days` int(11) NOT NULL,
                                  `pass_limit` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

ALTER TABLE `purchased_pass`
    ADD PRIMARY KEY (`id`);

ALTER TABLE `purchased_pass`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
