import { Head, Link, usePage } from "@inertiajs/react";
import { dashboard, login } from "@/routes";
import {
    LogIn,
    Target,
    Users,
    TrendingUp,
    Eye,
    History,
    ArrowRight,
    CheckCircle2,
    Shield,
    Sparkles,
    Compass,
    Layers,
    Check,
    Award,
    Building2,
    Lock,
} from "lucide-react";

// ── Progressive Credit Corporate Brand Palette ──────────────────────────────
const C = {
    orange: "#EA580C",
    orangeLight: "#FFF7ED",
    orangeBorder: "#FED7AA",
    orangeDark: "#C2410C",
    green: "#15803D",
    greenLight: "#F0FDF4",
    greenBorder: "#BBF7D0",
    greenDark: "#166534",
    slateDark: "#0F172A",
    slateMedium: "#334155",
    slateLight: "#64748B",
    bg: "#F8FAFC",
    white: "#FFFFFF",
    border: "#E2E8F0",
};

const FEATURES = [
    {
        title: "Agile KPI Performance",
        description:
            "Set measurable objectives, balance weights to 100%, and record progress across every appraisal cycle with real-time feedback.",
        icon: Target,
        iconBg: C.orangeLight,
        iconColor: C.orange,
    },
    {
        title: "360° Core Values Rubrics",
        description:
            "Assess competencies grounded in corporate pillars: Integrity, Passion, Customer Delight, Innovation, and Professionalism with 1–5 scoring.",
        icon: Compass,
        iconBg: C.greenLight,
        iconColor: C.greenDark,
    },
    {
        title: "Multi-Tier Workflow Review",
        description:
            "Seamless two-stage approvals: direct branch or department supervisor endorsement followed by HR Business Partner verification and sign-off.",
        icon: Eye,
        iconBg: "#EFF6FF",
        iconColor: "#2563EB",
    },
    {
        title: "Branch & HQ Data Scoping",
        description:
            "Hierarchical visibility: Staff track personal performance, Branch Managers oversee branches, HODs see departments, and Execs view enterprise-wide.",
        icon: Layers,
        iconBg: "#FEF3C7",
        iconColor: "#D97706",
    },
    {
        title: "Audit History & Traceability",
        description:
            "Full governance with date-stamped action logs, reviewer comments, rating changes, and return feedback archived securely.",
        icon: History,
        iconBg: "#F5F3FF",
        iconColor: "#7C3AED",
    },
    {
        title: "Growth & Analytics",
        description:
            "Transform periodic appraisals into continuous employee career progression and transparent performance-linked development.",
        icon: TrendingUp,
        iconBg: C.greenLight,
        iconColor: C.green,
    },
];

