import { Head, Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    RotateCcw,
    User,
    Building2,
    Calendar,
    MessageSquare,
    AlertTriangle,
    Check,
    ChevronRight,
    TrendingUp,
    Award,
    ShieldAlert,
    HelpCircle,
    Target,
    Scale,
    FileCheck2,
} from "lucide-react";
import Swal from "sweetalert2";
import { confirmAction } from "@/lib/swal";
import {
    supervisorApprove,
    supervisorReturn,
    reviewQueue as reviewQueueRoute,
} from "@/routes/kpi/evaluation";

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
    evaluation_status: "pending" | "self_submitted" | "supervisor_returned" | "completed";
    evaluation_submitted_at: string | null;
    logs?: LogEntry[];
}

interface Props {
    staffMember: { id: number; name: string };
    cycle: { id: number; name: string } | null;
    entries: KpiEntry[];
    activeEntryId?: number;
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

export default function EvaluationReviewDetail({
    staffMember,
    cycle,
    entries = [],
    activeEntryId,
}: Props) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";

    // Selected KPI tab
    const [selectedId, setSelectedId] = useState<number>(() => {
        if (activeEntryId && entries.some((e) => e.id === activeEntryId)) {
            return activeEntryId;
        }
        const firstActionable = entries.find((e) => e.evaluation_status === "self_submitted");
        return firstActionable ? firstActionable.id : entries[0]?.id ?? 0;
    });

    const currentEntry = entries.find((e) => e.id === selectedId) ?? entries[0];

