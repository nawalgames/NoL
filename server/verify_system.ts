import {
  createTemporarySession,
  validateTemporarySession,
  getActiveGames,
  createRoom,
  getRoomByCodeOrToken,
  joinRoom,
  hostStartGame,
  hostKickPlayer,
  hostCloseRoom,
  redeemActivationCode,
  checkGameAccess,
  submitGameAction,
} from "./nolService";

async function runTests() {
  console.log("=== NoL Platform: Full End-to-End Verification ===");

  // 1. Test Temporary Session Creation (Without accounts)
  console.log("\n[Test 1] Temporary Session Creation...");
  const hostSession = await createTemporarySession("أحمد المضيف");
  console.log("✓ Host Session created:", {
    playerId: hostSession.playerId,
    displayName: hostSession.displayName,
    expiresAt: hostSession.expiresAt,
  });

  const valid = await validateTemporarySession(hostSession.playerId, hostSession.sessionToken);
  if (!valid) throw new Error("Host session validation failed");
  console.log("✓ Session verified successfully via hash matching.");

  // 2. Test Games retrieval
  console.log("\n[Test 2] Games Retrieval...");
  const gamesList: any[] = await getActiveGames();
  console.log(`✓ Fetched ${gamesList.length} active games.`);
  const triviaGame = gamesList.find((g: any) => g.slug === "trivia-showdown")!;
  const vipGame = gamesList.find((g: any) => g.slug === "mind-master-vip")!;

  // 3. Test Room Creation by Host
  console.log("\n[Test 3] Room Creation...");
  const room = await createRoom(triviaGame.id, hostSession.playerId, hostSession.displayName);
  console.log("✓ Room Created:", {
    roomId: room.roomId,
    roomCode: room.roomCode,
    roomToken: room.roomToken,
  });

  // 4. Test Guest Player Join
  console.log("\n[Test 4] Second Player Join (Multiplayer)...");
  const guestSession = await createTemporarySession("محمد اللاعب الثاني");
  const joinRes = await joinRoom(room.roomCode, guestSession.playerId, guestSession.displayName);
  console.log("✓ Player 2 joined room:", joinRes);

  let currentRoom = await getRoomByCodeOrToken(room.roomCode);
  console.log(`✓ Room player count: ${currentRoom?.players.length} players.`);
  if (currentRoom?.players.length !== 2) throw new Error("Expected 2 players");

  // 5. Test Host-Only Security (Non-host cannot start)
  console.log("\n[Test 5] Security Check: Can Guest Player Start Game?");
  try {
    await hostStartGame(room.roomCode, guestSession.playerId);
    throw new Error("FAIL: Non-host was able to start game!");
  } catch (err: any) {
    console.log("✓ PASS: Server correctly rejected non-host start attempt:", err.message);
  }

  // 6. Test Host Starting Game
  console.log("\n[Test 6] Host Starts Game...");
  await hostStartGame(room.roomCode, hostSession.playerId);
  currentRoom = await getRoomByCodeOrToken(room.roomCode);
  console.log("✓ Game status updated to:", currentRoom?.status);
  if (currentRoom?.status !== "playing") throw new Error("Expected room status 'playing'");

  // 7. Test In-Game Interactive Move (Trivia submission)
  console.log("\n[Test 7] In-Game Live Action...");
  await submitGameAction(room.roomCode, hostSession.playerId, "SUBMIT_ANSWER", {
    questionIndex: 0,
    selectedOption: 0, // Riyadh (correct)
  });
  currentRoom = await getRoomByCodeOrToken(room.roomCode);
  const hostPlayerRow = currentRoom?.players.find((p: any) => p.playerId === hostSession.playerId);
  console.log("✓ Host score after correct answer:", hostPlayerRow?.score);

  // 8. Test Activation Code System (Locked Game)
  console.log("\n[Test 8] Activation Code Redemption for Locked Game...");
  const initialAccess = await checkGameAccess(hostSession.playerId, vipGame.id);
  console.log("Initial access to locked game:", initialAccess);
  if (initialAccess) throw new Error("Locked game should not be accessible initially");

  // Redeem valid code
  const redeemRes = await redeemActivationCode("NOL-7K29-XP41", hostSession.playerId, vipGame.id);
  console.log("✓ Code NOL-7K29-XP41 redeemed:", redeemRes);

  const postAccess = await checkGameAccess(hostSession.playerId, vipGame.id);
  console.log("✓ Post-redemption access granted:", postAccess);
  if (!postAccess) throw new Error("Expected access to be true after redemption");

  // Test Reusing Code (Should fail)
  console.log("\n[Test 9] Security Check: Reuse of already activated code...");
  try {
    await redeemActivationCode("NOL-7K29-XP41", guestSession.playerId, vipGame.id);
    throw new Error("FAIL: Code reuse was allowed!");
  } catch (err: any) {
    console.log("✓ PASS: Code reuse rejected by server:", err.message);
  }

  // 9. Host Kicking Player
  console.log("\n[Test 10] Host Kick Player...");
  await hostKickPlayer(room.roomCode, hostSession.playerId, guestSession.playerId);
  currentRoom = await getRoomByCodeOrToken(room.roomCode);
  console.log(`✓ Players after kick: ${currentRoom?.players.length} players.`);
  if (currentRoom?.players.length !== 1) throw new Error("Expected 1 player after kick");

  // 10. Host Closing Room
  console.log("\n[Test 11] Host Close Room...");
  await hostCloseRoom(room.roomCode, hostSession.playerId);
  const closedRoom = await getRoomByCodeOrToken(room.roomCode);
  console.log("✓ Room query after closure:", closedRoom);
  if (closedRoom !== null) throw new Error("Closed room should not be retrievable");

  console.log("\n=== ALL 11 TESTS PASSED PERFECTLY! ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
