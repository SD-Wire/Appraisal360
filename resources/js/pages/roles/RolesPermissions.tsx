// resources/js/pages/roles/RolesPermissions.tsx
import { Head, router } from "@inertiajs/react";
import { useEffect, useState, useMemo } from "react";
import { update as updateRolePermissions } from "@/routes/roles";
import {
    Shield,
    Globe,
    Building2,
    Save,
    RefreshCw,
    Check,
    Lock,
    Search,
    SlidersHorizontal,
    CheckCircle2,
} from "lucide-react";

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

interface RoleData {
    id: number;
    name: string;
    scope: "global" | "team";
    permissions: string[];
}

interface Props {
    allPermissions: string[];
    globalRoles: RoleData[];
    teamScopedRoles: RoleData[];
}

function RoleCard({
    role,
    allPermissions,
    permissionSearch,
}: {
    role: RoleData;
    allPermissions: string[];
    permissionSearch: string;
}) {
    const [selected, setSelected] = useState<string[]>(role.permissions);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSelected(role.permissions);
    }, [role.permissions]);

    const isSuperAdmin = role.name === "Super Admin";

    const dirty =
        !isSuperAdmin &&
        JSON.stringify([...selected].sort()) !==
            JSON.stringify([...role.permissions].sort());

    const toggle = (permission: string) => {
        if (isSuperAdmin) return;
        setSelected((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission],
        );
    };

    const selectAll = () => {
        if (isSuperAdmin) return;
        setSelected(allPermissions);
    };

    const deselectAll = () => {
        if (isSuperAdmin) return;
        setSelected([]);
    };

    const save = () => {
        if (isSuperAdmin) return;
        setSaving(true);
        router.put(
            updateRolePermissions.url(role.id),
            { permissions: selected },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const isGlobal = role.scope === "global";

    // Filter permissions for quick lookup
    const displayedPermissions = useMemo(() => {
        if (!permissionSearch) return allPermissions;
        return allPermissions.filter((p) =>
            p.toLowerCase().includes(permissionSearch.toLowerCase()),
        );
    }, [allPermissions, permissionSearch]);

    return (
        <div
            className="overflow-hidden rounded-2xl shadow-sm transition-all"
            style={{
                backgroundColor: C.white,
                border: dirty
                    ? `1.5px solid ${C.orange}`
                    : `1px solid ${C.border}`,
            }}
        >
            {/* Card Header */}
            <div
                className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4"
                style={{
                    backgroundColor: isGlobal ? C.navyLight : C.bg,
                    borderColor: C.border,
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                        style={{
                            backgroundColor: isGlobal ? C.navy : C.orange,
                        }}
                    >
                        {isGlobal ? (
                            <Globe className="h-5 w-5" />
                        ) : (
                            <Building2 className="h-5 w-5" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3
                                className="text-base font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                {role.name}
                            </h3>
                            {isSuperAdmin && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    style={{
                                        backgroundColor: C.greenLight,
                                        color: C.greenDark,
                                    }}
                                >
                                    <Lock className="h-3 w-3" /> Full System
                                    Access
                                </span>
                            )}
                        </div>
                        <p
                            className="text-xs font-medium"
                            style={{ color: C.textSecondary }}
                        >
                            {isGlobal
                                ? "Global authority across all branches & headquarters"
                                : "Standard role applicable to branch and HQ personnel"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isSuperAdmin && (
                        <>
                            <button
                                type="button"
                                onClick={selectAll}
                                className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-gray-100"
                                style={{ color: C.textSecondary }}
                            >
                                Grant All
                            </button>
                            <span className="text-xs text-gray-300">|</span>
                            <button
                                type="button"
                                onClick={deselectAll}
                                className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-gray-100"
                                style={{ color: C.textSecondary }}
                            >
                                Clear All
                            </button>
                        </>
                    )}

                    {dirty && (
                        <button
                            onClick={save}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                            style={{ backgroundColor: C.orange }}
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Permissions Grid */}
            <div className="p-6">
                {isSuperAdmin ? (
                    <div
                        className="flex items-center gap-3 rounded-xl p-4"
                        style={{
                            backgroundColor: C.greenLight,
                            border: `1px solid ${C.green}33`,
                        }}
                    >
                        <CheckCircle2
                            className="h-5 w-5 flex-shrink-0"
                            style={{ color: C.greenDark }}
                        />
                        <p
                            className="text-xs font-medium"
                            style={{ color: C.greenDark }}
                        >
                            Super Admin accounts automatically possess all
                            current and future permissions across the entire
                            platform via global gate bypass.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {displayedPermissions.map((permission) => {
                                const isChecked = selected.includes(permission);
                                return (
                                    <label
                                        key={permission}
                                        onClick={() => toggle(permission)}
                                        className="group flex cursor-pointer select-none items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all"
                                        style={{
                                            backgroundColor: isChecked
                                                ? C.greenLight
                                                : C.white,
                                            borderColor: isChecked
                                                ? C.green
                                                : C.border,
                                            color: isChecked
                                                ? C.greenDark
                                                : C.textPrimary,
                                        }}
                                    >
                                        <div
                                            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-md border transition-all"
                                            style={{
                                                borderColor: isChecked
                                                    ? C.green
                                                    : C.border,
                                                backgroundColor: isChecked
                                                    ? C.green
                                                    : C.white,
                                            }}
                                        >
                                            {isChecked && (
                                                <Check className="h-3 w-3 text-white stroke-[3]" />
                                            )}
                                        </div>
                                        <span className="truncate font-semibold tracking-tight">
                                            {permission}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        {displayedPermissions.length === 0 && (
                            <p
                                className="py-6 text-center text-xs"
                                style={{ color: C.textSecondary }}
                            >
                                No permissions matched your search query.
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Card Status Strip */}
            {!isSuperAdmin && (
                <div
                    className="flex items-center justify-between border-t px-6 py-2.5 text-xs font-medium"
                    style={{
                        backgroundColor: C.bg,
                        borderColor: C.border,
                        color: C.textSecondary,
                    }}
                >
                    <span>
                        <strong style={{ color: C.textPrimary }}>
                            {selected.length}
                        </strong>{" "}
                        of {allPermissions.length} permissions active
                    </span>
                    {dirty && (
                        <span
                            className="flex items-center gap-1.5 font-bold"
                            style={{ color: C.orange }}
                        >
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: C.orange }}
                            />
                            Unsaved changes pending
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default function RolesPermissions({
    allPermissions,
    globalRoles,
    teamScopedRoles,
}: Props) {
    const [permissionSearch, setPermissionSearch] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "global" | "team">(
        "all",
    );

    const totalRoles = globalRoles.length + teamScopedRoles.length;

    return (
        <>
            <Head title="Roles & Permission Matrix" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Page Header ───────────────────────────────────── */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1
                                    className="text-2xl font-bold tracking-tight"
                                    style={{ color: C.textPrimary }}
                                >
                                    Roles & Permission Matrix
                                </h1>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.orangeLight,
                                        color: C.orangeDark,
                                    }}
                                >
                                    <SlidersHorizontal className="h-3.5 w-3.5" />
                                    RBAC Architecture
                                </span>
                            </div>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Standardize access control policies.
                                Modifications apply uniformly across every
                                department and branch.
                            </p>
                        </div>
                    </div>

                    {/* ── Metric Summary Tiles ───────────────────────────── */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                                <Shield
                                    className="h-6 w-6"
                                    style={{ color: C.navy }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    {totalRoles}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Configured Roles
                                </p>
                            </div>
                        </div>

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
                                <Globe
                                    className="h-6 w-6"
                                    style={{ color: C.navy }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.navy }}
                                >
                                    {globalRoles.length}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Global Roles (Super / HRBP)
                                </p>
                            </div>
                        </div>

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
                                <Building2
                                    className="h-6 w-6"
                                    style={{ color: C.orangeDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.orangeDark }}
                                >
                                    {teamScopedRoles.length}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Branch & HQ Standard Roles
                                </p>
                            </div>
                        </div>

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
                                <CheckCircle2
                                    className="h-6 w-6"
                                    style={{ color: C.greenDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.greenDark }}
                                >
                                    {allPermissions.length}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    System Permissions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Filter / Search Bar ────────────────────────────── */}
                    <div
                        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-3 shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        {/* Scope selector tabs */}
                        <div
                            className="flex items-center gap-1 rounded-xl p-1"
                            style={{ backgroundColor: C.bg }}
                        >
                            {[
                                {
                                    id: "all",
                                    label: `All Roles (${totalRoles})`,
                                },
                                {
                                    id: "global",
                                    label: `Global (${globalRoles.length})`,
                                },
                                {
                                    id: "team",
                                    label: `Branch / HQ (${teamScopedRoles.length})`,
                                },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className="rounded-lg px-3 py-1.5 text-xs font-bold transition-all"
                                    style={{
                                        backgroundColor:
                                            activeTab === tab.id
                                                ? C.white
                                                : "transparent",
                                        color:
                                            activeTab === tab.id
                                                ? C.textPrimary
                                                : C.textSecondary,
                                        boxShadow:
                                            activeTab === tab.id
                                                ? "0 1px 3px rgba(0,0,0,0.05)"
                                                : "none",
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search input for permissions */}
                        <div className="relative w-full sm:w-72">
                            <Search
                                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4"
                                style={{ color: C.textSecondary }}
                            />
                            <input
                                type="text"
                                value={permissionSearch}
                                onChange={(e) =>
                                    setPermissionSearch(e.target.value)
                                }
                                placeholder="Filter permissions in cards..."
                                className="w-full rounded-xl border py-1.5 pl-9 pr-3 text-xs transition-all focus:outline-none"
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
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            />
                        </div>
                    </div>

                    {/* ── Global Roles Section ────────────────────────────── */}
                    {(activeTab === "all" || activeTab === "global") && (
                        <section className="mb-8">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe
                                        className="h-4 w-4"
                                        style={{ color: C.navy }}
                                    />
                                    <h2
                                        className="text-sm font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Global System Roles
                                    </h2>
                                </div>
                                <span
                                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.navyLight,
                                        color: C.navy,
                                    }}
                                >
                                    {globalRoles.length} roles
                                </span>
                            </div>

                            <div className="space-y-4">
                                {globalRoles.map((role) => (
                                    <RoleCard
                                        key={role.id}
                                        role={role}
                                        allPermissions={allPermissions}
                                        permissionSearch={permissionSearch}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Organization-wide Roles Section ────────────────── */}
                    {(activeTab === "all" || activeTab === "team") && (
                        <section>
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2
                                        className="h-4 w-4"
                                        style={{ color: C.orange }}
                                    />
                                    <h2
                                        className="text-sm font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Branch & HQ Standard Roles
                                    </h2>
                                </div>
                                <span
                                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.orangeLight,
                                        color: C.orangeDark,
                                    }}
                                >
                                    {teamScopedRoles.length} roles
                                </span>
                            </div>

                            <div className="space-y-4">
                                {teamScopedRoles.map((role) => (
                                    <RoleCard
                                        key={role.id}
                                        role={role}
                                        allPermissions={allPermissions}
                                        permissionSearch={permissionSearch}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
}
