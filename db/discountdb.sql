-- phpMyAdmin SQL Dump
-- version 4.4.10
-- http://www.phpmyadmin.net
--
-- Host: localhost:8889
-- Generation Time: Dec 19, 2017 at 09:20 AM
-- Server version: 5.5.42
-- PHP Version: 5.6.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

--
-- Database: `discountdb`
--


CREATE DATABASE `discountdb` CHARACTER SET utf8 COLLATE utf8_general_ci;

USE `discountdb`;

-- --------------------------------------------------------

--
-- Table structure for table `cards`
--

CREATE TABLE `cards` (
  `id` int(11) NOT NULL,
  `qr_code` varchar(128) COLLATE utf8_bin NOT NULL,
  `nfs_code` varchar(128) COLLATE utf8_bin NOT NULL,
  `m_code` varchar(128) COLLATE utf8_bin NOT NULL,
  `card_nb` varchar(128) COLLATE utf8_bin NOT NULL,
  `type` enum('adult','child','other') COLLATE utf8_bin NOT NULL DEFAULT 'adult',
  `status` enum('published','sold','activated','overdue','blocked') COLLATE utf8_bin NOT NULL DEFAULT 'published',
  `lifetime` int(11) NOT NULL,
  `servicetime` int(11) NOT NULL,
  `test` enum('0','1') COLLATE utf8_bin NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `id` int(11) NOT NULL,
  `name` varchar(128) COLLATE utf8_bin NOT NULL,
  `country` int(11) NOT NULL,
  `foc` int(11) NOT NULL,
  `region` int(11) NOT NULL,
  `owner` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Table structure for table `loc_fos`
--

CREATE TABLE `loc_fos` (
  `id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `state` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `loc_fos`
--

INSERT INTO `loc_fos` (`id`, `name`, `state`) VALUES
(1, 'Южный федеральный округ', 1),
(2, 'Северо-Кавказский федеральный округ', 1);

-- --------------------------------------------------------

--
-- Table structure for table `loc_regions`
--

CREATE TABLE `loc_regions` (
  `id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL,
  `foc` int(11) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `loc_regions`
--

INSERT INTO `loc_regions` (`id`, `name`, `foc`) VALUES
(1, 'Республика Крым', 1),
(2, 'Севастополь', 1);

-- --------------------------------------------------------

--
-- Table structure for table `loc_states`
--

CREATE TABLE `loc_states` (
  `id` int(11) NOT NULL,
  `name` varchar(128) NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

--
-- Dumping data for table `loc_states`
--

INSERT INTO `loc_states` (`id`, `name`) VALUES
(1, 'Российская федерация');

-- --------------------------------------------------------

--
-- Table structure for table `reference`
--

CREATE TABLE `reference` (
  `user` int(11) NOT NULL,
  `company` int(11) NOT NULL,
  `terminal` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Table structure for table `terminal`
--

CREATE TABLE `terminal` (
  `id` int(11) NOT NULL,
  `name` varchar(128) COLLATE utf8_bin NOT NULL,
  `company` int(11) NOT NULL,
  `place` varchar(128) COLLATE utf8_bin DEFAULT NULL,
  `type` enum('pass','discount') COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Table structure for table `tariff`
--

CREATE TABLE `tariff` (
  `id` int(11) NOT NULL,
  `name` varchar(128) COLLATE utf8_bin NOT NULL,
  `start` date DEFAULT NULL,
  `end` date DEFAULT NULL,
  `type` enum('adult','child','other') COLLATE utf8_bin NOT NULL DEFAULT 'adult',
  `discount` int(11) NOT NULL,
  `terminal` int(11) NOT NULL,
  `pass` enum('0','1','3','6') COLLATE utf8_bin NOT NULL DEFAULT '0',
  `guest` enum('0','1') COLLATE utf8_bin NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(128) COLLATE utf8_bin DEFAULT NULL,
  `last` varchar(128) COLLATE utf8_bin DEFAULT NULL,
  `phone` varchar(128) COLLATE utf8_bin DEFAULT NULL,
  `email` varchar(128) COLLATE utf8_bin NOT NULL,
  `password` varchar(128) COLLATE utf8_bin NOT NULL,
  `role` enum('super','admin','cashier') COLLATE utf8_bin NOT NULL DEFAULT 'cashier',
  `parent` int(11) NOT NULL,
  `publisher` enum('0','1') COLLATE utf8_bin NOT NULL DEFAULT '0'
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `last`, `phone`, `email`, `password`, `role`, `parent`, `publisher`) VALUES
(1, 'Супер', 'Супер', NULL, 'super@s.com', '$2a$05$63vJAM8ql9LYfVvwom/iMeLLbNErXfcsg67qBL5QEHZ82EkgS3W8u', 'super', 0, '1');

-- --------------------------------------------------------
--
-- Table structure for table `transh`
--

CREATE TABLE `transh` (
  `id` int(11) NOT NULL,
  `start` int(11) NOT NULL,
  `count` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cards`
--
ALTER TABLE `cards`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `qr_code` (`qr_code`);

--
-- Indexes for table `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `loc_fos`
--
ALTER TABLE `loc_fos`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `loc_regions`
--
ALTER TABLE `loc_regions`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `loc_states`
--
ALTER TABLE `loc_states`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reference`
--
ALTER TABLE `reference`
  ADD UNIQUE KEY `user` (`user`,`company`);

--
-- Indexes for table `terminal`
--
ALTER TABLE `terminal`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tariff`
--
ALTER TABLE `tariff`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `transh`
--
ALTER TABLE `transh`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `cards`
--
ALTER TABLE `cards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `loc_fos`
--
ALTER TABLE `loc_fos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `loc_regions`
--
ALTER TABLE `loc_regions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=3;
--
-- AUTO_INCREMENT for table `loc_states`
--
ALTER TABLE `loc_states`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `terminal`
--
ALTER TABLE `terminal`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `tariff`
--
ALTER TABLE `tariff`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT,AUTO_INCREMENT=2;
--
-- AUTO_INCREMENT for table `transh`
--
ALTER TABLE `transh`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;