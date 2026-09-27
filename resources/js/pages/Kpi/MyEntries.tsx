import { Head, Link, router, usePage } from "@inertiajs/react";
import { useState, useMemo } from "react";
import {
    CheckCircle2,
    ArrowRight,
    Plus,
    Target,
    Scale,
    FileEdit,
    Clock,
    RotateCcw,
    Search,
    ShieldCheck,
    Pencil,
    Send,
    ChevronDown,
    ChevronUp,
    Layers,
    AlertCircle,
    MessageSquare,
    History,
    FileText,
    Eye,
} from "lucide-react";
import StatusPill from "@/components/Kpi/StatusPill";
import ProgressSteps from "@/components/Kpi/ProgressSteps";
import { create, edit, show as showRoute, submit as submitRoute } from "@/routes/kpi";
import { index as kpiEvaluationIndex } from "@/routes/kpi/evaluation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

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
    logs?: LogEntry[];
}

interface Cycle {
    id: number;
    name: string;
    phase?: string;
    period_start?: string;
    period_end?: string;
    submission_deadline?: string;
    evaluation_deadline?: string;
    status?: string;
}

function daysUntil(dateString?: string): number | null {
    if (!dateString) return null;
    return Math.ceil(
        (new Date(dateString).getTime() - Date.now()) / 86_400_000,
    );
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

export default function MyEntries({
    cycle,
    entries,
}: {
    cycle: Cycle | null;
    entries: KpiEntry[];
}) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTab, setSelectedTab] = useState<
        "all" | "draft" | "review" | "approved" | "returned"
    >("all");
    const [submittingId, setSubmittingId] = useState<number | null>(null);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [conversationEntry, setConversationEntry] = useState<KpiEntry | null>(null);

    const returnedEntries = useMemo(
        () => entries.filter((e) => ["supervisor_returned", "hr_returned"].includes(e.status)),
        [entries],
    );

    const daysLeft = cycle?.submission_deadline
        ? daysUntil(cycle.submission_deadline)
        : null;

    const totalWeight = entries.reduce((sum, e) => sum + (e.weight || 0), 0);
    const canSubmit = (s: string) =>
        ["draft", "supervisor_returned", "hr_returned"].includes(s);

    const weightOver = totalWeight > 100;
    const weightUnder = totalWeight < 100 && entries.length > 0;
    const weightPerfect = totalWeight === 100;

    // Counts
    const approvedCount = entries.filter(
        (e) => e.status === "hr_approved",
    ).length;
    const inReviewCount = entries.filter((e) =>
        ["submitted", "supervisor_approved"].includes(e.status),
    ).length;
    const draftCount = entries.filter((e) => e.status === "draft").length;
    const returnedCount = entries.filter((e) =>
        ["supervisor_returned", "hr_returned"].includes(e.status),
    ).length;

    // Weight breakdowns
    const approvedWeight = entries
        .filter((e) => e.status === "hr_approved")
        .reduce((sum, e) => sum + (e.weight || 0), 0);
    const inReviewWeight = entries
        .filter((e) => ["submitted", "supervisor_approved"].includes(e.status))
        .reduce((sum, e) => sum + (e.weight || 0), 0);
    const draftWeight = entries
        .filter((e) =>
            ["draft", "supervisor_returned", "hr_returned"].includes(e.status),
        )
        .reduce((sum, e) => sum + (e.weight || 0), 0);

    // Filtered entries
    const filteredEntries = useMemo(() => {
        return entries.filter((e) => {
            // Tab filter
            if (selectedTab === "draft" && e.status !== "draft") return false;
            if (
                selectedTab === "review" &&
                !["submitted", "supervisor_approved"].includes(e.status)
            )
                return false;
            if (selectedTab === "approved" && e.status !== "hr_approved")
                return false;
            if (
                selectedTab === "returned" &&
                !["supervisor_returned", "hr_returned"].includes(e.status)
            )
                return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = e.title.toLowerCase().includes(q);
                const matchDesc =
                    e.description?.toLowerCase().includes(q) ?? false;
                const matchTarget =
                    e.target?.toLowerCase().includes(q) ?? false;
                if (!matchTitle && !matchDesc && !matchTarget) return false;
            }

            return true;
        });
    }, [entries, selectedTab, searchQuery]);

    const handleSubmit = (entryId: number) => {
        if (!currentTeam) return;
        setSubmittingId(entryId);
        router.post(
            String(
                submitRoute.url({
                    current_team: teamSlug,
                    kpiEntry: entryId,
                }),
            ),
            {},
            {
                onFinish: () => setSubmittingId(null),
            },
        );
    };

    return (
        <>
            <Head title="My KPIs — Progressive Credit" />

            <div className="flex h-full w-full flex-1 flex-col bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
                <div className="mx-auto w-full max-w-8xl space-y-6">
                    {/* ── Top Header Navigation ─────────────────────────── */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    My Key Performance Indicators
                                </h1>
                                <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 hidden sm:inline">
                                    Progressive Credit
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                {cycle ? (
                                    <>
                                        Cycle:{" "}
                                        <strong className="text-slate-800">
                                            {cycle.name}
                                        </strong>
                                        {cycle.period_start &&
                                            cycle.period_end && (
                                                <span className="text-slate-500 font-normal">
                                                    {" "}
                                                    (
                                                    {formatDate(
                                                        cycle.period_start,
                                                    )}{" "}
                                                    –{" "}
                                                    {formatDate(
                                                        cycle.period_end,
                                                    )}
                                                    )
                                                </span>
                                            )}
                                    </>
                                ) : (
                                    "No open appraisal cycle right now."
                                )}
                                <span className="hidden md:inline text-slate-300">
                                    {" "}
                                    •{" "}
                                </span>
                                <span className="hidden md:inline italic text-green-700 font-semibold">
                                    "Taking every step with you"
                                </span>
                            </p>
                        </div>

                        {/* Top Action Buttons (Brand Orange and Green) */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Cycle deadline pill */}
                            {cycle && daysLeft !== null && (
                                <span
                                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-2xs"
                                    style={{
                                        backgroundColor:
                                            daysLeft <= 3
                                                ? "#FEF2F2"
                                                : daysLeft <= 7
                                                  ? "#FFF7ED"
                                                  : "#F0FDF4",
                                        borderColor:
                                            daysLeft <= 3
                                                ? "#FECACA"
                                                : daysLeft <= 7
                                                  ? "#FED7AA"
                                                  : "#BBF7D0",
                                        color:
                                            daysLeft <= 3
                                                ? C.danger
                                                : daysLeft <= 7
                                                  ? C.orangeDark
                                                  : C.greenDark,
                                    }}
                                >
                                    <Clock className="h-3.5 w-3.5" />
                                    {daysLeft > 0
                                        ? `${daysLeft} days left`
                                        : "Deadline passed"}
                                </span>
                            )}

                            {/* Evaluation CTA in Progressive Green */}
                            {cycle?.phase === "evaluation" && currentTeam && (
                                <Link
                                    href={String(
                                        kpiEvaluationIndex.url(teamSlug),
                                    )}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-800"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Score My KPIs
                                </Link>
                            )}

                            {/* Create KPI Button in Progressive Orange (Disabled when totalWeight >= 100) */}
                            {cycle && (
                                totalWeight >= 100 ? (
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            disabled
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed shadow-2xs select-none transition-all"
                                            title="Total KPI weight for this cycle has reached 100%. Adjust existing weights before creating new KPIs."
                                        >
                                            <Plus className="h-4 w-4 text-slate-400" />
                                            <span>Create KPI</span>
                                            <span className="ml-1 rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-800">
                                                100%
                                            </span>
                                        </button>
                                        <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden w-64 rounded-xl border border-slate-200 bg-white p-2.5 text-center text-xs font-medium text-slate-600 shadow-md group-hover:block z-20">
                                            100% of cycle weight is already allocated across your KPIs. Adjust existing weights to create more.
                                        </div>
                                    </div>
                                ) : (
                                    <Link
                                        href={
                                            currentTeam
                                                ? String(create.url(teamSlug))
                                                : "/kpi/create"
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-md"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create KPI
                                    </Link>
                                )
                            )}
                        </div>
                    </div>

                    {/* ── Contextual Alert: Returned KPIs ─────────────────── */}
                    {returnedCount > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                    <RotateCcw className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-red-950">
                                        {returnedCount} KPI
                                        {returnedCount === 1 ? "" : "s"}{" "}
                                        Returned for Revision
                                    </h4>
                                    <p className="text-xs text-red-700">
                                        Your supervisor or HRBP has returned{" "}
                                        {returnedCount === 1 ? "a KPI" : "KPIs"}{" "}
                                        with feedback comments. Please review
                                        the adjustments and re-submit.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTab("returned");
                                    if (returnedEntries.length === 1) {
                                        setConversationEntry(returnedEntries[0]);
                                    } else {
                                        const el = document.getElementById("kpi-entries-list");
                                        el?.scrollIntoView({ behavior: "smooth" });
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition-all hover:bg-red-800 cursor-pointer"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>View Return Comments</span>
                                <ArrowRight className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    {/* ── Contextual Alert: Evaluation Phase Active (Brand Green) ── */}
                    {cycle?.phase === "evaluation" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50/90 p-4 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-green-950">
                                        KPI Self-Evaluation Phase is Live
                                    </h4>
                                    <p className="text-xs text-green-700">
                                        Self-evaluation scoring is open. Record
                                        your actual achievements and
                                        self-ratings against your finalized
                                        targets.
                                    </p>
                                </div>
                            </div>
                            {currentTeam && (
                                <Link
                                    href={String(
                                        kpiEvaluationIndex.url(teamSlug),
                                    )}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-800"
                                >
                                    Proceed to Scoring
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            )}
                        </div>
                    )}

                    {/* ── Executive KPI Summary Tiles (Strict Orange, Green, White) ── */}
                    {entries.length > 0 && (
                        <div
                            className={`grid grid-cols-2 gap-3 ${
                                returnedCount > 0
                                    ? "sm:grid-cols-3 lg:grid-cols-5"
                                    : "sm:grid-cols-2 lg:grid-cols-4"
                            }`}
                        >
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Total KPIs
                                    </span>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                        <Layers className="h-4.5 w-4.5" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-slate-900">
                                        {entries.length}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        defined
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                                        Drafts
                                    </span>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                        <FileEdit className="h-4.5 w-4.5" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-orange-600">
                                        {draftCount}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        unsubmitted
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                                        In Review
                                    </span>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                        <Clock className="h-4.5 w-4.5" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-orange-600">
                                        {inReviewCount}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        at supervisor/HR
                                    </span>
                                </div>
                            </div>

                            {returnedCount > 0 && (
                                <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-2xs transition-all hover:shadow-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                                            Returned
                                        </span>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                            <RotateCcw className="h-4.5 w-4.5" />
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-red-700">
                                            {returnedCount}
                                        </span>
                                        <span className="text-xs text-red-600 font-semibold">
                                            needs revision
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-2xs transition-all hover:shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                                        Final Approved
                                    </span>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                        <CheckCircle2 className="h-4.5 w-4.5" />
                                    </div>
                                </div>
                                <div className="mt-2 flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-green-700">
                                        {approvedCount}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        ready for eval
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Weight Allocation Master Card (Orange, Green, White) ── */}
                    {entries.length > 0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                        <Scale className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900">
                                            Weight Allocation Balance
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Total weight must equal exactly 100%
                                            across all your performance
                                            objectives.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider border ${
                                            weightPerfect
                                                ? "bg-green-50 border-green-200 text-green-700"
                                                : weightOver
                                                  ? "bg-red-50 border-red-200 text-red-700"
                                                  : "bg-orange-50 border-orange-200 text-orange-700"
                                        }`}
                                    >
                                        {totalWeight}% of 100% Allocated
                                    </span>
                                </div>
                            </div>

                            {/* Multi-segment progress bar */}
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 flex">
                                {approvedWeight > 0 && (
                                    <div
                                        style={{
                                            width: `${Math.min(approvedWeight, 100)}%`,
                                        }}
                                        className="h-full bg-green-600 transition-all duration-500"
                                        title={`Approved: ${approvedWeight}%`}
                                    />
                                )}
                                {inReviewWeight > 0 && (
                                    <div
                                        style={{
                                            width: `${Math.min(inReviewWeight, 100)}%`,
                                        }}
                                        className="h-full bg-orange-500 transition-all duration-500"
                                        title={`In Review: ${inReviewWeight}%`}
                                    />
                                )}
                                {draftWeight > 0 && (
                                    <div
                                        style={{
                                            width: `${Math.min(draftWeight, 100)}%`,
                                        }}
                                        className={`h-full transition-all duration-500 ${
                                            weightOver
                                                ? "bg-red-500"
                                                : "bg-orange-300"
                                        }`}
                                        title={`Draft/Returned: ${draftWeight}%`}
                                    />
                                )}
                            </div>

                            {/* Weight Allocation Status Feedback */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div>
                                    {weightPerfect && (
                                        <p className="font-semibold text-green-800 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-green-700" />
                                            Weight is perfectly balanced at
                                            100%. All objectives are ready for
                                            supervisor endorsement.
                                        </p>
                                    )}
                                    {weightUnder && (
                                        <p className="font-semibold text-orange-800 flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4 text-orange-600" />
                                            {100 - totalWeight}% remaining to
                                            allocate. Adjust existing weights or
                                            add new KPIs to reach 100%.
                                        </p>
                                    )}
                                    {weightOver && (
                                        <p className="font-semibold text-red-800 flex items-center gap-1.5">
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                            Total weight exceeds 100% by{" "}
                                            {totalWeight - 100}%. Please reduce
                                            weights before submitting for
                                            review.
                                        </p>
                                    )}
                                </div>

                                {/* Weight breakdown legend */}
                                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-green-600" />
                                        Approved:{" "}
                                        <strong>{approvedWeight}%</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                                        In Review:{" "}
                                        <strong>{inReviewWeight}%</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-orange-300" />
                                        Draft: <strong>{draftWeight}%</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Search & Filter Controls ───────────────────────── */}
                    {entries.length > 0 && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {/* Filter Tabs (Orange, Green, White) */}
                            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xs">
                                <button
                                    onClick={() => setSelectedTab("all")}
                                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                        selectedTab === "all"
                                            ? "bg-orange-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                                    }`}
                                >
                                    All ({entries.length})
                                </button>
                                <button
                                    onClick={() => setSelectedTab("draft")}
                                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                        selectedTab === "draft"
                                            ? "bg-orange-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                                    }`}
                                >
                                    Drafts ({draftCount})
                                </button>
                                <button
                                    onClick={() => setSelectedTab("review")}
                                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                        selectedTab === "review"
                                            ? "bg-orange-600 text-white shadow-xs"
                                            : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                                    }`}
                                >
                                    In Review ({inReviewCount})
                                </button>
                                <button
                                    onClick={() => setSelectedTab("approved")}
                                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                        selectedTab === "approved"
                                            ? "bg-green-700 text-white shadow-xs"
                                            : "text-slate-600 hover:text-green-700 hover:bg-green-50"
                                    }`}
                                >
                                    Approved ({approvedCount})
                                </button>
                                {returnedCount > 0 && (
                                    <button
                                        onClick={() =>
                                            setSelectedTab("returned")
                                        }
                                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                            selectedTab === "returned"
                                                ? "bg-red-600 text-white shadow-xs"
                                                : "text-red-700 hover:bg-red-50"
                                        }`}
                                    >
                                        Returned ({returnedCount})
                                    </button>
                                )}
                            </div>

                            {/* Search bar */}
                            <div className="relative w-full sm:w-72">
                                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search KPIs by title or target..."
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-hidden"
                                />
                            </div>
                        </div>
                    )}

                    {/* ── Empty State ─────────────────────────────────────── */}
                    {entries.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-16 px-6 text-center shadow-xs">
                            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-600 mb-4 border border-orange-100">
                                <Target className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                No KPIs Captured for this Cycle
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 max-w-md">
                                {cycle
                                    ? "Set clear, measurable objectives for your branch or department and allocate weights totaling 100%."
                                    : "There is currently no active KPI appraisal cycle scheduled."}
                            </p>

                            {cycle && (
                                <Link
                                    href={
                                        currentTeam
                                            ? String(create.url(teamSlug))
                                            : "/kpi/create"
                                    }
                                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-orange-600/20 transition-all hover:bg-orange-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create KPI
                                </Link>
                            )}
                        </div>
                    )}

                    {/* ── KPI List (Semantic Table on Desktop + Responsive Cards on Mobile) ── */}
                    {entries.length > 0 && (
                        <div
                            id="kpi-entries-list"
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs"
                        >
                            {/* ── Desktop Semantic Table View (lg+) ── */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <th className="py-3.5 px-6">
                                                KPI Objective & Target Outcome
                                            </th>
                                            <th className="py-3.5 px-4 text-center w-28">
                                                Weight
                                            </th>
                                            <th className="py-3.5 px-4 w-44">
                                                Review Stage
                                            </th>
                                            <th className="py-3.5 px-4 w-48">
                                                Status
                                            </th>
                                            <th className="py-3.5 px-6 text-right w-64">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEntries.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="py-12 text-center text-xs text-slate-500"
                                                >
                                                    No KPIs match the selected
                                                    filter or search term.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredEntries.map((entry) => {
                                                const isDraftOrReturned =
                                                    canSubmit(entry.status);
                                                const isSubmitting =
                                                    submittingId === entry.id;
                                                const isReturned = [
                                                    "supervisor_returned",
                                                    "hr_returned",
                                                ].includes(entry.status);
                                                const returnLogs = (
                                                    entry.logs ?? []
                                                ).filter(
                                                    (l) =>
                                                        l.action === "returned",
                                                );
                                                const latestReturn =
                                                    returnLogs.length > 0
                                                        ? returnLogs[0]
                                                        : null;

                                                return (
                                                    <>
                                                        {/* Primary KPI Row */}
                                                        <tr
                                                            key={entry.id}
                                                            className={`transition-colors hover:bg-slate-50/80 ${
                                                                isReturned
                                                                    ? "bg-red-50/25"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {/* Title & Target Details */}
                                                            <td className="py-4 px-6 align-middle">
                                                                <div className="flex items-start gap-3">
                                                                    <div
                                                                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5 ${
                                                                            isReturned
                                                                                ? "bg-red-100 text-red-700"
                                                                                : "bg-orange-50 text-orange-600"
                                                                        }`}
                                                                    >
                                                                        {isReturned ? (
                                                                            <RotateCcw className="h-4 w-4" />
                                                                        ) : (
                                                                            <Target className="h-4 w-4" />
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-1 min-w-0">
                                                                        <Link
                                                                            href={String(
                                                                                showRoute.url(
                                                                                    {
                                                                                        current_team:
                                                                                            teamSlug,
                                                                                        kpiEntry:
                                                                                            entry.id,
                                                                                    },
                                                                                ),
                                                                            )}
                                                                            className="text-sm font-bold text-slate-900 transition-colors hover:text-orange-600 hover:underline block leading-snug"
                                                                        >
                                                                            {
                                                                                entry.title
                                                                            }
                                                                        </Link>
                                                                        {entry.target && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                                                <span className="font-semibold text-slate-700">
                                                                                    Target:
                                                                                </span>
                                                                                <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                                    {
                                                                                        entry.target
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {entry.description &&
                                                                            entry.description !==
                                                                                entry.title && (
                                                                                <p className="text-xs text-slate-500 line-clamp-2 max-w-xl">
                                                                                    {
                                                                                        entry.description
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Weight Badge */}
                                                            <td className="py-4 px-4 align-middle text-center">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-black border ${
                                                                        entry.weight >=
                                                                        20
                                                                            ? "bg-green-50 border-green-200 text-green-700"
                                                                            : "bg-orange-50 border-orange-200 text-orange-700"
                                                                    }`}
                                                                >
                                                                    {
                                                                        entry.weight
                                                                    }
                                                                    %
                                                                </span>
                                                            </td>

                                                            {/* 3-Stage Progress & Label */}
                                                            <td className="py-4 px-4 align-middle">
                                                                <div className="flex items-center gap-2.5">
                                                                    <ProgressSteps
                                                                        status={
                                                                            entry.status
                                                                        }
                                                                    />
                                                                    <span className="text-xs text-slate-600 font-medium">
                                                                        {entry.status ===
                                                                            "draft" &&
                                                                            "Draft"}
                                                                        {entry.status ===
                                                                            "submitted" &&
                                                                            "Supervisor"}
                                                                        {entry.status ===
                                                                            "supervisor_approved" &&
                                                                            "HRBP"}
                                                                        {entry.status ===
                                                                            "hr_approved" &&
                                                                            "Approved"}
                                                                        {entry.status ===
                                                                            "supervisor_returned" &&
                                                                            "Returned (Sup)"}
                                                                        {entry.status ===
                                                                            "hr_returned" &&
                                                                            "Returned (HR)"}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Status Badge */}
                                                            <td className="py-4 px-4 align-middle">
                                                                <StatusPill
                                                                    status={
                                                                        entry.status
                                                                    }
                                                                />
                                                            </td>

                                                            {/* Action Buttons */}
                                                            <td className="py-4 px-6 align-middle text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {isReturned ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setConversationEntry(
                                                                                    entry,
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 shadow-2xs hover:bg-red-100 transition-all cursor-pointer"
                                                                            title="View reviewer return feedback"
                                                                        >
                                                                            <MessageSquare className="h-3.5 w-3.5 text-red-600" />
                                                                            <span>
                                                                                Feedback
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        <Link
                                                                            href={String(
                                                                                showRoute.url(
                                                                                    {
                                                                                        current_team:
                                                                                            teamSlug,
                                                                                        kpiEntry:
                                                                                            entry.id,
                                                                                    },
                                                                                ),
                                                                            )}
                                                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all"
                                                                            title="View KPI details and history"
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                                                                            <span>
                                                                                View
                                                                            </span>
                                                                        </Link>
                                                                    )}

                                                                    <Link
                                                                        href={String(
                                                                            edit.url(
                                                                                {
                                                                                    current_team:
                                                                                        teamSlug,
                                                                                    kpiEntry:
                                                                                        entry.id,
                                                                                },
                                                                            ),
                                                                        )}
                                                                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-orange-300 transition-all"
                                                                        title="Edit KPI details and weights"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                                                        <span>
                                                                            Edit
                                                                        </span>
                                                                    </Link>

                                                                    {isDraftOrReturned && (
                                                                        <button
                                                                            onClick={() =>
                                                                                handleSubmit(
                                                                                    entry.id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isSubmitting
                                                                            }
                                                                            className="inline-flex items-center gap-1 rounded-xl bg-green-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-green-800 disabled:opacity-50 transition-all cursor-pointer"
                                                                            title="Submit to supervisor for moderation"
                                                                        >
                                                                            {isSubmitting ? (
                                                                                "..."
                                                                            ) : (
                                                                                <>
                                                                                    <Send className="h-3 w-3" />
                                                                                    <span>
                                                                                        Submit
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {/* Full-Width Sub-Row for Returned Feedback */}
                                                        {isReturned && (
                                                            <tr
                                                                key={`${entry.id}-feedback-row`}
                                                                className="bg-red-50/50 border-b border-red-200"
                                                            >
                                                                <td
                                                                    colSpan={5}
                                                                    className="px-6 py-3.5"
                                                                >
                                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white/95 p-3.5 shadow-2xs">
                                                                        <div className="flex items-start gap-3 min-w-0">
                                                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 mt-0.5">
                                                                                <RotateCcw className="h-4 w-4" />
                                                                            </div>
                                                                            <div className="space-y-1 min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className="text-xs font-bold text-red-950">
                                                                                        Revision
                                                                                        Requested
                                                                                        by{" "}
                                                                                        {latestReturn
                                                                                            ?.actor
                                                                                            ?.name ||
                                                                                            "Reviewer"}{" "}
                                                                                        (
                                                                                        {latestReturn?.stage ===
                                                                                        "hr"
                                                                                            ? "Regional HRBP"
                                                                                            : "Supervisor"}
                                                                                        )
                                                                                    </span>
                                                                                    {latestReturn?.created_at && (
                                                                                        <span className="text-[11px] text-red-600 font-medium">
                                                                                            •{" "}
                                                                                            {formatDate(
                                                                                                latestReturn.created_at,
                                                                                            )}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {latestReturn?.comment ? (
                                                                                    <div className="rounded-xl bg-red-50/70 p-2.5 border border-red-100 text-xs italic text-slate-800 leading-relaxed max-w-4xl whitespace-pre-wrap">
                                                                                        "
                                                                                        {
                                                                                            latestReturn.comment
                                                                                        }
                                                                                        "
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-xs text-red-700 italic">
                                                                                        Please
                                                                                        review
                                                                                        requested
                                                                                        adjustments
                                                                                        with
                                                                                        your
                                                                                        supervisor
                                                                                        and
                                                                                        re-submit.
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setConversationEntry(
                                                                                        entry,
                                                                                    )
                                                                                }
                                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-50 shadow-2xs cursor-pointer transition-all"
                                                                            >
                                                                                <MessageSquare className="h-3.5 w-3.5 text-red-600" />
                                                                                <span>
                                                                                    View
                                                                                    Conversation
                                                                                    (
                                                                                    {
                                                                                        (
                                                                                            entry.logs ??
                                                                                            []
                                                                                        )
                                                                                            .length
                                                                                    }
                                                                                    )
                                                                                </span>
                                                                            </button>
                                                                            <Link
                                                                                href={String(
                                                                                    edit.url(
                                                                                        {
                                                                                            current_team:
                                                                                                teamSlug,
                                                                                            kpiEntry:
                                                                                                entry.id,
                                                                                        },
                                                                                    ),
                                                                                )}
                                                                                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-orange-700 transition-all"
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                                <span>
                                                                                    Edit
                                                                                    &
                                                                                    Revise
                                                                                </span>
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Mobile Responsive Card View (<lg) ── */}
                            <div className="divide-y divide-slate-100 lg:hidden">
                                {filteredEntries.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-500">
                                        No KPIs match the selected filter or
                                        search term.
                                    </div>
                                ) : (
                                    filteredEntries.map((entry) => {
                                        const isDraftOrReturned =
                                            canSubmit(entry.status);
                                        const isSubmitting =
                                            submittingId === entry.id;
                                        const isReturned = [
                                            "supervisor_returned",
                                            "hr_returned",
                                        ].includes(entry.status);
                                        const returnLogs = (
                                            entry.logs ?? []
                                        ).filter(
                                            (l) => l.action === "returned",
                                        );
                                        const latestReturn =
                                            returnLogs.length > 0
                                                ? returnLogs[0]
                                                : null;

                                        return (
                                            <div
                                                key={entry.id}
                                                className={`p-4 sm:p-5 space-y-3.5 ${
                                                    isReturned
                                                        ? "bg-red-50/20"
                                                        : ""
                                                }`}
                                            >
                                                {/* Header: Icon + Title + Weight */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div
                                                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl mt-0.5 ${
                                                                isReturned
                                                                    ? "bg-red-100 text-red-700"
                                                                    : "bg-orange-50 text-orange-600"
                                                            }`}
                                                        >
                                                            {isReturned ? (
                                                                <RotateCcw className="h-4 w-4" />
                                                            ) : (
                                                                <Target className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <Link
                                                                href={String(
                                                                    showRoute.url(
                                                                        {
                                                                            current_team:
                                                                                teamSlug,
                                                                            kpiEntry:
                                                                                entry.id,
                                                                        },
                                                                    ),
                                                                )}
                                                                className="text-sm font-bold text-slate-900 hover:text-orange-600 block leading-snug"
                                                            >
                                                                {entry.title}
                                                            </Link>
                                                            {entry.target && (
                                                                <p className="mt-1 text-xs text-slate-600">
                                                                    <span className="font-semibold text-slate-700">
                                                                        Target:
                                                                    </span>{" "}
                                                                    <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                                        {
                                                                            entry.target
                                                                        }
                                                                    </span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`rounded-xl px-2.5 py-1 text-xs font-black border flex-shrink-0 ${
                                                            entry.weight >= 20
                                                                ? "bg-green-50 border-green-200 text-green-700"
                                                                : "bg-orange-50 border-orange-200 text-orange-700"
                                                        }`}
                                                    >
                                                        {entry.weight}%
                                                    </span>
                                                </div>

                                                {/* Return Feedback Callout on Mobile */}
                                                {isReturned && (
                                                    <div className="rounded-2xl border border-red-200 bg-red-50/90 p-3 space-y-2 text-xs">
                                                        <div className="flex items-center justify-between text-[11px] font-bold text-red-900">
                                                            <span>
                                                                Returned by{" "}
                                                                {latestReturn
                                                                    ?.actor
                                                                    ?.name ||
                                                                    "Reviewer"}
                                                            </span>
                                                            <span>
                                                                {formatDate(
                                                                    latestReturn?.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                        {latestReturn?.comment && (
                                                            <p className="italic text-slate-800 bg-white/95 p-2 rounded-xl border border-red-100 whitespace-pre-wrap">
                                                                "
                                                                {
                                                                    latestReturn.comment
                                                                }
                                                                "
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setConversationEntry(
                                                                    entry,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 font-bold text-red-800 hover:text-red-950 underline text-[11px] cursor-pointer"
                                                        >
                                                            <MessageSquare className="h-3 w-3" />
                                                            <span>
                                                                View Full Return
                                                                Conversation (
                                                                {
                                                                    (
                                                                        entry.logs ??
                                                                        []
                                                                    ).length
                                                                }{" "}
                                                                events)
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Footer: Stage + Actions */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <ProgressSteps
                                                            status={
                                                                entry.status
                                                            }
                                                        />
                                                        <StatusPill
                                                            status={
                                                                entry.status
                                                            }
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {isReturned ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setConversationEntry(
                                                                        entry,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700"
                                                            >
                                                                <MessageSquare className="h-3.5 w-3.5 text-red-600" />
                                                                <span>
                                                                    Feedback
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <Link
                                                                href={String(
                                                                    showRoute.url(
                                                                        {
                                                                            current_team:
                                                                                teamSlug,
                                                                            kpiEntry:
                                                                                entry.id,
                                                                        },
                                                                    ),
                                                                )}
                                                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 text-slate-500" />
                                                                <span>
                                                                    View
                                                                </span>
                                                            </Link>
                                                        )}

                                                        <Link
                                                            href={String(
                                                                edit.url({
                                                                    current_team:
                                                                        teamSlug,
                                                                    kpiEntry:
                                                                        entry.id,
                                                                }),
                                                            )}
                                                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                                            <span>Edit</span>
                                                        </Link>

                                                        {isDraftOrReturned && (
                                                            <button
                                                                onClick={() =>
                                                                    handleSubmit(
                                                                        entry.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    isSubmitting
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-xl bg-green-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                            >
                                                                <Send className="h-3 w-3" />
                                                                <span>
                                                                    Submit
                                                                </span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Table Footer */}
                            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-600">
                                <div>
                                    Showing{" "}
                                    <strong className="text-slate-900">
                                        {filteredEntries.length}
                                    </strong>{" "}
                                    of{" "}
                                    <strong className="text-slate-900">
                                        {entries.length}
                                    </strong>{" "}
                                    total KPI{entries.length === 1 ? "" : "s"}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span>
                                        Total Weight:{" "}
                                        <strong
                                            className={
                                                weightPerfect
                                                    ? "text-green-700"
                                                    : weightOver
                                                      ? "text-red-700"
                                                      : "text-orange-700"
                                            }
                                        >
                                            {totalWeight}% / 100%
                                        </strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── KPI Governance & Policy Guidance Accordion (Orange & Green) ── */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                        <button
                            onClick={() => setShowGuidelines(!showGuidelines)}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                    <ShieldCheck className="h-4.5 w-4.5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Progressive Credit KPI Guidelines &
                                        Approval Workflow
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Standards for objective setting, weight
                                        balance, and supervisor endorsement.
                                    </p>
                                </div>
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                {showGuidelines ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                        </button>

                        {showGuidelines && (
                            <div className="mt-4 pt-4 border-t border-slate-100 grid gap-4 sm:grid-cols-3 text-xs text-slate-600">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                                        <Target className="h-4 w-4 text-orange-600" />
                                        SMART Objectives
                                    </div>
                                    <p className="leading-relaxed text-slate-500">
                                        Formulate specific, measurable,
                                        achievable, relevant, and time-bound
                                        goals aligned with branch budgets and
                                        departmental KPIs.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                                        <Scale className="h-4 w-4 text-green-700" />
                                        100% Weight Balance
                                    </div>
                                    <p className="leading-relaxed text-slate-500">
                                        Typically 3 to 7 core performance
                                        indicators. The sum of all individual
                                        KPI weights must equal exactly 100% for
                                        full submission.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-900 mb-1.5">
                                        <CheckCircle2 className="h-4 w-4 text-orange-600" />
                                        Two-Stage Sign-Off
                                    </div>
                                    <p className="leading-relaxed text-slate-500">
                                        Submissions route to your Direct
                                        Supervisor first for moderation, then to
                                        your regional HRBP for final
                                        authorization before evaluation.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Return Feedback & Conversation History Modal ─────────────── */}
            <Dialog
                open={!!conversationEntry}
                onOpenChange={(open) => !open && setConversationEntry(null)}
            >
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                            <RotateCcw className="h-4 w-4" />
                            Return Feedback & Review History
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            {conversationEntry?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Review timeline of supervisor coaching, HRBP reviews, and submission events.
                        </DialogDescription>
                    </DialogHeader>

                    {conversationEntry && (
                        <div className="space-y-4 py-2">
                            {/* Target & Weight summary pills */}
                            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3 text-xs border border-slate-100">
                                <span className="font-semibold text-slate-700">
                                    Target: <strong className="text-slate-900">{conversationEntry.target || "—"}</strong>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-slate-700">
                                    Weight: <strong className="text-green-700">{conversationEntry.weight}%</strong>
                                </span>
                                <span className="text-slate-300">•</span>
                                <StatusPill status={conversationEntry.status} />
                            </div>

                            {/* Conversation Events List */}
                            {(!conversationEntry.logs || conversationEntry.logs.length === 0) ? (
                                <div className="py-6 text-center text-xs text-slate-400 italic">
                                    No review conversation logged yet for this KPI.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {conversationEntry.logs.map((log, idx) => {
                                        const isReturn = log.action === "returned";
                                        const isApproved = log.action === "approved";

                                        return (
                                            <div
                                                key={log.id || idx}
                                                className={`rounded-2xl border p-4 text-xs ${
                                                    isReturn
                                                        ? "border-red-200 bg-red-50/70"
                                                        : isApproved
                                                        ? "border-green-200 bg-green-50/40"
                                                        : "border-slate-200 bg-white"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">
                                                            {log.actor?.name || "Reviewer"}
                                                        </span>
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                                                isReturn
                                                                    ? "bg-red-100 text-red-800"
                                                                    : isApproved
                                                                    ? "bg-green-100 text-green-800"
                                                                    : "bg-slate-100 text-slate-700"
                                                            }`}
                                                        >
                                                            {isReturn ? "Returned for Revision" : isApproved ? "Approved" : "Submitted"}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">
                                                        {formatDate(log.created_at)}
                                                    </span>
                                                </div>

                                                {log.comment ? (
                                                    <div className="mt-2 rounded-xl bg-white p-3 border border-slate-100 shadow-2xs italic text-slate-800 whitespace-pre-wrap">
                                                        <div className="flex items-start gap-1.5 not-italic font-bold text-[11px] text-slate-600 mb-1">
                                                            <MessageSquare className="h-3.5 w-3.5 text-orange-600 mt-0.5" />
                                                            <span>Reviewer Note / Adjustments:</span>
                                                        </div>
                                                        "{log.comment}"
                                                    </div>
                                                ) : (
                                                    <p className="mt-1 text-[11px] text-slate-400 italic">
                                                        No text comments provided with this event.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                        <DialogClose asChild>
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                                Close
                            </button>
                        </DialogClose>

                        {conversationEntry && canSubmit(conversationEntry.status) && (
                            <Link
                                href={String(
                                    edit.url({
                                        current_team: teamSlug,
                                        kpiEntry: conversationEntry.id,
                                    })
                                )}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-orange-700"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit & Revise This KPI</span>
                            </Link>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
