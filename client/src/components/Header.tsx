import { Link } from "wouter";
import { Gamepad2, Shield, LifeBuoy } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0c0f17]/80 border-b border-white/5 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-200">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="brand-font text-2xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-purple-300 bg-clip-text text-transparent">
                NoL
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1 font-medium">ألعاب جماعية فورية</span>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/support">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
              <LifeBuoy className="w-4 h-4 text-purple-400" />
              <span>الدعم الفني</span>
            </span>
          </Link>

          <Link href="/admin">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white rounded-lg border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all cursor-pointer">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>لوحة الأدمن</span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
