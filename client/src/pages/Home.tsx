import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, Lock, Sparkles, ArrowLeft, Play, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: gamesList, isLoading } = trpc.nol.getGames.useQuery();
  const createSession = trpc.nol.createSession.useMutation();
  const createRoom = trpc.nol.createRoom.useMutation();
  const redeemCode = trpc.nol.redeemCode.useMutation();
  const recordVisit = trpc.nol.recordVisit.useMutation();

  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [activationCodeInput, setActivationCodeInput] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [unlockedGames, setUnlockedGames] = useState<number[]>([]);

  // Record Anonymous Visit
  useEffect(() => {
    let sessionGuid = localStorage.getItem("nol_visit_id");
    if (!sessionGuid) {
      sessionGuid = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("nol_visit_id", sessionGuid);
    }
    recordVisit.mutate({ page: "home", sessionIdentifier: sessionGuid });

    // Load stored temporary player name if any
    const savedName = localStorage.getItem("nol_player_name");
    if (savedName) setPlayerName(savedName);
  }, []);

  const handleGameSelect = (game: any) => {
    setSelectedGame(game);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim() || playerName.trim().length < 2) {
      toast.error("الرجاء إدخال اسمك (حرفين على الأقل)");
      return;
    }

    try {
      // 1. Create or get ephemeral session
      let playerId = localStorage.getItem("nol_player_id");
      let sessionToken = localStorage.getItem("nol_session_token");

      if (!playerId || !sessionToken) {
        const sessionRes = await createSession.mutateAsync({ displayName: playerName.trim() });
        playerId = sessionRes.playerId;
        sessionToken = sessionRes.sessionToken;
        localStorage.setItem("nol_player_id", playerId);
        localStorage.setItem("nol_session_token", sessionToken);
        localStorage.setItem("nol_player_name", sessionRes.displayName);
      }

      // 2. If locked game, check access
      if (selectedGame.isLocked && !unlockedGames.includes(selectedGame.id)) {
        setIsActivating(true);
        return;
      }

      // 3. Create room
      const roomRes = await createRoom.mutateAsync({
        gameId: selectedGame.id,
        playerId,
        displayName: playerName.trim(),
      });

      toast.success("تم إنشاء الغرفة بنجاح!");
      setSelectedGame(null);
      setLocation(`/room/${roomRes.roomCode}`);
    } catch (err: any) {
      toast.error(err.message || "فشل في إنشاء الغرفة");
    }
  };

  const handleRedeemCode = async () => {
    if (!activationCodeInput.trim()) {
      toast.error("الرجاء إدخال كود الاشتراك");
      return;
    }

    try {
      let playerId = localStorage.getItem("nol_player_id");
      if (!playerId) {
        const sessionRes = await createSession.mutateAsync({ displayName: playerName.trim() || "لاعب NoL" });
        playerId = sessionRes.playerId;
        localStorage.setItem("nol_player_id", playerId);
        localStorage.setItem("nol_session_token", sessionRes.sessionToken);
      }

      await redeemCode.mutateAsync({
        code: activationCodeInput.trim(),
        playerId,
        gameId: selectedGame.id,
      });

      toast.success("تم تفعيل اللعبة بنجاح! يمكنك الآن بدء اللعب.");
      setUnlockedGames((prev) => [...prev, selectedGame.id]);
      setIsActivating(false);
      setActivationCodeInput("");
    } catch (err: any) {
      toast.error(err.message || "الكود غير صالح");
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-10 text-center max-w-4xl mx-auto">
        <div className="absolute inset-0 bg-radial from-purple-900/20 via-transparent to-transparent pointer-events-none -z-10 blur-3xl" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>بدون حساب • بدون بريد • بدون كلمة مرور</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
          العب مع أصدقائك في ثوانٍ مع{" "}
          <span className="brand-font bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">
            NoL
          </span>
        </h1>

        <p className="text-muted-foreground text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          اختر لعبتك المفضلة، اكتب اسمك فقط، وأرسل الرابط لأصدقائك لتبدأ المغامرة فوراً وبشكل لحظي كامل.
        </p>
      </section>

      {/* Games Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-20 flex-1 w-full">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <span>الألعاب الجماعية المتوفرة</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {gamesList?.length || 0}
            </span>
          </h2>
          <span className="text-xs text-muted-foreground">تحديث مباشر</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gamesList?.map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className="group relative rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/50 p-5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:shadow-xl hover:shadow-purple-500/10"
              >
                {/* Background visual image */}
                <div className="relative h-48 rounded-xl overflow-hidden mb-4">
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {game.isLocked && !unlockedGames.includes(game.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md">
                        <Lock className="w-3.5 h-3.5" />
                        <span>خاصة (اشتراك)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مفتوحة ومجانية</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-slate-300">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>{game.minPlayers} إلى {game.maxPlayers} لاعبين</span>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-purple-300 transition-colors mb-2">
                    {game.name}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {game.description}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <span className="text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>دخول اللعبة وإنشاء غرفة</span>
                    <ArrowLeft className="w-4 h-4" />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Game Dialog / Room Creator */}
      {selectedGame && (
        <Dialog open={Boolean(selectedGame)} onOpenChange={() => setSelectedGame(null)}>
          <DialogContent className="bg-[#121624] border border-white/10 text-slate-100 max-w-md w-[92vw] rounded-2xl p-6 sm:p-8">
            <DialogHeader className="text-right">
              <DialogTitle className="text-2xl font-bold text-white mb-1">
                {selectedGame.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                {selectedGame.description}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Check if locked */}
              {selectedGame.isLocked && !unlockedGames.includes(selectedGame.id) ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <span>هذه اللعبة تتطلب كود اشتراك معتمد</span>
                  </div>
                  <p className="text-xs text-amber-200/80">
                    إذا كان لديك كود تفعيل أدخله بالأسفل، أو تواصل مع الدعم للحصول على كود.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Input
                      placeholder="NOL-XXXX-XXXX"
                      value={activationCodeInput}
                      onChange={(e) => setActivationCodeInput(e.target.value)}
                      className="bg-black/30 border-amber-500/40 text-white font-mono text-center tracking-widest text-sm"
                    />
                    <Button
                      onClick={handleRedeemCode}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    >
                      تفعيل
                    </Button>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center">
                    كود تجريبي للاختبار: <code className="text-amber-400 font-mono">NOL-7K29-XP41</code>
                  </div>
                </div>
              ) : null}

              {/* Player Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  اسمك المستعار في اللعبة:
                </label>
                <Input
                  placeholder="مثال: أحمد، سارة، المحترف..."
                  value={playerName}
                  maxLength={20}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="bg-black/40 border-white/10 text-white text-base py-5 focus:border-purple-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  * مؤقت للجلسة فقط، ولا يتم إنشاء حساب دائم.
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleCreateRoom}
                disabled={createRoom.isPending || createSession.isPending}
                className="w-full py-6 rounded-xl font-extrabold text-base bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                {createRoom.isPending ? "جاري إنشاء الغرفة..." : "إنشاء الغرفة وبدء اللعب"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 NoL — جميع الحقوق محفوظة. منصة ألعاب فورية بدون حسابات.</p>
          <div className="flex items-center gap-6">
            <Link href="/support" className="hover:text-purple-400 transition-colors">الدعم الفني</Link>
            <Link href="/admin" className="hover:text-purple-400 transition-colors">لوحة الإدارة</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
