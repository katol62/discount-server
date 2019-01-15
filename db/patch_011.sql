ALTER TABLE `cards`
  MODIFY COLUMN `type` enum('adult','child','group','other') COLLATE utf8_bin NOT NULL DEFAULT 'adult' AFTER `card_nb`;

ALTER TABLE `tariff`
  MODIFY COLUMN `type` enum('adult','child','group','other') COLLATE utf8_bin NOT NULL DEFAULT 'adult' AFTER `end`;

CREATE TABLE `tariff_card` (
  `card` varchar(128) COLLATE utf8_bin NOT NULL,
  `tariff` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

ALTER TABLE `tariff_card`
  ADD PRIMARY KEY (`card`,`tariff`);