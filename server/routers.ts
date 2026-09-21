import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createTemporarySession,
  validateTemporarySession,
  getActiveGames,
  getGameBySlug,
  checkGameAccess,
  redeemActivationCode,
  createRoom,
  getRoomByCodeOrToken,
  joinRoom,
  hostStartGame,
  hostKickPlayer,
  hostCloseRoom,
  submitGameAction,
  recordPageView,
  getAdminStats,
  createActivationCodeByAdmin,
  getAllGamesAdmin,
  getAllRoomsAdmin,
  getAllCodesAdmin,
  getSupportLinks,
} from "./nolService";
import { getDb } from "./db";
import { games, rooms, activationCodes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // --- NoL Public & Player APIs (No Permanent Accounts) ---
  nol: router({
    // Anonymous Page View Log
    recordVisit: publicProcedure
      .input(z.object({ page: z.string(), sessionIdentifier: z.string() }))
      .mutation(async ({ input }) => {
        await recordPageView(input.page, input.sessionIdentifier);
        return { success: true };
      }),

    // Get Active Games Grid
    getGames: publicProcedure.query(async () => {
      return await getActiveGames();
    }),

    // Get Game Details
    getGame: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const game = await getGameBySlug(input.slug);
        if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "اللعبة غير موجودة" });
        return game;
      }),

    // Create Ephemeral Player Session
    createSession: publicProcedure
      .input(z.object({ displayName: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const clientIp = (ctx.req.headers["x-forwarded-for"] as string) || ctx.req.socket.remoteAddress;
        const userAgent = ctx.req.headers["user-agent"] as string;
        return await createTemporarySession(input.displayName, clientIp, userAgent);
      }),

    // Verify Session
    verifySession: publicProcedure
      .input(z.object({ playerId: z.string(), sessionToken: z.string() }))
      .query(async ({ input }) => {
        const session = await validateTemporarySession(input.playerId, input.sessionToken);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "انتهت صلاحية جلستك المؤقتة، الرجاء إدخال اسمك مجدداً" });
        return { valid: true, displayName: session.displayName };
      }),

    // Check Locked Game Access
    checkAccess: publicProcedure
      .input(z.object({ playerId: z.string(), gameId: z.number() }))
      .query(async ({ input }) => {
        return await checkGameAccess(input.playerId, input.gameId);
      }),

    // Redeem Subscription Code
    redeemCode: publicProcedure
      .input(z.object({ code: z.string(), playerId: z.string(), gameId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          return await redeemActivationCode(input.code, input.playerId, input.gameId);
        } catch (err: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
      }),

    // Create Room
    createRoom: publicProcedure
      .input(
        z.object({
          gameId: z.number(),
          playerId: z.string(),
          displayName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await createRoom(input.gameId, input.playerId, input.displayName);
        } catch (err: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
      }),

    // Get Room State
    getRoom: publicProcedure
      .input(z.object({ roomCode: z.string() }))
      .query(async ({ input }) => {
        const room = await getRoomByCodeOrToken(input.roomCode);
        if (!room) {
          throw new TRPCError({ code: "NOT_FOUND", message: "الغرفة غير موجودة أو انتهت صلاحيتها" });
        }
        return room;
      }),

    // Join Room
    joinRoom: publicProcedure
      .input(
        z.object({
          roomCode: z.string(),
          playerId: z.string(),
          displayName: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await joinRoom(input.roomCode, input.playerId, input.displayName);
        } catch (err: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
      }),

    // Host Starts Game (Server-Side Verified)
    hostStartGame: publicProcedure
      .input(z.object({ roomCode: z.string(), hostPlayerId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          return await hostStartGame(input.roomCode, input.hostPlayerId);
        } catch (err: any) {
          throw new TRPCError({ code: "FORBIDDEN", message: err.message });
        }
      }),

    // Host Kicks Player (Server-Side Verified)
    hostKickPlayer: publicProcedure
      .input(
        z.object({
          roomCode: z.string(),
          hostPlayerId: z.string(),
          targetPlayerId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await hostKickPlayer(input.roomCode, input.hostPlayerId, input.targetPlayerId);
        } catch (err: any) {
          throw new TRPCError({ code: "FORBIDDEN", message: err.message });
        }
      }),

    // Host Closes Room (Server-Side Verified)
    hostCloseRoom: publicProcedure
      .input(z.object({ roomCode: z.string(), hostPlayerId: z.string() }))
      .mutation(async ({ input }) => {
        try {
          return await hostCloseRoom(input.roomCode, input.hostPlayerId);
        } catch (err: any) {
          throw new TRPCError({ code: "FORBIDDEN", message: err.message });
        }
      }),

    // Submit Game Action
    submitAction: publicProcedure
      .input(
        z.object({
          roomCode: z.string(),
          playerId: z.string(),
          actionType: z.string(),
          actionData: z.any(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await submitGameAction(input.roomCode, input.playerId, input.actionType, input.actionData);
        } catch (err: any) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
      }),

    // Support Links
    getSupportLinks: publicProcedure.query(async () => {
      return await getSupportLinks();
    }),
  }),

  // --- NoL Admin Portal (Protected from regular players) ---
  admin: router({
    getStats: publicProcedure.query(async () => {
      return await getAdminStats();
    }),

    getAllGames: publicProcedure.query(async () => {
      return await getAllGamesAdmin();
    }),

    getAllRooms: publicProcedure.query(async () => {
      return await getAllRoomsAdmin();
    }),

    getAllCodes: publicProcedure.query(async () => {
      return await getAllCodesAdmin();
    }),

    createCode: publicProcedure
      .input(z.object({ gameId: z.number().nullable(), durationDays: z.number().min(1).max(365) }))
      .mutation(async ({ input }) => {
        return await createActivationCodeByAdmin(input.gameId, input.durationDays);
      }),

    toggleGameLock: publicProcedure
      .input(z.object({ gameId: z.number(), isLocked: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(games).set({ isLocked: input.isLocked }).where(eq(games.id, input.gameId));
        return { success: true };
      }),

    toggleGameActive: publicProcedure
      .input(z.object({ gameId: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(games).set({ isActive: input.isActive }).where(eq(games.id, input.gameId));
        return { success: true };
      }),

    addGame: publicProcedure
      .input(
        z.object({
          name: z.string(),
          slug: z.string(),
          description: z.string(),
          imageUrl: z.string(),
          minPlayers: z.number().default(2),
          maxPlayers: z.number().default(8),
          isLocked: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(games).values({
          ...input,
          isActive: true,
          sortOrder: 10,
        });
        return { success: true };
      }),

    closeRoomAdmin: publicProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(rooms).set({ status: "closed", endedAt: new Date() }).where(eq(rooms.id, input.roomId));
        return { success: true };
      }),

    disableCodeAdmin: publicProcedure
      .input(z.object({ codeId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(activationCodes).set({ status: "disabled" }).where(eq(activationCodes.id, input.codeId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
