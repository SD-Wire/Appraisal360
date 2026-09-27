// resources/js/Pages/Kpi/ReviewDetail.tsx
import { Head, useForm, Link, usePage } from "@inertiajs/react";
import {
    ArrowLeft,
    CheckCircle,
    RotateCcw,
    Building2,
    Scale,
    History,
    MessageSquare,
    AlertTriangle,
    Clock,
    FileText,
    UserCheck,
    Send,
} from "lucide-react";
import StatusPill from "@/components/Kpi/StatusPill";
import ProgressSteps from "@/components/Kpi/ProgressSteps";
import {
    hrApprove,
    hrReturn,
    supervisorApprove,
    supervisorReturn,
} from "@/routes/kpi/review";
import { reviewQueue } from "@/routes/kpi";
import { confirmAction, Swal } from "@/lib/swal";

// ── Corporate Brand Colors ──────────────────────────────────────────────────
const C = {
    orange: "#EA580C",
    orangeLight: "#FFF7ED",
    orangeBorder: "#FDBA74",
    orangeDark: "#C2410C",
    green: "#15803D",
    greenLight: "#F0FDF4",
    greenBorder: "#86EFAC",
    greenDark: "#166534",
    bg: "#F9FAFB",
    white: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    danger: "#DC2626",
    dangerLight: "#FEF2F2",
    dangerBorder: "#FCA5A5",
    warn: "#D97706",
    warnLight: "#FEF3C7",
    warnBorder: "#FCD34D",
};

interface LogEntry {
    id: number;
    stage: string;
    action: string;
    comment: string | null;
    actor: { name: string };
    created_at: string;
}

interface Entry {
    id: number;
    title: string;
    description: string;
    target: string | null;
    weight: number;
    status: string;
    user: { name: string; department: { name: string } | null };
    logs: LogEntry[];
}

const STAGE_LABELS: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    supervisor_approved: "Supervisor Approved",
    supervisor_returned: "Returned by Supervisor",
    hr_approved: "HR Approved",
    hr_returned: "Returned by HR",
};

function stageDot(stage: string, isLatest: boolean) {
    if (!isLatest) return { bg: C.border, border: C.border };
    if (stage.includes("returned")) return { bg: C.danger, border: C.danger };
    if (stage === "hr_approved") return { bg: C.green, border: C.green };
    return { bg: C.orange, border: C.orange };
}

