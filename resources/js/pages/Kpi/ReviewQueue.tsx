import { Head, Link, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    ArrowRight,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    FileCheck2,
    Search,
    User,
    Inbox,
    RotateCcw,
    MessageSquare,
    Target,
    Scale,
    AlertCircle,
    ShieldAlert,
} from "lucide-react";
import StatusPill from "@/components/Kpi/StatusPill";
import { reviewShow } from "@/routes/kpi";

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

interface QueueLog {
    id: number;
    stage: string;
    action: string;
    comment: string | null;
    actor?: { name: string };
    created_at: string;
}

interface QueueEntry {
    id: number;
    title: string;
    description?: string;
    target?: string | null;
    weight?: number;
    status: string;
    user: { name: string; department?: { name: string } | null };
    submitted_at?: string;
    updated_at?: string;
    department?: { name: string } | null;
    logs?: QueueLog[];
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

export default function ReviewQueue({
    entries = [],
}: {
    entries: QueueEntry[];
}) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<
        "all" | "supervisor" | "hr" | "returned"
    >("all");

    // Helper to get latest return feedback log
    const getLatestReturnLog = (entry: QueueEntry): QueueLog | undefined => {
        return entry.logs?.find((l) => l.action === "returned");
    };

    const supervisorCount = entries.filter(
        (e) => e.status === "submitted",
    ).length;
    const hrCount = entries.filter(
        (e) => e.status === "supervisor_approved",
    ).length;
    const returnedCount = entries.filter(
        (e) =>
            e.status === "hr_returned" ||
            e.status === "supervisor_returned" ||
            getLatestReturnLog(e) !== undefined,
    ).length;

    const filteredEntries = entries.filter((e) => {
        const query = search.toLowerCase();
        const title = e.title?.toLowerCase() ?? "";
        const userName = e.user?.name?.toLowerCase() ?? "";
        const deptName =
            (e.department?.name || e.user?.department?.name)?.toLowerCase() ??
            "";
        const returnComment =
            getLatestReturnLog(e)?.comment?.toLowerCase() ?? "";

        const matchesQuery =
            title.includes(query) ||
            userName.includes(query) ||
            deptName.includes(query) ||
            returnComment.includes(query);

        if (!matchesQuery) return false;

        if (activeTab === "supervisor") {
            return e.status === "submitted";
        }
        if (activeTab === "hr") {
            return e.status === "supervisor_approved";
        }
        if (activeTab === "returned") {
            return (
                e.status === "hr_returned" || e.status === "supervisor_returned"
            );
        }

        return true;
    });

    const pendingCount = entries.length;

