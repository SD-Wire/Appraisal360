// resources/js/pages/Kpi/Show.tsx
import { Head, Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    ArrowLeft,
    RotateCcw,
    CheckCircle,
    Clock,
    Pencil,
    Send,
    MessageSquare,
    Target,
    Scale,
    Building2,
    Calendar,
    FileText,
    History,
    AlertCircle,
    User,
} from "lucide-react";
import StatusPill from "@/components/Kpi/StatusPill";
import ProgressSteps from "@/components/Kpi/ProgressSteps";
import { edit, index, submit as submitRoute } from "@/routes/kpi";

// ── Corporate Brand Palette ──────────────────────────────────────────────────
const C = {
    orange: "#EA580C",
    orangeLight: "#FFF7ED",
    orangeBorder: "#FED7AA",
    green: "#15803D",
    greenLight: "#F0FDF4",
    greenBorder: "#BBF7D0",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    border: "#E2E8F0",
    danger: "#DC2626",
    dangerLight: "#FEF2F2",
    dangerBorder: "#FECACA",
};

interface LogEntry {
    id: number;
    stage: string;
    action: string;
    comment: string | null;
    actor: {
        id: number;
        name: string;
        email?: string;
        job_title?: string;
    };
    created_at: string;
}

interface KpiEntry {
    id: number;
    title: string;
    description?: string | null;
    target?: string | null;
    weight: number;
    status: string;
    self_rating?: number | null;
    supervisor_rating?: number | null;
    actual_result?: string | null;
    created_at?: string;
    updated_at?: string;
    cycle?: {
        id: number;
        name: string;
        phase?: string;
        period_start?: string;
        period_end?: string;
    } | null;
    team?: { id: number; name: string } | null;
    department?: { id: number; name: string } | null;
    logs?: LogEntry[];
}

const STAGE_LABELS: Record<string, string> = {
    draft: "Draft",
    staff: "Staff Member",
    submitted: "Submitted for Review",
    supervisor: "Supervisor Review",
    supervisor_approved: "Supervisor Approved",
    supervisor_returned: "Returned by Supervisor",
    hr: "Regional HRBP Review",
    hr_approved: "HR Approved",
    hr_returned: "Returned by HRBP",
};

function formatDate(dateString?: string | null): string {
    if (!dateString) return "—";
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dateString;
    }
}

