// resources/js/pages/users/UserRoles.tsx
import { Head, router } from "@inertiajs/react";
import { index, updateRole, updateGlobalRole } from "@/routes/users";
import {
    ChevronDown,
    Users,
    Building2,
    Shield,
    RefreshCw,
    Search,
    UserCheck,
    Briefcase,
    Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

// ── Brand colours ──────────────────────────────────────────────────────────
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
};

interface Team {
    id: number;
    name: string;
    type: "hq" | "branch";
}

interface UserRow {
    id: number;
    name: string;
    email: string;
    department: string | null;
    team_role: string | null;
    global_role: string | null;
}

interface Props {
    teams: Team[];
    selectedTeamId: number | null;
    assignableRoles: string[];
    users: UserRow[];
    canManageGlobalRoles: boolean;
    assignableGlobalRoles: string[];
}

export default function UserRoles({
    teams,
    selectedTeamId,
    assignableRoles,
    users,
    canManageGlobalRoles,
    assignableGlobalRoles,
}: Props) {
    const [savingUserId, setSavingUserId] = useState<number | null>(null);
    const [savingGlobalUserId, setSavingGlobalUserId] = useState<number | null>(
        null,
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState("all");

    const changeTeam = (teamId: string) => {
        router.get(index.url(), teamId ? { team_id: teamId } : {}, {
            preserveState: true,
        });
    };

    const changeRole = (userId: number, role: string) => {
        setSavingUserId(userId);
        router.put(
            updateRole.url(userId),
            { role },
            {
                preserveScroll: true,
                onFinish: () => setSavingUserId(null),
            },
        );
    };

    const changeGlobalRole = (userId: number, role: string) => {
        setSavingGlobalUserId(userId);
        router.put(
            updateGlobalRole.url(userId),
            { role },
            {
                preserveScroll: true,
                onFinish: () => setSavingGlobalUserId(null),
            },
        );
    };

    const selectedTeam = teams.find((t) => t.id === selectedTeamId);
    const userCount = users.length;
    const assignedCount = users.filter((u) => u.team_role).length;
    const globalRoleCount = users.filter((u) => u.global_role).length;
    const uniqueRolesCount = new Set(
        users.map((u) => u.team_role).filter(Boolean),
    ).size;

    // Filter users
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch =
                user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.department &&
                    user.department
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()));

            const matchesRole =
                filterRole === "all"
                    ? true
                    : filterRole === "unassigned"
                      ? !user.team_role
                      : user.team_role === filterRole;

            return matchesSearch && matchesRole;
        });
    }, [users, searchQuery, filterRole]);

    const gridColsClass = canManageGlobalRoles
        ? "sm:grid-cols-[1.8fr_1.2fr_1.2fr_1.2fr]"
        : "sm:grid-cols-[2fr_1.5fr_1.5fr]";

    return (
        <>
            <Head title="User Roles & Assignments" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1
                                    className="text-2xl font-bold tracking-tight"
                                    style={{ color: C.textPrimary }}
                                >
                                    User Roles & Access
                                </h1>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.navyLight,
                                        color: C.navy,
                                    }}
                                >
                                    <Shield className="h-3.5 w-3.5" />
                                    Access Control
                                </span>
                            </div>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Manage operational team-scoped roles and
                                elevated global privileges across headquarters
                                and branches.
                            </p>
                        </div>
                    </div>

                    {/* ── Metric Cards ────────────────────────────────────── */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Current Team Card with dropdown */}
                        <div
                            className="flex flex-col justify-between rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className="text-xs font-semibold uppercase tracking-wider"
                                    style={{ color: C.textSecondary }}
                                >
                                    Active Team / Branch
                                </span>
                                <span
                                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: C.navyLight }}
                                >
                                    <Building2
                                        className="h-4 w-4"
                                        style={{ color: C.navy }}
                                    />
                                </span>
                            </div>
                            <div className="mt-2">
                                <SearchableSelect
                                    options={teams.map((team) => ({
                                        value: team.id,
                                        label: `${team.name} ${team.type === "hq" ? "🏢 (HQ)" : "🏪 (Branch)"}`,
                                    }))}
                                    value={selectedTeamId ?? ""}
                                    onChange={(val) => changeTeam(String(val))}
                                    placeholder="Select a team/branch..."
                                    searchPlaceholder="Search team or branch..."
                                />
                            </div>
                        </div>

                        {/* Total Members */}
                        <div
                            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <span
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: C.navyLight }}
                            >
                                <Users
                                    className="h-6 w-6"
                                    style={{ color: C.navy }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    {userCount}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Members in{" "}
                                    {selectedTeam?.type === "hq"
                                        ? "HQ"
                                        : "Branch"}
                                </p>
                            </div>
                        </div>

                        {/* Assigned Roles */}
                        <div
                            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <span
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: C.greenLight }}
                            >
                                <UserCheck
                                    className="h-6 w-6"
                                    style={{ color: C.greenDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.greenDark }}
                                >
                                    {assignedCount}{" "}
                                    <span className="text-sm font-normal text-gray-400">
                                        / {userCount}
                                    </span>
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Active Team Roles ({uniqueRolesCount}{" "}
                                    distinct)
                                </p>
                            </div>
                        </div>

                        {/* Global Privileges */}
                        <div
                            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <span
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: C.orangeLight }}
                            >
                                <Sparkles
                                    className="h-6 w-6"
                                    style={{ color: C.orangeDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.orangeDark }}
                                >
                                    {globalRoleCount}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Global Privileged Users
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Search & Filter Bar ──────────────────────────────── */}
                    <div
                        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
                            <div className="relative w-full max-w-md">
                                <Search
                                    className="pointer-events-none absolute left-3 top-2.5 h-4 w-4"
                                    style={{ color: C.textSecondary }}
                                />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    placeholder="Search by member name, email or department..."
                                    className="w-full rounded-xl border py-2 pl-9 pr-4 text-sm transition-all focus:outline-none"
                                    style={{
                                        borderColor: C.border,
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
                                            C.border;
                                        e.currentTarget.style.boxShadow =
                                            "none";
                                    }}
                                />
                            </div>
                        </div>

                        {/* Role filter chips / select */}
                        <div className="flex items-center gap-2">
                            <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: C.textSecondary }}
                            >
                                Filter Role:
                            </span>
                            <SearchableSelect
                                size="sm"
                                className="w-56"
                                options={[
                                    {
                                        value: "all",
                                        label: `All Roles (${users.length})`,
                                    },
                                    {
                                        value: "unassigned",
                                        label: `Unassigned (${users.filter((u) => !u.team_role).length})`,
                                    },
                                    ...assignableRoles.map((role) => ({
                                        value: role,
                                        label: `${role} (${users.filter((u) => u.team_role === role).length})`,
                                    })),
                                ]}
                                value={filterRole}
                                onChange={(val) => setFilterRole(String(val))}
                                placeholder="Filter by role..."
                                searchPlaceholder="Search roles..."
                            />
                        </div>
                    </div>

                    {/* ── Users Table ─────────────────────────────────────── */}
                    <div
                        className="overflow-hidden rounded-2xl shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        {filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div
                                    className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                                    style={{ backgroundColor: C.bg }}
                                >
                                    <Users
                                        className="h-7 w-7"
                                        style={{ color: C.textSecondary }}
                                    />
                                </div>
                                <h3
                                    className="mb-1 text-base font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    No members found
                                </h3>
                                <p
                                    className="text-xs"
                                    style={{ color: C.textSecondary }}
                                >
                                    {searchQuery || filterRole !== "all"
                                        ? "Try adjusting your search criteria or role filters."
                                        : "This team has no assigned members yet."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Table Header */}
                                <div
                                    className={`hidden border-b px-6 py-3.5 sm:grid ${gridColsClass}`}
                                    style={{
                                        backgroundColor: C.bg,
                                        borderColor: C.border,
                                    }}
                                >
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: C.textSecondary }}
                                    >
                                        User Details
                                    </span>
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Department & Context
                                    </span>
                                    <span
                                        className="text-xs font-semibold uppercase tracking-wider"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Operational Role ({selectedTeam?.name})
                                    </span>
                                    {canManageGlobalRoles && (
                                        <span
                                            className="text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: C.textSecondary }}
                                        >
                                            Global Authority
                                        </span>
                                    )}
                                </div>

                                {/* Table Body */}
                                <div
                                    className="divide-y"
                                    style={{ borderColor: C.border }}
                                >
                                    {filteredUsers.map((user) => {
                                        const isSaving =
                                            savingUserId === user.id;
                                        const isGlobalSaving =
                                            savingGlobalUserId === user.id;

                                        return (
                                            <div
                                                key={user.id}
                                                className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50/75 sm:grid sm:items-center sm:gap-4 sm:px-6 ${gridColsClass}`}
                                            >
                                                {/* User Info */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                                                        style={{
                                                            backgroundColor:
                                                                C.navy,
                                                        }}
                                                    >
                                                        {user.name
                                                            ?.charAt(0)
                                                            .toUpperCase() ||
                                                            "U"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="truncate text-sm font-bold"
                                                            style={{
                                                                color: C.textPrimary,
                                                            }}
                                                        >
                                                            {user.name}
                                                        </p>
                                                        <p
                                                            className="truncate text-xs"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Department & Badges */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {user.department ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                                                            style={{
                                                                backgroundColor:
                                                                    C.bg,
                                                                color: C.textPrimary,
                                                                border: `1px solid ${C.border}`,
                                                            }}
                                                        >
                                                            <Briefcase
                                                                className="h-3 w-3"
                                                                style={{
                                                                    color: C.textSecondary,
                                                                }}
                                                            />
                                                            {user.department}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="text-xs italic"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            No department
                                                        </span>
                                                    )}

                                                    {user.global_role && (
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                                                            style={{
                                                                backgroundColor:
                                                                    C.orangeLight,
                                                                color: C.orangeDark,
                                                            }}
                                                        >
                                                            <Shield className="h-3 w-3" />
                                                            {user.global_role}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Team Role Dropdown */}
                                                <div>
                                                    <SearchableSelect
                                                        size="sm"
                                                        disabled={isSaving}
                                                        options={assignableRoles.map((role) => ({
                                                            value: role,
                                                            label: role,
                                                        }))}
                                                        value={user.team_role ?? ""}
                                                        onChange={(val) =>
                                                            changeRole(user.id, String(val))
                                                        }
                                                        placeholder="Select Role..."
                                                        searchPlaceholder="Search role..."
                                                    />
                                                </div>

                                                {/* Global Role Dropdown */}
                                                {canManageGlobalRoles && (
                                                    <div>
                                                        <SearchableSelect
                                                            size="sm"
                                                            disabled={isGlobalSaving}
                                                            options={[
                                                                { value: "none", label: "No Global Role" },
                                                                ...assignableGlobalRoles.map((role) => ({
                                                                    value: role,
                                                                    label: `★ ${role}`,
                                                                })),
                                                            ]}
                                                            value={user.global_role ?? "none"}
                                                            onChange={(val) =>
                                                                changeGlobalRole(user.id, String(val))
                                                            }
                                                            placeholder="No Global Role"
                                                            searchPlaceholder="Search global role..."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Table Footer */}
                                <div
                                    className="flex flex-wrap items-center justify-between border-t px-6 py-3.5 text-xs font-medium"
                                    style={{
                                        backgroundColor: C.bg,
                                        borderColor: C.border,
                                        color: C.textSecondary,
                                    }}
                                >
                                    <span>
                                        Showing{" "}
                                        <strong
                                            style={{ color: C.textPrimary }}
                                        >
                                            {filteredUsers.length}
                                        </strong>{" "}
                                        of{" "}
                                        <strong
                                            style={{ color: C.textPrimary }}
                                        >
                                            {userCount}
                                        </strong>{" "}
                                        members in {selectedTeam?.name}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: C.green }}
                                        />
                                        Instant auto-save on role selection
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
