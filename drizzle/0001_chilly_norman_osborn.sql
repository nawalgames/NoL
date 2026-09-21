CREATE TABLE `activation_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`codeDisplayPrefix` varchar(16) NOT NULL,
	`gameId` int,
	`durationDays` int NOT NULL DEFAULT 30,
	`status` varchar(24) NOT NULL DEFAULT 'unused',
	`createdBy` varchar(64) NOT NULL DEFAULT 'admin',
	`activatedByPlayerId` varchar(64),
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activation_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `activation_codes_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `game_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`imageUrl` text NOT NULL,
	`gameUrl` varchar(255) DEFAULT '',
	`isActive` boolean NOT NULL DEFAULT true,
	`isLocked` boolean NOT NULL DEFAULT false,
	`minPlayers` int NOT NULL DEFAULT 2,
	`maxPlayers` int NOT NULL DEFAULT 8,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `room_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`playerId` varchar(64) NOT NULL,
	`displayName` varchar(64) NOT NULL,
	`isHost` boolean NOT NULL DEFAULT false,
	`isConnected` boolean NOT NULL DEFAULT true,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`score` int NOT NULL DEFAULT 0,
	`metadata` json NOT NULL,
	CONSTRAINT `room_players_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomCode` varchar(16) NOT NULL,
	`roomToken` varchar(64) NOT NULL,
	`gameId` int NOT NULL,
	`hostPlayerId` varchar(64) NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'waiting',
	`gameState` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`endedAt` timestamp,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_roomCode_unique` UNIQUE(`roomCode`),
	CONSTRAINT `rooms_roomToken_unique` UNIQUE(`roomToken`)
);
--> statement-breakpoint
CREATE TABLE `session_game_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` varchar(64) NOT NULL,
	`gameId` int NOT NULL,
	`activationCodeId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `session_game_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `support_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platform` varchar(32) NOT NULL,
	`title` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`icon` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_links_platform_unique` UNIQUE(`platform`)
);
--> statement-breakpoint
CREATE TABLE `temporary_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playerId` varchar(64) NOT NULL,
	`sessionTokenHash` varchar(128) NOT NULL,
	`displayName` varchar(64) NOT NULL,
	`ipHash` varchar(128),
	`userAgentHash` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `temporary_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `temporary_sessions_playerId_unique` UNIQUE(`playerId`)
);
--> statement-breakpoint
CREATE TABLE `visit_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page` varchar(128) NOT NULL,
	`sessionIdentifier` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visit_stats_id` PRIMARY KEY(`id`)
);
