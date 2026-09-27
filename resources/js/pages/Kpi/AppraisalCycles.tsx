import { Head, router, useForm, usePage } from "@inertiajs/react";
import { FormEventHandler, useState } from "react";
import {
    Calendar,
    Pencil,
    Play,
    Plus,
    Square,
    Trash2,
    X,
    ChevronRight,
    CheckCircle2,
} from "lucide-react";
import {
    store,
    update,
    destroy,
    open as openCycle,
    close as closeCycle,
    startEvaluation,
} from "@/routes/kpi/cycles";
import { confirmAction } from "@/lib/swal";

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
};

interface Cycle {
    id: number;
    name: string;
    period_start: string;
    period_end: string;
    submission_deadline: string;
    evaluation_deadline?: string | null;
    status: "draft" | "open" | "closed";
    phase?: "goal_setting" | "evaluation";
}

const STATUS_CONFIG: Record<
    Cycle["status"],
    { label: string; bg: string; text: string; dot: string }
> = {
    draft: { label: "Draft", bg: C.navyLight, text: C.navy, dot: C.navy },
    open: { label: "Open", bg: C.greenLight, text: C.greenDark, dot: C.green },
    closed: {
        label: "Closed",
        bg: "#F3F4F6",
        text: C.textSecondary,
        dot: C.textSecondary,
    },
};

