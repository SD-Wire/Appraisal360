// resources/js/Pages/Kpi/Form.tsx
import { Head, useForm, Link, usePage } from "@inertiajs/react";
import { FormEventHandler, useState } from "react";
import {
    ArrowLeft,
    Save,
    FileText,
    Target,
    Scale,
    AlertCircle,
    X,
    HelpCircle,
    Lightbulb,
    RotateCcw,
    MessageSquare,
    History,
} from "lucide-react";
import { store, update, index } from "@/routes/kpi";

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
    description: string;
    target: string | null;
    weight: number;
    status?: string;
    logs?: LogEntry[];
}

// ── Shared field label ─────────────────────────────────────────────────────
function FieldLabel({
    children,
    required,
}: {
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <label
            className="mb-1.5 block text-sm font-semibold"
            style={{ color: C.textPrimary }}
        >
            {children}
            {required && <span style={{ color: C.danger }}> *</span>}
        </label>
    );
}

function FieldError({ msg }: { msg?: string }) {
    if (!msg) return null;
    return (
        <p
            className="mt-1.5 flex items-center gap-1 text-xs"
            style={{ color: C.danger }}
        >
            <AlertCircle className="h-3 w-3 flex-shrink-0" /> {msg}
        </p>
    );
}

function SectionCard({
    icon,
    title,
    badge,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="overflow-hidden rounded-2xl shadow-sm"
            style={{
                backgroundColor: C.white,
                border: `1px solid ${C.border}`,
            }}
        >
            <div
                className="flex items-center gap-3 px-6 py-4"
                style={{
                    backgroundColor: C.bg,
                    borderBottom: `1px solid ${C.border}`,
                }}
            >
                <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: C.navyLight }}
                >
                    {icon}
                </span>
                <h2
                    className="text-sm font-bold"
                    style={{ color: C.textPrimary }}
                >
                    {title}
                </h2>
                {badge && (
                    <span
                        className="ml-auto text-xs"
                        style={{ color: C.textSecondary }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

export default function Form({
    cycle,
    entry,
}: {
    cycle: { id: number; name: string };
    entry: KpiEntry | null;
}) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? "";
    const { data, setData, post, put, processing, errors } = useForm({
        kpi_cycle_id: cycle.id,
        title: entry?.title ?? "",
        description: entry?.description ?? "",
        target: entry?.target ?? "",
        weight: entry?.weight ?? 0,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (entry) {
            put(update.url({ current_team: teamSlug, kpiEntry: entry.id }));
        } else {
            post(store.url(teamSlug));
        }
    };

    const isEditing = !!entry;
    const pageTitle = isEditing ? "Edit KPI" : "Add New KPI";
    const [showHistory, setShowHistory] = useState(false);

    const isReturned = entry?.status === "supervisor_returned" || entry?.status === "hr_returned";
    const returnLogs = (entry?.logs ?? []).filter((l) => l.action === "returned");
    const latestReturnLog = returnLogs.length > 0 ? returnLogs[0] : null;

    const inputBase = (hasError: boolean) =>
        ({
            width: "100%",
            borderRadius: "0.75rem",
            border: `1px solid ${hasError ? C.danger : C.border}`,
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            color: C.textPrimary,
            backgroundColor: C.white,
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
        }) as React.CSSProperties;

    return (
        <>
            <Head title={pageTitle} />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg }}
            >
                {/* ── Top navigation bar ───────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{
                        backgroundColor: C.white,
                        borderBottom: `1px solid ${C.border}`,
                    }}
                >
                    <Link
                        href={currentTeam ? index.url(teamSlug) : "#"}
                        className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                        style={{ color: C.textSecondary }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color = C.orange)
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color = C.textSecondary)
                        }
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to My KPIs
                    </Link>
                    <div className="flex items-center gap-2">
                        <span
                            className="text-xs"
                            style={{ color: C.textSecondary }}
                        >
                            {cycle.name}
                        </span>
                        <span
                            className="h-4 w-px"
                            style={{ backgroundColor: C.border }}
                        />
                        <span
                            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                            style={{
                                backgroundColor: isEditing
                                    ? C.warnLight
                                    : C.greenLight,
                                color: isEditing ? C.warn : C.greenDark,
                            }}
                        >
                            {isEditing ? "Editing" : "New"}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-8xl">
                        {/* ── Page Header ───────────────────────────────── */}
                        <div className="mb-8">
                            <h1
                                className="text-3xl font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                {pageTitle}
                            </h1>
                            <p
                                className="mt-1.5 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Define measurable objectives aligned with your
                                role and team goals.
                            </p>
                        </div>

                        {/* ── Returned For Revision Feedback Alert ───────────────── */}
                        {isReturned && (
                            <div className="mb-6 overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50/95 p-5 shadow-sm">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                        <RotateCcw className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide">
                                                KPI Returned for Revision
                                            </h3>
                                            {latestReturnLog && (
                                                <span className="text-[11px] font-semibold text-red-700">
                                                    {new Date(latestReturnLog.created_at).toLocaleDateString("en-US", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-red-800 font-medium">
                                            {entry?.status === "supervisor_returned"
                                                ? "Your supervisor has returned this KPI with requested adjustments below."
                                                : "Your Regional HRBP has returned this KPI with requested adjustments below."}
                                        </p>

                                        {latestReturnLog?.comment ? (
                                            <div className="mt-3 rounded-xl border border-red-200 bg-white p-4 shadow-2xs">
                                                <div className="flex items-center gap-2 text-xs font-bold text-red-900 mb-1.5">
                                                    <MessageSquare className="h-4 w-4 text-red-600" />
                                                    <span>
                                                        Feedback from {latestReturnLog.actor?.name || "Reviewer"} (
                                                        {latestReturnLog.stage === "hr" ? "Regional HRBP" : "Supervisor"}
                                                        ):
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-800 italic whitespace-pre-wrap leading-relaxed bg-red-50/40 p-3 rounded-lg border border-red-100">
                                                    "{latestReturnLog.comment}"
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs italic text-red-600">
                                                No specific comment recorded. Please review with your supervisor.
                                            </p>
                                        )}

                                        {(entry?.logs ?? []).length > 1 && (
                                            <div className="mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowHistory(!showHistory)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 hover:text-red-950"
                                                >
                                                    <History className="h-3.5 w-3.5" />
                                                    <span>
                                                        {showHistory
                                                            ? "Hide Review History"
                                                            : "View Complete Review & Conversation History"}
                                                    </span>
                                                </button>

                                                {showHistory && (
                                                    <div className="mt-3 space-y-2 border-t border-red-200/80 pt-3">
                                                        {entry!.logs!.map((log, i) => (
                                                            <div
                                                                key={log.id || i}
                                                                className="rounded-lg bg-white/90 p-3 text-xs border border-red-100 shadow-2xs"
                                                            >
                                                                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                                                    <span className="font-bold text-gray-800">
                                                                        {log.actor?.name} — {log.action.toUpperCase()} ({log.stage})
                                                                    </span>
                                                                    <span>
                                                                        {new Date(log.created_at).toLocaleDateString("en-US", {
                                                                            day: "numeric",
                                                                            month: "short",
                                                                            hour: "2-digit",
                                                                            minute: "2-digit",
                                                                        })}
                                                                    </span>
                                                                </div>
                                                                {log.comment && (
                                                                    <div className="text-gray-700 italic bg-gray-50 p-2 rounded border border-gray-100 mt-1">
                                                                        "{log.comment}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-6">
                            {/* ── Title ───────────────────────────────────── */}
                            <SectionCard
                                icon={
                                    <FileText
                                        className="h-4 w-4"
                                        style={{ color: C.navy }}
                                    />
                                }
                                title="KPI Title"
                                badge="Required"
                            >
                                <FieldLabel required>Title</FieldLabel>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData("title", e.target.value)
                                        }
                                        style={inputBase(!!errors.title)}
                                        placeholder="e.g. Grow branch loan book by 15% in Q3 2026"
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor =
                                                C.orange;
                                            e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor =
                                                errors.title
                                                    ? C.danger
                                                    : C.border;
                                            e.currentTarget.style.boxShadow =
                                                "none";
                                        }}
                                        required
                                    />
                                    {data.title && (
                                        <span
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                                            style={{ color: C.green }}
                                        >
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <p
                                    className="mt-1.5 text-xs"
                                    style={{ color: C.textSecondary }}
                                >
                                    Clear, concise, and measurable KPI title
                                </p>
                                <FieldError msg={errors.title} />
                            </SectionCard>

                            {/* ── Description ─────────────────────────────── */}
                            <SectionCard
                                icon={
                                    <FileText
                                        className="h-4 w-4"
                                        style={{ color: C.navy }}
                                    />
                                }
                                title="Description"
                            >
                                <FieldLabel required>Description</FieldLabel>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData("description", e.target.value)
                                    }
                                    rows={4}
                                    style={inputBase(!!errors.description)}
                                    placeholder="Describe the KPI, how it will be measured, and what success looks like…"
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor =
                                            C.orange;
                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor =
                                            errors.description
                                                ? C.danger
                                                : C.border;
                                        e.currentTarget.style.boxShadow =
                                            "none";
                                    }}
                                    required
                                />
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span
                                        className="text-xs"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Provide context and measurement criteria
                                    </span>
                                    <span
                                        className="text-xs"
                                        style={{
                                            color:
                                                data.description.length > 450
                                                    ? C.warn
                                                    : C.textSecondary,
                                        }}
                                    >
                                        {data.description.length}/500
                                    </span>
                                </div>
                                <FieldError msg={errors.description} />
                            </SectionCard>

                            {/* ── Target & Weight ─────────────────────────── */}
                            <SectionCard
                                icon={
                                    <Target
                                        className="h-4 w-4"
                                        style={{ color: C.navy }}
                                    />
                                }
                                title="Target & Weight"
                                badge={`Weight: ${data.weight}%`}
                            >
                                <div className="grid gap-6 sm:grid-cols-2">
                                    {/* Target */}
                                    <div>
                                        <FieldLabel>Target Value</FieldLabel>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                                                <Target
                                                    className="h-4 w-4"
                                                    style={{
                                                        color: C.textSecondary,
                                                    }}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={data.target}
                                                onChange={(e) =>
                                                    setData(
                                                        "target",
                                                        e.target.value,
                                                    )
                                                }
                                                style={{
                                                    ...inputBase(false),
                                                    paddingLeft: "2.5rem",
                                                }}
                                                placeholder="e.g. KES 20,000,000"
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
                                        <p
                                            className="mt-1.5 text-xs"
                                            style={{ color: C.textSecondary }}
                                        >
                                            Specific measurable target
                                        </p>
                                    </div>

                                    {/* Weight */}
                                    <div>
                                        <FieldLabel required>
                                            Weight (%)
                                        </FieldLabel>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={data.weight}
                                                onChange={(e) =>
                                                    setData(
                                                        "weight",
                                                        Number(e.target.value),
                                                    )
                                                }
                                                style={inputBase(
                                                    !!errors.weight,
                                                )}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        C.orange;
                                                    e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                                }}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor =
                                                        errors.weight
                                                            ? C.danger
                                                            : C.border;
                                                    e.currentTarget.style.boxShadow =
                                                        "none";
                                                }}
                                                placeholder="0"
                                                required
                                            />
                                            <span
                                                className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm"
                                                style={{
                                                    color: C.textSecondary,
                                                }}
                                            >
                                                %
                                            </span>
                                        </div>
                                        {/* Weight mini-bar */}
                                        <div className="mt-2">
                                            <div
                                                className="h-2 w-full overflow-hidden rounded-full"
                                                style={{
                                                    backgroundColor: C.border,
                                                }}
                                            >
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.min(data.weight, 100)}%`,
                                                        backgroundColor:
                                                            data.weight >= 20
                                                                ? C.green
                                                                : C.warn,
                                                    }}
                                                />
                                            </div>
                                            <p
                                                className="mt-1 text-xs"
                                                style={{
                                                    color:
                                                        data.weight >= 20
                                                            ? C.green
                                                            : C.warn,
                                                }}
                                            >
                                                {data.weight >= 20
                                                    ? "Good weight"
                                                    : "Consider increasing weight"}
                                            </p>
                                        </div>
                                        <FieldError msg={errors.weight} />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ── Tips ────────────────────────────────────── */}
                            <div
                                className="rounded-2xl p-4"
                                style={{
                                    backgroundColor: C.warnLight,
                                    border: `1px solid ${C.warn}33`,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <span
                                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                                        style={{ backgroundColor: C.warn }}
                                    >
                                        <Lightbulb className="h-4 w-4 text-white" />
                                    </span>
                                    <div>
                                        <h4
                                            className="text-sm font-bold"
                                            style={{ color: C.textPrimary }}
                                        >
                                            Tips for Writing Great KPIs
                                        </h4>
                                        <ul
                                            className="mt-1.5 space-y-1 text-xs"
                                            style={{ color: C.textSecondary }}
                                        >
                                            <li>
                                                • Make it <strong>SMART</strong>
                                                : Specific, Measurable,
                                                Achievable, Relevant, Time-bound
                                            </li>
                                            <li>
                                                • Weight should reflect the
                                                KPI's importance (typically
                                                5–30%)
                                            </li>
                                            <li>
                                                • Total weights across all your
                                                KPIs must equal exactly{" "}
                                                <strong>100%</strong>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* ── Actions ─────────────────────────────────── */}
                            <div
                                className="overflow-hidden rounded-2xl shadow-sm"
                                style={{
                                    backgroundColor: C.white,
                                    border: `1px solid ${C.border}`,
                                }}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4 p-6">
                                    <div>
                                        <p
                                            className="text-sm font-bold"
                                            style={{ color: C.textPrimary }}
                                        >
                                            {isEditing
                                                ? "Update KPI"
                                                : "Create New KPI"}
                                        </p>
                                        <p
                                            className="text-xs"
                                            style={{ color: C.textSecondary }}
                                        >
                                            {isEditing
                                                ? "Review and save your updated KPI details"
                                                : "Add this KPI to your appraisal cycle"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Link
                                            href={
                                                currentTeam
                                                    ? index.url(teamSlug)
                                                    : "#"
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                                            style={{
                                                borderColor: C.border,
                                                color: C.textSecondary,
                                            }}
                                        >
                                            <X className="h-4 w-4" /> Cancel
                                        </Link>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                            style={{
                                                backgroundColor: C.orange,
                                            }}
                                        >
                                            <Save className="h-4 w-4" />
                                            {processing
                                                ? "Saving…"
                                                : isEditing
                                                  ? "Update KPI"
                                                  : "Create KPI"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
