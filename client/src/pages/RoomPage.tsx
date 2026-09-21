import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Copy,
  Share2,
  Crown,
  Play,
  XCircle,
  LogOut,
  Send,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

export default function RoomPage() {
  const [, params] = useRoute("/room/:roomCode");
  const [, setLocation] = useLocation();
  const roomCode = params?.roomCode || "";

  const [playerId, setPlayerId] = useState<string>("");
  const [sessionToken, setSessionToken] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [joinNameInput, setJoinNameInput] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);

  // Game Specific Inputs
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<number | null>(null);
  const [speedWordInput, setSpeedWordInput] = useState<string>("");
  const [imposterClueInput, setImposterClueInput] = useState<string>("");

  // Room Query with active polling / realtime sync
  const {
    data: roomData,
    isLoading: isRoomLoading,
    error: roomError,
    refetch: refetchRoom,
  } = trpc.nol.getRoom.useQuery(
    { roomCode },
    {
      enabled: Boolean(roomCode),
      refetchInterval: 1800, // Frequent polling to mimic realtime updates
    }
  );

  const createSession = trpc.nol.createSession.useMutation();
  const joinRoomMutation = trpc.nol.joinRoom.useMutation();
  const hostStartGame = trpc.nol.hostStartGame.useMutation();
  const hostKickPlayer = trpc.nol.hostKickPlayer.useMutation();
  const hostCloseRoom = trpc.nol.hostCloseRoom.useMutation();
  const submitAction = trpc.nol.submitAction.useMutation();

  // Load local session
  useEffect(() => {
    const savedPlayerId = localStorage.getItem("nol_player_id");
    const savedSessionToken = localStorage.getItem("nol_session_token");
    const savedName = localStorage.getItem("nol_player_name");

    if (savedPlayerId) setPlayerId(savedPlayerId);
    if (savedSessionToken) setSessionToken(savedSessionToken);
    if (savedName) setDisplayName(savedName);
  }, []);

  // Determine if current client is the Host
  const isHost = Boolean(roomData && playerId && roomData.hostPlayerId === playerId);
  const currentPlayerInRoom = roomData?.players?.find((p) => p.playerId === playerId);

  // Copy Room Link
  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    toast.success("تم نسخ رابط الغرفة بنجاح ✓");
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Mobile Web Share
  const handleShare = async () => {
    const fullUrl = `${window.location.origin}/room/${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `انضم معي في غرفة NoL: ${roomData?.game?.name || "لعبة جماعية"}`,
          text: `العب معي الآن بدون حساب عبر الرابط التالي:`,
          url: fullUrl,
        });
      } catch (e) {
        // Ignored or cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  // Handle Join as new guest player
  const handleJoinSubmit = async () => {
    if (!joinNameInput.trim() || joinNameInput.trim().length < 2) {
      toast.error("الرجاء إدخال اسمك (حرفين على الأقل)");
      return;
    }

    try {
      let currentPid = playerId;
      if (!currentPid) {
        const sessionRes = await createSession.mutateAsync({ displayName: joinNameInput.trim() });
        currentPid = sessionRes.playerId;
        setPlayerId(currentPid);
        setSessionToken(sessionRes.sessionToken);
        setDisplayName(sessionRes.displayName);
        localStorage.setItem("nol_player_id", currentPid);
        localStorage.setItem("nol_session_token", sessionRes.sessionToken);
        localStorage.setItem("nol_player_name", sessionRes.displayName);
      }

      await joinRoomMutation.mutateAsync({
        roomCode,
        playerId: currentPid,
        displayName: joinNameInput.trim(),
      });

      toast.success("تم الانضمام للغرفة!");
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "تعذر الانضمام للغرفة");
    }
  };

  // Host: Start Game
  const handleStartGame = async () => {
    try {
      await hostStartGame.mutateAsync({
        roomCode,
        hostPlayerId: playerId,
      });
      toast.success("انطلقت اللعبة لجميع اللاعبين!");
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "فشل بدء اللعبة");
    }
  };

  // Host: Kick Player
  const handleKick = async (targetPlayerId: string, targetName: string) => {
    if (!confirm(`هل أنت متأكد من طرد اللاعب "${targetName}"؟`)) return;
    try {
      await hostKickPlayer.mutateAsync({
        roomCode,
        hostPlayerId: playerId,
        targetPlayerId,
      });
      toast.success(`تم طرد ${targetName}`);
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "تعذر طرد اللاعب");
    }
  };

  // Host: Close Room
  const handleCloseRoom = async () => {
    if (!confirm("هل أنت متأكد من إغلاق هذه الغرفة نهائياً؟")) return;
    try {
      await hostCloseRoom.mutateAsync({
        roomCode,
        hostPlayerId: playerId,
      });
      toast.info("تم إغلاق الغرفة");
      setLocation("/");
    } catch (err: any) {
      toast.error(err.message || "تعذر إغلاق الغرفة");
    }
  };

  // Submit Trivia Answer
  const handleTriviaAnswer = async (index: number) => {
    setSelectedTriviaOption(index);
    try {
      await submitAction.mutateAsync({
        roomCode,
        playerId,
        actionType: "SUBMIT_ANSWER",
        actionData: {
          questionIndex: roomData?.gameState?.currentQuestionIndex || 0,
          selectedOption: index,
        },
      });
      toast.success("تم تسجيل إجابتك!");
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "تعذر إرسال الإجابة");
    }
  };

  // Submit Speed Word
  const handleSpeedWordSubmit = async () => {
    if (!speedWordInput.trim()) return;
    try {
      await submitAction.mutateAsync({
        roomCode,
        playerId,
        actionType: "SUBMIT_WORD",
        actionData: {
          category: roomData?.gameState?.categories?.[0] || "كلمة سريعة",
          word: speedWordInput.trim(),
        },
      });
      toast.success("تم تسجيل الكلمة!");
      setSpeedWordInput("");
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "تعذر إرسال الكلمة");
    }
  };

  // Submit Imposter Clue
  const handleImposterClueSubmit = async () => {
    if (!imposterClueInput.trim()) return;
    try {
      await submitAction.mutateAsync({
        roomCode,
        playerId,
        actionType: "SUBMIT_CLUE",
        actionData: {
          clue: imposterClueInput.trim(),
        },
      });
      toast.success("تم إرسال تلميحك!");
      setImposterClueInput("");
      refetchRoom();
    } catch (err: any) {
      toast.error(err.message || "تعذر إرسال التلميح");
    }
  };

  if (isRoomLoading) {
    return (
      <div className="min-h-screen bg-[#0c0f17] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400">جاري تحميل بيانات الغرفة اللحظية...</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle Room Errors (Expired, Not Found, Closed)
  if (roomError || !roomData) {
    return (
      <div className="min-h-screen bg-[#0c0f17] text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-900/90 border border-white/10 text-center p-8 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">الغرفة غير متاحة</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              انتهت صلاحية هذه الغرفة لعدم النشاط، أو تم إغلاقها من قِبل المضيف، أو أن رمز الرابط غير صحيح.
            </p>
            <Link href="/">
              <Button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-5 rounded-xl cursor-pointer">
                العودة للرئيسية وإنشاء غرفة جديدة
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // --- Step 1: If Guest user not in room yet -> Display Join Prompt ---
  if (!currentPlayerInRoom) {
    return (
      <div className="min-h-screen bg-[#0c0f17] text-white flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-slate-900/80 border border-purple-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl shadow-purple-900/20 backdrop-blur-xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-black text-white mb-1">
              الدخول إلى غرفة: {roomData.game.name}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              رمز الغرفة: <span className="font-mono text-purple-400 font-bold">{roomCode}</span>
            </p>

            <div className="space-y-4 text-right">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  اكتب اسمك للانضمام:
                </label>
                <Input
                  placeholder="مثال: خالد، سارة، فيصل..."
                  value={joinNameInput}
                  maxLength={20}
                  onChange={(e) => setJoinNameInput(e.target.value)}
                  className="bg-black/50 border-white/10 text-white text-base py-5 text-center focus:border-purple-500"
                />
              </div>

              <Button
                onClick={handleJoinSubmit}
                disabled={joinRoomMutation.isPending}
                className="w-full py-6 font-extrabold text-base bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                {joinRoomMutation.isPending ? "جاري الدخول..." : "دخول الغرفة واللعب فوراً"}
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // --- Step 2: Main Room View (Lobby OR Active Game) ---
  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Room Header Banner */}
        <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-right w-full sm:w-auto">
            <img
              src={roomData.game.imageUrl}
              alt={roomData.game.name}
              className="w-14 h-14 rounded-xl object-cover border border-white/10 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{roomData.game.name}</h1>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  roomData.status === "playing"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                }`}>
                  {roomData.status === "playing" ? "اللعبة جارية الآن" : "في صالة الانتظار (Lobby)"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>رمز الغرفة: <strong className="font-mono text-white text-sm">{roomCode}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>متصل لحظياً</span>
                </span>
              </div>
            </div>
          </div>

          {/* Share & Invite Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 sm:flex-none border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 text-white font-bold text-xs gap-1.5 py-4 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-purple-400" />
              <span>{isCopied ? "تم النسخ ✓" : "نسخ رابط الغرفة"}</span>
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-white font-bold text-xs gap-1.5 py-4 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">مشاركة الغرفة</span>
            </Button>

            {isHost && (
              <Button
                onClick={handleCloseRoom}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs py-4 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">إغلاق</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Section: If Waiting -> Lobby | If Playing -> Active Game Engine */}
        {roomData.status === "waiting" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Players List (2 cols on tablet/desktop) */}
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <h3 className="font-extrabold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>اللاعبون المنضمون للغرفة</span>
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 font-mono text-purple-300">
                    {roomData.players.length} / {roomData.game.maxPlayers}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roomData.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border ${
                        player.playerId === playerId
                          ? "bg-purple-950/30 border-purple-500/40"
                          : "bg-slate-950/40 border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center font-bold text-sm text-purple-300">
                          {player.displayName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">
                              {player.displayName}
                            </span>
                            {player.isHost && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <Crown className="w-3 h-3" />
                                <span>Host</span>
                              </span>
                            )}
                            {player.playerId === playerId && (
                              <span className="text-[10px] text-purple-400 font-bold">(أنت)</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {player.isConnected ? "متصل الآن" : "غير متصل"}
                          </span>
                        </div>
                      </div>

                      {/* Host Controls: Kick Option */}
                      {isHost && !player.isHost && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleKick(player.playerId, player.displayName)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs px-2 py-1 h-auto cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>طرد</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Waiting Status / Host Action Box */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-purple-950/20 border border-white/10 p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-lg text-white mb-2">تعليمات الغرفة</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    أرسل رابط الغرفة لأصدقائك. عند اكتمال العدد المطلوب ({roomData.game.minPlayers} لاعبين كحد أدنى)، يضغط المضيف على "بدء اللعبة".
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  {isHost ? (
                    <Button
                      onClick={handleStartGame}
                      disabled={roomData.players.length < roomData.game.minPlayers || hostStartGame.isPending}
                      className="w-full py-6 font-extrabold text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current ml-1" />
                      <span>{hostStartGame.isPending ? "جاري الإطلاق..." : "بدء اللعبة لجميع اللاعبين"}</span>
                    </Button>
                  ) : (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                      <p className="text-xs text-purple-300 font-bold animate-pulse">
                        بانتظار المضيف لبدء اللعبة...
                      </p>
                    </div>
                  )}

                  {roomData.players.length < roomData.game.minPlayers && (
                    <p className="text-[11px] text-amber-400 text-center">
                      * مطلوب لاعبين اثنين على الأقل لبدء التحدي
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- ACTIVE GAME PLAY INTERFACE --- */
          <div className="space-y-6">
            {/* Interactive Game Renderers */}
            {roomData.game.slug === "trivia-showdown" && (
              <div className="rounded-3xl bg-slate-900/90 border border-purple-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
                    <HelpCircle className="w-5 h-5" />
                    <span>السؤال رقم 1 من 5</span>
                  </div>
                  <div className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    النقاط: {currentPlayerInRoom.score}
                  </div>
                </div>

                {/* Question */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-8 leading-snug">
                  {roomData.gameState?.questions?.[0]?.question || "ما هي عاصمة المملكة العربية السعودية؟"}
                </h2>

                {/* Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {roomData.gameState?.questions?.[0]?.options?.map((opt: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleTriviaAnswer(idx)}
                      disabled={selectedTriviaOption !== null}
                      className={`p-5 rounded-2xl border text-right font-bold text-base transition-all duration-200 cursor-pointer ${
                        selectedTriviaOption === idx
                          ? "bg-purple-600 border-purple-400 text-white scale-[1.02] shadow-lg shadow-purple-600/40"
                          : "bg-slate-950/60 border-white/10 hover:border-purple-500/60 text-slate-200 hover:bg-slate-900"
                      }`}
                    >
                      <span className="inline-block w-7 h-7 rounded-full bg-white/10 text-center leading-7 text-xs font-mono ml-2">
                        {idx + 1}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                {selectedTriviaOption !== null && (
                  <p className="text-center text-xs text-emerald-400 font-bold mt-6">
                    تم إرسال إجابتك بنجاح! سيتم إظهار النتيجة في نهاية الجولة.
                  </p>
                )}
              </div>
            )}

            {roomData.game.slug === "speed-words" && (
              <div className="rounded-3xl bg-slate-900/90 border border-purple-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-6">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  الحرف المطلوب
                </span>
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-5xl font-black flex items-center justify-center mx-auto shadow-xl shadow-purple-600/30">
                  {roomData.gameState?.currentLetter || "ب"}
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  اكتب اسم (جماد أو حيوان أو بلاد) يبدأ بحرف ({roomData.gameState?.currentLetter || "ب"}) بأسرع وقت!
                </h3>
                <div className="max-w-md mx-auto flex gap-2">
                  <Input
                    placeholder="اكتب كلمتك هنا..."
                    value={speedWordInput}
                    onChange={(e) => setSpeedWordInput(e.target.value)}
                    className="bg-black/50 border-white/10 text-white text-base py-6 focus:border-purple-500"
                  />
                  <Button
                    onClick={handleSpeedWordSubmit}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-6 rounded-xl cursor-pointer"
                  >
                    <Send className="w-5 h-5 ml-1" />
                    <span>إرسال</span>
                  </Button>
                </div>
              </div>
            )}

            {roomData.game.slug === "imposter-secret" && (
              <div className="rounded-3xl bg-slate-900/90 border border-purple-500/40 p-6 sm:p-10 shadow-2xl text-center space-y-6">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  دورك السري في الجولة
                </span>
                <div className="p-6 rounded-2xl bg-purple-950/30 border border-purple-500/30 max-w-md mx-auto">
                  {roomData.gameState?.imposterPlayerId === playerId ? (
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-red-400">أنت المندس! 🕵️</h3>
                      <p className="text-xs text-slate-300">
                        لا تعرف الكلمة السرية! حاول التظاهر بأنك تعرفها واخدع باقي اللاعبين.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-300">الكلمة السرية هي:</h3>
                      <p className="text-3xl font-black text-purple-300 font-mono">
                        {roomData.gameState?.secretWord || "طائرة سفر"}
                      </p>
                      <p className="text-xs text-slate-400">
                        حاول كشف من هو المندس الذي لا يعرف هذه الكلمة!
                      </p>
                    </div>
                  )}
                </div>

                <div className="max-w-md mx-auto flex gap-2">
                  <Input
                    placeholder="اكتب تلميحاً ذكياً عن الكلمة..."
                    value={imposterClueInput}
                    onChange={(e) => setImposterClueInput(e.target.value)}
                    className="bg-black/50 border-white/10 text-white text-base py-6 focus:border-purple-500"
                  />
                  <Button
                    onClick={handleImposterClueSubmit}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-6 rounded-xl cursor-pointer"
                  >
                    <span>إرسال التلميح</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Scoreboard / Live Players Strip */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
              <h4 className="text-sm font-extrabold text-white mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>الترتيب والنقاط الحية في الغرفة</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {roomData.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-purple-400 font-bold">#{idx + 1}</span>
                      <span className="text-xs font-bold text-white truncate max-w-[80px]">
                        {p.displayName}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {p.score} نقطة
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