export default function Show({ entry }: { entry: KpiEntry }) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isReturned = ["supervisor_returned", "hr_returned"].includes(entry.status);
    const canEditOrSubmit = ["draft", "supervisor_returned", "hr_returned"].includes(entry.status);

    // Latest return feedback log
    const returnLogs = (entry.logs ?? []).filter((l) => l.action === "returned");
    const latestReturnLog = returnLogs.length > 0 ? returnLogs[0] : null;

    const handleSubmit = () => {
        if (!confirm("Are you sure you want to submit this KPI for review?")) return;
        setIsSubmitting(true);
        router.post(
            String(submitRoute.url({ current_team: teamSlug, kpiEntry: entry.id })),
            {},
            {
                onFinish: () => setIsSubmitting(false),
            }
        );
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <Head title={`KPI Details: ${entry.title}`} />

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
                {/* ── Breadcrumb & Top Navigation ───────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Link
                        href={String(index.url(teamSlug))}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-orange-300"
                    >
                        <ArrowLeft className="h-4 w-4 text-orange-600" />
                        <span>Back to My KPIs</span>
                    </Link>

                    {canEditOrSubmit && (
                        <div className="flex items-center gap-3">
                            <Link
                                href={String(
                                    edit.url({
                                        current_team: teamSlug,
                                        kpiEntry: entry.id,
                                    })
                                )}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 hover:border-orange-400"
                            >
                                <Pencil className="h-3.5 w-3.5 text-orange-600" />
                                <span>Edit KPI</span>
                            </Link>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-5 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-green-800 disabled:opacity-50"
                            >
                                <Send className="h-3.5 w-3.5" />
                                <span>{isSubmitting ? "Submitting..." : "Submit for Review"}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Highlighted Alert: Returned for Revision ─────────────── */}
                {isReturned && (
                    <div className="overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50/90 p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 border border-red-200">
                                <RotateCcw className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-sm font-extrabold text-red-950 uppercase tracking-wide">
                                        KPI Returned for Revision
                                    </h3>
                                    {latestReturnLog && (
                                        <span className="text-[11px] font-semibold text-red-700">
                                            {formatDate(latestReturnLog.created_at)}
                                        </span>
                                    )}
                                </div>

                                <p className="mt-1 text-xs text-red-800 font-medium">
                                    {entry.status === "supervisor_returned"
                                        ? "Your supervisor has returned this KPI and requested adjustments before approval."
                                        : "Your Regional HRBP has reviewed and returned this KPI for required revisions."}
                                </p>

                                {latestReturnLog?.comment && (
                                    <div className="mt-3.5 rounded-xl border border-red-200 bg-white p-4 shadow-2xs">
                                        <div className="flex items-center gap-2 text-xs font-bold text-red-900 mb-1.5">
                                            <MessageSquare className="h-4 w-4 text-red-600" />
                                            <span>
                                                Feedback from {latestReturnLog.actor?.name || "Reviewer"} (
                                                {latestReturnLog.stage === "hr" ? "Regional HRBP" : "Supervisor"}
                                                ):
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-red-50/40 p-3 rounded-lg border border-red-100 italic">
                                            "{latestReturnLog.comment}"
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={String(
                                            edit.url({
                                                current_team: teamSlug,
                                                kpiEntry: entry.id,
                                            })
                                        )}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-red-800"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        <span>Edit & Revise Targets Now</span>
                                    </Link>
                                    <span className="text-[11px] text-red-700">
                                        Make requested revisions and click Submit to return it to the review queue.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── KPI Main Specifications Card ─────────────────────────── */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200">
                                    {entry.cycle?.name || "Performance Appraisal"}
                                </span>
                                {entry.team?.name && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                        <Building2 className="h-3 w-3 text-slate-400" />
                                        {entry.team.name}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl font-bold text-slate-900">{entry.title}</h1>
                        </div>

                        <div className="flex items-center gap-3">
                            <StatusPill status={entry.status} />
                            <span
                                className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-extrabold border ${
                                    entry.weight >= 20
                                        ? "bg-green-50 border-green-200 text-green-700"
                                        : "bg-orange-50 border-orange-200 text-orange-700"
                                }`}
                            >
                                <Scale className="h-3.5 w-3.5" />
                                Weight: {entry.weight}%
                            </span>
                        </div>
                    </div>

                    {/* Progress tracker */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Approval Progress
                        </div>
                        <ProgressSteps status={entry.status} />
                    </div>

                    {/* Target & Description */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                                <Target className="h-4 w-4 text-orange-600" />
                                <span>Target / Measurable Outcome</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                                {entry.target || <span className="italic text-slate-400">None specified</span>}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                                <Scale className="h-4 w-4 text-green-600" />
                                <span>Weight Allocation</span>
                            </div>
                            <p className="text-sm font-bold text-green-700">
                                {entry.weight}% of Annual KPI Evaluation
                            </p>
                        </div>
                    </div>

                    {/* Description Details */}
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <span>Description & Execution Strategy</span>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {entry.description || <span className="italic text-slate-400">No description provided.</span>}
                        </div>
                    </div>
                </div>

                {/* ── Return & Review Conversation History ─────────────────── */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                <History className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Review & Return Conversation History
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Chronological timeline of submissions, supervisor coaching, and HRBP return notes.
                                </p>
                            </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                            {(entry.logs ?? []).length} Event{(entry.logs ?? []).length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {(entry.logs ?? []).length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 italic">
                            No review activity recorded yet. Once submitted, feedback and review decisions will appear here.
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                            {entry.logs!.map((log, idx) => {
                                const isReturnedLog = log.action === "returned";
                                const isApprovedLog = log.action === "approved";
                                const isSubmittedLog = log.action === "submitted";

                                return (
                                    <div key={log.id || idx} className="relative group">
                                        {/* Dot indicator */}
                                        <div
                                            className={`absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white ${
                                                isReturnedLog
                                                    ? "border-red-600 text-red-600"
                                                    : isApprovedLog
                                                    ? "border-green-600 text-green-600"
                                                    : "border-orange-500 text-orange-500"
                                            }`}
                                        >
                                            <span
                                                className={`h-2 w-2 rounded-full ${
                                                    isReturnedLog
                                                        ? "bg-red-600"
                                                        : isApprovedLog
                                                        ? "bg-green-600"
                                                        : "bg-orange-500"
                                                }`}
                                            />
                                        </div>

                                        <div
                                            className={`rounded-2xl border p-4.5 transition-all ${
                                                isReturnedLog
                                                    ? "border-red-200 bg-red-50/50 shadow-2xs"
                                                    : isApprovedLog
                                                    ? "border-green-200 bg-green-50/40"
                                                    : "border-slate-200 bg-white"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 pb-2 mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-900">
                                                        {log.actor?.name || "System"}
                                                    </span>
                                                    {log.actor?.job_title && (
                                                        <span className="text-[11px] text-slate-500">
                                                            • {log.actor.job_title}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-medium text-slate-500">
                                                    {formatDate(log.created_at)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs">
                                                <span
                                                    className={`rounded-md px-2 py-0.5 font-bold uppercase text-[10px] ${
                                                        isReturnedLog
                                                            ? "bg-red-100 text-red-800"
                                                            : isApprovedLog
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-orange-100 text-orange-800"
                                                    }`}
                                                >
                                                    {isReturnedLog
                                                        ? "Returned with Comments"
                                                        : isApprovedLog
                                                        ? "Approved"
                                                        : "Submitted"}
                                                </span>
                                                <span className="text-slate-500 text-[11px]">
                                                    Stage: {STAGE_LABELS[log.stage] ?? log.stage}
                                                </span>
                                            </div>

                                            {log.comment ? (
                                                <div
                                                    className={`mt-3 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed border ${
                                                        isReturnedLog
                                                            ? "border-red-200 bg-white shadow-2xs"
                                                            : "border-slate-200 bg-slate-50"
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <MessageSquare
                                                            className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                                                                isReturnedLog ? "text-red-600" : "text-orange-600"
                                                            }`}
                                                        />
                                                        <p className="whitespace-pre-wrap italic">
                                                            "{log.comment}"
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="mt-2 text-[11px] italic text-slate-400">
                                                    No specific text comment provided with this action.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
