import { Head, Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    Award,
    Calendar,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Save,
    Send,
    MessageSquare,
    Info,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    TrendingUp,
    Sparkles,
    Target,
    Scale,
    HelpCircle,
    ArrowRight,
    FileCheck2,
    Check,
    ArrowLeft,
    ShieldCheck,
} from "lucide-react";
import Swal from "sweetalert2";
import {
    save as saveSelfScoreRoute,
    submit as submitEvaluationRoute,
} from "@/routes/kpi/evaluation";
import { index as kpiIndex } from "@/routes/kpi";

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
};

const RATING_RUBRIC: Record<number, { label: string; desc: string }> = {
    1: { label: "Poor", desc: "Significantly below expected standard" },
    2: { label: "Fair", desc: "Partially achieved; below target expectations" },
    3: { label: "Average", desc: "Meets expected performance target" },
    4: { label: "Good", desc: "Exceeds standard target expectations" },
    5: { label: "Excellent", desc: "Outstanding, exceptional achievement" },
};

interface LogEntry {
    id: number;
    stage: string;
    action: string;
    comment: string | null;
    actor?: { name: string };
    created_at: string;
}

interface KpiEntry {
    id: number;
    title: string;
    description: string;
    target: string | null;
    actual_result: string | null;
    weight: number;
    self_rating: number | null;
    self_comment: string | null;
    supervisor_rating: number | null;
    supervisor_comment: string | null;
    evaluation_status:
        | "pending"
        | "self_submitted"
        | "supervisor_returned"
        | "completed";
    evaluation_submitted_at: string | null;
    logs?: LogEntry[];
}

interface Cycle {
    id: number;
    name: string;
    period_start: string;
    period_end: string;
    submission_deadline: string;
    evaluation_deadline?: string | null;
    status: string;
    phase: string;
}

interface Props {
    cycle: Cycle | null;
    entries: KpiEntry[];
    canSubmit: boolean;
    weightedScore: number | null;
    threeSixtyScore: number | null;
}