    // Local moderation form per entry
    const [moderations, setModerations] = useState<
        Record<
            number,
            {
                rating: number;
                comment: string;
            }
        >
    >(() => {
        const map: Record<number, { rating: number; comment: string }> = {};
        entries.forEach((e) => {
            map[e.id] = {
                rating: e.supervisor_rating ?? e.self_rating ?? 3,
                comment: e.supervisor_comment ?? "",
            };
        });
        return map;
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRatingSelect = (entryId: number, rating: number) => {
        setModerations((prev) => ({
            ...prev,
            [entryId]: {
                ...prev[entryId],
                rating,
            },
        }));
    };

    const handleCommentChange = (entryId: number, comment: string) => {
        setModerations((prev) => ({
            ...prev,
            [entryId]: {
                ...prev[entryId],
                comment,
            },
        }));
    };

    const handleApprove = async (entry: KpiEntry) => {
        const form = moderations[entry.id];
        if (!form?.rating) {
            Swal.fire({
                icon: "warning",
                title: "Rating Required",
                text: "Please select a moderated score from 1 to 5.",
                confirmButtonColor: C.orange,
            });
            return;
        }

        if (!form?.comment?.trim() || form.comment.trim().length < 3) {
            Swal.fire({
                icon: "warning",
                title: "Comment Required",
                text: "Please provide a supervisor moderation comment (at least 3 characters).",
                confirmButtonColor: C.orange,
            });
            return;
        }

        const confirmed = await confirmAction({
            title: "Approve & Moderate KPI?",
            text: `Confirm moderated rating of ${form.rating}/5 and submit evaluation review?`,
            confirmButtonText: "Yes, submit review",
            icon: "question",
            confirmButtonColor: C.green,
        });
        if (!confirmed) return;

        setIsSubmitting(true);
        router.post(
            supervisorApprove.url({
                current_team: teamSlug,
                kpiEntry: entry.id,
            }),
            {
                supervisor_rating: form.rating,
                comment: form.comment,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    const handleReturn = async (entry: KpiEntry) => {
        const form = moderations[entry.id];
        const comment = form?.comment?.trim() ?? "";

        const result = await Swal.fire({
            icon: "warning",
            title: "Return Evaluation to Staff?",
            text: "Provide specific feedback on what needs revision (score, actual results, or comment):",
            input: "textarea",
            inputValue: comment,
            inputPlaceholder: "Enter detailed reason for returning this KPI evaluation...",
            inputValidator: (val) => {
                if (!val || val.trim().length < 3) {
                    return "A clear return comment (at least 3 characters) is required.";
                }
                return null;
            },
            showCancelButton: true,
            confirmButtonText: "Return to Staff",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.danger,
            cancelButtonColor: "#64748B",
        });

        if (!result.isConfirmed || !result.value) return;

        setIsSubmitting(true);
        router.post(
            supervisorReturn.url({
                current_team: teamSlug,
                kpiEntry: entry.id,
            }),
            {
                comment: result.value,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    // Metrics
    const totalCount = entries.length;
    const completedCount = entries.filter((e) => e.evaluation_status === "completed").length;
    const totalAllocatedWeight = entries.reduce((acc, e) => acc + e.weight, 0);

    const selfWeightedAvg =
        totalAllocatedWeight > 0
            ? (
                  entries.reduce(
                      (acc, e) => acc + (e.self_rating ?? 0) * e.weight,
                      0
                  ) / totalAllocatedWeight
              ).toFixed(2)
            : null;

    const completedEntries = entries.filter((e) => e.evaluation_status === "completed");
    const completedWeight = completedEntries.reduce((acc, e) => acc + e.weight, 0);
    const moderatedWeightedAvg =
        completedWeight > 0
            ? (
                  completedEntries.reduce(
                      (acc, e) => acc + (e.supervisor_rating ?? 0) * e.weight,
                      0
                  ) / completedWeight
              ).toFixed(2)
            : null;

    const initials = staffMember.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <>
            <Head title={`Evaluate: ${staffMember.name}`} />

            <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">

                    {/* ── Breadcrumb & Back Link ───────────────────────────── */}
                    <div>
                        <Link
                            href={currentTeam ? String(reviewQueueRoute.url(teamSlug)) : "#"}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Review Queue
                        </Link>
                    </div>

                    {/* ── Staff & Cycle Overview Header ─────────────────────── */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-green-700 to-green-800 text-lg font-black text-white shadow-2xs">
                                    {initials}
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h1 className="text-xl font-black text-slate-900">
                                            {staffMember.name}
                                        </h1>
                                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-green-800">
                                            KPI Moderation
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Cycle: <strong>{cycle?.name || "Active Cycle"}</strong> • <span className="italic text-green-700 font-semibold">"Taking every step with you"</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-5">
                                <div className="text-right">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Progress</span>
                                    <div className="text-base font-black text-slate-900">
                                        {completedCount} of {totalCount} Moderated
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-right">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Self Score Avg</span>
                                    <div className="text-base font-black text-orange-600">
                                        {selfWeightedAvg ? `${selfWeightedAvg} / 5.0` : "—"}
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-right">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Moderated Avg</span>
                                    <div className="text-base font-black text-green-700">
                                        {moderatedWeightedAvg ? `${moderatedWeightedAvg} / 5.0` : "Pending"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── KPI Tabs Bar ──────────────────────────────────── */}
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            {entries.map((entry, idx) => {
                                const isActive = entry.id === currentEntry?.id;
                                const isCompleted = entry.evaluation_status === "completed";
                                const isReturned = entry.evaluation_status === "supervisor_returned";
                                const isPending = entry.evaluation_status === "self_submitted";

                                return (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => setSelectedId(entry.id)}
                                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                            isActive
                                                ? "bg-green-700 text-white shadow-sm"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        <span>KPI {idx + 1}</span>
                                        {isCompleted && (
                                            <CheckCircle2 className={`h-3.5 w-3.5 ${isActive ? "text-green-200" : "text-green-600"}`} />
                                        )}
                                        {isReturned && (
                                            <RotateCcw className={`h-3.5 w-3.5 ${isActive ? "text-red-200" : "text-red-600"}`} />
                                        )}
                                        {isPending && (
                                            <Clock className={`h-3.5 w-3.5 ${isActive ? "text-orange-200" : "text-orange-600"}`} />
                                        )}
                                        <span className="text-[10px] opacity-75 font-normal">
                                            ({entry.weight}%)
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Active KPI Detailed Review Panel ───────────────────── */}
                    {currentEntry && (
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                            {/* Panel Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">
                                        {currentEntry.title}
                                    </h2>
                                    <span className="text-xs text-orange-700 font-bold">
                                        Appraisal Weight: <strong>{currentEntry.weight}%</strong>
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {currentEntry.evaluation_status === "self_submitted" && (
                                        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                                            Awaiting Moderation
                                        </span>
                                    )}
                                    {currentEntry.evaluation_status === "completed" && (
                                        <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                                            Moderated & Approved
                                        </span>
                                    )}
                                    {currentEntry.evaluation_status === "supervisor_returned" && (
                                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                                            Returned to Employee
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Agreed Goal & Target */}
                                <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4.5 text-xs">
                                    <div>
                                        <span className="font-bold text-slate-800">Agreed Objective Description:</span>
                                        <p className="mt-1 text-slate-600 leading-relaxed">{currentEntry.description}</p>
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800">Agreed Target Outcome:</span>
                                        <p className="mt-1 font-semibold text-slate-900 leading-relaxed">
                                            {currentEntry.target || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                {/* Employee's Self-Evaluation Submission (Green-tinted brand card) */}
                                <div className="rounded-2xl border border-green-200 bg-green-50/40 p-5">
                                    <div className="flex items-center justify-between border-b border-green-200 pb-3">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-green-700" />
                                            <h3 className="text-sm font-bold text-green-950">
                                                Employee's Self-Evaluation Submission
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-green-800 font-semibold">Self-Rating:</span>
                                            <span className="rounded-lg bg-green-700 px-3 py-1 text-xs font-bold text-white shadow-2xs">
                                                {currentEntry.self_rating || "—"} / 5.0
                                                {currentEntry.self_rating &&
                                                    ` (${RATING_RUBRIC[currentEntry.self_rating]?.label})`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3.5 text-xs">
                                        <div>
                                            <span className="font-bold uppercase tracking-wider text-green-900 text-[11px]">
                                                Reported Actual Result:
                                            </span>
                                            <div className="mt-1 rounded-xl border border-green-200 bg-white p-3 font-semibold text-slate-800 shadow-2xs">
                                                {currentEntry.actual_result || "No actual result recorded."}
                                            </div>
                                        </div>

                                        <div>
                                            <span className="font-bold uppercase tracking-wider text-green-900 text-[11px]">
                                                Employee Self-Comment & Justification:
                                            </span>
                                            <div className="mt-1 rounded-xl border border-green-200 bg-white p-3 text-slate-700 italic shadow-2xs leading-relaxed">
                                                "{currentEntry.self_comment || "No self-comment provided."}"
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Supervisor Moderation Form (Orange-tinted brand card) */}
                                <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
                                    <div className="flex items-center gap-2 border-b border-orange-200 pb-3">
                                        <Award className="h-4 w-4 text-orange-700" />
                                        <h3 className="text-sm font-bold text-orange-950">
                                            Supervisor Moderation & Scoring
                                        </h3>
                                    </div>

                                    <div className="mt-4 space-y-5">
                                        {currentEntry.evaluation_status === "completed" && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-green-200 bg-green-50/90 px-4 py-2.5 text-xs text-green-950">
                                                <span className="flex items-center gap-1.5 font-bold">
                                                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                                                    Currently Moderated: {currentEntry.supervisor_rating} / 5.0
                                                </span>
                                                <span className="text-[11px] text-green-800 font-medium">
                                                    You can adjust the moderated rating or comments below at any time.
                                                </span>
                                            </div>
                                        )}
                                        {/* Score Selection */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                    Moderated Score (1 to 5) <span className="text-red-500">*</span>
                                                </label>
                                                {moderations[currentEntry.id]?.rating && (
                                                    <span className="text-xs font-bold text-orange-700">
                                                        Selected: {moderations[currentEntry.id].rating} —{" "}
                                                        {RATING_RUBRIC[moderations[currentEntry.id].rating]?.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                                                {[1, 2, 3, 4, 5].map((score) => {
                                                    const isSelected = moderations[currentEntry.id]?.rating === score;
                                                    const rubric = RATING_RUBRIC[score];

                                                    return (
                                                        <button
                                                            key={score}
                                                            type="button"
                                                            onClick={() => handleRatingSelect(currentEntry.id, score)}
                                                            className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center transition-all cursor-pointer ${
                                                                isSelected
                                                                    ? score <= 2
                                                                        ? "bg-red-600 text-white shadow-sm"
                                                                        : score === 3
                                                                        ? "bg-orange-600 text-white shadow-sm"
                                                                        : "bg-green-700 text-white shadow-sm"
                                                                    : "bg-white border border-slate-200 text-slate-800 hover:border-orange-300 hover:bg-orange-50/40"
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

                                        {/* Supervisor Comment */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                                Supervisor Comment & Moderation Feedback <span className="text-red-500">*</span>
                                            </label>
                                            <p className="mb-1.5 text-xs text-slate-500">
                                                Provide evaluation feedback on performance, justification for score moderation, and coaching recommendations.
                                            </p>
                                            <textarea
                                                rows={3}
                                                value={moderations[currentEntry.id]?.comment ?? ""}
                                                onChange={(e) =>
                                                    handleCommentChange(currentEntry.id, e.target.value)
                                                }
                                                placeholder="Provide your review comment, justification of the moderated score, and specific feedback for the staff member..."
                                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => handleReturn(currentEntry)}
                                                disabled={isSubmitting}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 shadow-2xs transition-all hover:bg-red-100 disabled:opacity-50"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Return to Staff for Revision
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleApprove(currentEntry)}
                                                disabled={isSubmitting}
                                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-700 to-green-800 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-green-700/20 transition-all hover:from-green-800 hover:to-green-900 hover:shadow-md disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                                {isSubmitting
                                                    ? "Saving…"
                                                    : currentEntry.evaluation_status === "completed"
                                                    ? "Update Moderation"
                                                    : "Moderate & Approve KPI"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity & Logs Timeline */}
                                {currentEntry.logs && currentEntry.logs.length > 0 && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                                        <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
                                            <MessageSquare className="h-4 w-4 text-slate-400" />
                                            <span>Evaluation Activity & Audit Log</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {currentEntry.logs.map((log) => (
                                                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-800">
                                                            {log.actor?.name || "System"}{" "}
                                                            <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal uppercase text-slate-600">
                                                                {log.action.replace("_", " ")}
                                                            </span>
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">
                                                            {formatDate(log.created_at)}
                                                        </span>
                                                    </div>
                                                    {log.comment && (
                                                        <p className="mt-1 text-slate-700 italic bg-white rounded-lg p-2 border border-slate-100">
                                                            "{log.comment}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
