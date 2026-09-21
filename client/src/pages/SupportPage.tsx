import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import { MessageSquare, Send, PhoneCall, ExternalLink, HelpCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  const { data: supportLinks, isLoading } = trpc.nol.getSupportLinks.useQuery();

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "discord":
        return <MessageSquare className="w-8 h-8 text-indigo-400" />;
      case "telegram":
        return <Send className="w-8 h-8 text-sky-400" />;
      case "whatsapp":
        return <PhoneCall className="w-8 h-8 text-emerald-400" />;
      default:
        return <HelpCircle className="w-8 h-8 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-14 flex-1 w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>قنوات التواصل الرسمية</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white">
            مركز الدعم والمساعدة لـ NoL
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            هل تواجه مشكلة في إنشاء غرفة، أو ترغب في الحصول على كود اشتراك للألعاب الخاصة؟ فريقنا متواجد لخدمتك عبر القنوات التالية:
          </p>
        </div>

        {/* Support Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))
          ) : (
            supportLinks?.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/50 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    {getPlatformIcon(item.platform)}
                  </div>
                  <h3 className="text-xl font-extrabold text-white group-hover:text-purple-300 transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تواصل معنا مباشرة عبر {item.platform.toUpperCase()} للحصول على رد سريع.
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
                  <span>فتح القناة</span>
                  <ExternalLink className="w-4 h-4 ml-1" />
                </div>
              </a>
            ))
          )}
        </div>

        {/* FAQ box */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/10 p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">الأسئلة الشائعة</h3>
          
          <div className="space-y-3 text-xs sm:text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5">
              <h4 className="font-bold text-white mb-1">كيف يمكنني اللعب بدون حساب؟</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                في منصة NoL لا يتطلب اللعب أي تسجيل دائم أو بريد إلكتروني. تكتفي بإدخال اسمك فقط لإنشاء جلسة مؤقتة وصالحة لعدة ساعات.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5">
              <h4 className="font-bold text-white mb-1">كيف أحصل على كود تفعيل للألعاب المقفلة؟</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                تواصل معنا عبر Discord أو Telegram أو WhatsApp وسيتم تزويدك بكود صالح للتفعيل الفوري.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
