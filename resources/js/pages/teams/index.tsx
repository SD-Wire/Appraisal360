import { Head, Link } from "@inertiajs/react";
import {
    Pencil,
    Plus,
    Building2,
    Users,
    User,
    Shield,
    Search,
    X,
    GitBranch,
    Globe,
    MapPin,
} from "lucide-react";
import { useState, useMemo } from "react";
import CreateTeamModal from "@/components/create-team-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { edit, index } from "@/routes/teams";
import type { Team } from "@/types";

// ── Brand colours ──────────────────────────────────────────────────────────
const C = {
    navy: "#003366",
    navyLight: "#EFF6FF",
    gold: "#E8A83C",
    goldLight: "#FEF3C7",
    goldDark: "#C9922E",
    green: "#15803D",
    greenLight: "#DCFCE7",
    greenDark: "#166534",
    bg: "#F9FAFB",
    white: "#FFFFFF",
    border: "#E5E7EB",
    text: "#111827",
    textSecondary: "#6B7280",
    danger: "#DC2626",
    dangerLight: "#FEE2E2",
    orange: "#EA580C",
    orangeLight: "#FED7AA",
    orangeDark: "#C2410C",
};

type TypeFilter = "all" | "hq" | "branch" | "region" | "personal";

type Props = {
    teams: Team[];
    canManageTeams: boolean;
};

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string; icon: typeof Building2 }> = {
    hq: { label: "HQ", bg: C.navyLight, color: C.navy, icon: Building2 },
    branch: { label: "Branch", bg: C.greenLight, color: C.greenDark, icon: GitBranch },
    region: { label: "Region", bg: C.goldLight, color: C.goldDark, icon: Globe },
};

const FILTER_TABS: { value: TypeFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "hq", label: "HQ" },
    { value: "branch", label: "Branches" },
    { value: "region", label: "Regions" },
    { value: "personal", label: "Personal" },
];