export default function Welcome() {
    const { auth, currentTeam } = usePage().props as any;
    const dashboardUrl = currentTeam ? dashboard.url(currentTeam.slug) : "/";

    return (
        <>
            <Head title="Appraise360 — Performance Management Platform | Progressive Credit" />

            <div className="min-h-screen text-slate-900 bg-[#F8FAFC]">
                {/* ── Top Header Navigation ──────────────────────────── */}
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
                        {/* Brand Logo & Tagline */}
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-xs border border-slate-100">
                                <img
                                    src="/images/logo.png"
                                    alt="Progressive Credit"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black tracking-tight text-slate-900">
                                        Appraise<span className="text-orange-600">360</span>
                                    </span>
                                    <span className="rounded-md bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                        Enterprise
                                    </span>
                                </div>
                                <p className="text-[11px] font-semibold text-slate-500">
                                    Progressive Credit Ltd <span className="mx-1 text-slate-300">•</span>
                                    <span className="italic text-green-700">"Taking every step with you"</span>
                                </p>
                            </div>
                        </div>

                        {/* Nav Actions */}
                        <nav className="flex items-center gap-3">
                            {auth?.user ? (
                                <Link
                                    href={dashboardUrl}
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-700 hover:shadow-md"
                                >
                                    My Dashboard
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <Link
                                    href={login()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-700 hover:shadow-md"
                                >
                                    <LogIn className="h-3.5 w-3.5" />
                                    Staff Sign In
                                </Link>
                            )}
                        </nav>
                    </div>
                </header>

                {/* ── Hero Section ───────────────────────────────────── */}
                <section className="relative overflow-hidden border-b border-slate-200/80 bg-white">
                    {/* Subtle corporate ambient glows in brand orange and green */}
                    <div className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at 85% 20%, ${C.orangeLight} 0%, transparent 45%), radial-gradient(circle at 15% 80%, ${C.greenLight} 0%, transparent 45%)`,
                        }}
                    />

                    <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
                        <div className="grid items-center gap-12 lg:grid-cols-12">
                            {/* Hero Text */}
                            <div className="lg:col-span-7">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-1.5 text-xs font-bold text-orange-800 shadow-xs">
                                    <Sparkles className="h-3.5 w-3.5 text-orange-600" />
                                    Continuous Performance & 360° Appraisals
                                </div>

                                <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 lg:text-5xl">
                                    Know where you stand.
                                    <span className="block text-orange-600">
                                        Every goal, every value, every step.
                                    </span>
                                </h1>

                                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                                    Appraise360 empowers staff, branch managers, and executive leadership across Progressive Credit with continuous KPI tracking, objective 360° core values appraisals, and transparent supervisor-to-HR workflows.
                                </p>

                                {/* Highlights list with Progressive Forest Green checkmarks */}
                                <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    {[
                                        "KPI weighting & milestone tracking",
                                        "1–5 Rubric scoring for Core Values",
                                        "Hierarchical role & branch scoping",
                                        "Dual supervisor & HR sign-off cycles",
                                    ].map((item) => (
                                        <div key={item} className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-700 text-white flex-shrink-0">
                                                <Check className="h-3 w-3 stroke-[3]" />
                                            </div>
                                            {item}
                                        </div>
                                    ))}
                                </div>

                                {/* Hero CTAs */}
                                <div className="mt-8 flex flex-wrap items-center gap-4">
                                    {auth?.user ? (
                                        <Link
                                            href={dashboardUrl}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-lg"
                                        >
                                            Go to My Dashboard
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    ) : (
                                        <Link
                                            href={login()}
                                            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-lg"
                                        >
                                            <LogIn className="h-4 w-4" />
                                            Access Portal
                                        </Link>
                                    )}

                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                        <Shield className="h-4 w-4 text-green-700" />
                                        Progressive Credit Enterprise Security
                                    </div>
                                </div>
                            </div>

                            {/* Hero Interactive Mockup Card */}
                            <div className="lg:col-span-5">
                                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/5 transition-all">
                                    {/* Mockup Header */}
                                    <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 shadow-xs">
                                                <img
                                                    src="/images/logo.png"
                                                    alt="Progressive Credit"
                                                    className="h-full w-full object-contain"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white leading-tight">FY2026 Appraisal Cycle</p>
                                                <p className="text-[10px] text-slate-300">Progressive Credit HQ & Branches</p>
                                            </div>
                                        </div>
                                        <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                                            Active
                                        </span>
                                    </div>

                                    {/* Mockup Body Content */}
                                    <div className="p-6 space-y-4">
                                        {/* Score Bar 1: KPIs */}
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                                                    <Target className="h-3.5 w-3.5 text-orange-600" />
                                                    KPI Objectives Score
                                                </span>
                                                <span className="font-bold text-orange-600">88% Target</span>
                                            </div>
                                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div className="h-full rounded-full bg-orange-600 transition-all duration-1000"
                                                    style={{ width: "88%" }} />
                                            </div>
                                            <p className="mt-1.5 text-[11px] text-slate-500">
                                                100% Weight allocated across loan book & customer targets
                                            </p>
                                        </div>

                                        {/* Score Bar 2: Core Values 360 */}
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between text-xs mb-2">
                                                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                                                    <Compass className="h-3.5 w-3.5 text-green-700" />
                                                    360° Core Values Assessment
                                                </span>
                                                <span className="font-bold text-green-700">4.6 / 5.0 pts</span>
                                            </div>
                                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div className="h-full rounded-full bg-green-700 transition-all duration-1000"
                                                    style={{ width: "92%" }} />
                                            </div>
                                            <p className="mt-1.5 text-[11px] text-slate-500">
                                                Integrity, Passion, Customer Delight, Innovation, Professionalism
                                            </p>
                                        </div>

                                        {/* Mini Workflow Tracker */}
                                        <div className="flex items-center justify-between rounded-xl bg-green-50/80 border border-green-200/60 p-3">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-700" />
                                                <span className="text-xs font-semibold text-green-900">
                                                    Supervisor Approved → Awaiting HR
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                                                Stage 2 of 3
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Features Section ───────────────────────────────── */}
                <section className="border-b border-slate-200/80 bg-white py-16 lg:py-24">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mb-14 text-center max-w-2xl mx-auto">
                            <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                                Enterprise Capabilities
                            </span>
                            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                                Built specifically for modern corporate performance
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Everything your appraisal should measure — balanced KPIs, behavioral values, and role-driven oversight in one unified platform.
                            </p>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((feature) => {
                                const Icon = feature.icon;
                                return (
                                    <div
                                        key={feature.title}
                                        className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:border-orange-500 hover:shadow-lg"
                                    >
                                        <div>
                                            <div
                                                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105"
                                                style={{ backgroundColor: feature.iconBg }}
                                            >
                                                <Icon className="h-6 w-6" style={{ color: feature.iconColor }} />
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                                {feature.description}
                                            </p>
                                        </div>

                                        <div className="mt-5 flex items-center gap-1.5 text-xs font-bold transition-all text-orange-600">
                                            <span>Progressive Standard</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── Core Values Callout Banner ──────────────────────── */}
                <section className="py-16 bg-[#F8FAFC]">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="overflow-hidden rounded-3xl shadow-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border border-slate-800">
                            <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-12">
                                <div className="lg:col-span-7">
                                    <span className="rounded-full bg-orange-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                                        Progressive Credit Values
                                    </span>
                                    <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                                        Empowering high-performance through shared culture
                                    </h3>
                                    <p className="mt-3 text-xs leading-relaxed text-slate-300 max-w-lg">
                                        Every employee's contribution is benchmarked against our core pillars: Integrity, Passion, Customer Delight, Innovation, and Professionalism with standardized behavioral indicators.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        {["Integrity", "Passion", "Customer Delight", "Innovation", "Professionalism"].map((val) => (
                                            <span key={val} className="rounded-xl px-3 py-1.5 text-xs font-bold bg-white/10 text-white border border-white/15">
                                                ★ {val}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="lg:col-span-5 flex justify-center lg:justify-end">
                                    <div className="rounded-2xl p-6 text-center max-w-xs w-full bg-white/10 backdrop-blur-md border border-white/15">
                                        <Award className="h-10 w-10 text-orange-400 mx-auto mb-2" />
                                        <p className="text-xl font-extrabold text-white">360° Evaluation</p>
                                        <p className="mt-1 text-xs text-slate-300">
                                            Comprehensive rating calculated alongside operational KPI metrics.
                                        </p>
                                        {!auth?.user && (
                                            <Link
                                                href={login()}
                                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-orange-700"
                                            >
                                                Sign In to Appraise
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Footer ─────────────────────────────────────────── */}
                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
                        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1 shadow-xs border border-slate-100">
                                    <img
                                        src="/images/logo.png"
                                        alt="Progressive Credit"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <span className="text-sm font-black tracking-tight text-slate-900">
                                    Appraise<span className="text-orange-600">360</span>
                                </span>
                                <span className="text-xs text-slate-300">•</span>
                                <span className="text-xs font-bold text-slate-700">
                                    Progressive Credit Limited
                                </span>
                                <span className="text-xs italic text-green-700">
                                    — "Taking every step with you"
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                &copy; {new Date().getFullYear()} Progressive Credit Ltd. All rights reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
