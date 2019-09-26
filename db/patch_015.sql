 ALTER TABLE `cards` CHANGE `pass` `pass` TINYINT NOT NULL DEFAULT 0;
 UPDATE `cards` SET pass = pass - 1;
 UPDATE `cards` SET pass = 6 WHERE pass = 3;
 UPDATE `cards` SET pass = 3 WHERE pass = 2;