    return (
        <>
            <Head title="KPI Review Queue" />

            <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-8xl space-y-6">
                    {/* ── Page Header ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md shadow-green-600/20">
                                    <FileCheck2 className="h-6 w-6" />
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    KPI Review & Approval Queue
                                </h1>
                                {pendingCount > 0 && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-orange-600 px-3.5 py-1 text-xs font-bold text-white shadow-2xs">
                                        <Clock className="h-3.5 w-3.5" />
                                        {pendingCount} Pending Decision
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-sm text-slate-500">
                                Inspect staff KPI submissions, review supervisor
                                and HRBP revision comments, and provide
                                authorization.
                                <span className="hidden md:inline text-slate-300">
                                    {" "}
                                    •{" "}
                                </span>
                                <span className="hidden md:inline italic text-green-700 font-semibold">
                                    "Taking every step with you"
                                </span>
                            </p>
                        </div>

                        {entries.length > 0 && (
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search KPI, employee, feedback..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Metric Summary Tiles ─────────────────────────────────── */}
                    {entries.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Awaiting Supervisor
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-slate-900">
                                        {supervisorCount}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                                    <Clock className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Awaiting HRBP
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-green-700">
                                        {hrCount}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Returned with Comments
                                    </p>
                                    <p className="mt-1 text-2xl font-black text-red-700">
                                        {returnedCount}
                                    </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                    <RotateCcw className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Filter Tabs ─────────────────────────────────────────── */}
                    {entries.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "all"
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                All KPIs ({entries.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("supervisor")}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "supervisor"
                                        ? "bg-orange-600 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Awaiting Supervisor ({supervisorCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("hr")}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "hr"
                                        ? "bg-green-700 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Awaiting HRBP ({hrCount})
                            </button>
                            {returnedCount > 0 && (
                                <button
                                    onClick={() => setActiveTab("returned")}
                                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                        activeTab === "returned"
                                            ? "bg-red-700 text-white shadow-2xs"
                                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }`}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Returned with Feedback ({returnedCount})
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Empty State ─────────────────────────────────────────── */}
                    {entries.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-slate-900">
                                All Caught Up! 🎉
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                                There are no staff KPI proposals or returned
                                items awaiting your review right now.
                            </p>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                            <p className="text-xs text-slate-500">
                                No KPI entries match the current filter or
                                search query.
                            </p>
                        </div>
                    ) : (
                        /* ── Submissions List ───────────────────────────────────── */
                        <div className="space-y-3.5">
                            {filteredEntries.map((entry) => {
                                const returnLog = getLatestReturnLog(entry);
                                const isReturnedByHr =
                                    entry.status === "hr_returned" ||
                                    returnLog?.stage === "hr";
                                const isReturnedBySupervisor =
                                    entry.status === "supervisor_returned" ||
                                    returnLog?.stage === "supervisor";
                                const deptName =
                                    entry.department?.name ||
                                    entry.user?.department?.name;

                                return (
                                    <div
                                        key={entry.id}
                                        className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-orange-200 hover:shadow-md"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            {/* Details */}
                                            <div className="space-y-1.5 min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                                                        {entry.title}
                                                    </h3>
                                                    {entry.weight !==
                                                        undefined && (
                                                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                                            {entry.weight}%
                                                            Weight
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                                                        <User className="h-3.5 w-3.5 text-slate-400" />
                                                        {entry.user?.name}
                                                    </span>
                                                    {deptName && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                                            {deptName}
                                                        </span>
                                                    )}
                                                    {entry.submitted_at && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                            Submitted:{" "}
                                                            {formatDate(
                                                                entry.submitted_at,
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {entry.target && (
                                                    <p className="text-xs text-slate-600 mt-1">
                                                        <span className="font-semibold text-slate-700">
                                                            Target Outcome:
                                                        </span>{" "}
                                                        {entry.target}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status & Review Button */}
                                            <div className="flex flex-wrap items-center gap-3 sm:flex-shrink-0">
                                                <StatusPill
                                                    status={entry.status}
                                                />

                                                <Link
                                                    href={
                                                        currentTeam
                                                            ? String(
                                                                  reviewShow.url(
                                                                      {
                                                                          current_team:
                                                                              teamSlug,
                                                                          kpiEntry:
                                                                              entry.id,
                                                                      },
                                                                  ),
                                                              )
                                                            : "#"
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-md"
                                                >
                                                    <span>Review KPI</span>
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </div>

                                        {/* ── Accommodate Return Comments (from Supervisor or HRBP) ── */}
                                        {returnLog &&
                                            (entry.status === "hr_returned" ||
                                                entry.status ===
                                                    "supervisor_returned" ||
                                                activeTab === "returned") && (
                                                <div className="mt-3.5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-950">
                                                    <RotateCcw className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center justify-between gap-1">
                                                            <span className="font-bold text-red-900">
                                                                Feedback from{" "}
                                                                {returnLog.stage ===
                                                                "hr"
                                                                    ? "HR Business Partner"
                                                                    : "Supervisor"}
                                                                {returnLog.actor
                                                                    ?.name &&
                                                                    ` (${returnLog.actor.name})`}
                                                                :
                                                            </span>
                                                            <span className="text-[10px] text-red-700">
                                                                {formatDate(
                                                                    returnLog.created_at,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-slate-800 italic bg-white/90 rounded-xl p-2.5 border border-red-100 leading-relaxed font-medium">
                                                            "{returnLog.comment}
                                                            "
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
