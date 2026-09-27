import { Head, Link, usePage } from "@inertiajs/react";
import { useState, useMemo } from "react";
import PendingInvitationsModal from "@/components/pending-invitations-modal";
import { dashboard } from "@/routes";
import { index as kpiIndex, reviewQueue as kpiReviewQueue } from "@/routes/kpi";
import { index as myEvaluationsIndex } from "@/routes/three-sixty/evaluations";
import { index as kpiEvaluationIndex, reviewQueue as kpiEvaluationReviewQueue } from "@/routes/kpi/evaluation";
import type { DashboardInvitation } from "@/types";
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
    Users,
    Star,
    Sparkles,
    AlertCircle,
    Compass,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    BarChart2,
    ClipboardList,
    FileCheck2,
    Scale,
    FolderKanban,
    Inbox,
    Eye,
    Target,
    Plus,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type StatusCounts = Record<
    | "draft"
    | "submitted"
    | "supervisor_returned"
    | "supervisor_approved"
    | "hr_returned"
    | "hr_approved",
    number
>;

type Cycle = { id: number; name: string; submission_deadline: string } | null;

type ActivityLog = {
    id: number;
    kpi_entry_id: number;
    stage: string;
    action: string;
    created_at: string;
    actor: { name: string };
    entry?: { id: number; title: string };
};

interface ThreeSixtyAssignmentPair {
    id: number;
    relationship_type: string;
    status: "pending" | "in_progress" | "completed";
    score: number | null;
    submitted_at: string | null;
    evaluatee: {
        id: number;
        name: string;
        email: string;
        job_title: string | null;
        team_name?: string | null;
        dept_name?: string | null;
    };
}

interface CoreValueScoreItem {
    id: number;
    name: string;
    description: string | null;
    weight: number;
    ratings_count: number;
    average_score: number | null;
    rating_comment: "Far Below Average" | "Average" | "Far Above Average" | "No Ratings Yet";
    badge_type: "danger" | "warn" | "green" | "neutral";
}

interface ThreeSixtyDashboardData {
    has_scheduled_appraisal: boolean;
    cycle: {
        id: number;
        name: string;
        period_start: string;
        period_end: string;
        evaluation_deadline: string;
        status: string;
        days_remaining: number | null;
    } | null;
    my_assignments: {
        total: number;
        completed: number;
        pending: number;
        is_locked: boolean;
        pairs: ThreeSixtyAssignmentPair[];
    };
    my_scores: {
        overall_average: number | null;
        core_values: CoreValueScoreItem[];
    };
}

type Props = {
    pendingInvitations?: DashboardInvitation[];
    cycle: Cycle;
    myStatusCounts: StatusCounts;
    totalWeight: number;
    entryCount: number;
    scope: "own" | "branch" | "department" | "region" | "all";
    scopeName: string;
    scopeDescription: string;
    scopedStatusCounts: StatusCounts;
    scopedTotalEntries: number;
    scopedStaffCount: number;
    scopedCompletionRate: number;
    canReview: boolean;
    pendingReviewCount: number;
    pendingEvaluationReviewCount?: number;
    kpiCyclePhase?: string;
    recentActivity: ActivityLog[];
    threeSixty: ThreeSixtyDashboardData;
};

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
    danger: "#DC2626",
    dangerLight: "#FEF2F2",
    dangerBorder: "#FECACA",
    warn: "#D97706",
    warnLight: "#FFFBEB",
    warnBorder: "#FDE68A",
};

// ── Status tile definitions ────────────────────────────────────────────────
const STATUS_TILES: {
    key: keyof StatusCounts;
    label: string;
    bg: string;
    text: string;
    dot: string;
}[] = [
    { key: "draft",               label: "Draft",               bg: "#F1F5F9",     text: "#334155",    dot: "#64748B"   },
    { key: "submitted",           label: "Awaiting Supervisor", bg: C.warnLight,   text: C.warn,       dot: C.warn       },
    { key: "supervisor_approved", label: "Awaiting HR",         bg: C.orangeLight, text: C.orangeDark, dot: C.orange     },
    { key: "hr_approved",         label: "Approved",            bg: C.greenLight,  text: C.greenDark,  dot: C.green      },
    { key: "supervisor_returned", label: "Returned (Supervisor)", bg: C.dangerLight, text: C.danger,   dot: C.danger     },
    { key: "hr_returned",         label: "Returned (HR)",       bg: C.dangerLight, text: C.danger,     dot: C.danger     },
];

