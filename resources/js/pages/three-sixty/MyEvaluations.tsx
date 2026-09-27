// resources/js/pages/three-sixty/MyEvaluations.tsx
import { Head, Link, usePage, router } from "@inertiajs/react";
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Lock,
    ArrowRight,
    Users,
    LayoutGrid,
    Layers,
} from "lucide-react";
import { show as showEvaluationRoute } from "@/routes/three-sixty/evaluations";

// ── Brand colours ───────────────────────────────────────────────────────────
const C = {
    orange: "#EA580C",
    orangeLight: "#FED7AA",
    orangeDark: "#C2410C",
    green: "#15803D",
    greenLight: "#DCFCE7",
    greenDark: "#166534",
    navy: "#1E3A5F",
    navyLight: "#EFF6FF",
    bg: "#F9FAFB",
    white: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    danger: "#DC2626",
    dangerLight: "#FEE2E2",
    warn: "#D97706",
    warnLight: "#FEF3C7",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────
interface Cycle {
    id: number;
    name: string;
    period_start: string;
    period_end: string;
    evaluation_deadline: string;
    status: string;
    days_remaining: number;
}

interface Evaluatee {
    id: number;
    name: string;
    email: string;
    job_title: string | null;
    dept_name: string | null;
    team_name: string | null;
}

interface Assignment {
    id: number;
    relationship_type: string;
    status: "pending" | "in_progress" | "completed";
    score: number | string | null;
    submitted_at: string | null;
    evaluatee: Evaluatee;
}

interface Stats {
    total: number;
    completed: number;
    pending: number;
}

interface ActiveCycleItem {
    id: number;
    name: string;
    period_start: string;
    period_end: string;
    evaluation_deadline: string;
    status: string;
    days_remaining: number;
    total_assignments: number;
    completed_assignments: number;
    pending_assignments: number;
}

interface Props {
    cycle: Cycle | null;
    activeCycles?: ActiveCycleItem[];
    assignments: Assignment[];
    stats: Stats;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function ratingLabel(score: number | string | null): {
    label: string;
    color: string;
    bg: string;
} {
    if (score === null || score === undefined || score === "")
        return { label: "—", color: C.textSecondary, bg: C.border };
    const num = Number(score);
    if (isNaN(num)) return { label: "—", color: C.textSecondary, bg: C.border };
    if (num < 2.5)
        return {
            label: "Far Below Average",
            color: C.danger,
            bg: C.dangerLight,
        };
    if (num <= 3.7) return { label: "Average", color: C.warn, bg: C.warnLight };
    return { label: "Far Above Average", color: C.greenDark, bg: C.greenLight };
}

function formatScore(score: number | string | null): string {
    if (score === null || score === undefined || score === "") return "—";
    const num = Number(score);
    return isNaN(num) ? "—" : num.toFixed(2);
}

function relationshipLabel(type: string) {
    return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: Assignment["status"] }) {
    const map: Record<
        Assignment["status"],
        { label: string; color: string; bg: string; icon: React.ReactNode }
    > = {
        pending: {
            label: "Pending",
            color: C.warn,
            bg: C.warnLight,
            icon: <Clock className="h-3 w-3" />,
        },
        in_progress: {
            label: "In Progress",
            color: C.navy,
            bg: C.navyLight,
            icon: <AlertCircle className="h-3 w-3" />,
        },
        completed: {
            label: "Completed",
            color: C.greenDark,
            bg: C.greenLight,
            icon: <CheckCircle2 className="h-3 w-3" />,
        },
    };
    const s = map[status];
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: s.bg, color: s.color }}
        >
            {s.icon}
            {s.label}
        </span>
    );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = circ * (pct / 100);
    return (
        <svg width={88} height={88} className="rotate-[-90deg]">
            <circle
                cx={44}
                cy={44}
                r={r}
                fill="none"
                stroke={C.border}
                strokeWidth={8}
            />
            <circle
                cx={44}
                cy={44}
                r={r}
                fill="none"
                stroke={pct === 100 ? C.green : C.orange}
                strokeWidth={8}
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
        </svg>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyEvaluations({ cycle, activeCycles = [], assignments, stats }: Props) {
    const { props } = usePage<{ currentTeam?: { slug: string } }>();
    const teamSlug = props.currentTeam?.slug ?? "";

    const handleSwitchCycle = (cycleId: number) => {
        router.get(
            window.location.pathname,
            { cycle_id: cycleId },
            { preserveState: true }
        );
    };

    const pct =
        stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <>
            <Head title="My 360° Appraisals" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Page Header ──────────────────────────────────────── */}
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Award
                                    className="h-5 w-5"
                                    style={{ color: C.orange }}
                                />
                                <h1
                                    className="text-2xl font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    My 360° Appraisals
                                </h1>
                            </div>
                            <p
                                className="text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Rate your colleagues across our company core
                                values for the current evaluation cycle.
                            </p>
                        </div>
                        <Link
                            href={teamSlug ? `/${teamSlug}/dashboard` : "/"}
                            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-gray-50"
                            style={{
                                borderColor: C.border,
                                color: C.textSecondary,
                            }}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Dashboard
                        </Link>
                    </div>

                    {/* ── Multiple Active Cycles Switcher Banner ─────────── */}
                    {activeCycles && activeCycles.length > 1 && (
                        <div
                            className="mb-6 rounded-2xl border bg-white p-5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5"
                                style={{ borderColor: C.border }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            backgroundColor: C.orangeLight,
                                            color: C.orangeDark,
                                        }}
                                    >
                                        <Layers className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-bold text-gray-900">
                                                Active Appraisal Cycles
                                            </h2>
                                            <span
                                                className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                style={{
                                                    backgroundColor: C.orangeLight,
                                                    color: C.orangeDark,
                                                }}
                                            >
                                                {activeCycles.length} Concurrent Active Cycles
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            You have evaluations across multiple active cycles. Select a cycle to view and complete your appraisals.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Cycle Selection Cards */}
                            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {activeCycles.map((c) => {
                                    const isSelected = c.id === cycle?.id;
                                    const hasPending = c.pending_assignments > 0;
                                    const isAllDone =
                                        c.total_assignments > 0 &&
                                        c.pending_assignments === 0;

                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleSwitchCycle(c.id)}
                                            className={`relative flex flex-col justify-between rounded-xl p-3.5 text-left transition-all ${
                                                isSelected
                                                    ? "ring-2 shadow-xs"
                                                    : "border hover:border-gray-300 hover:bg-gray-50/60"
                                            }`}
                                            style={{
                                                borderColor: isSelected
                                                    ? C.orange
                                                    : C.border,
                                                backgroundColor: isSelected
                                                    ? "#FFF7ED"
                                                    : C.white,
                                                outlineColor: isSelected
                                                    ? C.orange
                                                    : undefined,
                                            }}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2">
                                                    <span className="text-xs font-bold text-gray-900 line-clamp-1">
                                                        {c.name}
                                                    </span>
                                                    {isSelected && (
                                                        <span
                                                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    C.orange,
                                                            }}
                                                        >
                                                            Viewing
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-[11px] text-gray-500">
                                                    {formatDate(c.period_start)} –{" "}
                                                    {formatDate(c.period_end)}
                                                </p>
                                                <p
                                                    className="mt-0.5 text-[11px] font-medium"
                                                    style={{
                                                        color:
                                                            c.days_remaining <= 3
                                                                ? C.danger
                                                                : C.warn,
                                                    }}
                                                >
                                                    Deadline: {formatDate(c.evaluation_deadline)}{" "}
                                                    {c.days_remaining > 0
                                                        ? `(${c.days_remaining}d left)`
                                                        : "(Deadline passed)"}
                                                </p>
                                            </div>

                                            <div
                                                className="mt-3 flex items-center justify-between border-t pt-2"
                                                style={{
                                                    borderColor: isSelected
                                                        ? C.orangeLight
                                                        : C.border,
                                                }}
                                            >
                                                <span className="text-[11px] text-gray-500 font-medium">
                                                    Your Evaluations:
                                                </span>
                                                {hasPending ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                        style={{
                                                            backgroundColor:
                                                                C.warnLight,
                                                            color: C.warn,
                                                        }}
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                        {c.pending_assignments} Pending ({c.completed_assignments}/{c.total_assignments})
                                                    </span>
                                                ) : isAllDone ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                                                        style={{
                                                            backgroundColor:
                                                                C.greenLight,
                                                            color: C.greenDark,
                                                        }}
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        All {c.total_assignments} Done
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">
                                                        0 Assigned
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── No Active Cycle Banner ─────────────────────────── */}
                    {!cycle && (
                        <div
                            className="flex flex-col items-center justify-center rounded-2xl border p-12 text-center shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                borderColor: C.border,
                            }}
                        >
                            <Users
                                className="mb-3 h-10 w-10"
                                style={{ color: C.border }}
                            />
                            <h2
                                className="text-base font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                No Active 360° Appraisal Cycle
                            </h2>
                            <p
                                className="mt-1 max-w-sm text-xs"
                                style={{ color: C.textSecondary }}
                            >
                                There is no open 360° evaluation cycle at this
                                time. Your administrator will notify you when a
                                new period begins.
                            </p>
                        </div>
                    )}

                    {cycle && (
                        <>
                            {/* ── Cycle Info & Summary Cards ─────────────── */}
                            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
                                {/* Cycle period card */}
                                <div
                                    className="col-span-1 sm:col-span-2 rounded-2xl border p-5 shadow-sm"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                            style={{
                                                backgroundColor: C.navyLight,
                                            }}
                                        >
                                            <Calendar
                                                className="h-5 w-5"
                                                style={{ color: C.navy }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p
                                                    className="text-[11px] font-semibold uppercase tracking-wider"
                                                    style={{
                                                        color: C.textSecondary,
                                                    }}
                                                >
                                                    Active Cycle
                                                </p>
                                                {activeCycles && activeCycles.length > 1 && (
                                                    <span
                                                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                                                        style={{
                                                            backgroundColor:
                                                                C.orangeLight,
                                                            color: C.orangeDark,
                                                        }}
                                                    >
                                                        Cycle {activeCycles.findIndex((c) => c.id === cycle.id) + 1} of {activeCycles.length}
                                                    </span>
                                                )}
                                            </div>

                                            {activeCycles && activeCycles.length > 1 ? (
                                                <div className="mt-1">
                                                    <select
                                                        value={cycle.id}
                                                        onChange={(e) =>
                                                            handleSwitchCycle(
                                                                Number(e.target.value),
                                                            )
                                                        }
                                                        className="w-full rounded-lg border px-2.5 py-1 text-sm font-bold text-gray-900 shadow-2xs focus:border-orange-500 focus:outline-hidden"
                                                        style={{
                                                            borderColor: C.border,
                                                            backgroundColor: C.white,
                                                        }}
                                                    >
                                                        {activeCycles.map((c) => (
                                                            <option
                                                                key={c.id}
                                                                value={c.id}
                                                            >
                                                                {c.name} {c.pending_assignments > 0 ? `(${c.pending_assignments} pending)` : `(Done)`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <p
                                                    className="mt-0.5 text-base font-bold"
                                                    style={{
                                                        color: C.textPrimary,
                                                    }}
                                                >
                                                    {cycle.name}
                                                </p>
                                            )}
                                            <p
                                                className="mt-1 text-xs"
                                                style={{
                                                    color: C.textSecondary,
                                                }}
                                            >
                                                {formatDate(cycle.period_start)}{" "}
                                                — {formatDate(cycle.period_end)}
                                            </p>
                                            <p
                                                className="mt-1 text-xs font-semibold"
                                                style={{
                                                    color:
                                                        cycle.days_remaining <=
                                                        3
                                                            ? C.danger
                                                            : C.warn,
                                                }}
                                            >
                                                Deadline:{" "}
                                                {formatDate(
                                                    cycle.evaluation_deadline,
                                                )}
                                                &nbsp;
                                                {cycle.days_remaining > 0
                                                    ? `(${cycle.days_remaining}d remaining)`
                                                    : "(Deadline passed)"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress ring */}
                                <div
                                    className="rounded-2xl border p-5 shadow-sm flex flex-col items-center justify-center text-center"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    <div className="relative">
                                        <ProgressRing pct={pct} />
                                        <span
                                            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
                                            style={{
                                                color:
                                                    pct === 100
                                                        ? C.greenDark
                                                        : C.orange,
                                            }}
                                        >
                                            {pct}%
                                        </span>
                                    </div>
                                    <p
                                        className="mt-1 text-[11px] font-semibold"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Completion
                                    </p>
                                </div>

                                {/* Counts */}
                                <div
                                    className="rounded-2xl border p-5 shadow-sm flex flex-col justify-between gap-2"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    <div>
                                        <p
                                            className="text-[11px] font-semibold uppercase tracking-wider"
                                            style={{ color: C.textSecondary }}
                                        >
                                            Total Assigned
                                        </p>
                                        <p
                                            className="mt-0.5 text-3xl font-bold"
                                            style={{ color: C.textPrimary }}
                                        >
                                            {stats.total}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div>
                                            <p
                                                className="text-[10px]"
                                                style={{
                                                    color: C.textSecondary,
                                                }}
                                            >
                                                Completed
                                            </p>
                                            <p
                                                className="font-bold"
                                                style={{ color: C.greenDark }}
                                            >
                                                {stats.completed}
                                            </p>
                                        </div>
                                        <div>
                                            <p
                                                className="text-[10px]"
                                                style={{
                                                    color: C.textSecondary,
                                                }}
                                            >
                                                Pending
                                            </p>
                                            <p
                                                className="font-bold"
                                                style={{ color: C.warn }}
                                            >
                                                {stats.pending}
                                            </p>
                                        </div>
                                        <div>
                                            <p
                                                className="text-[10px]"
                                                style={{
                                                    color: C.textSecondary,
                                                }}
                                            >
                                                In Progress
                                            </p>
                                            <p
                                                className="font-bold"
                                                style={{ color: C.navy }}
                                            >
                                                {stats.total -
                                                    stats.completed -
                                                    stats.pending}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── All Completed Banner ──────────────────── */}
                            {stats.total > 0 &&
                                stats.completed === stats.total && (
                                    <div
                                        className="mb-5 flex items-center gap-3 rounded-2xl border p-4 shadow-sm"
                                        style={{
                                            backgroundColor: C.greenLight,
                                            borderColor: `${C.green}33`,
                                        }}
                                    >
                                        <CheckCircle2
                                            className="h-5 w-5 flex-shrink-0"
                                            style={{ color: C.greenDark }}
                                        />
                                        <p
                                            className="text-xs font-bold"
                                            style={{ color: C.greenDark }}
                                        >
                                            🎉 Excellent! You have completed all
                                            your 360° appraisals for this cycle.
                                            All evaluations are locked.
                                        </p>
                                    </div>
                                )}

                            {/* ── Assignment Table ──────────────────────── */}
                            {assignments.length === 0 ? (
                                <div
                                    className="flex flex-col items-center justify-center rounded-2xl border p-10 text-center shadow-sm"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    <Users
                                        className="mb-3 h-8 w-8"
                                        style={{ color: C.border }}
                                    />
                                    <p
                                        className="text-sm font-semibold"
                                        style={{ color: C.textPrimary }}
                                    >
                                        No evaluations assigned yet
                                    </p>
                                    <p
                                        className="mt-1 text-xs"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Evaluation pairs will appear here once
                                        your administrator generates assignments
                                        for this cycle.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="overflow-hidden rounded-2xl border shadow-sm"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    <div
                                        className="flex items-center justify-between border-b px-6 py-4"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: "#FAFAFA",
                                        }}
                                    >
                                        <h2
                                            className="text-sm font-bold"
                                            style={{ color: C.textPrimary }}
                                        >
                                            Evaluation Assignments
                                        </h2>
                                        <span
                                            className="text-xs"
                                            style={{ color: C.textSecondary }}
                                        >
                                            {assignments.length} colleague
                                            {assignments.length !== 1
                                                ? "s"
                                                : ""}{" "}
                                            to appraise
                                        </span>
                                    </div>

                                    <div
                                        className="divide-y"
                                        style={{ borderColor: C.border }}
                                    >
                                        {assignments.map((a) => {
                                            const isCompleted =
                                                a.status === "completed";
                                            const rating = ratingLabel(a.score);

                                            return (
                                                <div
                                                    key={a.id}
                                                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                                                >
                                                    {/* Left: Evaluatee info */}
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    C.navy,
                                                            }}
                                                        >
                                                            {a.evaluatee.name
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p
                                                                className="text-sm font-semibold"
                                                                style={{
                                                                    color: C.textPrimary,
                                                                }}
                                                            >
                                                                {
                                                                    a.evaluatee
                                                                        .name
                                                                }
                                                            </p>
                                                            <div
                                                                className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs"
                                                                style={{
                                                                    color: C.textSecondary,
                                                                }}
                                                            >
                                                                {a.evaluatee
                                                                    .job_title && (
                                                                    <span>
                                                                        {
                                                                            a
                                                                                .evaluatee
                                                                                .job_title
                                                                        }
                                                                    </span>
                                                                )}
                                                                {a.evaluatee
                                                                    .dept_name && (
                                                                    <>
                                                                        <span className="opacity-40">
                                                                            ·
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                a
                                                                                    .evaluatee
                                                                                    .dept_name
                                                                            }
                                                                        </span>
                                                                    </>
                                                                )}
                                                                {a.evaluatee
                                                                    .team_name && (
                                                                    <>
                                                                        <span className="opacity-40">
                                                                            ·
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                a
                                                                                    .evaluatee
                                                                                    .team_name
                                                                            }
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: relationship + status + score + CTA */}
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span
                                                            className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                                            style={{
                                                                backgroundColor:
                                                                    C.navyLight,
                                                                color: C.navy,
                                                            }}
                                                        >
                                                            {relationshipLabel(
                                                                a.relationship_type,
                                                            )}
                                                        </span>

                                                        <StatusBadge
                                                            status={a.status}
                                                        />

                                                        {isCompleted &&
                                                            a.score !==
                                                                null && (
                                                                <span
                                                                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                                                                    style={{
                                                                        backgroundColor:
                                                                            rating.bg,
                                                                        color: rating.color,
                                                                    }}
                                                                >
                                                                    {formatScore(
                                                                        a.score,
                                                                    )}{" "}
                                                                    —{" "}
                                                                    {
                                                                        rating.label
                                                                    }
                                                                </span>
                                                            )}

                                                        {isCompleted ? (
                                                            <span
                                                                className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
                                                                style={{
                                                                    borderColor:
                                                                        C.border,
                                                                    color: C.textSecondary,
                                                                }}
                                                            >
                                                                <Lock className="h-3 w-3" />
                                                                Locked
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href={showEvaluationRoute.url(
                                                                    {
                                                                        current_team:
                                                                            teamSlug,
                                                                        evaluation:
                                                                            a.id,
                                                                    },
                                                                )}
                                                                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:shadow-md"
                                                                style={{
                                                                    backgroundColor:
                                                                        C.orange,
                                                                }}
                                                            >
                                                                {a.status ===
                                                                "in_progress"
                                                                    ? "Continue"
                                                                    : "Begin Appraisal"}
                                                                <ArrowRight className="h-3.5 w-3.5" />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
