import { eq, and, desc, gt, sql } from "drizzle-orm";
import crypto from "crypto";
import { getDb } from "./db";
import {
  games,
  rooms,
  roomPlayers,
  temporarySessions,
  activationCodes,
  sessionGameAccess,
  gameEvents,
  siteSettings,
  supportLinks,
  visitStats,
  users,
} from "../drizzle/schema";

// --- Utility Functions ---

export function generateSecureRoomToken(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    token += chars[randomBytes[i] % chars.length];
  }
  return token;
}

export function generatePlayerId(): string {
  return "p_" + crypto.randomBytes(12).toString("hex");
}

export function generateSessionToken(): string {
  return "s_" + crypto.randomBytes(24).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Sanitize display name (strict 2-20 characters, no HTML/JS injection)
export function sanitizeDisplayName(name: string): string {
  if (!name) return "";
  const clean = name
    .replace(/[<>'"&/\\;`]/g, "")
    .trim()
    .slice(0, 20);
  return clean;
}

// --- Session Management ---

export async function createTemporarySession(displayName: string, ip?: string, userAgent?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const cleanName = sanitizeDisplayName(displayName);
  if (cleanName.length < 2) {
    throw new Error("اسم اللاعب يجب أن يكون حرفين على الأقل وبدون رموز خاصة");
  }

  const playerId = generatePlayerId();
  const sessionToken = generateSessionToken();
  const sessionTokenHash = hashToken(sessionToken);
  const ipHash = ip ? crypto.createHash("sha256").update(ip).digest("hex") : null;
  const userAgentHash = userAgent ? crypto.createHash("sha256").update(userAgent).digest("hex") : null;

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 6);

  await db.insert(temporarySessions).values({
    playerId,
    sessionTokenHash,
    displayName: cleanName,
    ipHash,
    userAgentHash,
    expiresAt,
  });

  return {
    playerId,
    sessionToken,
    displayName: cleanName,
    expiresAt,
  };
}

export async function validateTemporarySession(playerId: string, sessionToken: string) {
  const db = await getDb();
  if (!db) return null;

  const sessionTokenHash = hashToken(sessionToken);
  const rows = await db
    .select()
    .from(temporarySessions)
    .where(
      and(
        eq(temporarySessions.playerId, playerId),
        eq(temporarySessions.sessionTokenHash, sessionTokenHash),
        gt(temporarySessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!rows.length) return null;

  // Touch last activity
  await db
    .update(temporarySessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(temporarySessions.playerId, playerId));

  return rows[0];
}

// --- Game Queries ---

export async function getActiveGames() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(games)
    .where(eq(games.isActive, true))
    .orderBy(games.sortOrder);
}

export async function getGameBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(games).where(eq(games.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getGameById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(games).where(eq(games.id, id)).limit(1);
  return rows[0] ?? null;
}

// --- Activation Code Validation & Permissions ---

export async function checkGameAccess(playerId: string, gameId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const game = await getGameById(gameId);
  if (!game) return false;
  if (!game.isLocked) return true; // Open games do not require code

  const rows = await db
    .select()
    .from(sessionGameAccess)
    .where(
      and(
        eq(sessionGameAccess.playerId, playerId),
        eq(sessionGameAccess.gameId, gameId),
        gt(sessionGameAccess.expiresAt, new Date())
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function redeemActivationCode(code: string, playerId: string, gameId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const cleanCode = code.trim().toUpperCase();
  const codeHash = crypto.createHash("sha256").update(cleanCode).digest("hex");

  const codeRows = await db
    .select()
    .from(activationCodes)
    .where(and(eq(activationCodes.codeHash, codeHash), eq(activationCodes.status, "unused")))
    .limit(1);

  if (!codeRows.length) {
    throw new Error("كود التفعيل غير صحيح، مستخدم مسبقاً، أو غير متاح");
  }

  const record = codeRows[0];
  if (record.gameId && record.gameId !== gameId) {
    throw new Error("هذا الكود مخصص للعبة أخرى");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + record.durationDays);

  // Update code status
  await db
    .update(activationCodes)
    .set({
      status: "active",
      activatedByPlayerId: playerId,
      activatedAt: new Date(),
      expiresAt,
    })
    .where(eq(activationCodes.id, record.id));

  // Grant access
  await db
    .insert(sessionGameAccess)
    .values({
      playerId,
      gameId,
      activationCodeId: record.id,
      expiresAt,
    });

  return { success: true, expiresAt };
}

// --- Room Engine ---

export async function createRoom(gameId: number, hostPlayerId: string, hostDisplayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const game = await getGameById(gameId);
  if (!game) throw new Error("اللعبة غير موجودة");

  // Verify access for locked games
  const hasAccess = await checkGameAccess(hostPlayerId, gameId);
  if (!hasAccess) {
    throw new Error("تحتاج إلى كود تفعيل صالح لإنشاء غرفة في هذه اللعبة الخاصة");
  }

  const roomCode = generateSecureRoomToken(8);
  const roomToken = "rt_" + crypto.randomBytes(16).toString("hex");

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Initial Game State depending on game
  let initialGameState: Record<string, any> = {
    currentRound: 1,
    totalRounds: 5,
    scores: {},
    phase: "lobby",
  };

  if (game.slug === "trivia-showdown") {
    initialGameState = {
      ...initialGameState,
      currentQuestionIndex: 0,
      questions: [
        {
          id: 1,
          question: "ما هي عاصمة المملكة العربية السعودية؟",
          options: ["الرياض", "جدة", "الدمام", "مكة المكرمة"],
          answer: 0,
        },
        {
          id: 2,
          question: "كم عدد قارات العالم المعترف بها جغرافياً؟",
          options: ["5", "6", "7", "8"],
          answer: 2,
        },
        {
          id: 3,
          question: "ما هو العنصر الكيميائي الذي يرمز له بالرمز Au؟",
          options: ["الفضة", "الذهب", "النحاس", "الحديد"],
          answer: 1,
        },
        {
          id: 4,
          question: "أي الكواكب يعتبر الأقرب إلى الشمس في المجموعة الشمسية؟",
          options: ["الزهرة", "المريخ", "عطارد", "المشتري"],
          answer: 2,
        },
        {
          id: 5,
          question: "ما هو أطول نهر في العالم؟",
          options: ["نهر النيل", "نهر الأمازون", "نهر المسيسيبي", "نهر الفرات"],
          answer: 0,
        },
      ],
      answers: {},
    };
  } else if (game.slug === "speed-words") {
    initialGameState = {
      ...initialGameState,
      currentLetter: "ب",
      letters: ["ب", "س", "م", "ك", "ت", "ج", "ر"],
      categories: ["اسم جماد", "اسم حيوان", "اسم بلاد", "نبات"],
      submissions: {},
    };
  } else if (game.slug === "imposter-secret") {
    initialGameState = {
      ...initialGameState,
      secretWord: "طائرة سفر",
      imposterPlayerId: null,
      clues: {},
    };
  } else {
    initialGameState = {
      ...initialGameState,
      currentTurn: null,
      customMoves: [],
    };
  }

  const [insertedRoom] = await db.insert(rooms).values({
    roomCode,
    roomToken,
    gameId,
    hostPlayerId,
    status: "waiting",
    gameState: initialGameState,
    expiresAt,
  });

  const roomId = insertedRoom.insertId;

  // Add Host as the first player
  await db.insert(roomPlayers).values({
    roomId,
    playerId: hostPlayerId,
    displayName: hostDisplayName,
    isHost: true,
    isConnected: true,
    metadata: { isReady: true },
  });

  // Log Event
  await db.insert(gameEvents).values({
    roomId,
    eventType: "ROOM_CREATED",
    payload: { hostPlayerId, hostDisplayName },
  });

  return {
    roomId,
    roomCode,
    roomToken,
    expiresAt,
  };
}

export async function getRoomByCodeOrToken(identifier: string) {
  const db = await getDb();
  if (!db) return null;

  // Auto clean expired
  await cleanInactiveRooms();

  const rows = await db
    .select({
      room: rooms,
      game: games,
    })
    .from(rooms)
    .innerJoin(games, eq(rooms.gameId, games.id))
    .where(
      and(
        sql`(${rooms.roomCode} = ${identifier} OR ${rooms.roomToken} = ${identifier})`,
        sql`${rooms.status} != 'closed' AND ${rooms.status} != 'expired'`
      )
    )
    .limit(1);

  if (!rows.length) return null;

  const currentRoom = rows[0].room;
  const currentGame = rows[0].game;

  // Fetch players
  const players = await db
    .select()
    .from(roomPlayers)
    .where(eq(roomPlayers.roomId, currentRoom.id))
    .orderBy(desc(roomPlayers.isHost), roomPlayers.joinedAt);

  return {
    ...currentRoom,
    game: currentGame,
    players,
  };
}

export async function joinRoom(roomCode: string, playerId: string, displayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const roomData = await getRoomByCodeOrToken(roomCode);
  if (!roomData) {
    throw new Error("الغرفة غير موجودة أو انتهت صلاحيتها");
  }

  if (roomData.status !== "waiting") {
    throw new Error("اللعبة قد بدأت بالفعل أو الغرفة لم تعد تستقبل لاعبين جدد");
  }

  if (roomData.players.length >= roomData.game.maxPlayers) {
    throw new Error("الغرفة مكتملة العدد ولا يمكن الانضمام حالياً");
  }

  const cleanName = sanitizeDisplayName(displayName);

  // Check if player is already in room
  const existing = roomData.players.find((p) => p.playerId === playerId);
  if (existing) {
    // Re-connect
    await db
      .update(roomPlayers)
      .set({ isConnected: true, lastSeenAt: new Date(), displayName: cleanName })
      .where(and(eq(roomPlayers.roomId, roomData.id), eq(roomPlayers.playerId, playerId)));
  } else {
    await db.insert(roomPlayers).values({
      roomId: roomData.id,
      playerId,
      displayName: cleanName,
      isHost: false,
      isConnected: true,
      metadata: { isReady: true },
    });

    await db.insert(gameEvents).values({
      roomId: roomData.id,
      eventType: "PLAYER_JOINED",
      payload: { playerId, displayName: cleanName },
    });
  }

  // Update room activity
  await touchRoomActivity(roomData.id);

  return { success: true, roomId: roomData.id };
}

export async function hostStartGame(roomCode: string, hostPlayerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const roomData = await getRoomByCodeOrToken(roomCode);
  if (!roomData) throw new Error("الغرفة غير موجودة");

  // Server-side host check
  if (roomData.hostPlayerId !== hostPlayerId) {
    throw new Error("غير مصرح: المضيف فقط هو المخول ببدء اللعبة");
  }

  if (roomData.players.length < roomData.game.minPlayers) {
    throw new Error(`يجب تواجد ${roomData.game.minPlayers} لاعبين على الأقل لبدء اللعبة`);
  }

  const updatedState: Record<string, any> = { ...roomData.gameState, phase: "playing", roundStartedAt: new Date().toISOString() };

  // If imposter game, assign secret imposter
  if (roomData.game.slug === "imposter-secret" && roomData.players.length > 0) {
    const randomIndex = Math.floor(Math.random() * roomData.players.length);
    updatedState.imposterPlayerId = roomData.players[randomIndex].playerId;
  }

  await db
    .update(rooms)
    .set({
      status: "playing",
      startedAt: new Date(),
      gameState: updatedState,
      lastActivityAt: new Date(),
    })
    .where(eq(rooms.id, roomData.id));

  await db.insert(gameEvents).values({
    roomId: roomData.id,
    eventType: "GAME_STARTED",
    payload: { startedAt: new Date().toISOString() },
  });

  return { success: true };
}

export async function hostKickPlayer(roomCode: string, hostPlayerId: string, targetPlayerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const roomData = await getRoomByCodeOrToken(roomCode);
  if (!roomData) throw new Error("الغرفة غير موجودة");

  if (roomData.hostPlayerId !== hostPlayerId) {
    throw new Error("غير مصرح: المضيف فقط يملك صلاحية طرد اللاعبين");
  }

  if (targetPlayerId === hostPlayerId) {
    throw new Error("لا يمكن للمضيف طرد نفسه");
  }

  await db
    .delete(roomPlayers)
    .where(and(eq(roomPlayers.roomId, roomData.id), eq(roomPlayers.playerId, targetPlayerId)));

  await db.insert(gameEvents).values({
    roomId: roomData.id,
    eventType: "PLAYER_KICKED",
    payload: { targetPlayerId },
  });

  return { success: true };
}

export async function hostCloseRoom(roomCode: string, hostPlayerId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const roomData = await getRoomByCodeOrToken(roomCode);
  if (!roomData) throw new Error("الغرفة غير موجودة");

  if (roomData.hostPlayerId !== hostPlayerId) {
    throw new Error("غير مصرح: المضيف فقط يملك صلاحية إغلاق الغرفة");
  }

  await db
    .update(rooms)
    .set({ status: "closed", endedAt: new Date() })
    .where(eq(rooms.id, roomData.id));

  await db.insert(gameEvents).values({
    roomId: roomData.id,
    eventType: "ROOM_CLOSED",
    payload: { closedAt: new Date().toISOString() },
  });

  return { success: true };
}

export async function submitGameAction(roomCode: string, playerId: string, actionType: string, actionData: any) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const roomData = await getRoomByCodeOrToken(roomCode);
  if (!roomData) throw new Error("الغرفة غير موجودة");

  if (roomData.status !== "playing") {
    throw new Error("اللعبة ليست قيد التشغيل حالياً");
  }

  const state = { ...roomData.gameState };
  const player = roomData.players.find((p) => p.playerId === playerId);
  if (!player) throw new Error("اللاعب غير مسجل بالغرفة");

  // Handle specific game moves
  if (roomData.game.slug === "trivia-showdown") {
    if (actionType === "SUBMIT_ANSWER") {
      const { questionIndex, selectedOption } = actionData;
      const currentQ = state.questions?.[questionIndex];
      if (currentQ) {
        state.answers = state.answers || {};
        state.answers[`${questionIndex}_${playerId}`] = selectedOption;

        // Scoring
        if (selectedOption === currentQ.answer) {
          const currentScore = player.score + 10;
          await db
            .update(roomPlayers)
            .set({ score: currentScore })
            .where(and(eq(roomPlayers.roomId, roomData.id), eq(roomPlayers.playerId, playerId)));
        }
      }
    }
  } else if (roomData.game.slug === "speed-words") {
    if (actionType === "SUBMIT_WORD") {
      const { category, word } = actionData;
      state.submissions = state.submissions || {};
      state.submissions[playerId] = state.submissions[playerId] || {};
      state.submissions[playerId][category] = word;

      // 5 points per submission
      await db
        .update(roomPlayers)
        .set({ score: player.score + 5 })
        .where(and(eq(roomPlayers.roomId, roomData.id), eq(roomPlayers.playerId, playerId)));
    }
  } else if (roomData.game.slug === "imposter-secret") {
    if (actionType === "SUBMIT_CLUE") {
      state.clues = state.clues || {};
      state.clues[playerId] = actionData.clue;
    }
  }

  // Update room state
  await db
    .update(rooms)
    .set({ gameState: state, lastActivityAt: new Date() })
    .where(eq(rooms.id, roomData.id));

  await db.insert(gameEvents).values({
    roomId: roomData.id,
    eventType: "GAME_ACTION",
    payload: { playerId, actionType, actionData },
  });

  return { success: true };
}

export async function touchRoomActivity(roomId: number) {
  const db = await getDb();
  if (!db) return;
  const newExpiry = new Date();
  newExpiry.setMinutes(newExpiry.getMinutes() + 30);
  await db
    .update(rooms)
    .set({ lastActivityAt: new Date(), expiresAt: newExpiry })
    .where(eq(rooms.id, roomId));
}

// Cleanup routine: expires inactive rooms > 30 minutes
export async function cleanInactiveRooms() {
  const db = await getDb();
  if (!db) return;

  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

  await db
    .update(rooms)
    .set({ status: "expired" })
    .where(
      and(
        sql`${rooms.status} IN ('waiting', 'playing')`,
        sql`${rooms.lastActivityAt} < ${thirtyMinsAgo}`
      )
    );
}

// Record anonymous page view
export async function recordPageView(page: string, sessionIdentifier: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(visitStats).values({
    page: page.slice(0, 120),
    sessionIdentifier: crypto.createHash("sha256").update(sessionIdentifier).digest("hex").slice(0, 32),
  });
}

// --- Admin Queries ---

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const totalVisitsRes = await db.select({ count: sql<number>`count(*)` }).from(visitStats);
  const activeRoomsRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .where(sql`${rooms.status} IN ('waiting', 'playing')`);
  const activePlayersRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(roomPlayers)
    .where(eq(roomPlayers.isConnected, true));
  const activeCodesRes = await db
    .select({ count: sql<number>`count(*)` })
    .from(activationCodes)
    .where(eq(activationCodes.status, "unused"));

  return {
    totalVisits: Number(totalVisitsRes[0]?.count || 0),
    activeRooms: Number(activeRoomsRes[0]?.count || 0),
    connectedPlayers: Number(activePlayersRes[0]?.count || 0),
    availableCodes: Number(activeCodesRes[0]?.count || 0),
  };
}

export async function createActivationCodeByAdmin(gameId: number | null, durationDays: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const randomStr = crypto.randomBytes(4).toString("hex").toUpperCase();
  const rawCode = `NOL-${randomStr.slice(0, 4)}-${randomStr.slice(4, 8)}`;
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

  await db.insert(activationCodes).values({
    codeHash,
    codeDisplayPrefix: rawCode.slice(0, 8),
    gameId,
    durationDays,
    status: "unused",
    createdBy: "admin",
  });

  return { code: rawCode, durationDays };
}

export async function getAllGamesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(games).orderBy(games.sortOrder);
}

export async function getAllRoomsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      room: rooms,
      gameName: games.name,
    })
    .from(rooms)
    .leftJoin(games, eq(rooms.gameId, games.id))
    .orderBy(desc(rooms.createdAt))
    .limit(50);
}

export async function getAllCodesAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      code: activationCodes,
      gameName: games.name,
    })
    .from(activationCodes)
    .leftJoin(games, eq(activationCodes.gameId, games.id))
    .orderBy(desc(activationCodes.createdAt))
    .limit(50);
}

export async function getSupportLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportLinks).where(eq(supportLinks.isActive, true)).orderBy(supportLinks.sortOrder);
}
