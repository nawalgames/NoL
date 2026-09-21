import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table for Admin authentication only.
 * Players NEVER have accounts or rows here.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Dynamic Games Registry
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("imageUrl").notNull(),
  gameUrl: varchar("gameUrl", { length: 255 }).default(""),
  isActive: boolean("isActive").default(true).notNull(),
  isLocked: boolean("isLocked").default(false).notNull(),
  minPlayers: int("minPlayers").default(2).notNull(),
  maxPlayers: int("maxPlayers").default(8).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Temporary Player Sessions (NO permanent user accounts)
 */
export const temporarySessions = mysqlTable("temporary_sessions", {
  id: int("id").autoincrement().primaryKey(),
  playerId: varchar("playerId", { length: 64 }).notNull().unique(),
  sessionTokenHash: varchar("sessionTokenHash", { length: 128 }).notNull(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  ipHash: varchar("ipHash", { length: 128 }),
  userAgentHash: varchar("userAgentHash", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

/**
 * Temporary Game Rooms
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  roomCode: varchar("roomCode", { length: 16 }).notNull().unique(),
  roomToken: varchar("roomToken", { length: 64 }).notNull().unique(),
  gameId: int("gameId").notNull(),
  hostPlayerId: varchar("hostPlayerId", { length: 64 }).notNull(),
  status: varchar("status", { length: 24 }).default("waiting").notNull(), // waiting, playing, finished, expired, closed
  gameState: json("gameState").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

/**
 * Room Players (Ephemeral)
 */
export const roomPlayers = mysqlTable("room_players", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  displayName: varchar("displayName", { length: 64 }).notNull(),
  isHost: boolean("isHost").default(false).notNull(),
  isConnected: boolean("isConnected").default(true).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  score: int("score").default(0).notNull(),
  metadata: json("metadata").$type<Record<string, any>>().notNull(),
});

/**
 * Activation Codes
 */
export const activationCodes = mysqlTable("activation_codes", {
  id: int("id").autoincrement().primaryKey(),
  codeHash: varchar("codeHash", { length: 128 }).notNull().unique(),
  codeDisplayPrefix: varchar("codeDisplayPrefix", { length: 16 }).notNull(),
  gameId: int("gameId"),
  durationDays: int("durationDays").default(30).notNull(),
  status: varchar("status", { length: 24 }).default("unused").notNull(), // unused, active, expired, disabled
  createdBy: varchar("createdBy", { length: 64 }).default("admin").notNull(),
  activatedByPlayerId: varchar("activatedByPlayerId", { length: 64 }),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Temporary Session Game Access
 */
export const sessionGameAccess = mysqlTable("session_game_access", {
  id: int("id").autoincrement().primaryKey(),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  gameId: int("gameId").notNull(),
  activationCodeId: int("activationCodeId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

/**
 * Game Events
 */
export const gameEvents = mysqlTable("game_events", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payload: json("payload").$type<Record<string, any>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Site Settings
 */
export const siteSettings = mysqlTable("site_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<Record<string, any>>().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/**
 * Support Links
 */
export const supportLinks = mysqlTable("support_links", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 64 }).notNull(),
  url: text("url").notNull(),
  icon: varchar("icon", { length: 64 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Anonymous Visit Stats
 */
export const visitStats = mysqlTable("visit_stats", {
  id: int("id").autoincrement().primaryKey(),
  page: varchar("page", { length: 128 }).notNull(),
  sessionIdentifier: varchar("sessionIdentifier", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;
export type TemporarySession = typeof temporarySessions.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type ActivationCode = typeof activationCodes.$inferSelect;
export type SupportLink = typeof supportLinks.$inferSelect;
