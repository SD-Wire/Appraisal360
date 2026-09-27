// resources/js/pages/core-values/Index.tsx
import { Head, useForm, router } from "@inertiajs/react";
import { useState, useMemo, FormEventHandler } from "react";
import {
    store as storeCoreValue,
    update as updateCoreValue,
    destroy as destroyCoreValue,
} from "@/routes/core-values";
import {
    store as storeQuestionRoute,
    update as updateQuestionRoute,
    destroy as destroyQuestionRoute,
} from "@/routes/core-values/questions";
import { confirmAction } from "@/lib/swal";
import { Spinner } from "@/components/ui/spinner";
import {
    Award,
    Compass,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Scale,
    SlidersHorizontal,
    Star,
    Sparkles,
    X,
    Info,
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

interface Question {
    id: number;
    core_value_id: number;
    question: string;
    description: string | null;
    weight: number;
    min_score: number;
    max_score: number;
    order: number;
    is_active: boolean;
}

interface CoreValueItem {
    id: number;
    name: string;
    description: string | null;
    weight: number;
    order: number;
    is_active: boolean;
    questions: Question[];
}

interface Props {
    coreValues: CoreValueItem[];
}

export default function CoreValuesIndex({ coreValues }: Props) {
    const [expandedValues, setExpandedValues] = useState<
        Record<number, boolean>
    >(() => {
        // Expand all by default
        const initial: Record<number, boolean> = {};
        coreValues.forEach((cv) => {
            initial[cv.id] = true;
        });
        return initial;
    });

    // Modals & form state
    const [showValueModal, setShowValueModal] = useState(false);
    const [editingValue, setEditingValue] = useState<CoreValueItem | null>(
        null,
    );

    const [questionModalValueId, setQuestionModalValueId] = useState<
        number | null
    >(null);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(
        null,
    );

    // Value form
    const valueForm = useForm({
        name: "",
        description: "",
        weight: 20,
        order: 0,
        is_active: true,
    });

    // Question form
    const questionForm = useForm({
        question: "",
        description: "",
        weight: 50,
        min_score: 1,
        max_score: 5,
        order: 0,
        is_active: true,
    });

    const isValueFormValid = Boolean(
        valueForm.data.name?.trim() && Number(valueForm.data.weight) > 0
    );

    const isQuestionFormValid = Boolean(
        questionForm.data.question?.trim() &&
        Number(questionForm.data.weight) > 0 &&
        Number(questionForm.data.max_score) > 0
    );

    const toggleExpand = (id: number) => {
        setExpandedValues((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // Calculate metrics
    const totalCoreValueWeight = useMemo(() => {
        return coreValues.reduce(
            (sum, cv) => sum + (cv.is_active ? cv.weight : 0),
            0,
        );
    }, [coreValues]);

    const totalQuestions = useMemo(() => {
        return coreValues.reduce((sum, cv) => sum + cv.questions.length, 0);
    }, [coreValues]);

    const weightIs100 = totalCoreValueWeight === 100;

    // Actions for Core Value
    const openCreateValueModal = () => {
        valueForm.setData({
            name: "",
            description: "",
            weight: 20,
            order: coreValues.length + 1,
            is_active: true,
        });
        valueForm.clearErrors();
        setEditingValue(null);
        setShowValueModal(true);
    };

    const openEditValueModal = (cv: CoreValueItem) => {
        valueForm.setData({
            name: cv.name,
            description: cv.description || "",
            weight: cv.weight,
            order: cv.order,
            is_active: cv.is_active,
        });
        valueForm.clearErrors();
        setEditingValue(cv);
        setShowValueModal(true);
    };

    const submitValueForm: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingValue) {
            valueForm.put(updateCoreValue.url(editingValue.id), {
                preserveScroll: true,
                onSuccess: () => setShowValueModal(false),
            });
        } else {
            valueForm.post(storeCoreValue.url(), {
                preserveScroll: true,
                onSuccess: () => setShowValueModal(false),
            });
        }
    };

    const deleteValue = async (cv: CoreValueItem) => {
        const confirmed = await confirmAction({
            title: `Delete "${cv.name}"?`,
            text: `Are you sure you want to delete "${cv.name}" and all its evaluation questions? This cannot be undone.`,
            confirmButtonText: "Yes, delete",
            icon: "warning",
            danger: true,
        });
        if (!confirmed) {
            return;
        }
        router.delete(destroyCoreValue.url(cv.id), {
            preserveScroll: true,
        });
    };

    // Actions for Question
    const openCreateQuestionModal = (coreValueId: number) => {
        const cv = coreValues.find((c) => c.id === coreValueId);
        const existingCount = cv ? cv.questions.length : 0;
        questionForm.setData({
            question: "",
            description: "",
            weight:
                existingCount > 0 ? Math.floor(100 / (existingCount + 1)) : 100,
            min_score: 1,
            max_score: 5,
            order: existingCount + 1,
            is_active: true,
        });
        questionForm.clearErrors();
        setEditingQuestion(null);
        setQuestionModalValueId(coreValueId);
    };

    const openEditQuestionModal = (q: Question) => {
        questionForm.setData({
            question: q.question,
            description: q.description || "",
            weight: q.weight,
            min_score: q.min_score,
            max_score: q.max_score,
            order: q.order,
            is_active: q.is_active,
        });
        questionForm.clearErrors();
        setEditingQuestion(q);
        setQuestionModalValueId(q.core_value_id);
    };

    const submitQuestionForm: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingQuestion) {
            questionForm.put(updateQuestionRoute.url(editingQuestion.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setQuestionModalValueId(null);
                    setEditingQuestion(null);
                },
            });
        } else if (questionModalValueId) {
            questionForm.post(storeQuestionRoute.url(questionModalValueId), {
                preserveScroll: true,
                onSuccess: () => {
                    setQuestionModalValueId(null);
                    setEditingQuestion(null);
                },
            });
        }
    };

    const deleteQuestion = async (q: Question) => {
        const confirmed = await confirmAction({
            title: "Delete Question?",
            text: "Are you sure you want to delete this evaluation question? This cannot be undone.",
            confirmButtonText: "Yes, delete",
            icon: "warning",
            danger: true,
        });
        if (!confirmed) {
            return;
        }
        router.delete(destroyQuestionRoute.url(q.id), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="360° Appraisal: Core Values & Questions" />

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
                                    360° Appraisal: Core Values & Rubrics
                                </h1>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.orangeLight,
                                        color: C.orangeDark,
                                    }}
                                >
                                    <Compass className="h-3.5 w-3.5" />
                                    Competency Model
                                </span>
                            </div>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Register institutional core values and
                                behavioral evaluation questions (graded 1 to 5)
                                to score cultural alignment alongside KPIs.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateValueModal}
                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md"
                            style={{ backgroundColor: C.orange }}
                        >
                            <Plus className="h-4 w-4" />
                            Add Core Value
                        </button>
                    </div>

                    {/* ── Metric Summary Tiles ───────────────────────────── */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* Core Values Count */}
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
                                <Award
                                    className="h-6 w-6"
                                    style={{ color: C.navy }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    {coreValues.length}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Company Core Values
                                </p>
                            </div>
                        </div>

                        {/* Questions Count */}
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
                                    {totalQuestions}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Evaluation Questions
                                </p>
                            </div>
                        </div>

                        {/* Rating Scale Indicator */}
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
                                <Star
                                    className="h-6 w-6"
                                    style={{ color: C.greenDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.greenDark }}
                                >
                                    1 – 5
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Rating Scale (Min to Max)
                                </p>
                            </div>
                        </div>

                        {/* Total Allocation Weight */}
                        <div
                            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <span
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{
                                    backgroundColor: weightIs100
                                        ? C.greenLight
                                        : C.warnLight,
                                }}
                            >
                                <Scale
                                    className="h-6 w-6"
                                    style={{
                                        color: weightIs100
                                            ? C.greenDark
                                            : C.warn,
                                    }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{
                                        color: weightIs100
                                            ? C.greenDark
                                            : C.warn,
                                    }}
                                >
                                    {totalCoreValueWeight}%
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    {weightIs100
                                        ? "100% Fully Distributed"
                                        : "Target: 100% total"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Weight Distribution Alert (if not 100%) ─────────── */}
                    {!weightIs100 && (
                        <div
                            className="mb-6 flex items-center justify-between gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.warnLight,
                                border: `1px solid ${C.warn}44`,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <AlertCircle
                                    className="h-5 w-5 flex-shrink-0"
                                    style={{ color: C.warn }}
                                />
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textPrimary }}
                                >
                                    Active core value weights currently total{" "}
                                    <strong>{totalCoreValueWeight}%</strong>.
                                    For balanced 360° appraisal calculations,
                                    adjust values so they sum up to{" "}
                                    <strong>100%</strong>.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Core Values List ───────────────────────────────── */}
                    {coreValues.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center rounded-2xl py-20 text-center shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <div
                                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: C.bg }}
                            >
                                <Award
                                    className="h-7 w-7"
                                    style={{ color: C.textSecondary }}
                                />
                            </div>
                            <h3
                                className="mb-1 text-base font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                No core values defined yet
                            </h3>
                            <p
                                className="mb-6 max-w-sm text-xs"
                                style={{ color: C.textSecondary }}
                            >
                                Get started by registering your company core
                                values (e.g. Integrity, Passion, Customer
                                Delight, Innovation, Professionalism).
                            </p>
                            <button
                                type="button"
                                onClick={openCreateValueModal}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all hover:shadow-md"
                                style={{ backgroundColor: C.orange }}
                            >
                                <Plus className="h-4 w-4" /> Add First Core
                                Value
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {coreValues.map((cv) => {
                                const isExpanded = !!expandedValues[cv.id];
                                const questionTotalWeight = cv.questions.reduce(
                                    (sum, q) => sum + q.weight,
                                    0,
                                );

                                return (
                                    <div
                                        key={cv.id}
                                        className="overflow-hidden rounded-2xl shadow-sm transition-all"
                                        style={{
                                            backgroundColor: C.white,
                                            border: `1px solid ${C.border}`,
                                        }}
                                    >
                                        {/* Core Value Header Banner */}
                                        <div
                                            className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4"
                                            style={{
                                                backgroundColor: C.bg,
                                                borderColor: C.border,
                                            }}
                                        >
                                            <div
                                                className="flex flex-1 cursor-pointer items-center gap-3.5 min-w-[260px]"
                                                onClick={() =>
                                                    toggleExpand(cv.id)
                                                }
                                            >
                                                <div
                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                                    style={{
                                                        backgroundColor: C.navy,
                                                    }}
                                                >
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h2
                                                            className="text-base font-bold"
                                                            style={{
                                                                color: C.textPrimary,
                                                            }}
                                                        >
                                                            {cv.name}
                                                        </h2>
                                                        <span
                                                            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                                                            style={{
                                                                backgroundColor:
                                                                    C.orangeLight,
                                                                color: C.orangeDark,
                                                            }}
                                                        >
                                                            {cv.weight}% of 360°
                                                            Score
                                                        </span>
                                                        {!cv.is_active && (
                                                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                    {cv.description && (
                                                        <p
                                                            className="mt-1 text-xs"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            {cv.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action tools */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openCreateQuestionModal(
                                                            cv.id,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:bg-white"
                                                    style={{
                                                        borderColor: C.green,
                                                        color: C.greenDark,
                                                        backgroundColor:
                                                            C.greenLight,
                                                    }}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Question
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openEditValueModal(cv)
                                                    }
                                                    className="rounded-xl border p-2 transition-colors hover:bg-gray-100"
                                                    style={{
                                                        borderColor: C.border,
                                                        color: C.textSecondary,
                                                    }}
                                                    title="Edit Core Value"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        deleteValue(cv)
                                                    }
                                                    className="rounded-xl border p-2 transition-colors hover:bg-red-50"
                                                    style={{
                                                        borderColor: C.border,
                                                        color: C.danger,
                                                    }}
                                                    title="Delete Core Value"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleExpand(cv.id)
                                                    }
                                                    className="rounded-xl border p-2 transition-colors hover:bg-gray-100"
                                                    style={{
                                                        borderColor: C.border,
                                                        color: C.textSecondary,
                                                    }}
                                                    title={
                                                        isExpanded
                                                            ? "Collapse"
                                                            : "Expand"
                                                    }
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded Questions Section */}
                                        {isExpanded && (
                                            <div className="p-6">
                                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <h3
                                                            className="text-xs font-bold uppercase tracking-wider"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            Evaluation Rubrics /
                                                            Behavioral Questions
                                                        </h3>
                                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                                            {
                                                                cv.questions
                                                                    .length
                                                            }{" "}
                                                            question
                                                            {cv.questions
                                                                .length !== 1
                                                                ? "s"
                                                                : ""}
                                                        </span>
                                                    </div>

                                                    <span
                                                        className="text-xs font-semibold"
                                                        style={{
                                                            color: C.textSecondary,
                                                        }}
                                                    >
                                                        Relative Question Weight
                                                        Sum:{" "}
                                                        <strong
                                                            style={{
                                                                color:
                                                                    questionTotalWeight ===
                                                                    100
                                                                        ? C.greenDark
                                                                        : C.warn,
                                                            }}
                                                        >
                                                            {
                                                                questionTotalWeight
                                                            }
                                                            %
                                                        </strong>
                                                    </span>
                                                </div>

                                                {cv.questions.length === 0 ? (
                                                    <div
                                                        className="rounded-xl border border-dashed p-6 text-center"
                                                        style={{
                                                            borderColor:
                                                                C.border,
                                                            backgroundColor:
                                                                C.bg,
                                                        }}
                                                    >
                                                        <p
                                                            className="text-xs"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            No evaluation
                                                            questions added to
                                                            this core value yet.
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openCreateQuestionModal(
                                                                    cv.id,
                                                                )
                                                            }
                                                            className="mt-2 text-xs font-bold underline"
                                                            style={{
                                                                color: C.orange,
                                                            }}
                                                        >
                                                            Add the first
                                                            question
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {cv.questions.map(
                                                            (q, idx) => (
                                                                <div
                                                                    key={q.id}
                                                                    className="flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 sm:flex-row sm:items-center"
                                                                    style={{
                                                                        backgroundColor:
                                                                            C.white,
                                                                        borderColor:
                                                                            C.border,
                                                                    }}
                                                                >
                                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                                        <span
                                                                            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    C.navyLight,
                                                                                color: C.navy,
                                                                            }}
                                                                        >
                                                                            {idx +
                                                                                1}
                                                                        </span>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p
                                                                                className="text-sm font-semibold"
                                                                                style={{
                                                                                    color: C.textPrimary,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    q.question
                                                                                }
                                                                            </p>
                                                                            {q.description && (
                                                                                <p
                                                                                    className="mt-1 text-xs leading-relaxed"
                                                                                    style={{
                                                                                        color: C.textSecondary,
                                                                                    }}
                                                                                >
                                                                                    {
                                                                                        q.description
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Score Scale & Actions */}
                                                                    <div className="flex items-center gap-3 sm:flex-shrink-0">
                                                                        {/* Weighted Score */}
                                                                        <div className="text-right">
                                                                            <span
                                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        C.bg,
                                                                                    color: C.navy,
                                                                                    border: `1px solid ${C.border}`,
                                                                                }}
                                                                            >
                                                                                {
                                                                                    q.weight
                                                                                }
                                                                                %
                                                                                weight
                                                                            </span>
                                                                        </div>

                                                                        {/* 1 - 5 Scoring Scale Pill */}
                                                                        <span
                                                                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    C.greenLight,
                                                                                color: C.greenDark,
                                                                            }}
                                                                        >
                                                                            <Star className="h-3 w-3 fill-current" />
                                                                            {
                                                                                q.min_score
                                                                            }{" "}
                                                                            –{" "}
                                                                            {
                                                                                q.max_score
                                                                            }{" "}
                                                                            pts
                                                                        </span>

                                                                        {/* Edit / Delete */}
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openEditQuestionModal(
                                                                                        q,
                                                                                    )
                                                                                }
                                                                                className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                                                                                style={{
                                                                                    color: C.textSecondary,
                                                                                }}
                                                                                title="Edit Question"
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    deleteQuestion(
                                                                                        q,
                                                                                    )
                                                                                }
                                                                                className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                                                                                style={{
                                                                                    color: C.danger,
                                                                                }}
                                                                                title="Delete Question"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal: Create / Edit Core Value ──────────────────────── */}
            {showValueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div
                        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl transition-all"
                        style={{ backgroundColor: C.white }}
                    >
                        <div
                            className="flex items-center justify-between border-b px-6 py-4"
                            style={{
                                backgroundColor: C.bg,
                                borderColor: C.border,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Award
                                    className="h-5 w-5"
                                    style={{ color: C.orange }}
                                />
                                <h3
                                    className="text-base font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    {editingValue
                                        ? `Edit Core Value: ${editingValue.name}`
                                        : "Add Company Core Value"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowValueModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={submitValueForm}
                            className="space-y-4 p-6"
                        >
                            <div>
                                <label
                                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                    style={{ color: C.textPrimary }}
                                >
                                    Core Value Name{" "}
                                    <span style={{ color: C.danger }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={valueForm.data.name}
                                    onChange={(e) =>
                                        valueForm.setData(
                                            "name",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. Integrity, Passion, Customer Delight..."
                                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                    style={{
                                        borderColor: valueForm.errors.name
                                            ? C.danger
                                            : C.border,
                                        backgroundColor: C.white,
                                        color: C.textPrimary,
                                    }}
                                />
                                {valueForm.errors.name && (
                                    <p
                                        className="mt-1 text-xs"
                                        style={{ color: C.danger }}
                                    >
                                        {valueForm.errors.name}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                    style={{ color: C.textPrimary }}
                                >
                                    Description & Definition
                                </label>
                                <textarea
                                    rows={3}
                                    value={valueForm.data.description}
                                    onChange={(e) =>
                                        valueForm.setData(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Explain the behavioral philosophy and expectation for this core value..."
                                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                    style={{
                                        borderColor: valueForm.errors
                                            .description
                                            ? C.danger
                                            : C.border,
                                        backgroundColor: C.white,
                                        color: C.textPrimary,
                                    }}
                                />
                                {valueForm.errors.description && (
                                    <p
                                        className="mt-1 text-xs"
                                        style={{ color: C.danger }}
                                    >
                                        {valueForm.errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Weight (%){" "}
                                        <span style={{ color: C.danger }}>
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        max={100}
                                        value={valueForm.data.weight}
                                        onChange={(e) =>
                                            valueForm.setData(
                                                "weight",
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                        style={{
                                            borderColor: valueForm.errors.weight
                                                ? C.danger
                                                : C.border,
                                            backgroundColor: C.white,
                                            color: C.textPrimary,
                                        }}
                                    />
                                    <p
                                        className="mt-1 text-[11px]"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Share of overall 360° score (e.g. 20%)
                                    </p>
                                </div>

                                <div>
                                    <label
                                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Display Order
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={valueForm.data.order}
                                        onChange={(e) =>
                                            valueForm.setData(
                                                "order",
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: C.white,
                                            color: C.textPrimary,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="cv_is_active"
                                    checked={valueForm.data.is_active}
                                    onChange={(e) =>
                                        valueForm.setData(
                                            "is_active",
                                            e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <label
                                    htmlFor="cv_is_active"
                                    className="text-xs font-semibold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Active for current 360° appraisals
                                </label>
                            </div>

                            <div
                                className="flex items-center justify-end gap-3 border-t pt-4"
                                style={{ borderColor: C.border }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setShowValueModal(false)}
                                    className="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50"
                                    style={{
                                        borderColor: C.border,
                                        color: C.textSecondary,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={valueForm.processing || !isValueFormValid}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    {valueForm.processing && <Spinner className="h-3.5 w-3.5 animate-spin text-white" />}
                                    {valueForm.processing
                                        ? "Saving…"
                                        : editingValue
                                          ? "Update Value"
                                          : "Create Value"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Modal: Create / Edit Evaluation Question ─────────────── */}
            {questionModalValueId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div
                        className="w-full max-w-xl overflow-hidden rounded-2xl shadow-xl transition-all"
                        style={{ backgroundColor: C.white }}
                    >
                        <div
                            className="flex items-center justify-between border-b px-6 py-4"
                            style={{
                                backgroundColor: C.bg,
                                borderColor: C.border,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles
                                    className="h-5 w-5"
                                    style={{ color: C.orange }}
                                />
                                <h3
                                    className="text-base font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    {editingQuestion
                                        ? "Edit Evaluation Question"
                                        : "Add Evaluation Question"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setQuestionModalValueId(null);
                                    setEditingQuestion(null);
                                }}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-200"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form
                            onSubmit={submitQuestionForm}
                            className="space-y-4 p-6"
                        >
                            <div>
                                <label
                                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                    style={{ color: C.textPrimary }}
                                >
                                    Question / Behavioral Prompt{" "}
                                    <span style={{ color: C.danger }}>*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    required
                                    value={questionForm.data.question}
                                    onChange={(e) =>
                                        questionForm.setData(
                                            "question",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. Demonstrates honesty, ethical behavior, and moral courage in all professional dealings."
                                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                    style={{
                                        borderColor: questionForm.errors
                                            .question
                                            ? C.danger
                                            : C.border,
                                        backgroundColor: C.white,
                                        color: C.textPrimary,
                                    }}
                                />
                                {questionForm.errors.question && (
                                    <p
                                        className="mt-1 text-xs"
                                        style={{ color: C.danger }}
                                    >
                                        {questionForm.errors.question}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                    style={{ color: C.textPrimary }}
                                >
                                    Evaluation Guideline / Rubric Anchors
                                </label>
                                <textarea
                                    rows={3}
                                    value={questionForm.data.description}
                                    onChange={(e) =>
                                        questionForm.setData(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Explain what 1 (Unsatisfactory) through 5 (Exemplary) looks like in practice for evaluators..."
                                    className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                    style={{
                                        borderColor: questionForm.errors
                                            .description
                                            ? C.danger
                                            : C.border,
                                        backgroundColor: C.white,
                                        color: C.textPrimary,
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label
                                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Weight (%){" "}
                                        <span style={{ color: C.danger }}>
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={100}
                                        value={questionForm.data.weight}
                                        onChange={(e) =>
                                            questionForm.setData(
                                                "weight",
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: C.white,
                                            color: C.textPrimary,
                                        }}
                                    />
                                    <p
                                        className="mt-1 text-[11px]"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Relative weight
                                    </p>
                                </div>

                                <div>
                                    <label
                                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Min Score{" "}
                                        <span style={{ color: C.danger }}>
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={5}
                                        value={questionForm.data.min_score}
                                        onChange={(e) =>
                                            questionForm.setData(
                                                "min_score",
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: C.white,
                                            color: C.textPrimary,
                                        }}
                                    />
                                    <p
                                        className="mt-1 text-[11px]"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Floor score (1)
                                    </p>
                                </div>

                                <div>
                                    <label
                                        className="mb-1.5 block text-xs font-bold uppercase tracking-wider"
                                        style={{ color: C.textPrimary }}
                                    >
                                        Max Score{" "}
                                        <span style={{ color: C.danger }}>
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        max={5}
                                        value={questionForm.data.max_score}
                                        onChange={(e) =>
                                            questionForm.setData(
                                                "max_score",
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: C.white,
                                            color: C.textPrimary,
                                        }}
                                    />
                                    <p
                                        className="mt-1 text-[11px]"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Ceiling score (5)
                                    </p>
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-end gap-3 border-t pt-4"
                                style={{ borderColor: C.border }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuestionModalValueId(null);
                                        setEditingQuestion(null);
                                    }}
                                    className="rounded-xl border px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50"
                                    style={{
                                        borderColor: C.border,
                                        color: C.textSecondary,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={questionForm.processing || !isQuestionFormValid}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    {questionForm.processing && <Spinner className="h-3.5 w-3.5 animate-spin text-white" />}
                                    {questionForm.processing
                                        ? "Saving…"
                                        : editingQuestion
                                          ? "Update Question"
                                          : "Add Question"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
