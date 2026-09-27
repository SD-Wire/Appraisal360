import { Link } from "@inertiajs/react";
import type { AuthLayoutProps } from "@/types";
import { home } from "@/routes";
import {
    ShieldCheck,
    Users2,
    TrendingUp,
    Lock,
    Sparkles,
    CheckCircle2,
} from "lucide-react";

export default function AuthSimpleLayout({
    children,
}: AuthLayoutProps) {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-[#F8FAFC]">
            {/* Background subtle ambient glow in brand Orange and Green */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-green-600/5 blur-3xl" />
            </div>

            {/* Main Auth Container Card */}
            <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)]">
                <div className="grid lg:grid-cols-12 min-h-[600px]">
                    {/* Left Brand Showcase Panel (Desktop lg+) */}
                    <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white overflow-hidden">
                        {/* Decorative background geometric accents */}
                        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-orange-500/20" />
                        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full border border-green-500/15" />
                        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-orange-600/10 blur-3xl" />

                        {/* Top: Official Logo & Brand Name */}
                        <div className="relative z-10">
                            <Link href={home()} className="inline-flex items-center gap-3.5 group">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-2 shadow-md transition-transform group-hover:scale-105">
                                    <img
                                        src="/images/logo.png"
                                        alt="Progressive Credit"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black tracking-tight text-white">
                                            Appraise<span className="text-orange-500">360</span>
                                        </span>
                                        <span className="rounded-md bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                            Enterprise
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold tracking-wider text-slate-300 block">
                                        Progressive Credit Limited
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Center: System Value Pillars */}
                        <div className="relative z-10 my-8 space-y-6">
                            <div>
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-300 mb-3">
                                    <Sparkles className="h-3.5 w-3.5 text-green-400" />
                                    "Taking every step with you"
                                </div>
                                <h2 className="text-2xl font-extrabold leading-tight text-white tracking-tight">
                                    360° Appraisal & KPI Management
                                </h2>
                                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                                    Unified corporate performance appraisals, multi-rater peer evaluations, and objective KPI tracking.
                                </p>
                            </div>

                            <div className="space-y-4 pt-1">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                        <Users2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            Multi-Rater 360° Feedback
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Anonymous evaluations across peers, supervisors, and direct reports.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-green-500/20 text-green-400 border border-green-500/30">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            Continuous KPI Tracking
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Clear target weights, self-evaluations, and supervisor moderation.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white">
                                            Two-Tier Approval & HR Sign-Off
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Supervisor moderation, HRBP verification, and regional data protection.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Official Seal */}
                        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-slate-700/60 text-xs text-slate-400">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                                <Lock className="h-3.5 w-3.5 text-orange-500" />
                                Internal Enterprise Portal
                            </span>
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                Progressive Credit Ltd &copy; {new Date().getFullYear()}
                            </span>
                        </div>
                    </div>

                    {/* Right Form Container (Mobile + Desktop) */}
                    <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
                        {/* Mobile Brand Header (Visible only on mobile/tablet) */}
                        <div className="lg:hidden mb-6 text-center">
                            <Link href={home()} className="inline-flex flex-col items-center gap-2 group">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2.5 shadow-md border border-slate-100 transition-transform group-hover:scale-105">
                                    <img
                                        src="/images/logo.png"
                                        alt="Progressive Credit"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <div>
                                    <span className="text-2xl font-black tracking-tight text-slate-900">
                                        Appraise<span className="text-orange-600">360</span>
                                    </span>
                                    <span className="block text-[11px] font-bold tracking-wider uppercase text-green-700">
                                        Progressive Credit Limited
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Main Form Content Area */}
                        <div className="w-full max-w-md mx-auto my-auto py-4">
                            {children}
                        </div>

                        {/* Bottom Security Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5 font-medium">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                <span>256-Bit SSL Encrypted</span>
                            </div>
                            <span className="text-slate-300 hidden sm:inline">•</span>
                            <span className="font-medium text-slate-600">Progressive Credit Performance System</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