// ── Scope badge config ─────────────────────────────────────────────────────
const SCOPE_BADGE: Record<Props["scope"], { label: string; color: string; bg: string }> = {
    own:        { label: "Personal",       color: "#334155",   bg: "#F1F5F9"      },
    branch:     { label: "Branch",         color: C.warn,       bg: C.warnLight    },
    department: { label: "Department",     color: C.orangeDark, bg: C.orangeLight  },
    region:     { label: "Region",         color: C.greenDark,  bg: C.greenLight   },
    all:        { label: "Organisation",   color: "#1E293B",   bg: "#E2E8F0"      },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function daysUntil(dateString: string): number {
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86_400_000);
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return "";
    try {
        const parts = dateString.split("T")[0].split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            const [year, month, day] = parts;
            const d = new Date(year, month - 1, day);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        }
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
}

function totalOf(counts: StatusCounts) {
    return Object.values(counts).reduce((a, b) => a + b, 0);
}

function pct(value: number, total: number) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function MetricCard({
    label,
    value,
    sub,
    icon: Icon,
    iconBg = "bg-orange-50",
    iconColor = "text-orange-600",
    accent = false,
    href,
    linkLabel,
}: {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    icon: React.ElementType;
    iconBg?: string;
    iconColor?: string;
    accent?: boolean;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div
            className={`flex flex-col justify-between rounded-2xl p-5 shadow-xs transition-all hover:shadow-md border ${
                accent
                    ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-slate-800"
                    : "bg-white border-slate-200"
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                            accent ? "text-slate-400" : "text-slate-500"
                        }`}
                    >
                        {label}
                    </p>
                    <p
                        className={`mt-1.5 text-2xl font-black leading-tight ${
                            accent ? "text-white" : "text-slate-900"
                        }`}
                    >
                        {value}
                    </p>
                    {sub && (
                        <p
                            className={`mt-1 text-xs ${
                                accent ? "text-slate-300" : "text-slate-500"
                            }`}
                        >
                            {sub}
                        </p>
                    )}
                </div>
                <div
                    className={`ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                        accent ? "bg-white/10 text-orange-400" : `${iconBg} ${iconColor}`
                    }`}
                >
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {href && linkLabel && (
                <Link
                    href={href}
                    className={`mt-4 inline-flex items-center gap-1 text-xs font-bold transition-colors ${
                        accent ? "text-orange-400 hover:text-orange-300" : "text-orange-600 hover:text-orange-700"
                    }`}
                >
                    {linkLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            )}
        </div>
    );
}

function StatusGrid({ counts, title }: { counts: StatusCounts; title: string }) {
    const total = totalOf(counts) || 1;
    return (
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
            <h2 className="mb-4 text-sm font-bold text-slate-900">{title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {STATUS_TILES.map((tile) => {
                    const count = counts[tile.key];
                    const share = pct(count, total);
                    return (
                        <div
                            key={tile.key}
                            className="rounded-xl p-3.5 transition-all"
                            style={{ backgroundColor: tile.bg, border: `1px solid ${tile.dot}26` }}
                        >
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: tile.dot }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: tile.text }}>
                                    {tile.label}
                                </span>
                            </div>
                            <p className="text-2xl font-black" style={{ color: tile.text }}>{count}</p>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${tile.dot}26` }}>
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${share}%`, backgroundColor: tile.dot }} />
                            </div>
                            <p className="mt-1 text-[10px] font-semibold" style={{ color: tile.text }}>{share}%</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function CompletionRing({ rate }: { rate: number }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = (rate / 100) * circ;
    return (
        <svg width="96" height="96" viewBox="0 0 96 96" className="flex-shrink-0">
            <circle cx="48" cy="48" r={r} fill="none" strokeWidth="10" stroke="#E2E8F0" />
            <circle
                cx="48" cy="48" r={r} fill="none" strokeWidth="10"
                stroke={rate >= 80 ? C.green : rate >= 50 ? C.orange : C.danger}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                transform="rotate(-90 48 48)"
                style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
            <text x="48" y="54" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0F172A">
                {rate}%
            </text>
        </svg>
    );
}

function ActivityFeed({ logs }: { logs: ActivityLog[] }) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                    Last 7 days
                </span>
            </div>

            {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                        <Inbox className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No activity yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">Updates will appear as you and your team work</p>
                </div>
            ) : (
                <ul className="space-y-3.5">
                    {logs.slice(0, 8).map((log) => (
                        <li key={log.id} className="flex items-start gap-3">
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-600" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug text-slate-900">
                                    <span className="font-bold">{log.actor.name}</span>
                                    <span className="text-slate-600"> — {log.action}</span>
                                </p>
                                {log.entry && (
                                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                                        {log.entry.title}
                                    </p>
                                )}
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                        {log.stage}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {new Date(log.created_at).toLocaleDateString(undefined, {
                                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Dashboard({
    pendingInvitations = [],
    cycle,
    myStatusCounts,
    totalWeight,
    entryCount,
    scope,
    scopeName,
    scopeDescription,
    scopedStatusCounts,
    scopedTotalEntries,
    scopedStaffCount,
    scopedCompletionRate,
    canReview,
    pendingReviewCount,
    pendingEvaluationReviewCount = 0,
    kpiCyclePhase,
    recentActivity,
    threeSixty,
}: Props) {
    const { currentTeam, auth } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";
    const userName = (auth?.user?.name ?? "").split(" ")[0];
    const [showInvitations, setShowInvitations] = useState(pendingInvitations.length > 0);

    const daysLeft = cycle ? daysUntil(cycle.submission_deadline) : null;
    const myTotal = totalOf(myStatusCounts) || 1;
    const myApproved = myStatusCounts.hr_approved;
    const myCompletionRate = pct(myApproved, myTotal);
    const badge = SCOPE_BADGE[scope];
    const hasOrgScope = scope !== "own";

    const threeSixtyAssignments = threeSixty?.my_assignments;
    const total360 = threeSixtyAssignments?.total ?? 0;
    const completed360 = threeSixtyAssignments?.completed ?? 0;
    const pending360 = threeSixtyAssignments?.pending ?? 0;
    const completionRate360 = total360 > 0 ? Math.round((completed360 / total360) * 100) : 0;
    const pairs360 = threeSixtyAssignments?.pairs ?? [];

    const relationshipCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        pairs360.forEach((p) => {
            const rel = p.relationship_type || "colleague";
            counts[rel] = (counts[rel] || 0) + 1;
        });
        return counts;
    }, [pairs360]);

    const formatRelation = (type: string) => {
        switch (type) {
            case "peer":
                return "Peer";
            case "supervisor_to_subordinate":
                return "Direct Report";
            case "subordinate_to_supervisor":
                return "Supervisor";
            default:
                return type.replace(/_/g, " ");
        }
    };

    const pendingPairs = useMemo(() => {
        return pairs360.filter((p) => p.status !== "completed");
    }, [pairs360]);

    return (
        <>
            <Head title="Dashboard" />
            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <div className="flex h-full w-full flex-1 flex-col bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                Welcome back{userName ? `, ${userName}` : ""}!
                            </h1>
                            <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 hidden sm:inline">
                                Progressive Credit
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            Here's your KPI and 360° multi-rater performance overview
                            <span className="hidden md:inline text-slate-300"> • </span>
                            <span className="hidden md:inline italic text-green-700 font-medium">"Taking every step with you"</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Scope badge */}
                        <span
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border"
                            style={{ backgroundColor: badge.bg, color: badge.color, borderColor: `${badge.color}33` }}
                        >
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: badge.color }} />
                            {badge.label} View
                        </span>
                        {/* Cycle pill */}
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
                            <Calendar className="h-3.5 w-3.5 text-orange-600" />
                            {cycle ? cycle.name : "No active KPI cycle"}
                        </span>
                    </div>
                </div>

                {/* ── Cycle deadline banner ────────────────────────────────── */}
                {cycle && daysLeft !== null && (
                    <div
                        className="mb-5 flex items-center gap-3.5 rounded-2xl px-5 py-3.5 border shadow-2xs"
                        style={{
                            backgroundColor: daysLeft <= 3 ? C.dangerLight : daysLeft <= 7 ? C.warnLight : C.greenLight,
                            borderColor: daysLeft <= 3 ? C.dangerBorder : daysLeft <= 7 ? C.warnBorder : C.greenBorder,
                        }}
                    >
                        <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{
                                backgroundColor: daysLeft <= 3 ? "#FEE2E2" : daysLeft <= 7 ? "#FFEDD5" : "#DCFCE7",
                                color: daysLeft <= 3 ? C.danger : daysLeft <= 7 ? C.orangeDark : C.greenDark,
                            }}
                        >
                            {daysLeft <= 3 ? (
                                <AlertCircle className="h-4 w-4" />
                            ) : daysLeft <= 7 ? (
                                <Clock className="h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                        </div>
                        <p className="text-sm font-semibold" style={{ color: daysLeft <= 3 ? C.danger : daysLeft <= 7 ? C.orangeDark : C.greenDark }}>
                            {daysLeft > 0
                                ? `KPI submission deadline: ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining — ${formatDate(cycle.submission_deadline)}`
                                : "KPI submission period has closed for this cycle."}
                        </p>
                    </div>
                )}

                {/* ── KPI Evaluation Phase Alert Banner ─────────────────────── */}
                {kpiCyclePhase === "evaluation" && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50/90 p-4 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-green-950">KPI Self-Evaluation Phase is Live</h4>
                                <p className="text-xs text-green-700">
                                    Appraisal self-scoring is now open. Score your achievements against agreed targets and submit comments for supervisor review.
                                </p>
                            </div>
                        </div>
                        {currentTeam && (
                            <Link
                                href={kpiEvaluationIndex.url(teamSlug)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-800"
                            >
                                Score My KPIs
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                )}

                {/* ── Supervisor Moderation Review Alert Banner ───────────────── */}
                {pendingEvaluationReviewCount > 0 && (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 p-4 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                                <FileCheck2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-orange-950">Staff Self-Evaluations Awaiting Moderation</h4>
                                <p className="text-xs text-orange-700">
                                    You have <strong>{pendingEvaluationReviewCount}</strong> staff member self-evaluation{pendingEvaluationReviewCount === 1 ? "" : "s"} submitted and waiting for your review and rating moderation.
                                </p>
                            </div>
                        </div>
                        {currentTeam && (
                            <Link
                                href={kpiEvaluationReviewQueue.url(teamSlug)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-700"
                            >
                                Review & Moderate Evaluations
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        )}
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    ACTIVE 360° APPRAISAL — EXECUTIVE SUMMARY WIDGET
                   ═══════════════════════════════════════════════════════════ */}
                {threeSixty.has_scheduled_appraisal && threeSixty.cycle ? (
                    <div
                        className="mb-7 overflow-hidden rounded-3xl border shadow-sm transition-all bg-white"
                        style={{
                            borderColor: threeSixty.my_assignments.is_locked ? C.greenBorder : C.orangeBorder,
                        }}
                    >
                        {/* Top decorative gradient strip in Progressive brand colours */}
                        <div
                            className="h-2 w-full"
                            style={{
                                background: threeSixty.my_assignments.is_locked
                                    ? `linear-gradient(to right, ${C.green}, ${C.greenDark})`
                                    : `linear-gradient(to right, ${C.orange}, ${C.green})`,
                            }}
                        />

                        <div className="p-6">
                            {/* Header row */}
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-xs"
                                        style={{
                                            backgroundColor: threeSixty.my_assignments.is_locked ? C.greenLight : C.orangeLight,
                                            color: threeSixty.my_assignments.is_locked ? C.greenDark : C.orangeDark,
                                        }}
                                    >
                                        {threeSixty.my_assignments.is_locked ? (
                                            <Lock className="h-6 w-6" />
                                        ) : (
                                            <Compass className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                                                Active 360° Appraisal: {threeSixty.cycle.name}
                                            </h3>
                                            <span
                                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: threeSixty.my_assignments.is_locked ? C.greenLight : C.warnLight,
                                                    color: threeSixty.my_assignments.is_locked ? C.greenDark : C.warn,
                                                }}
                                            >
                                                {threeSixty.my_assignments.is_locked ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        All Appraisals Completed & Group Locked
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3" />
                                                        {pending360} Pending in Your Group
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Appraisal Window:{" "}
                                            <strong>{formatDate(threeSixty.cycle.period_start)}</strong> to <strong>{formatDate(threeSixty.cycle.period_end)}</strong>
                                            {" • "}Evaluation Deadline:{" "}
                                            <strong className="text-orange-600">{formatDate(threeSixty.cycle.evaluation_deadline)}</strong>
                                            {threeSixty.cycle.days_remaining !== null && (
                                                <span
                                                    className="font-bold ml-1"
                                                    style={{ color: threeSixty.cycle.days_remaining <= 3 ? C.danger : C.orangeDark }}
                                                >
                                                    ({threeSixty.cycle.days_remaining} day{threeSixty.cycle.days_remaining === 1 ? "" : "s"} left)
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Primary Button linking to Appraisal Page */}
                                {currentTeam && (
                                    <Link
                                        href={myEvaluationsIndex.url(teamSlug)}
                                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                                        style={{ backgroundColor: pending360 > 0 ? C.orange : C.greenDark }}
                                    >
                                        <Award className="h-4 w-4" />
                                        {pending360 > 0
                                            ? `Go to 360° Appraisals (${pending360} Pending)`
                                            : `View All My 360° Appraisals (${total360})`}
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                )}
                            </div>

                            {/* ── Summary Metrics Strip ─────────────────────────────────── */}
                            {total360 > 0 && (
                                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Scheduled Colleagues
                                        </span>
                                        <div className="mt-1 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-slate-900">{total360}</span>
                                            <span className="text-xs text-slate-500">assigned</span>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4">
                                        <span className="text-[11px] font-bold text-green-800 uppercase tracking-wider">
                                            Completed Appraisals
                                        </span>
                                        <div className="mt-1 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-green-700">{completed360}</span>
                                            <span className="text-xs text-green-800">submitted</span>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
                                        <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                                            Pending Appraisals
                                        </span>
                                        <div className="mt-1 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black text-orange-600">{pending360}</span>
                                            <span className="text-xs text-orange-800">remaining</span>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            Appraisal Progress
                                        </span>
                                        <div className="mt-1 flex items-baseline gap-1.5">
                                            <span className="text-2xl font-black" style={{ color: completionRate360 === 100 ? C.greenDark : C.orangeDark }}>
                                                {completionRate360}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${completionRate360}%`,
                                                    backgroundColor: completionRate360 === 100 ? C.green : C.orange,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Breakdown & Scheduled Colleagues Summary ───────── */}
                            {total360 > 0 ? (
                                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        {/* Relationship Breakdown Badges */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900">
                                                Colleagues by Relationship:
                                            </span>
                                            {Object.entries(relationshipCounts).map(([rel, count]) => (
                                                <span
                                                    key={rel}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs"
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
                                                    <span className="capitalize">{formatRelation(rel)}:</span>
                                                    <strong className="text-slate-900">{count}</strong>
                                                </span>
                                            ))}
                                        </div>

                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <ShieldCheck className="h-3.5 w-3.5 text-green-700" />
                                            Anonymous & confidential multi-rater evaluation
                                        </p>
                                    </div>

                                    {/* Compact Preview of Next Pending Colleagues */}
                                    {pendingPairs.length > 0 ? (
                                        <div className="mt-3.5 border-t border-slate-200 pt-3">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-600">
                                                    Upcoming colleagues scheduled for your appraisal:
                                                </span>
                                                {currentTeam && (
                                                    <Link
                                                        href={myEvaluationsIndex.url(teamSlug)}
                                                        className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                                                    >
                                                        View all on 360° page →
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {pendingPairs.slice(0, 4).map((pair) => (
                                                    <div
                                                        key={pair.id}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs"
                                                    >
                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white bg-slate-800">
                                                            {pair.evaluatee.name.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="truncate text-xs font-bold text-slate-900">
                                                                {pair.evaluatee.name}
                                                            </span>
                                                            <span className="ml-1.5 text-[10px] capitalize text-slate-500">
                                                                ({formatRelation(pair.relationship_type)})
                                                            </span>
                                                        </div>
                                                        <span className="ml-1 rounded-md bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-700">
                                                            Pending
                                                        </span>
                                                    </div>
                                                ))}

                                                {pendingPairs.length > 4 && (
                                                    <Link
                                                        href={currentTeam ? myEvaluationsIndex.url(teamSlug) : "#"}
                                                        className="inline-flex items-center rounded-xl border border-dashed border-orange-300 bg-orange-50/50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-50"
                                                    >
                                                        +{pendingPairs.length - 4} more colleagues
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-3.5 flex items-center gap-2 border-t border-slate-200 pt-3">
                                            <CheckCircle2 className="h-4 w-4 text-green-700" />
                                            <span className="text-xs font-semibold text-green-800">
                                                Excellent! You have completed appraisals for all {total360} scheduled colleagues in this group.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                                    <p className="text-xs text-slate-500">
                                        No review pairs assigned to you for this cycle yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mb-7 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs">
                        <div className="flex items-center gap-3.5">
                            <div className="rounded-2xl bg-orange-50 p-3 text-orange-600 border border-orange-100">
                                <Compass className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    No Active 360° Appraisal Period Scheduled
                                </h3>
                                <p className="text-xs text-slate-500">
                                    360° Core Values multi-rater appraisals will appear here once opened by HR administrators.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    APPRAISAL QUICK ACTIONS HUB
                   ═══════════════════════════════════════════════════════════ */}
                <div className="mb-7">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="h-5 w-1 rounded-full bg-orange-600" />
                        <h2 className="text-base font-bold text-slate-900">Appraisal Quick Navigation</h2>
                        <span className="text-xs text-slate-500">Core appraisal actions & tools</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Link
                            href={currentTeam ? kpiIndex.url(teamSlug) : "#"}
                            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-orange-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
                                    <ClipboardList className="h-5 w-5" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
                            </div>
                            <div className="mt-3.5">
                                <h3 className="text-sm font-bold text-slate-900">My KPIs</h3>
                                <p className="mt-0.5 text-xs text-slate-500">Target setting, weights, and submission status</p>
                            </div>
                        </Link>

                        <Link
                            href={currentTeam ? kpiEvaluationIndex.url(teamSlug) : "#"}
                            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-green-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-100">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-green-700" />
                            </div>
                            <div className="mt-3.5">
                                <h3 className="text-sm font-bold text-slate-900">KPI Evaluation</h3>
                                <p className="mt-0.5 text-xs text-slate-500">Self-ratings and achievements against targets</p>
                            </div>
                        </Link>

                        <Link
                            href={currentTeam ? myEvaluationsIndex.url(teamSlug) : "#"}
                            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-orange-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-100">
                                    <Award className="h-5 w-5" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-orange-600" />
                            </div>
                            <div className="mt-3.5">
                                <h3 className="text-sm font-bold text-slate-900">360° Appraisals</h3>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {pending360 > 0 ? `${pending360} pending evaluations` : "Multi-rater peer & supervisor reviews"}
                                </p>
                            </div>
                        </Link>

                        <Link
                            href={currentTeam ? `/${teamSlug}/reports/performance` : "#"}
                            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-green-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-100">
                                    <BarChart2 className="h-5 w-5" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-green-700" />
                            </div>
                            <div className="mt-3.5">
                                <h3 className="text-sm font-bold text-slate-900">Performance Reports</h3>
                                <p className="mt-0.5 text-xs text-slate-500">Core value rubric scores & org rankings</p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════
                    360° SUMMARY OF SCORES PER CORE VALUE (Average & Comments)
                   ═══════════════════════════════════════════════════════════ */}
                {threeSixty.my_scores.core_values.length > 0 && (
                    <div className="mb-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="h-5 w-1 rounded-full bg-green-700" />
                                    <h2 className="text-base font-bold text-slate-900">
                                        My 360° Appraisal Scorecard — Core Values Rubric
                                    </h2>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Anonymous, weighted scores and qualitative ratings received across the 5 corporate core values.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {threeSixty.my_scores.overall_average !== null && (
                                    <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2">
                                        <Star className="h-4 w-4 fill-green-600 text-green-600" />
                                        <span className="text-xs font-bold text-green-900">
                                            Overall 360° Average:
                                        </span>
                                        <span className="text-base font-black text-green-700">
                                            {threeSixty.my_scores.overall_average} / 5.0
                                        </span>
                                    </div>
                                )}
                                {currentTeam && (
                                    <Link
                                        href={`/${teamSlug}/reports/performance`}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 shadow-2xs hover:border-orange-300"
                                    >
                                        <BarChart2 className="h-3.5 w-3.5 text-orange-600" />
                                        Full Reports & Rankings
                                        <ArrowRight className="h-3 w-3" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Core Values Score Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            {threeSixty.my_scores.core_values.map((cv) => {
                                const isGreen = cv.badge_type === "green";
                                const isWarn = cv.badge_type === "warn";
                                const isDanger = cv.badge_type === "danger";

                                return (
                                    <div
                                        key={cv.id}
                                        className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs transition-all hover:shadow-xs"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-900">
                                                    {cv.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {cv.weight}% Wt
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-slate-900">
                                                    {cv.average_score !== null ? cv.average_score : "—"}
                                                </span>
                                                <span className="text-xs text-slate-500 font-semibold">
                                                    / 5.0
                                                </span>
                                            </div>

                                            {/* Progress Bar for Score 1 to 5 */}
                                            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: cv.average_score ? `${(cv.average_score / 5) * 100}%` : "0%",
                                                        backgroundColor: isGreen ? C.green : isWarn ? C.warn : isDanger ? C.danger : "#CBD5E1",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Qualitative rating comment */}
                                        <div className="mt-4 border-t border-slate-200 pt-2.5">
                                            <span
                                                className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: isGreen
                                                        ? C.greenLight
                                                        : isWarn
                                                        ? C.warnLight
                                                        : isDanger
                                                        ? C.dangerLight
                                                        : "#F1F5F9",
                                                    color: isGreen
                                                        ? C.greenDark
                                                        : isWarn
                                                        ? C.warn
                                                        : isDanger
                                                        ? C.danger
                                                        : "#64748B",
                                                    border: `1px solid ${
                                                        isGreen ? C.greenBorder : isWarn ? C.warnBorder : isDanger ? C.dangerBorder : "#E2E8F0"
                                                    }`,
                                                }}
                                            >
                                                {cv.rating_comment}
                                            </span>
                                            <div className="mt-1 text-[10px] text-slate-500 font-medium">
                                                Based on {cv.ratings_count} response{cv.ratings_count === 1 ? "" : "s"}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════
                    SECTION 1 — My KPIs
                   ═══════════════════════════════════════════════════════════ */}
                <div className="mb-3 flex items-center gap-2">
                    <span className="h-5 w-1 rounded-full bg-orange-600" />
                    <h2 className="text-base font-bold text-slate-900">My KPIs</h2>
                    <span className="text-xs text-slate-500">Your personal performance this cycle</span>
                </div>

                {/* Top metric cards with clean Lucide icons */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        label="My KPI Entries"
                        value={entryCount}
                        sub={entryCount === 0 ? "No entries yet" : `${myApproved} finalized`}
                        icon={ClipboardList}
                        iconBg="bg-orange-50"
                        iconColor="text-orange-600"
                        href={currentTeam ? kpiIndex.url(teamSlug) : "#"}
                        linkLabel={entryCount === 0 ? "Add first KPI" : "Manage my KPIs"}
                    />
                    <MetricCard
                        label="Weight Allocated"
                        value={`${totalWeight}%`}
                        sub={totalWeight === 100 ? "Fully allocated (100%)" : `${100 - totalWeight}% remaining`}
                        icon={Scale}
                        iconBg={totalWeight === 100 ? "bg-green-50" : "bg-orange-50"}
                        iconColor={totalWeight === 100 ? "text-green-700" : "text-orange-600"}
                    />
                    <MetricCard
                        label="My Completion"
                        value={`${myCompletionRate}%`}
                        sub={`${myApproved} of ${entryCount} finalized`}
                        icon={CheckCircle2}
                        iconBg="bg-green-50"
                        iconColor="text-green-700"
                    />
                    {canReview ? (
                        <MetricCard
                            label="Pending Review"
                            value={pendingReviewCount}
                            sub={`KPI${pendingReviewCount === 1 ? "" : "s"} awaiting your approval`}
                            icon={Eye}
                            accent
                            href={currentTeam ? kpiReviewQueue.url(teamSlug) : "#"}
                            linkLabel="Open Review Queue"
                        />
                    ) : (
                        <MetricCard
                            label="Finalized"
                            value={myApproved}
                            sub={totalWeight === 100 ? "All weight allocated" : `${totalWeight}% weight allocated`}
                            icon={Award}
                            iconBg="bg-green-50"
                            iconColor="text-green-700"
                        />
                    )}
                </div>

                {/* Status breakdown + Activity (My scope) */}
                <div className="mb-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                    <StatusGrid counts={myStatusCounts} title="My KPI Status Breakdown" />
                    <ActivityFeed logs={recentActivity} />
                </div>

                {/* ════════════════════════════════════════════════════════════
                    SECTION 2 — Org/Scope View (only if scope !== 'own')
                   ═══════════════════════════════════════════════════════════ */}
                {hasOrgScope && (
                    <>
                        <div className="mb-3 flex items-center gap-2">
                            <span className="h-5 w-1 rounded-full" style={{ backgroundColor: badge.color }} />
                            <h2 className="text-base font-bold text-slate-900">{scopeName}</h2>
                            <span className="text-xs text-slate-500">{scopeDescription}</span>
                            <span
                                className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                                style={{ backgroundColor: badge.bg, color: badge.color, borderColor: `${badge.color}33` }}
                            >
                                {badge.label}
                            </span>
                        </div>

                        {/* Scoped aggregate cards */}
                        <div className="mb-6 grid gap-4 sm:grid-cols-3">
                            <MetricCard
                                label="Total Entries"
                                value={scopedTotalEntries}
                                sub="KPI entries in scope"
                                icon={FolderKanban}
                                iconBg="bg-orange-50"
                                iconColor="text-orange-600"
                            />
                            <MetricCard
                                label="Staff with Entries"
                                value={scopedStaffCount}
                                sub="Unique staff members"
                                icon={Users}
                                iconBg="bg-green-50"
                                iconColor="text-green-700"
                            />
                            {/* Completion rate with ring */}
                            <div className="flex items-center gap-5 rounded-2xl p-5 shadow-xs border border-slate-200 bg-white transition-all hover:shadow-md">
                                <CompletionRing rate={scopedCompletionRate} />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Completion Rate
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-900">
                                        {scopedStatusCounts.hr_approved}
                                        <span className="text-sm font-normal text-slate-500 ml-1">approved</span>
                                    </p>
                                    <p className="text-xs mt-0.5 text-slate-500">
                                        of {scopedTotalEntries} total entries
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Scoped status breakdown */}
                        <StatusGrid counts={scopedStatusCounts} title={`${scopeName} — Status Breakdown`} />
                    </>
                )}
            </div>
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: "Dashboard",
            href: props.currentTeam ? dashboard.url(props.currentTeam.slug) : "/",
        },
    ],
});