export default function TeamsIndex({ teams, canManageTeams }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

    const filteredTeams = useMemo(() => {
        let list = teams;

        if (typeFilter !== "all") {
            list = list.filter((t) => {
                if (typeFilter === "personal") return t.isPersonal;
                return !t.isPersonal && t.type === typeFilter;
            });
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.type?.toLowerCase().includes(q) ||
                    t.roleLabel?.toLowerCase().includes(q) ||
                    t.regionName?.toLowerCase().includes(q) ||
                    t.regionCode?.toLowerCase().includes(q) ||
                    (t.isPersonal ? "personal" : "").includes(q),
            );
        }

        return list;
    }, [teams, searchQuery, typeFilter]);

    const counts = useMemo(() => ({
        total: teams.length,
        hq: teams.filter((t) => !t.isPersonal && t.type === "hq").length,
        branch: teams.filter((t) => !t.isPersonal && t.type === "branch").length,
        region: teams.filter((t) => !t.isPersonal && t.type === "region").length,
        personal: teams.filter((t) => t.isPersonal).length,
        org: teams.filter((t) => !t.isPersonal).length,
    }), [teams]);

    return (
        <>
            <Head title="Teams Management" />

            <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight" style={{ color: C.text }}>
                            Teams & Branches
                        </h2>
                        <p className="mt-0.5 text-xs font-medium" style={{ color: C.textSecondary }}>
                            Manage branches, HQ departments, and membership assignments.
                        </p>
                    </div>

                    {canManageTeams && (
                        <CreateTeamModal>
                            <Button
                                data-test="teams-new-team-button"
                                className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                                style={{ backgroundColor: C.navy }}
                            >
                                <Plus className="h-4 w-4" />
                                Add Branch or Department
                            </Button>
                        </CreateTeamModal>
                    )}
                </div>

                {/* Metric Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-4">
                    {[
                        { label: "Total Teams", value: counts.total, icon: Building2, bg: C.navyLight, color: C.navy },
                        { label: "Branch & HQ Units", value: counts.org, icon: Users, bg: C.greenLight, color: C.greenDark },
                        { label: "Regions", value: counts.region, icon: Globe, bg: C.goldLight, color: C.goldDark },
                        { label: "Personal Workspaces", value: counts.personal, icon: User, bg: C.orangeLight, color: C.orangeDark },
                    ].map(({ label, value, icon: Icon, bg, color }) => (
                        <div
                            key={label}
                            className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                            style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                        >
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: bg }}>
                                <Icon className="h-5 w-5" style={{ color }} />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>{label}</p>
                                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filter Tabs + Search */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Type Filter Tabs */}
                    <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                        {FILTER_TABS.map(({ value, label }) => {
                            const active = typeFilter === value;
                            return (
                                <button
                                    key={value}
                                    onClick={() => setTypeFilter(value)}
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                                    style={{
                                        backgroundColor: active ? C.navy : "transparent",
                                        color: active ? C.white : C.textSecondary,
                                    }}
                                >
                                    {label}
                                    {value !== "all" && (
                                        <span
                                            className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                            style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : C.border, color: active ? C.white : C.textSecondary }}
                                        >
                                            {value === "personal" ? counts.personal : value === "hq" ? counts.hq : value === "branch" ? counts.branch : counts.region}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3.5 top-3 h-4 w-4" style={{ color: C.textSecondary }} />
                        <Input
                            placeholder="Search teams by name, type, or region…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 w-full rounded-xl border pl-10 pr-10 text-xs transition-all"
                            style={{ borderColor: C.border, backgroundColor: C.white, color: C.text }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3.5 top-3 transition-colors"
                                style={{ color: C.textSecondary }}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Teams List Table */}
                <div className="overflow-hidden rounded-2xl shadow-sm" style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    {filteredTeams.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: C.bg }}>
                                <Building2 className="h-7 w-7" style={{ color: C.textSecondary }} />
                            </div>
                            <h3 className="mb-1 text-base font-bold" style={{ color: C.text }}>No teams found</h3>
                            <p className="text-xs" style={{ color: C.textSecondary }}>
                                {searchQuery || typeFilter !== "all"
                                    ? "No teams matched the current filters."
                                    : "No teams available yet."}
                            </p>
                            {(searchQuery || typeFilter !== "all") && (
                                <button
                                    onClick={() => { setSearchQuery(""); setTypeFilter("all"); }}
                                    className="mt-3 text-xs font-bold underline"
                                    style={{ color: C.navy }}
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Table Header */}
                            <div
                                className="hidden border-b px-6 py-3.5 sm:grid sm:grid-cols-[2.5fr_1.2fr_1.2fr_auto]"
                                style={{ backgroundColor: C.bg, borderColor: C.border }}
                            >
                                {["Team Name & Type", "Region", "Your Role", "Actions"].map((h, i) => (
                                    <span
                                        key={h}
                                        className={`text-xs font-semibold uppercase tracking-wider ${i === 3 ? "text-right" : ""}`}
                                        style={{ color: C.textSecondary }}
                                    >
                                        {h}
                                    </span>
                                ))}
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y" style={{ borderColor: C.border }}>
                                {filteredTeams.map((team) => {
                                    const isPersonal = team.isPersonal;
                                    const isOwner = team.role === "owner";
                                    const typeMeta = team.type ? TYPE_BADGE[team.type] : null;
                                    const TypeIcon = typeMeta?.icon ?? User;

                                    return (
                                        <div
                                            key={team.id}
                                            data-test="team-row"
                                            className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50/75 sm:grid sm:grid-cols-[2.5fr_1.2fr_1.2fr_auto] sm:items-center"
                                        >
                                            {/* Team Info */}
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div
                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                                    style={{ backgroundColor: isPersonal ? C.orange : (typeMeta?.bg ?? C.navyLight) }}
                                                >
                                                    <TypeIcon className="h-5 w-5" style={{ color: isPersonal ? C.orangeDark : (typeMeta?.color ?? C.navy) }} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="truncate font-bold text-sm" style={{ color: C.text }}>
                                                            {team.name}
                                                        </span>
                                                        {isPersonal ? (
                                                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-bold" style={{ backgroundColor: C.orangeLight, color: C.orangeDark }}>
                                                                Personal
                                                            </Badge>
                                                        ) : typeMeta ? (
                                                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-bold" style={{ backgroundColor: typeMeta.bg, color: typeMeta.color }}>
                                                                {typeMeta.label}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                    {team.isCurrent && (
                                                        <span className="text-[10px] font-semibold" style={{ color: C.green }}>
                                                            ● Current team
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Region */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {(team.regionName || team.regionCode) ? (
                                                    <>
                                                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: C.textSecondary }} />
                                                        <span className="truncate text-xs font-medium" style={{ color: C.textSecondary }}>
                                                            {team.regionName ?? team.regionCode}
                                                            {team.regionCode && team.regionName && ` (${team.regionCode})`}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs" style={{ color: C.border }}>—</span>
                                                )}
                                            </div>

                                            {/* Role */}
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"
                                                    style={{
                                                        backgroundColor: isOwner ? C.greenLight : C.navyLight,
                                                        color: isOwner ? C.greenDark : C.navy,
                                                    }}
                                                >
                                                    <Shield className="h-3 w-3" />
                                                    {team.roleLabel || team.role || "—"}
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="rounded-xl px-3 text-xs font-semibold transition-colors hover:bg-gray-100"
                                                    style={{ color: C.text }}
                                                >
                                                    <Link href={edit(team.slug)}>
                                                        <Pencil className="mr-1.5 h-3.5 w-3.5" style={{ color: C.goldDark }} />
                                                        Manage
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Table Footer */}
                            <div
                                className="flex items-center justify-between border-t px-6 py-3 text-xs font-medium"
                                style={{ backgroundColor: C.bg, borderColor: C.border, color: C.textSecondary }}
                            >
                                <span>
                                    Showing <strong style={{ color: C.text }}>{filteredTeams.length}</strong> of{" "}
                                    <strong style={{ color: C.text }}>{counts.total}</strong> total teams
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

TeamsIndex.layout = {
    breadcrumbs: [{ title: "Teams", href: index() }],
};
