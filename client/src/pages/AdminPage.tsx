import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Gamepad2,
  Users,
  Key,
  BarChart3,
  Lock,
  Unlock,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"stats" | "games" | "rooms" | "codes">("stats");

  // Admin Auth Gate (Distinct from players)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("nol_admin_logged") === "true";
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Data Queries
  const statsQuery = trpc.admin.getStats.useQuery(undefined, { enabled: isAdminAuthenticated });
  const gamesQuery = trpc.admin.getAllGames.useQuery(undefined, { enabled: isAdminAuthenticated });
  const roomsQuery = trpc.admin.getAllRooms.useQuery(undefined, { enabled: isAdminAuthenticated });
  const codesQuery = trpc.admin.getAllCodes.useQuery(undefined, { enabled: isAdminAuthenticated });

  // Mutations
  const toggleGameLock = trpc.admin.toggleGameLock.useMutation();
  const toggleGameActive = trpc.admin.toggleGameActive.useMutation();
  const addGameMutation = trpc.admin.addGame.useMutation();
  const createCodeMutation = trpc.admin.createCode.useMutation();
  const closeRoomMutation = trpc.admin.closeRoomAdmin.useMutation();
  const disableCodeMutation = trpc.admin.disableCodeAdmin.useMutation();

  // New Game Form
  const [newGameName, setNewGameName] = useState("");
  const [newGameSlug, setNewGameSlug] = useState("");
  const [newGameDesc, setNewGameDesc] = useState("");
  const [newGameImage, setNewGameImage] = useState("");
  const [newGameLocked, setNewGameLocked] = useState(false);
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);

  // New Code Form
  const [codeGameId, setCodeGameId] = useState<number | null>(null);
  const [codeDuration, setCodeDuration] = useState<number>(30);
  const [generatedCodeResult, setGeneratedCodeResult] = useState<string | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default Admin credentials for platform deployment
    if (adminUsername === "admin" && adminPassword === "nol2026vip") {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem("nol_admin_logged", "true");
      toast.success("مرحباً بك في لوحة تحكم NoL");
    } else {
      toast.error("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  };

  const handleCreateCode = async () => {
    try {
      const res = await createCodeMutation.mutateAsync({
        gameId: codeGameId,
        durationDays: Number(codeDuration),
      });
      setGeneratedCodeResult(res.code);
      codesQuery.refetch();
      toast.success(`تم إنشاء الكود: ${res.code}`);
    } catch (err: any) {
      toast.error("فشل إنشاء الكود");
    }
  };

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName || !newGameSlug || !newGameDesc) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      await addGameMutation.mutateAsync({
        name: newGameName,
        slug: newGameSlug,
        description: newGameDesc,
        imageUrl: newGameImage || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
        minPlayers: 2,
        maxPlayers: 8,
        isLocked: newGameLocked,
      });
      toast.success("تمت إضافة اللعبة الجديدة بنجاح!");
      setIsAddGameOpen(false);
      gamesQuery.refetch();
      setNewGameName("");
      setNewGameSlug("");
      setNewGameDesc("");
      setNewGameImage("");
    } catch (err: any) {
      toast.error("فشل إضافة اللعبة");
    }
  };

  // Login Gate
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900/90 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white text-center mb-1">
              تسجيل دخول الأدمن
            </h2>
            <p className="text-xs text-slate-400 text-center mb-6">
              بوابة الإدارة المركزية لمنصة NoL (منفصلة تماماً عن جلسات اللاعبين)
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4 text-right">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  اسم المستخدم:
                </label>
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  كلمة المرور:
                </label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-black/50 border-white/10 text-white"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl mt-2 cursor-pointer"
              >
                دخول لوحة التحكم
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              <span>لوحة الإدارة المركزية</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              إدارة الألعاب، الأكواد، الغرف الحية، ومتابعة النشاط بدون مساس بخصوصية اللاعبين.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem("nol_admin_logged");
              setIsAdminAuthenticated(false);
            }}
            className="border-white/10 text-slate-300 hover:bg-white/5 text-xs py-2 cursor-pointer"
          >
            تسجيل الخروج
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
          <Button
            variant={activeTab === "stats" ? "default" : "ghost"}
            onClick={() => setActiveTab("stats")}
            className={`font-bold text-xs gap-2 ${activeTab === "stats" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>الإحصائيات الحية</span>
          </Button>

          <Button
            variant={activeTab === "games" ? "default" : "ghost"}
            onClick={() => setActiveTab("games")}
            className={`font-bold text-xs gap-2 ${activeTab === "games" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>إدارة الألعاب ({gamesQuery.data?.length || 0})</span>
          </Button>

          <Button
            variant={activeTab === "codes" ? "default" : "ghost"}
            onClick={() => setActiveTab("codes")}
            className={`font-bold text-xs gap-2 ${activeTab === "codes" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
          >
            <Key className="w-4 h-4" />
            <span>أكواد الاشتراك ({codesQuery.data?.length || 0})</span>
          </Button>

          <Button
            variant={activeTab === "rooms" ? "default" : "ghost"}
            onClick={() => setActiveTab("rooms")}
            className={`font-bold text-xs gap-2 ${activeTab === "rooms" ? "bg-indigo-600 text-white" : "text-slate-400"}`}
          >
            <Users className="w-4 h-4" />
            <span>الغرف النشطة والمؤقتة</span>
          </Button>
        </div>

        {/* --- Tab 1: Stats --- */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
                <span className="text-xs text-slate-400 block mb-1">إجمالي الزيارات</span>
                <span className="text-3xl font-black text-white font-mono">
                  {statsQuery.data?.totalVisits || 12}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
                <span className="text-xs text-slate-400 block mb-1">الغرف النشطة حالياً</span>
                <span className="text-3xl font-black text-purple-400 font-mono">
                  {statsQuery.data?.activeRooms || 0}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
                <span className="text-xs text-slate-400 block mb-1">اللاعبون المتصلون</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {statsQuery.data?.connectedPlayers || 0}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5">
                <span className="text-xs text-slate-400 block mb-1">الأكواد المتاحة</span>
                <span className="text-3xl font-black text-amber-400 font-mono">
                  {statsQuery.data?.availableCodes || 0}
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-400 space-y-2">
              <h4 className="font-bold text-white text-sm">ملاحظة أمنية ومعمارية:</h4>
              <p>
                جميع زيارات الموقع تسجل بشكل مجهول (Anonymous Identifiers) دون تخزين أي عنوان IP خام أو بريد إلكتروني، تماشياً مع المعايير الصارمة لخصوصية اللاعبين وعدم الاعتماد على أي حسابات دائمة.
              </p>
            </div>
          </div>
        )}

        {/* --- Tab 2: Games Management --- */}
        {activeTab === "games" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">قائمة الألعاب المسجلة</h3>
              
              <Dialog open={isAddGameOpen} onOpenChange={setIsAddGameOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1.5 py-2 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <span>إضافة لعبة جديدة</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#121624] border border-white/10 text-white max-w-md w-[92vw]">
                  <DialogHeader className="text-right">
                    <DialogTitle className="text-xl font-bold">إضافة لعبة جديدة للمنصة</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddGame} className="space-y-3 mt-3 text-right">
                    <div>
                      <label className="text-xs font-bold text-slate-300">اسم اللعبة:</label>
                      <Input
                        value={newGameName}
                        onChange={(e) => setNewGameName(e.target.value)}
                        placeholder="مثال: حرب الكلمات"
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">المعرف اللاتيني (Slug):</label>
                      <Input
                        value={newGameSlug}
                        onChange={(e) => setNewGameSlug(e.target.value)}
                        placeholder="word-war"
                        className="bg-black/40 border-white/10 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">الوصف:</label>
                      <Textarea
                        value={newGameDesc}
                        onChange={(e) => setNewGameDesc(e.target.value)}
                        placeholder="وصف تفصيلي لقواعد اللعبة..."
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300">رابط صورة اللعبة:</label>
                      <Input
                        value={newGameImage}
                        onChange={(e) => setNewGameImage(e.target.value)}
                        placeholder="https://..."
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="gameLocked"
                        checked={newGameLocked}
                        onChange={(e) => setNewGameLocked(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="gameLocked" className="text-xs text-slate-300 font-bold">
                        تتطلب اللعبة كود اشتراك مقفل
                      </label>
                    </div>
                    <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 font-bold mt-3">
                      حفظ اللعبة وإدراجها
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gamesQuery.data?.map((g) => (
                <div
                  key={g.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <img src={g.imageUrl} alt={g.name} className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    <div>
                      <h4 className="font-bold text-base text-white">{g.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{g.description}</p>
                      <span className="text-[11px] font-mono text-purple-400">/{g.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await toggleGameLock.mutateAsync({ gameId: g.id, isLocked: !g.isLocked });
                          gamesQuery.refetch();
                          toast.success("تم تحديث حالة القفل للعبة");
                        }}
                        className={`text-xs gap-1 border-white/10 ${g.isLocked ? "text-amber-400" : "text-emerald-400"}`}
                      >
                        {g.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{g.isLocked ? "مقفل باشتراك" : "مفتوح مجاني"}</span>
                      </Button>
                    </div>

                    <span className="text-slate-500 text-[11px]">
                      اللاعبين: {g.minPlayers} - {g.maxPlayers}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Tab 3: Activation Codes --- */}
        {activeTab === "codes" && (
          <div className="space-y-6">
            {/* Create Code Card */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
              <h3 className="font-bold text-white text-base">إنشاء كود اشتراك جديد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">اللعبة المخصصة:</label>
                  <select
                    onChange={(e) => setCodeGameId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="">كافة الألعاب المقفلة</option>
                    {gamesQuery.data?.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">مدة الصلاحية:</label>
                  <select
                    value={codeDuration}
                    onChange={(e) => setCodeDuration(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                  >
                    <option value="7">أسبوع (7 أيام)</option>
                    <option value="30">شهر (30 يوماً)</option>
                    <option value="90">3 أشهر (90 يوماً)</option>
                    <option value="365">سنة كاملة (365 يوماً)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleCreateCode}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-5 rounded-xl cursor-pointer"
                  >
                    توليد وحفظ الكود
                  </Button>
                </div>
              </div>

              {generatedCodeResult && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-200 block">تم توليد الكود التالي (يتم تخزين الهاش فقط):</span>
                    <strong className="text-xl font-mono text-amber-400 tracking-wider">
                      {generatedCodeResult}
                    </strong>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCodeResult);
                      toast.success("تم نسخ الكود");
                    }}
                    className="bg-amber-600 text-white text-xs"
                  >
                    نسخ الكود
                  </Button>
                </div>
              )}
            </div>

            {/* Codes List */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-black/30 border-b border-white/5 text-slate-400 font-bold">
                  <tr>
                    <th className="p-4">بادئة الكود</th>
                    <th className="p-4">اللعبة</th>
                    <th className="p-4">المدة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">تاريخ التفعيل</th>
                    <th className="p-4">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {codesQuery.data?.map((c) => (
                    <tr key={c.code.id} className="hover:bg-white/5">
                      <td className="p-4 font-mono font-bold text-white">{c.code.codeDisplayPrefix}••••</td>
                      <td className="p-4 text-slate-300">{c.gameName || "عام لكل الألعاب"}</td>
                      <td className="p-4">{c.code.durationDays} يوم</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.code.status === "unused"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : c.code.status === "active"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}>
                          {c.code.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">
                        {c.code.activatedAt ? new Date(c.code.activatedAt).toLocaleDateString("ar-SA") : "غير مفعل"}
                      </td>
                      <td className="p-4">
                        {c.code.status !== "disabled" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await disableCodeMutation.mutateAsync({ codeId: c.code.id });
                              codesQuery.refetch();
                              toast.success("تم تعطيل الكود");
                            }}
                            className="text-red-400 hover:text-red-300 text-xs h-auto p-1 cursor-pointer"
                          >
                            تعطيل
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Tab 4: Rooms --- */}
        {activeTab === "rooms" && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">الغرف النشطة والمؤقتة</h3>
            <div className="rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-black/30 border-b border-white/5 text-slate-400 font-bold">
                  <tr>
                    <th className="p-4">رمز الغرفة</th>
                    <th className="p-4">اللعبة</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">المضيف</th>
                    <th className="p-4">الإنشاء</th>
                    <th className="p-4">إجراء الإدارة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {roomsQuery.data?.map((r) => (
                    <tr key={r.room.id} className="hover:bg-white/5">
                      <td className="p-4 font-mono font-bold text-purple-400">{r.room.roomCode}</td>
                      <td className="p-4 text-white font-bold">{r.gameName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.room.status === "playing"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : r.room.status === "waiting"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-slate-500/20 text-slate-400"
                        }`}>
                          {r.room.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">{r.room.hostPlayerId.slice(0, 10)}...</td>
                      <td className="p-4 text-slate-400">{new Date(r.room.createdAt).toLocaleTimeString("ar-SA")}</td>
                      <td className="p-4">
                        {r.room.status !== "closed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              await closeRoomMutation.mutateAsync({ roomId: r.room.id });
                              roomsQuery.refetch();
                              toast.info("تم إغلاق الغرفة من قبل الأدمن");
                            }}
                            className="text-red-400 hover:text-red-300 text-xs h-auto p-1 cursor-pointer"
                          >
                            إغلاق فوري
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
