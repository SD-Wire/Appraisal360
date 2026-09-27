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
    ShieldCheck,
    Pencil,
    RotateCcw,
} from "lucide-react";
import { reviewShow } from "@/routes/kpi/evaluation";

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

interface ReviewItem {
    first_entry_id: number;
    user: { id: number; name: string };
    department?: { name: string } | null;
    cycle?: { id: number; name: string } | null;
    kpi_count: number;
    pending_count?: number;
    completed_count?: number;
    returned_count?: number;
    status?: "pending" | "completed" | "returned";
    submitted_at: string | null;
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

export default function EvaluationReviewQueue({
    reviews = [],
}: {
    reviews: ReviewItem[];
}) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "";
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("all");

    const filteredReviews = reviews.filter((r) => {
        const query = search.toLowerCase();
        const userName = r.user?.name?.toLowerCase() ?? "";
        const deptName = r.department?.name?.toLowerCase() ?? "";
        const cycleName = r.cycle?.name?.toLowerCase() ?? "";
        const matchesQuery =
            userName.includes(query) ||
            deptName.includes(query) ||
            cycleName.includes(query);

        if (!matchesQuery) return false;

        if (activeTab === "pending") {
            return (r.pending_count ?? 1) > 0;
        }
        if (activeTab === "completed") {
            return r.status === "completed" || (r.completed_count ?? 0) > 0;
        }

        return true;
    });

    const pendingStaffCount = reviews.filter((r) => (r.pending_count ?? 1) > 0).length;
    const completedStaffCount = reviews.filter((r) => r.status === "completed" || ((r.completed_count ?? 0) > 0 && (r.pending_count ?? 0) === 0)).length;
    const totalKpiCount = reviews.reduce((acc, r) => acc + r.kpi_count, 0);

    return (
        <>
            <Head title="KPI Evaluation Review Queue" />

            <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">

                    {/* ── Page Header ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600 to-green-700 text-white shadow-md shadow-green-600/20">
                                    <FileCheck2 className="h-6 w-6" />
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                                    KPI Evaluation Moderation Queue
                                </h1>
                                {pendingStaffCount > 0 && (
                                    <span className="flex items-center gap-1.5 rounded-full bg-orange-600 px-3.5 py-1 text-xs font-bold text-white shadow-2xs">
                                        <Clock className="h-3.5 w-3.5" />
                                        {pendingStaffCount} Awaiting Moderation
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 text-sm text-slate-500">
                                Moderate employee self-evaluations, calibrate ratings, provide coaching comments, and edit scores during the cycle.
                                <span className="hidden md:inline text-slate-300"> • </span>
                                <span className="hidden md:inline italic text-green-700 font-semibold">"Taking every step with you"</span>
                            </p>
                        </div>

                        {reviews.length > 0 && (
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search staff, department, cycle..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 outline-none transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Filter Tabs ─────────────────────────────────────────── */}
                    {reviews.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "all"
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                All Staff ({reviews.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("pending")}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "pending"
                                        ? "bg-orange-600 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <Clock className="h-3.5 w-3.5" />
                                Awaiting Moderation ({pendingStaffCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("completed")}
                                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                    activeTab === "completed"
                                        ? "bg-green-700 text-white shadow-2xs"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Moderated / Completed ({completedStaffCount})
                            </button>
                        </div>
                    )}

                    {/* ── Empty State ─────────────────────────────────────────── */}
                    {reviews.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-base font-bold text-slate-900">
                                No Evaluations Awaiting Moderation
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                                When your direct reports submit their KPI self-scores and achievements, they will appear here for you to moderate ratings and provide constructive feedback.
                            </p>
                        </div>
                    ) : filteredReviews.length === 0 ? (
                        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                            <p className="text-xs text-slate-500">
                                No staff submissions match the current filter or search query.
                            </p>
                        </div>
                    ) : (
                        /* ── Submissions List ───────────────────────────────────── */
                        <div className="space-y-3.5">
                            {filteredReviews.map((item) => {
                                const initials = item.user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2);

                                const isFullyModerated = (item.pending_count ?? 0) === 0 && (item.completed_count ?? 0) > 0;

                                return (
                                    <div
                                        key={item.user.id}
                                        className="group flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-orange-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-base font-black text-white shadow-2xs ${
                                                    isFullyModerated
                                                        ? "bg-gradient-to-br from-green-700 to-green-800"
                                                        : "bg-gradient-to-br from-orange-600 to-orange-700"
                                                }`}
                                            >
                                                {initials}
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-slate-900">
                                                        {item.user.name}
                                                    </h3>
                                                    {item.department?.name && (
                                                        <span className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                            <Building2 className="h-3 w-3 text-slate-400" />
                                                            {item.department.name}
                                                        </span>
                                                    )}
                                                    {isFullyModerated ? (
                                                        <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-800">
                                                            Moderated & Approved
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                                                            Awaiting Moderation
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                                    {item.cycle?.name && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            Cycle: <strong className="text-slate-800">{item.cycle.name}</strong>
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                                                        <FileCheck2 className="h-3.5 w-3.5 text-orange-600" />
                                                        <strong>{item.kpi_count}</strong> KPI{item.kpi_count !== 1 ? "s" : ""}
                                                        {item.completed_count !== undefined && (
                                                            <span className="text-slate-500 font-normal">
                                                                {" "}({item.completed_count} moderated)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {item.submitted_at && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                            Submitted: {formatDate(item.submitted_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end sm:flex-shrink-0">
                                            <Link
                                                href={
                                                    currentTeam
                                                        ? String(
                                                              reviewShow.url({
                                                                  current_team: teamSlug,
                                                                  kpiEntry: item.first_entry_id,
                                                              }),
                                                          )
                                                        : "#"
                                                }
                                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md ${
                                                    isFullyModerated
                                                        ? "bg-green-700 hover:bg-green-800 shadow-green-700/20"
                                                        : "bg-orange-600 hover:bg-orange-700 shadow-orange-600/20"
                                                }`}
                                            >
                                                {isFullyModerated ? (
                                                    <>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        <span>Edit Moderation Scores</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Review & Moderate</span>
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </>
                                                )}
                                            </Link>
                                        </div>
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