function fmt(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function FieldInput({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    error,
    required,
}: {
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label
                className="mb-1.5 block text-sm font-semibold"
                style={{ color: C.textPrimary }}
            >
                {label}
                {required && <span style={{ color: C.danger }}> *</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2"
                style={{
                    borderColor: error ? C.danger : C.border,
                    boxShadow: "none",
                    color: C.textPrimary,
                    backgroundColor: C.white,
                }}
                onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.orange;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}66`;
                }}
                onBlur={(e) => {
                    e.currentTarget.style.borderColor = error
                        ? C.danger
                        : C.border;
                    e.currentTarget.style.boxShadow = "none";
                }}
            />
            {error && (
                <p className="mt-1 text-xs" style={{ color: C.danger }}>
                    {error}
                </p>
            )}
        </div>
    );
}

export default function AppraisalCycles({ cycles }: { cycles: Cycle[] }) {
    const { currentTeam } = usePage().props;
    const teamSlug = currentTeam?.slug ?? "";
    const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [pendingId, setPendingId] = useState<number | null>(null);

    const form = useForm({
        name: "",
        period_start: "",
        period_end: "",
        submission_deadline: "",
        evaluation_deadline: "",
    });

    const startCreate = () => {
        form.reset();
        form.clearErrors();
        setEditingCycle(null);
        setShowForm(true);
    };

    const startEdit = (cycle: Cycle) => {
        form.setData({
            name: cycle.name,
            period_start: cycle.period_start.slice(0, 10),
            period_end: cycle.period_end.slice(0, 10),
            submission_deadline: cycle.submission_deadline.slice(0, 10),
            evaluation_deadline: cycle.evaluation_deadline ? cycle.evaluation_deadline.slice(0, 10) : "",
        });
        form.clearErrors();
        setEditingCycle(cycle);
        setShowForm(true);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingCycle) {
            form.put(
                update.url({
                    current_team: teamSlug,
                    kpiCycle: editingCycle.id,
                }),
                {
                    preserveScroll: true,
                    onSuccess: () => setShowForm(false),
                },
            );
        } else {
            form.post(store.url(teamSlug), {
                preserveScroll: true,
                onSuccess: () => setShowForm(false),
            });
        }
    };

    const remove = async (cycle: Cycle) => {
        const confirmed = await confirmAction({
            title: `Delete "${cycle.name}"?`,
            text: "This action cannot be undone. All entries and data for this cycle will be removed.",
            confirmButtonText: "Yes, delete",
            icon: "warning",
            danger: true,
        });
        if (!confirmed) return;
        setPendingId(cycle.id);
        router.delete(
            destroy.url({ current_team: teamSlug, kpiCycle: cycle.id }),
            {
                preserveScroll: true,
                onFinish: () => setPendingId(null),
            },
        );
    };

    const transition = async (cycle: Cycle, action: "open" | "close") => {
        if (action === "close") {
            const confirmed = await confirmAction({
                title: "Close Appraisal Cycle?",
                text: `Close KPI appraisal cycle "${cycle.name}"? Staff will no longer be able to submit self-scores.`,
                confirmButtonText: "Yes, close cycle",
                icon: "warning",
                confirmButtonColor: C.warn,
            });
            if (!confirmed) return;
        } else {
            const confirmed = await confirmAction({
                title: "Open Appraisal Cycle?",
                text: `Open KPI appraisal cycle "${cycle.name}"? Any other open cycle will be closed.`,
                confirmButtonText: "Yes, open cycle",
                icon: "question",
                confirmButtonColor: C.green,
            });
            if (!confirmed) return;
        }
        setPendingId(cycle.id);
        const url =
            action === "open"
                ? openCycle.url({ current_team: teamSlug, kpiCycle: cycle.id })
                : closeCycle.url({
                      current_team: teamSlug,
                      kpiCycle: cycle.id,
                  });
        router.post(
            url,
            {},
            { preserveScroll: true, onFinish: () => setPendingId(null) },
        );
    };

    const startEvaluationAction = async (cycle: Cycle) => {
        const confirmed = await confirmAction({
            title: "Start Evaluation Phase?",
            text: `Start KPI evaluation phase for "${cycle.name}"? This will allow staff to begin scoring and submitting their self-evaluations.`,
            confirmButtonText: "Yes, start phase",
            icon: "question",
            confirmButtonColor: C.orange,
        });
        if (!confirmed) return;
        setPendingId(cycle.id);
        router.post(
            startEvaluation.url({ current_team: teamSlug, kpiCycle: cycle.id }),
            {},
            { preserveScroll: true, onFinish: () => setPendingId(null) },
        );
    };

    const openCount = cycles.filter((c) => c.status === "open").length;
    const draftCount = cycles.filter((c) => c.status === "draft").length;

    return (
        <>
            <Head title="Appraisal Cycles" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1
                                className="text-2xl font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                Appraisal Cycles
                            </h1>
                            <p
                                className="mt-0.5 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Define review periods and control when employees
                                can submit KPIs.
                            </p>
                        </div>
                        <button
                            onClick={startCreate}
                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                            style={{ backgroundColor: C.orange }}
                        >
                            <Plus className="h-4 w-4" />
                            New Cycle
                        </button>
                    </div>

                    {/* ── Summary pills ──────────────────────────────────── */}
                    {cycles.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-3">
                            {[
                                {
                                    label: `${cycles.length} total`,
                                    color: C.textSecondary,
                                    bg: C.bg,
                                },
                                {
                                    label: `${openCount} open`,
                                    color: C.greenDark,
                                    bg: C.greenLight,
                                },
                                {
                                    label: `${draftCount} draft`,
                                    color: C.navy,
                                    bg: C.navyLight,
                                },
                            ].map((p) => (
                                <span
                                    key={p.label}
                                    className="rounded-full px-3 py-1 text-xs font-semibold"
                                    style={{
                                        backgroundColor: p.bg,
                                        color: p.color,
                                        border: `1px solid ${p.color}22`,
                                    }}
                                >
                                    {p.label}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* ── Create/Edit Form ───────────────────────────────── */}
                    {showForm && (
                        <div
                            className="mb-6 overflow-hidden rounded-2xl shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.orange}`,
                            }}
                        >
                            {/* Form header */}
                            <div
                                className="flex items-center justify-between px-6 py-4"
                                style={{
                                    backgroundColor: C.orangeLight,
                                    borderBottom: `1px solid ${C.orangeDark}22`,
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-sm"
                                        style={{ backgroundColor: C.orange }}
                                    >
                                        {editingCycle ? (
                                            <Pencil className="h-3.5 w-3.5" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                    <h2
                                        className="text-sm font-bold"
                                        style={{ color: C.orangeDark }}
                                    >
                                        {editingCycle
                                            ? `Edit "${editingCycle.name}"`
                                            : "Create New Cycle"}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="rounded-lg p-1.5 transition-colors hover:bg-white/50"
                                    style={{ color: C.orangeDark }}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <form
                                onSubmit={submit}
                                className="grid gap-4 p-6 sm:grid-cols-2"
                            >
                                <div className="sm:col-span-2">
                                    <FieldInput
                                        label="Cycle Name"
                                        value={form.data.name}
                                        onChange={(v) =>
                                            form.setData("name", v)
                                        }
                                        placeholder="e.g. FY2026 H1"
                                        error={form.errors.name}
                                        required
                                    />
                                </div>
                                <FieldInput
                                    label="Period Start"
                                    type="date"
                                    value={form.data.period_start}
                                    onChange={(v) =>
                                        form.setData("period_start", v)
                                    }
                                    error={form.errors.period_start}
                                    required
                                />
                                <FieldInput
                                    label="Period End"
                                    type="date"
                                    value={form.data.period_end}
                                    onChange={(v) =>
                                        form.setData("period_end", v)
                                    }
                                    error={form.errors.period_end}
                                    required
                                />
                                <div className="sm:col-span-2">
                                    <FieldInput
                                        label="Submission Deadline"
                                        type="date"
                                        value={form.data.submission_deadline}
                                        onChange={(v) =>
                                            form.setData(
                                                "submission_deadline",
                                                v,
                                            )
                                        }
                                        error={form.errors.submission_deadline}
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <FieldInput
                                        label="Evaluation Deadline (Optional)"
                                        type="date"
                                        value={form.data.evaluation_deadline}
                                        onChange={(v) =>
                                            form.setData(
                                                "evaluation_deadline",
                                                v,
                                            )
                                        }
                                        error={form.errors.evaluation_deadline}
                                    />
                                </div>

                                <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-gray-50"
                                        style={{
                                            borderColor: C.border,
                                            color: C.textSecondary,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
                                        style={{ backgroundColor: C.orange }}
                                    >
                                        {form.processing
                                            ? "Saving…"
                                            : editingCycle
                                              ? "Save Changes"
                                              : "Create Cycle"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* ── Cycle List ─────────────────────────────────────── */}
                    <div
                        className="overflow-hidden rounded-2xl shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        {cycles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div
                                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                                    style={{ backgroundColor: C.bg }}
                                >
                                    <Calendar
                                        className="h-8 w-8"
                                        style={{ color: C.textSecondary }}
                                    />
                                </div>
                                <h3
                                    className="mb-1 text-lg font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    No cycles yet
                                </h3>
                                <p
                                    className="mb-6 text-sm"
                                    style={{ color: C.textSecondary }}
                                >
                                    Create your first appraisal cycle to get
                                    started.
                                </p>
                                <button
                                    onClick={startCreate}
                                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    <Plus className="h-4 w-4" /> Create Cycle
                                </button>
                            </div>
                        ) : (
                            <div>
                                {cycles.map((cycle, idx) => {
                                    const isPending = pendingId === cycle.id;
                                    const sc = STATUS_CONFIG[cycle.status];
                                    return (
                                        <div
                                            key={cycle.id}
                                            className="flex flex-col gap-3 px-6 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                                            style={{
                                                borderTop:
                                                    idx > 0
                                                        ? `1px solid ${C.border}`
                                                        : undefined,
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Status dot / icon */}
                                                <div
                                                    className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                                                    style={{
                                                        backgroundColor: sc.bg,
                                                    }}
                                                >
                                                    <span
                                                        className="h-2.5 w-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                sc.dot,
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p
                                                            className="text-sm font-bold"
                                                            style={{
                                                                color: C.textPrimary,
                                                            }}
                                                        >
                                                            {cycle.name}
                                                        </p>
                                                        <span
                                                            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                                            style={{
                                                                backgroundColor:
                                                                    sc.bg,
                                                                color: sc.text,
                                                            }}
                                                        >
                                                            {sc.label}
                                                        </span>
                                                        {cycle.status === "open" && (
                                                            <span
                                                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                                    cycle.phase === "evaluation"
                                                                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                                                                        : "bg-blue-100 text-blue-800 border border-blue-300"
                                                                }`}
                                                            >
                                                                {cycle.phase === "evaluation"
                                                                    ? "Evaluation Phase"
                                                                    : "Goal Setting Phase"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div
                                                        className="mt-1 flex flex-wrap items-center gap-3 text-xs"
                                                        style={{
                                                            color: C.textSecondary,
                                                        }}
                                                    >
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {fmt(
                                                                cycle.period_start,
                                                            )}{" "}
                                                            –{" "}
                                                            {fmt(
                                                                cycle.period_end,
                                                            )}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <ChevronRight className="h-3 w-3" />
                                                            Deadline:{" "}
                                                            {fmt(
                                                                cycle.submission_deadline,
                                                            )}
                                                        </span>
                                                        {cycle.evaluation_deadline && (
                                                            <span className="flex items-center gap-1 font-medium text-purple-700">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Eval Deadline:{" "}
                                                                {fmt(
                                                                    cycle.evaluation_deadline,
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:flex-shrink-0">
                                                {cycle.status === "draft" && (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                startEdit(cycle)
                                                            }
                                                            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50"
                                                            style={{
                                                                borderColor:
                                                                    C.border,
                                                                color: C.textPrimary,
                                                            }}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />{" "}
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                transition(
                                                                    cycle,
                                                                    "open",
                                                                )
                                                            }
                                                            disabled={isPending}
                                                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-sm disabled:opacity-50"
                                                            style={{
                                                                backgroundColor:
                                                                    C.green,
                                                            }}
                                                        >
                                                            <Play className="h-3.5 w-3.5" />
                                                            {isPending
                                                                ? "Opening…"
                                                                : "Open"}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                remove(cycle)
                                                            }
                                                            disabled={isPending}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50 disabled:opacity-50"
                                                            style={{
                                                                borderColor:
                                                                    C.danger,
                                                                color: C.danger,
                                                            }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />{" "}
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                                {cycle.status === "open" && (
                                                    <>
                                                        {cycle.phase !== "evaluation" && (
                                                            <button
                                                                onClick={() =>
                                                                    startEvaluationAction(cycle)
                                                                }
                                                                disabled={isPending}
                                                                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:shadow-sm disabled:opacity-50"
                                                                style={{
                                                                    backgroundColor:
                                                                        C.orange,
                                                                }}
                                                            >
                                                                <Play className="h-3.5 w-3.5" />
                                                                {isPending
                                                                    ? "Starting…"
                                                                    : "Start Evaluation"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() =>
                                                                transition(
                                                                    cycle,
                                                                    "close",
                                                                )
                                                            }
                                                            disabled={isPending}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
                                                            style={{
                                                                borderColor: C.navy,
                                                                color: C.navy,
                                                            }}
                                                        >
                                                            <Square className="h-3.5 w-3.5" />
                                                            {isPending
                                                                ? "Closing…"
                                                                : "Close Cycle"}
                                                        </button>
                                                    </>
                                                )}
                                                {cycle.status === "closed" && (
                                                    <span
                                                        className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                                                        style={{
                                                            backgroundColor:
                                                                C.bg,
                                                            color: C.textSecondary,
                                                        }}
                                                    >
                                                        Archived
                                                    </span>
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
        </>
    );
}