function daysUntil(dateString?: string | null): number | null {
    if (!dateString) return null;
    return Math.ceil((new Date(dateString).getTime() - Date.now()) / 86_400_000);
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return "N/A";
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

export default function MyEvaluation({
    cycle,
    entries = [],
    canSubmit,
    weightedScore,
    threeSixtyScore,
}: Props) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";

    // Local state for edits on each entry
    const [localForms, setLocalForms] = useState<
        Record<
            number,
            {
                self_rating: number | null;
                actual_result: string;
                self_comment: string;
            }
        >
    >(() => {
        const initial: Record<
            number,
            {
                self_rating: number | null;
                actual_result: string;
                self_comment: string;
            }
        > = {};
        entries.forEach((e) => {
            initial[e.id] = {
                self_rating: e.self_rating,
                actual_result: e.actual_result ?? "",
                self_comment: e.self_comment ?? "",
            };
        });
        return initial;
    });

    const [savingId, setSavingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
    const [showRubricGuide, setShowRubricGuide] = useState(false);

    const daysLeft = cycle?.evaluation_deadline ? daysUntil(cycle.evaluation_deadline) : null;

    const handleRatingSelect = (entryId: number, score: number) => {
        setLocalForms((prev) => ({
            ...prev,
            [entryId]: {
                ...prev[entryId],
                self_rating: score,
            },
        }));
    };

    const handleFieldChange = (
        entryId: number,
        field: "actual_result" | "self_comment",
        value: string,
    ) => {
        setLocalForms((prev) => ({
            ...prev,
            [entryId]: {
                ...prev[entryId],
                [field]: value,
            },
        }));
    };

    const toggleLogs = (entryId: number) => {
        setExpandedLogs((prev) => ({
            ...prev,
            [entryId]: !prev[entryId],
        }));
    };

    const saveKpi = (entry: KpiEntry) => {
        const formData = localForms[entry.id];
        if (!formData || !formData.self_rating) {
            Swal.fire({
                icon: "warning",
                title: "Rating Required",
                text: "Please select a score from 1 to 5 before saving.",
                confirmButtonColor: C.orange,
            });
            return;
        }

        if (!formData.actual_result.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Actual Result Required",
                text: "Please enter the actual result achieved against your target.",
                confirmButtonColor: C.orange,
            });
            return;
        }

        if (
            !formData.self_comment.trim() ||
            formData.self_comment.trim().length < 3
        ) {
            Swal.fire({
                icon: "warning",
                title: "Comment Required",
                text: "Please provide a self-evaluation comment (at least 3 characters).",
                confirmButtonColor: C.orange,
            });
            return;
        }

        setSavingId(entry.id);
        router.put(
            saveSelfScoreRoute.url({
                current_team: teamSlug,
                kpiEntry: entry.id,
            }),
            {
                self_rating: formData.self_rating,
                actual_result: formData.actual_result,
                self_comment: formData.self_comment,
            },
            {
                preserveScroll: true,
                onFinish: () => setSavingId(null),
            },
        );
    };

    const submitAllEvaluations = async () => {
        // Double-check all actionable entries are filled
        const actionableEntries = entries.filter((e) =>
            ["pending", "supervisor_returned"].includes(e.evaluation_status),
        );

        const incomplete = actionableEntries.some((e) => {
            const f = localForms[e.id];
            return (
                !f ||
                !f.self_rating ||
                !f.actual_result.trim() ||
                !f.self_comment.trim()
            );
        });

        if (incomplete) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Evaluation",
                text: "All your KPIs must have a score (1 to 5), actual result, and comment saved before submitting.",
                confirmButtonColor: C.orange,
            });
            return;
        }

        const confirm = await Swal.fire({
            icon: "question",
            title: "Submit KPI Evaluation?",
            text: "Are you sure you want to submit your self-evaluation to your supervisor? Once submitted, your supervisor will review and moderate your scores.",
            showCancelButton: true,
            confirmButtonText: "Yes, submit to supervisor",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.green,
            cancelButtonColor: "#64748B",
        });

        if (!confirm.isConfirmed) return;

        setSubmitting(true);
        router.post(
            submitEvaluationRoute.url(teamSlug),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    // Calculate metrics
    const totalCount = entries.length;
    const completedCount = entries.filter(
        (e) => e.evaluation_status === "completed",
    ).length;
    const submittedCount = entries.filter(
        (e) => e.evaluation_status === "self_submitted",
    ).length;
    const returnedCount = entries.filter(
        (e) => e.evaluation_status === "supervisor_returned",
    ).length;
    const pendingCount = entries.filter(
        (e) => e.evaluation_status === "pending",
    ).length;

    // Self completeness count
    const filledCount = entries.filter((e) => {
        const f = localForms[e.id];
        return f && f.self_rating && f.actual_result.trim() && f.self_comment.trim();
    }).length;

    // Self weighted score estimate
    const totalAllocatedWeight = entries.reduce((acc, e) => acc + e.weight, 0);
    const selfScoredEntries = entries.filter(
        (e) => localForms[e.id]?.self_rating != null,
    );
    const estimatedSelfScore =
        selfScoredEntries.length > 0 && totalAllocatedWeight > 0
            ? (
                  selfScoredEntries.reduce(
                      (acc, e) =>
                          acc + (localForms[e.id]?.self_rating ?? 0) * e.weight,
                      0,
                  ) / totalAllocatedWeight
              ).toFixed(2)
            : null;

    const completenessPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    return (
        <>
            <Head title="My KPI Evaluation" />

            <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">

                    {/* ── Page Header ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md shadow-green-600/20">
                                    <Award className="h-6 w-6" />
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    My KPI Evaluation
                                </h1>
                                {cycle && (
                                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-800">
                                        Evaluation Phase
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-sm text-slate-500">
                                {cycle ? (
                                    <>
                                        Cycle: <strong className="text-slate-800">{cycle.name}</strong>
                                        {cycle.period_start && cycle.period_end && (
                                            <span className="text-slate-500 font-normal">
                                                {" "}({formatDate(cycle.period_start)} – {formatDate(cycle.period_end)})
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    "No appraisal cycle is currently open for evaluation."
                                )}
                                <span className="hidden md:inline text-slate-300"> • </span>
                                <span className="hidden md:inline italic text-green-700 font-semibold">"Taking every step with you"</span>
                            </p>
                        </div>

                        {/* Top Action Pills */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {cycle?.evaluation_deadline && (
                                <div
                                    className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-2xs"
                                    style={{
                                        backgroundColor: daysLeft !== null && daysLeft <= 3 ? "#FEF2F2" : daysLeft !== null && daysLeft <= 7 ? "#FFF7ED" : "#F0FDF4",
                                        borderColor: daysLeft !== null && daysLeft <= 3 ? "#FECACA" : daysLeft !== null && daysLeft <= 7 ? "#FED7AA" : "#BBF7D0",
                                        color: daysLeft !== null && daysLeft <= 3 ? C.danger : daysLeft !== null && daysLeft <= 7 ? C.orangeDark : C.greenDark,
                                    }}
                                >
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>
                                        Deadline: {formatDate(cycle.evaluation_deadline)}
                                        {daysLeft !== null && ` (${daysLeft > 0 ? `${daysLeft}d left` : "Closed"})`}
                                    </span>
                                </div>
                            )}

                            {currentTeam && (
                                <Link
                                    href={kpiIndex.url(teamSlug)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-orange-300"
                                >
                                    <Target className="h-3.5 w-3.5 text-orange-600" />
                                    <span>View My KPI Targets</span>
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ── Cycle Status Check ───────────────────────────────── */}
                    {!cycle && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <Info className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-slate-900">
                                Evaluation Phase Not Active
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                                The active appraisal cycle is not currently in the evaluation phase. Self-scoring will become available once HR transitions the cycle to evaluation.
                            </p>
                        </div>
                    )}

                    {cycle && entries.length === 0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-100">
                                <AlertTriangle className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-slate-900">
                                No Approved KPIs Found for Evaluation
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                                You have no HR-approved KPIs in this cycle to evaluate. Please ensure your initial performance indicators are agreed, submitted, and fully authorized by HR before self-scoring.
                            </p>
                            {currentTeam && (
                                <Link
                                    href={kpiIndex.url(teamSlug)}
                                    className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-600/20 hover:bg-orange-700 transition-all"
                                >
                                    Go to My KPIs
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    )}

                    {cycle && entries.length > 0 && (
                        <>
                            {/* ── Executive Metric Summary Cards ─────────────────────── */}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Card 1: Evaluation Status */}
                                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Evaluation Status
                                            </p>
                                            <p className="mt-1.5 text-2xl font-black text-slate-900">
                                                {completedCount === totalCount
                                                    ? "Finalized"
                                                    : submittedCount > 0
                                                      ? "Under Review"
                                                      : returnedCount > 0
                                                        ? "Needs Revision"
                                                        : `${filledCount}/${totalCount} Ready`}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {completedCount} completed • {submittedCount} submitted
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700 shadow-2xs">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Self Score (Est.) */}
                                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Self-Rating (Est.)
                                            </p>
                                            <p className="mt-1.5 text-2xl font-black text-orange-600">
                                                {estimatedSelfScore ? `${estimatedSelfScore} / 5.0` : "—"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Weighted average of self-scores
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-2xs">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Supervisor Score */}
                                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Supervisor Score
                                            </p>
                                            <p className="mt-1.5 text-2xl font-black text-green-700">
                                                {weightedScore != null ? `${weightedScore.toFixed(2)} / 5.0` : "Pending"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Final moderated supervisor rating
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-700 shadow-2xs">
                                            <Award className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: 360° Score */}
                                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                Core Values 360°
                                            </p>
                                            <p className="mt-1.5 text-2xl font-black text-slate-900">
                                                {threeSixtyScore != null ? `${threeSixtyScore.toFixed(2)} / 5.0` : "—"}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Multi-rater 360° appraisal average
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-2xs">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Completeness Progress Gauge ────────────────────────── */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <FileCheck2 className="h-4 w-4 text-orange-600" />
                                        <span className="text-xs font-bold text-slate-900">
                                            Self-Evaluation Preparation Progress:
                                        </span>
                                        <span className="text-xs text-slate-600">
                                            <strong>{filledCount}</strong> of <strong>{totalCount}</strong> KPIs fully scored & justified
                                        </span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">
                                        {completenessPct}% Ready
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${completenessPct}%`,
                                            backgroundColor: completenessPct === 100 ? C.green : C.orange,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* ── Returned by Supervisor Alert ──────────────────────── */}
                            {returnedCount > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-2xs">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                            <ShieldAlert className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-red-950">
                                                Evaluation Returned by Supervisor
                                            </h4>
                                            <p className="text-xs text-red-700">
                                                Your supervisor has returned <strong>{returnedCount}</strong> KPI evaluation(s) with feedback for revision. Please review the comments below, adjust your ratings or results, and re-submit.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Submission Callout Banner ─────────────────────────── */}
                            {(pendingCount > 0 || returnedCount > 0) && (
                                <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-green-200 bg-green-50/70 p-5 shadow-xs">
                                    <div className="flex items-start gap-3.5">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                            <Send className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-green-950">
                                                Ready to Submit Your Self-Evaluation?
                                            </h3>
                                            <p className="mt-0.5 text-xs text-green-800">
                                                Ensure each KPI has a score (1 to 5), actual result, and justification saved. Once ready, submit your evaluation for supervisor moderation.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={submitAllEvaluations}
                                        disabled={!canSubmit || submitting}
                                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-700 to-green-800 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-green-700/20 transition-all hover:from-green-800 hover:to-green-900 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Send className="h-4 w-4" />
                                        {submitting ? "Submitting to Supervisor…" : "Submit Evaluation to Supervisor"}
                                    </button>
                                </div>
                            )}

                            {submittedCount > 0 && pendingCount === 0 && returnedCount === 0 && (
                                <div className="flex items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 p-4 shadow-2xs">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-950">
                                            Self-Evaluation Submitted & Under Review
                                        </h4>
                                        <p className="text-xs text-orange-700">
                                            Your self-evaluation is currently with your supervisor for moderation and comments. You will be notified once reviewed.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── KPI Cards List ───────────────────────────────────── */}
                            <div className="space-y-5">
                                {entries.map((entry, idx) => {
                                    const form = localForms[entry.id] || {
                                        self_rating: entry.self_rating,
                                        actual_result: entry.actual_result ?? "",
                                        self_comment: entry.self_comment ?? "",
                                    };

                                    const isLocked =
                                        entry.evaluation_status === "self_submitted" ||
                                        entry.evaluation_status === "completed";

                                    const isSaving = savingId === entry.id;

                                    return (
                                        <div
                                            key={entry.id}
                                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-sm"
                                        >
                                            {/* Card Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-green-700 text-xs font-bold text-white shadow-2xs">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900">
                                                            {entry.title}
                                                        </h3>
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700">
                                                            Weight: <strong>{entry.weight}%</strong>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {entry.evaluation_status === "pending" && (
                                                        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                            Pending Self-Score
                                                        </span>
                                                    )}
                                                    {entry.evaluation_status === "self_submitted" && (
                                                        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                                            Submitted — Under Review
                                                        </span>
                                                    )}
                                                    {entry.evaluation_status === "supervisor_returned" && (
                                                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                                                            Returned by Supervisor
                                                        </span>
                                                    )}
                                                    {entry.evaluation_status === "completed" && (
                                                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                                                            Completed & Moderated
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-6">
                                                {/* Description & Target Context */}
                                                <div className="mb-5 grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs">
                                                    <div>
                                                        <span className="font-bold text-slate-800">
                                                            Agreed Objective Description:
                                                        </span>
                                                        <p className="mt-1 text-slate-600 leading-relaxed">
                                                            {entry.description || "No detailed description provided."}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-800">
                                                            Agreed Target Outcome:
                                                        </span>
                                                        <p className="mt-1 font-semibold text-slate-900 leading-relaxed">
                                                            {entry.target || "N/A"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Return comment banner if returned */}
                                                {entry.evaluation_status === "supervisor_returned" && entry.supervisor_comment && (
                                                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-950">
                                                        <div className="flex items-center gap-2 font-bold text-red-800">
                                                            <MessageSquare className="h-4 w-4" />
                                                            <span>Supervisor Return Feedback:</span>
                                                        </div>
                                                        <p className="mt-1.5 ml-6 text-red-800 leading-relaxed font-medium">
                                                            "{entry.supervisor_comment}"
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Completed Comparison if already moderated */}
                                                {entry.evaluation_status === "completed" && (
                                                    <div className="mb-5 rounded-2xl border border-green-200 bg-green-50/80 p-4.5 text-xs text-green-950">
                                                        <div className="flex items-center justify-between border-b border-green-200 pb-2.5">
                                                            <span className="font-bold text-green-900 flex items-center gap-1.5">
                                                                <CheckCircle2 className="h-4 w-4 text-green-700" />
                                                                Supervisor Moderation Result
                                                            </span>
                                                            <span className="rounded-lg bg-green-700 px-3 py-1 text-xs font-black text-white shadow-2xs">
                                                                Moderated Score: {entry.supervisor_rating} / 5.0
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                            <div>
                                                                <span className="font-semibold text-green-900">Your Self-Score:</span>{" "}
                                                                <strong className="text-slate-900">{entry.self_rating} / 5.0</strong>
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-green-900">Final Moderated Score:</span>{" "}
                                                                <strong className="text-green-800">{entry.supervisor_rating} / 5.0</strong>
                                                            </div>
                                                        </div>
                                                        {entry.supervisor_comment && (
                                                            <div className="mt-3 rounded-xl border border-green-100 bg-white/80 p-3 text-green-900">
                                                                <span className="font-bold">Supervisor Moderation Comment:</span>
                                                                <p className="mt-0.5 italic text-slate-700">"{entry.supervisor_comment}"</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Inputs Section */}
                                                <div className="space-y-5">
                                                    {/* 1. Actual Result Achieved */}
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                                            Actual Result Achieved <span className="text-red-500">*</span>
                                                        </label>
                                                        <p className="mb-1.5 text-xs text-slate-500">
                                                            Detail specific quantitative results or qualitative achievements recorded against agreed targets.
                                                        </p>
                                                        <input
                                                            type="text"
                                                            disabled={isLocked}
                                                            value={form.actual_result}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    entry.id,
                                                                    "actual_result",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="e.g. Achieved KES 4.2M loan disbursements (target was KES 4.0M) with 98.4% on-time repayment"
                                                            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500"
                                                        />
                                                    </div>

                                                    {/* 2. Self-Score (Rating 1 to 5) */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                                Self-Rating Score (1 to 5) <span className="text-red-500">*</span>
                                                            </label>
                                                            {form.self_rating && (
                                                                <span className="text-xs font-bold text-orange-600">
                                                                    Selected: {form.self_rating} — {RATING_RUBRIC[form.self_rating]?.label}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                                                            {[1, 2, 3, 4, 5].map((score) => {
                                                                const isSelected = form.self_rating === score;
                                                                const rubric = RATING_RUBRIC[score];

                                                                return (
                                                                    <button
                                                                        key={score}
                                                                        type="button"
                                                                        disabled={isLocked}
                                                                        onClick={() => handleRatingSelect(entry.id, score)}
                                                                        className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all ${
                                                                            isLocked
                                                                                ? "cursor-default"
                                                                                : "cursor-pointer hover:shadow-xs"
                                                                        } ${
                                                                            isSelected
                                                                                ? score <= 2
                                                                                    ? "bg-red-600 text-white shadow-sm"
                                                                                    : score === 3
                                                                                    ? "bg-orange-600 text-white shadow-sm"
                                                                                    : "bg-green-700 text-white shadow-sm"
                                                                                : "bg-slate-50 border border-slate-200 text-slate-800 hover:border-orange-300 hover:bg-orange-50/30"
                                                                        }`}
                                                                    >
                                                                        <span className="text-base font-black">
                                                                            {score}
                                                                        </span>
                                                                        <span className="text-xs font-bold mt-0.5">
                                                                            {rubric.label}
                                                                        </span>
                                                                        <span className="mt-1 text-[10px] opacity-80 hidden sm:block leading-tight">
                                                                            {rubric.desc}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* 3. Self-Comment (Required) */}
                                                    <div>
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                                            Self-Evaluation Comment & Justification <span className="text-red-500">*</span>
                                                        </label>
                                                        <p className="mb-1.5 text-xs text-slate-500">
                                                            Provide rationale for your self-rating, supporting metrics, operational challenges encountered, or key milestones.
                                                        </p>
                                                        <textarea
                                                            rows={3}
                                                            disabled={isLocked}
                                                            value={form.self_comment}
                                                            onChange={(e) =>
                                                                handleFieldChange(
                                                                    entry.id,
                                                                    "self_comment",
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="State reasons for this score, key operational drivers, obstacles managed, and how targets were met or exceeded..."
                                                            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:bg-slate-50 disabled:text-slate-500"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Card Footer Actions */}
                                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                                    {entry.logs && entry.logs.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleLogs(entry.id)}
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                                        >
                                                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                                                            Activity & Feedback ({entry.logs.length})
                                                            {expandedLogs[entry.id] ? (
                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <div />
                                                    )}

                                                    {!isLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => saveKpi(entry)}
                                                            disabled={isSaving}
                                                            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 disabled:opacity-50"
                                                        >
                                                            <Save className="h-3.5 w-3.5" />
                                                            {isSaving ? "Saving…" : "Save Self-Score"}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Collapsible Activity Logs */}
                                                {expandedLogs[entry.id] && entry.logs && entry.logs.length > 0 && (
                                                    <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
                                                        {entry.logs.map((log) => (
                                                            <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                                                                <div className="flex items-center justify-between text-slate-600">
                                                                    <span className="font-bold text-slate-800">
                                                                        {log.actor?.name || "System"}{" "}
                                                                        <span className="text-[10px] font-normal text-slate-500 capitalize">
                                                                            ({log.action.replace("_", " ")})
                                                                        </span>
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {formatDate(log.created_at)}
                                                                    </span>
                                                                </div>
                                                                {log.comment && (
                                                                    <p className="mt-1 text-slate-700 italic bg-white/70 rounded-lg p-2 border border-slate-100">
                                                                        "{log.comment}"
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Progressive Credit Rating Rubric Reference Guide ────────────── */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                                <button
                                    onClick={() => setShowRubricGuide(!showRubricGuide)}
                                    className="flex w-full items-center justify-between text-left"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                            <ShieldCheck className="h-4.5 w-4.5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Progressive Credit KPI 5-Point Rating Rubric Standards
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Benchmark criteria for objective performance appraisal scoring.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                        {showRubricGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </div>
                                </button>

                                {showRubricGuide && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 grid gap-3 sm:grid-cols-5 text-xs text-slate-600">
                                        {[1, 2, 3, 4, 5].map((score) => {
                                            const r = RATING_RUBRIC[score];
                                            return (
                                                <div
                                                    key={score}
                                                    className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5"
                                                >
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                                                        <span
                                                            className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black text-white ${
                                                                score <= 2
                                                                    ? "bg-red-600"
                                                                    : score === 3
                                                                    ? "bg-orange-600"
                                                                    : "bg-green-700"
                                                            }`}
                                                        >
                                                            {score}
                                                        </span>
                                                        <span>{r.label}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 leading-snug">
                                                        {r.desc}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