export default function ReviewDetail({
    entry,
    canReviewAsSupervisor,
    canReviewAsHr,
}: {
    entry: Entry;
    canReviewAsSupervisor: boolean;
    canReviewAsHr: boolean;
}) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";
    const { data, setData, post, processing, errors } = useForm({
        comment: "",
    });

    const isHrReturned = entry.status === "hr_returned";
    const isSupervisorReturned = entry.status === "supervisor_returned";

    // Find the most recent return log (HRBP or Supervisor)
    const latestReturnLog = entry.logs?.find(
        (l) => l.action === "returned" || l.stage.includes("returned"),
    );

    const routeFor = (kind: "approve" | "return") => {
        if (canReviewAsSupervisor) {
            return kind === "approve"
                ? supervisorApprove.url({
                      current_team: teamSlug,
                      kpiEntry: entry.id,
                  })
                : supervisorReturn.url({
                      current_team: teamSlug,
                      kpiEntry: entry.id,
                  });
        }
        return kind === "approve"
            ? hrApprove.url({ current_team: teamSlug, kpiEntry: entry.id })
            : hrReturn.url({ current_team: teamSlug, kpiEntry: entry.id });
    };

    const handleAction = async (kind: "approve" | "return") => {
        if (kind === "approve") {
            let title = "Approve & Forward to HR?";
            let text =
                "Approving will forward this KPI to HR for final sign-off.";
            let confirmButtonText = "Yes, approve";

            if (canReviewAsHr) {
                title = "Approve & Finalize KPI?";
                text =
                    "Approving will finalize this KPI. This cannot be undone.";
                confirmButtonText = "Yes, finalize";
            } else if (isHrReturned) {
                title = "Approve & Resubmit to HR?";
                text =
                    "Approving will re-submit this KPI to HR with supervisor endorsement.";
                confirmButtonText = "Yes, resubmit to HR";
            }

            const confirmed = await confirmAction({
                title,
                text,
                confirmButtonText,
                icon: "question",
                confirmButtonColor: C.green,
            });
            if (!confirmed) return;
            post(routeFor("approve"));
        } else if (kind === "return") {
            if (!data.comment.trim() || data.comment.trim().length < 3) {
                Swal.fire({
                    icon: "warning",
                    title: "Comment Required",
                    text: "Please provide a reason or changes requested in the comment before returning.",
                    confirmButtonColor: C.orange,
                });
                return;
            }

            const isHr = canReviewAsHr;
            const confirmed = await confirmAction({
                title: isHr
                    ? "Return KPI to Supervisor?"
                    : "Return KPI to Staff Member?",
                text: isHr
                    ? "Are you sure you want to return this KPI to the supervisor with your requested changes?"
                    : "Are you sure you want to return this KPI to the employee for revision?",
                confirmButtonText: isHr
                    ? "Yes, return to supervisor"
                    : "Yes, return to staff",
                icon: "warning",
                confirmButtonColor: C.danger,
                danger: true,
            });
            if (!confirmed) return;
            post(routeFor("return"));
        }
    };

    const canAct = canReviewAsSupervisor || canReviewAsHr;

    return (
        <>
            <Head title={`Review: ${entry.title}`} />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Back link ───────────────────────────────────────── */}
                    <Link
                        href={currentTeam ? reviewQueue.url(teamSlug) : "#"}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                        style={{ color: C.textSecondary }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = C.orange)
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color = C.textSecondary)
                        }
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to review queue
                    </Link>

                    {/* ── Header Card ─────────────────────────────────────── */}
                    <div
                        className="mb-6 overflow-hidden rounded-2xl shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        {/* Top accent strip */}
                        <div
                            className="h-1.5 w-full"
                            style={{
                                background: `linear-gradient(to right, ${C.orange}, ${C.green})`,
                            }}
                        />
                        <div className="p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Status row */}
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <StatusPill status={entry.status} />
                                        <span
                                            className="text-sm font-medium"
                                            style={{ color: C.textSecondary }}
                                        >
                                            {STAGE_LABELS[entry.status] ??
                                                entry.status}
                                        </span>
                                    </div>
                                    <h1
                                        className="text-2xl font-bold leading-snug"
                                        style={{ color: C.textPrimary }}
                                    >
                                        {entry.title}
                                    </h1>

                                    {/* Meta row */}
                                    <div
                                        className="mt-3 flex flex-wrap items-center gap-4 text-sm"
                                        style={{ color: C.textSecondary }}
                                    >
                                        <span className="flex items-center gap-2">
                                            <div
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                                                style={{
                                                    backgroundColor: C.green,
                                                }}
                                            >
                                                {entry.user.name
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-gray-800">
                                                {entry.user.name}
                                            </span>
                                        </span>
                                        {entry.user.department && (
                                            <span className="flex items-center gap-1.5">
                                                <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                                {entry.user.department.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 font-semibold text-orange-700">
                                            <Scale className="h-4 w-4 flex-shrink-0" />
                                            {entry.weight}% weight
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <ProgressSteps status={entry.status} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Returned Feedback Banner (HRBP or Supervisor) ───── */}
                    {(isHrReturned ||
                        isSupervisorReturned ||
                        latestReturnLog) && (
                        <div
                            className="mb-6 overflow-hidden rounded-2xl shadow-sm border"
                            style={{
                                backgroundColor: isHrReturned
                                    ? "#FFFBEB"
                                    : isSupervisorReturned
                                      ? "#FEF2F2"
                                      : "#FFF7ED",
                                borderColor: isHrReturned
                                    ? C.warnBorder
                                    : isSupervisorReturned
                                      ? C.dangerBorder
                                      : C.orangeBorder,
                            }}
                        >
                            <div className="p-5 flex items-start gap-4">
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                    style={{
                                        backgroundColor: isHrReturned
                                            ? C.warn
                                            : isSupervisorReturned
                                              ? C.danger
                                              : C.orange,
                                    }}
                                >
                                    <RotateCcw className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <h3
                                                className="text-sm font-bold tracking-tight"
                                                style={{
                                                    color: isHrReturned
                                                        ? "#92400E"
                                                        : isSupervisorReturned
                                                          ? "#991B1B"
                                                          : C.orangeDark,
                                                }}
                                            >
                                                {isHrReturned
                                                    ? "Returned by HRBP with Feedback"
                                                    : isSupervisorReturned
                                                      ? "Returned by Supervisor for Revisions"
                                                      : "Return Feedback on Record"}
                                            </h3>
                                            <span
                                                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                                                style={{
                                                    backgroundColor:
                                                        isHrReturned
                                                            ? "#FEF3C7"
                                                            : "#FEE2E2",
                                                    color: isHrReturned
                                                        ? "#B45309"
                                                        : "#B91C1C",
                                                }}
                                            >
                                                Action Required
                                            </span>
                                        </div>
                                        {latestReturnLog && (
                                            <span className="text-xs text-gray-500 font-medium">
                                                {new Date(
                                                    latestReturnLog.created_at,
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    },
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {/* The Comment */}
                                    <div className="mt-3 rounded-xl bg-white/90 p-4 border border-amber-200/60 shadow-xs">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-orange-600" />
                                            <span>
                                                Feedback from{" "}
                                                <strong className="text-gray-900">
                                                    {latestReturnLog?.actor
                                                        ?.name ?? "Approver"}
                                                </strong>
                                                :
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line pl-5 border-l-2 border-orange-400">
                                            {latestReturnLog?.comment ||
                                                "Changes requested before this KPI can be approved."}
                                        </p>
                                    </div>

                                    {/* Supervisor Action Instruction */}
                                    {canReviewAsSupervisor && isHrReturned && (
                                        <div className="mt-3 text-xs text-amber-900 bg-amber-100/60 rounded-lg p-2.5 flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 shrink-0 text-amber-700" />
                                            <span>
                                                <strong>
                                                    Supervisor Action:
                                                </strong>{" "}
                                                You can review the feedback
                                                above, coordinate with the staff
                                                member, and either{" "}
                                                <strong>
                                                    Approve & Resubmit to HR
                                                </strong>{" "}
                                                or{" "}
                                                <strong>
                                                    Return to Employee
                                                </strong>{" "}
                                                for direct edits.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Description & Target ────────────────────────────── */}
                    <div
                        className="mb-6 rounded-2xl p-6 shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        <h2
                            className="mb-3 flex items-center gap-2 text-sm font-bold"
                            style={{ color: C.textPrimary }}
                        >
                            <FileText
                                className="h-4 w-4"
                                style={{ color: C.orange }}
                            />
                            KPI Description
                        </h2>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                            {entry.description}
                        </p>

                        {entry.target && (
                            <div
                                className="mt-5 rounded-xl p-4"
                                style={{
                                    backgroundColor: C.greenLight,
                                    border: `1px solid ${C.greenBorder}`,
                                }}
                            >
                                <p
                                    className="mb-1 text-[11px] font-bold uppercase tracking-widest"
                                    style={{ color: C.greenDark }}
                                >
                                    Target / Success Criteria
                                </p>
                                <p className="text-sm font-semibold text-emerald-950">
                                    {entry.target}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Activity History ────────────────────────────────── */}
                    {entry.logs.length > 0 && (
                        <div
                            className="mb-6 rounded-2xl p-6 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <div className="mb-5 flex items-center gap-2">
                                <History
                                    className="h-4 w-4"
                                    style={{ color: C.orange }}
                                />
                                <h2
                                    className="text-sm font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Review & Activity History
                                </h2>
                                <span
                                    className="ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                                    style={{
                                        backgroundColor: C.bg,
                                        color: C.textSecondary,
                                    }}
                                >
                                    {entry.logs.length} event
                                    {entry.logs.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="relative">
                                {/* Vertical timeline line */}
                                <div
                                    className="absolute left-[15px] top-4 h-[calc(100%-2rem)] w-0.5"
                                    style={{ backgroundColor: C.border }}
                                />

                                <ul className="space-y-4">
                                    {entry.logs.map((log, idx) => {
                                        const dot = stageDot(
                                            log.stage,
                                            idx === 0,
                                        );
                                        const isReturn =
                                            log.action.includes("return") ||
                                            log.stage.includes("return");
                                        return (
                                            <li
                                                key={log.id}
                                                className="relative pl-10"
                                            >
                                                {/* Timeline dot */}
                                                <div
                                                    className="absolute left-0 top-2 h-7 w-7 flex items-center justify-center rounded-full border-2 bg-white"
                                                    style={{
                                                        borderColor: dot.border,
                                                    }}
                                                >
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                idx === 0
                                                                    ? dot.bg
                                                                    : C.border,
                                                        }}
                                                    />
                                                </div>

                                                <div
                                                    className="rounded-xl border p-4 transition-colors"
                                                    style={{
                                                        borderColor: isReturn
                                                            ? C.dangerBorder
                                                            : idx === 0
                                                              ? `${C.orange}66`
                                                              : C.border,
                                                        backgroundColor:
                                                            isReturn
                                                                ? "#FEF2F2"
                                                                : idx === 0
                                                                  ? `${C.orangeLight}`
                                                                  : C.white,
                                                    }}
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p
                                                                className="text-sm font-bold"
                                                                style={{
                                                                    color: isReturn
                                                                        ? C.danger
                                                                        : C.textPrimary,
                                                                }}
                                                            >
                                                                {log.actor.name}
                                                            </p>
                                                            <p
                                                                className="mt-0.5 text-sm"
                                                                style={{
                                                                    color: C.textSecondary,
                                                                }}
                                                            >
                                                                <span className="font-semibold text-gray-800 capitalize">
                                                                    {log.action}
                                                                </span>
                                                                <span
                                                                    className="mx-2"
                                                                    style={{
                                                                        color: C.border,
                                                                    }}
                                                                >
                                                                    |
                                                                </span>
                                                                <span className="text-xs font-semibold uppercase tracking-wider">
                                                                    {STAGE_LABELS[
                                                                        log
                                                                            .stage
                                                                    ] ??
                                                                        log.stage}
                                                                </span>
                                                            </p>
                                                            {log.comment && (
                                                                <div
                                                                    className="mt-3 flex items-start gap-2 rounded-lg p-3"
                                                                    style={{
                                                                        backgroundColor:
                                                                            isReturn
                                                                                ? "#FFFFFF"
                                                                                : C.bg,
                                                                        border: isReturn
                                                                            ? `1px solid ${C.dangerBorder}`
                                                                            : `1px solid ${C.border}`,
                                                                    }}
                                                                >
                                                                    <MessageSquare
                                                                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
                                                                        style={{
                                                                            color: isReturn
                                                                                ? C.danger
                                                                                : C.orange,
                                                                        }}
                                                                    />
                                                                    <p
                                                                        className="text-sm italic"
                                                                        style={{
                                                                            color: C.textPrimary,
                                                                        }}
                                                                    >
                                                                        "
                                                                        {
                                                                            log.comment
                                                                        }
                                                                        "
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span
                                                            className="whitespace-nowrap text-xs flex-shrink-0"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            {new Date(
                                                                log.created_at,
                                                            ).toLocaleDateString(
                                                                undefined,
                                                                {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* ── Review Decision ─────────────────────────────────── */}
                    {canAct && (
                        <div
                            className="overflow-hidden rounded-2xl shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            {/* Section header */}
                            <div
                                className="flex items-center gap-2 px-6 py-4"
                                style={{
                                    backgroundColor: C.bg,
                                    borderBottom: `1px solid ${C.border}`,
                                }}
                            >
                                <span
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </span>
                                <h2
                                    className="text-sm font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Your Review Decision
                                </h2>
                            </div>

                            <form
                                onSubmit={(e) => e.preventDefault()}
                                className="p-6 space-y-5"
                            >
                                {/* Comment */}
                                <div>
                                    <label
                                        className="mb-1.5 block text-sm font-semibold"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Review Comment / Feedback
                                        <span
                                            className="text-xs font-normal ml-1"
                                            style={{ color: C.textSecondary }}
                                        >
                                            (required when returning for
                                            changes)
                                        </span>
                                    </label>
                                    <textarea
                                        value={data.comment}
                                        onChange={(e) =>
                                            setData("comment", e.target.value)
                                        }
                                        rows={3}
                                        placeholder={
                                            isHrReturned
                                                ? "Provide instructions for the employee or notes for HR..."
                                                : "Add any guidance, commendation, or changes required..."
                                        }
                                        className="w-full rounded-xl border px-4 py-3 text-sm transition-all outline-none"
                                        style={{
                                            borderColor: errors.comment
                                                ? C.danger
                                                : C.border,
                                            backgroundColor: C.bg,
                                            color: C.textPrimary,
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor =
                                                C.orange;
                                            e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor =
                                                errors.comment
                                                    ? C.danger
                                                    : C.border;
                                            e.currentTarget.style.boxShadow =
                                                "none";
                                        }}
                                    />
                                    {errors.comment && (
                                        <p
                                            className="mt-1.5 flex items-center gap-1 text-xs"
                                            style={{ color: C.danger }}
                                        >
                                            <AlertTriangle className="h-3 w-3" />{" "}
                                            {errors.comment}
                                        </p>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleAction("approve")}
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ backgroundColor: C.green }}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        {canReviewAsHr
                                            ? "Approve & Finalize"
                                            : isHrReturned
                                              ? "Approve & Resubmit to HR"
                                              : "Approve & Forward to HR"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleAction("return")}
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-bold transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{
                                            borderColor: C.danger,
                                            color: C.danger,
                                            backgroundColor: C.white,
                                        }}
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {canReviewAsHr
                                            ? "Return to Supervisor for Changes"
                                            : "Return to Employee for Changes"}
                                    </button>
                                </div>

                                {/* Hint */}
                                <p
                                    className="text-xs"
                                    style={{ color: C.textSecondary }}
                                >
                                    {canReviewAsHr
                                        ? "Approving will finalize this KPI. Returning will send it back to the supervisor with your comments."
                                        : isHrReturned
                                          ? "Approving will re-forward this KPI to HR with your sign-off. Returning will send it back to the employee for direct revision."
                                          : "Approving will forward this KPI to HR for final sign-off. Returning will send it back to the employee."}
                                </p>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
