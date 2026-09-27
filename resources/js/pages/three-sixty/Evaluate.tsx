// resources/js/pages/three-sixty/Evaluate.tsx
import { Head, router, Link, usePage } from "@inertiajs/react";
import { FormEventHandler, useMemo, useState } from "react";
import {
    submit as submitEvaluationRoute,
    draft as saveDraftRoute,
    index as myEvaluationsRoute,
} from "@/routes/three-sixty/evaluations";
import {
    Award,
    CheckCircle2,
    Lock,
    Save,
    Star,
    Sparkles,
    UserCheck,
    Building2,
    ArrowLeft,
    Info,
    AlertCircle,
    Check,
} from "lucide-react";

import Swal from "sweetalert2";

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
}

interface CoreValue {
    id: number;
    name: string;
    description: string | null;
    weight: number;
    order: number;
    questions: Question[];
}

interface EvaluationRating {
    id: number;
    core_value_id: number;
    core_value_question_id: number;
    score: number | null;
    comment: string | null;
}

interface Evaluation {
    id: number;
    three_sixty_cycle_id: number;
    evaluator_id: number;
    evaluatee_id: number;
    relationship_type: string;
    status: "pending" | "in_progress" | "completed";
    score: number | null;
    feedback_summary: string | null;
    submitted_at: string | null;
    cycle?: { id: number; name: string; evaluation_deadline: string };
    evaluatee: {
        id: number;
        name: string;
        email: string;
        job_title: string | null;
        department?: { name: string; code: string } | null;
        current_team?: { name: string; type: string } | null;
    };
}

interface Props {
    evaluation: Evaluation;
    coreValues: CoreValue[];
    existingRatings: Record<number, EvaluationRating>;
}

export default function ThreeSixtyEvaluate({
    evaluation,
    coreValues,
    existingRatings,
}: Props) {
    const { props } = usePage<{ currentTeam?: { slug: string } }>();
    const teamSlug = props.currentTeam?.slug ?? "";
    const isCompleted = evaluation.status === "completed";

    // Initialize ratings state from existing or default to 0
    const initialRatings = useMemo(() => {
        const map: Record<
            number,
            { score: number; comment: string; core_value_id: number }
        > = {};
        coreValues.forEach((cv) => {
            cv.questions.forEach((q) => {
                const existing = existingRatings[q.id];
                map[q.id] = {
                    score: existing ? (existing.score ?? 0) : 0,
                    comment: existing?.comment || "",
                    core_value_id: cv.id,
                };
            });
        });
        return map;
    }, [coreValues, existingRatings]);

    const [ratings, setRatings] = useState(initialRatings);
    const [feedbackSummary, setFeedbackSummary] = useState(
        evaluation.feedback_summary || "",
    );
    const [coreValueComments, setCoreValueComments] = useState<
        Record<number, string>
    >((evaluation as any).core_value_comments || {});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    const totalQuestions = useMemo(() => {
        return coreValues.reduce((sum, cv) => sum + cv.questions.length, 0);
    }, [coreValues]);

    const answeredQuestions = useMemo(() => {
        return Object.values(ratings).filter(
            (r) => r.score >= 1 && r.score <= 5,
        ).length;
    }, [ratings]);

    const averageScore = useMemo(() => {
        const scores = Object.values(ratings)
            .map((r) => r.score)
            .filter((s) => s > 0);
        if (scores.length === 0) return 0;
        return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    }, [ratings]);

    // Qualitative rating comment computed on live average
    const liveRatingComment = useMemo(() => {
        const avg = parseFloat(averageScore as string);
        if (isNaN(avg) || avg === 0) return "Not Yet Rated";
        if (avg < 2.5) return "Far Below Average";
        if (avg <= 3.7) return "Average";
        return "Far Above Average";
    }, [averageScore]);

    const handleScoreSelect = (
        questionId: number,
        coreValueId: number,
        score: number,
    ) => {
        if (isCompleted) return;
        setRatings((prev) => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                score,
                core_value_id: coreValueId,
            },
        }));
    };

    const handleCommentChange = (questionId: number, comment: string) => {
        if (isCompleted) return;
        setRatings((prev) => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                comment,
            },
        }));
    };

    const handleSaveAndReturnLater = () => {
        if (isCompleted || isSavingDraft || isSubmitting) return;

        const ratingsArray = Object.entries(ratings)
            .map(([qId, r]) => ({
                question_id: Number(qId),
                core_value_id: r.core_value_id,
                score: r.score >= 1 && r.score <= 5 ? r.score : null,
                comment: r.comment || null,
            }))
            .filter(
                (r) =>
                    r.score !== null || (r.comment && r.comment.trim() !== ""),
            );

        setIsSavingDraft(true);

        router.post(
            saveDraftRoute.url({
                current_team: teamSlug,
                evaluation: evaluation.id,
            }),
            {
                ratings: ratingsArray,
                feedback_summary: feedbackSummary,
                core_value_comments:
                    evaluation.relationship_type === "supervisor_to_subordinate"
                        ? coreValueComments
                        : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSavingDraft(false),
            },
        );
    };

    const submitEvaluation: FormEventHandler = async (e) => {
        e.preventDefault();
        if (isCompleted) return;

        if (answeredQuestions < totalQuestions) {
            await Swal.fire({
                icon: "warning",
                title: "Incomplete Evaluation",
                text: `Please provide a rating (1 to 5) for all ${totalQuestions} evaluation questions before submitting.`,
                confirmButtonColor: C.orange,
            });
            return;
        }

        const result = await Swal.fire({
            icon: "question",
            title: "Finalize & Lock Appraisal?",
            text: `Are you sure you want to finalize this 360° appraisal for ${evaluation.evaluatee.name}? Once submitted, this evaluation will be locked and cannot be edited.`,
            showCancelButton: true,
            confirmButtonText: "Yes, finalize & lock",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.orange,
            cancelButtonColor: "#6B7280",
        });

        if (!result.isConfirmed) {
            return;
        }

        const ratingsArray = Object.entries(ratings).map(([qId, r]) => ({
            question_id: Number(qId),
            core_value_id: r.core_value_id,
            score: r.score,
            comment: r.comment,
        }));

        setIsSubmitting(true);

        router.post(
            submitEvaluationRoute.url({
                current_team: teamSlug,
                evaluation: evaluation.id,
            }),
            {
                ratings: ratingsArray,
                feedback_summary: feedbackSummary,
                core_value_comments:
                    evaluation.relationship_type === "supervisor_to_subordinate"
                        ? coreValueComments
                        : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    return (
        <>
            <Head title={`360° Appraisal: ${evaluation.evaluatee.name}`} />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Top navigation back ────────────────────────────── */}
                    <div className="mb-4 flex items-center justify-between">
                        <Link
                            href={`${myEvaluationsRoute.url(teamSlug)}?cycle_id=${evaluation.three_sixty_cycle_id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                            style={{ color: C.navy }}
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to My 360° Appraisals
                        </Link>
                        {!isCompleted && (
                            <button
                                type="button"
                                disabled={isSubmitting || isSavingDraft}
                                onClick={handleSaveAndReturnLater}
                                className="inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all hover:bg-gray-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    borderColor: C.border,
                                    color: C.textPrimary,
                                    backgroundColor: C.white,
                                }}
                            >
                                <Save
                                    className="h-3.5 w-3.5"
                                    style={{ color: C.orange }}
                                />
                                {isSavingDraft
                                    ? "Saving Progress…"
                                    : "Save & Return Later"}
                            </button>
                        )}
                    </div>

                    {/* ── Header Card ───────────────────────────────────── */}
                    <div
                        className="mb-6 rounded-2xl border p-6 shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            borderColor: C.border,
                        }}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                                        style={{
                                            backgroundColor: C.orangeLight,
                                            color: C.orangeDark,
                                        }}
                                    >
                                        <Award className="h-3.5 w-3.5" />
                                        360° Peer & Leadership Appraisal
                                    </span>
                                    {isCompleted ? (
                                        <span
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                                            style={{
                                                backgroundColor: C.greenLight,
                                                color: C.greenDark,
                                            }}
                                        >
                                            <Lock className="h-3 w-3" />
                                            Locked / Completed
                                        </span>
                                    ) : (
                                        <span
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                                            style={{
                                                backgroundColor: C.warnLight,
                                                color: C.warn,
                                            }}
                                        >
                                            In Progress
                                        </span>
                                    )}
                                </div>

                                <h1
                                    className="mt-2 text-2xl font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Appraise: {evaluation.evaluatee.name}
                                </h1>

                                <div
                                    className="mt-2 flex flex-wrap items-center gap-3 text-xs"
                                    style={{ color: C.textSecondary }}
                                >
                                    {evaluation.evaluatee.job_title && (
                                        <span
                                            className="font-semibold"
                                            style={{ color: C.textPrimary }}
                                        >
                                            {evaluation.evaluatee.job_title}
                                        </span>
                                    )}
                                    {evaluation.evaluatee.department && (
                                        <span>
                                            Dept:{" "}
                                            {
                                                evaluation.evaluatee.department
                                                    .name
                                            }
                                        </span>
                                    )}
                                    {evaluation.evaluatee.current_team && (
                                        <span>
                                            Branch/Team:{" "}
                                            {
                                                evaluation.evaluatee
                                                    .current_team.name
                                            }
                                        </span>
                                    )}
                                    <span
                                        className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                                        style={{
                                            backgroundColor: C.navyLight,
                                            color: C.navy,
                                        }}
                                    >
                                        {evaluation.relationship_type.replace(
                                            /_/g,
                                            " ",
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Progress & Live Rating Card */}
                            <div
                                className="flex flex-col items-end rounded-xl border p-3.5 text-right"
                                style={{
                                    borderColor: C.border,
                                    backgroundColor: C.bg,
                                }}
                            >
                                <span
                                    className="text-[11px] font-semibold"
                                    style={{ color: C.textSecondary }}
                                >
                                    Rating Progress
                                </span>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span
                                        className="text-xl font-bold"
                                        style={{ color: C.orange }}
                                    >
                                        {answeredQuestions} / {totalQuestions}
                                    </span>
                                    <span
                                        className="text-xs"
                                        style={{ color: C.textSecondary }}
                                    >
                                        Questions
                                    </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <span
                                        className="text-xs font-bold"
                                        style={{ color: C.navy }}
                                    >
                                        Score: {averageScore} / 5.0
                                    </span>
                                    <span
                                        className="rounded-full px-2 py-0.2 text-[10px] font-bold uppercase tracking-wider"
                                        style={{
                                            backgroundColor:
                                                liveRatingComment ===
                                                "Far Above Average"
                                                    ? C.greenLight
                                                    : liveRatingComment ===
                                                        "Average"
                                                      ? C.warnLight
                                                      : liveRatingComment ===
                                                          "Far Below Average"
                                                        ? C.dangerLight
                                                        : C.border,
                                            color:
                                                liveRatingComment ===
                                                "Far Above Average"
                                                    ? C.greenDark
                                                    : liveRatingComment ===
                                                        "Average"
                                                      ? C.warn
                                                      : liveRatingComment ===
                                                          "Far Below Average"
                                                        ? C.danger
                                                        : C.textSecondary,
                                        }}
                                    >
                                        {liveRatingComment}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div
                            className="mt-4 flex items-start gap-2.5 rounded-xl p-3 text-xs"
                            style={{
                                backgroundColor: C.navyLight,
                                color: C.navy,
                            }}
                        >
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong>Scoring Rubric (1 to 5):</strong> 1 =
                                Far Below Expectations, 2 = Below Expectations,
                                3 = Meets Expectations (Average), 4 = Exceeds
                                Expectations, 5 = Far Above Average (Role
                                Model). Please provide candid, constructive
                                feedback.
                            </div>
                        </div>
                    </div>

                    {/* ── Form: Core Values and Rubric Questions ─────────── */}
                    <form
                        onSubmit={submitEvaluation}
                        className="flex flex-col gap-6"
                    >
                        {coreValues.map((cv) => {
                            return (
                                <div
                                    key={cv.id}
                                    className="overflow-hidden rounded-2xl border shadow-sm"
                                    style={{
                                        backgroundColor: C.white,
                                        borderColor: C.border,
                                    }}
                                >
                                    {/* Core value header */}
                                    <div
                                        className="flex items-center justify-between border-b px-6 py-4"
                                        style={{
                                            borderColor: C.border,
                                            backgroundColor: "#FAFAFA",
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                                                style={{
                                                    backgroundColor: C.navy,
                                                }}
                                            >
                                                {cv.order}
                                            </span>
                                            <div>
                                                <h3
                                                    className="text-base font-bold"
                                                    style={{
                                                        color: C.textPrimary,
                                                    }}
                                                >
                                                    {cv.name}
                                                </h3>
                                                {cv.description && (
                                                    <p
                                                        className="text-xs"
                                                        style={{
                                                            color: C.textSecondary,
                                                        }}
                                                    >
                                                        {cv.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span
                                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                            style={{
                                                backgroundColor: C.orangeLight,
                                                color: C.orangeDark,
                                            }}
                                        >
                                            Weight: {cv.weight}%
                                        </span>
                                    </div>

                                    {/* Questions */}
                                    <div
                                        className="divide-y p-6"
                                        style={{ borderColor: C.border }}
                                    >
                                        {cv.questions.map((q, idx) => {
                                            const currentRating =
                                                ratings[q.id]?.score || 0;
                                            const currentComment =
                                                ratings[q.id]?.comment || "";

                                            return (
                                                <div
                                                    key={q.id}
                                                    className={`flex flex-col gap-3.5 py-5 first:pt-0 last:pb-0`}
                                                >
                                                    <div>
                                                        <div className="flex items-baseline gap-2">
                                                            <span
                                                                className="text-xs font-bold"
                                                                style={{
                                                                    color: C.orange,
                                                                }}
                                                            >
                                                                Q{idx + 1}.
                                                            </span>
                                                            <p
                                                                className="text-sm font-semibold"
                                                                style={{
                                                                    color: C.textPrimary,
                                                                }}
                                                            >
                                                                {q.question}
                                                            </p>
                                                        </div>
                                                        {q.description && (
                                                            <p
                                                                className="ml-5 mt-1 text-xs"
                                                                style={{
                                                                    color: C.textSecondary,
                                                                }}
                                                            >
                                                                {q.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Score 1 to 5 Pill Buttons */}
                                                    <div className="ml-5 flex flex-wrap items-center gap-2">
                                                        <span
                                                            className="text-xs font-semibold"
                                                            style={{
                                                                color: C.textSecondary,
                                                            }}
                                                        >
                                                            Score:
                                                        </span>
                                                        {[1, 2, 3, 4, 5].map(
                                                            (num) => {
                                                                const isSelected =
                                                                    currentRating ===
                                                                    num;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            num
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            isCompleted
                                                                        }
                                                                        onClick={() =>
                                                                            handleScoreSelect(
                                                                                q.id,
                                                                                cv.id,
                                                                                num,
                                                                            )
                                                                        }
                                                                        className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                                                                            isCompleted
                                                                                ? "cursor-default"
                                                                                : "cursor-pointer hover:shadow-sm"
                                                                        }`}
                                                                        style={{
                                                                            backgroundColor:
                                                                                isSelected
                                                                                    ? num <=
                                                                                      2
                                                                                        ? C.danger
                                                                                        : num ===
                                                                                            3
                                                                                          ? C.warn
                                                                                          : C.green
                                                                                    : C.bg,
                                                                            color: isSelected
                                                                                ? C.white
                                                                                : C.textPrimary,
                                                                            border: `1px solid ${isSelected ? "transparent" : C.border}`,
                                                                        }}
                                                                    >
                                                                        <span>
                                                                            {
                                                                                num
                                                                            }
                                                                        </span>
                                                                        <span className="text-[10px] font-normal opacity-80">
                                                                            {num ===
                                                                                1 &&
                                                                                "— Poor"}
                                                                            {num ===
                                                                                2 &&
                                                                                "— Fair"}
                                                                            {num ===
                                                                                3 &&
                                                                                "— Average"}
                                                                            {num ===
                                                                                4 &&
                                                                                "— Good"}
                                                                            {num ===
                                                                                5 &&
                                                                                "— Excellent"}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>

                                                    {/* Optional Question Comment */}
                                                    <div className="ml-5">
                                                        <input
                                                            type="text"
                                                            disabled={
                                                                isCompleted
                                                            }
                                                            value={
                                                                currentComment
                                                            }
                                                            onChange={(e) =>
                                                                handleCommentChange(
                                                                    q.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Specific example or justification comment (optional)..."
                                                            className="w-full rounded-xl border px-3 py-1.5 text-xs focus:outline-none"
                                                            style={{
                                                                borderColor:
                                                                    C.border,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Supervisor comment per Core Value */}
                                    {evaluation.relationship_type ===
                                        "supervisor_to_subordinate" && (
                                        <div
                                            className="border-t px-6 py-4"
                                            style={{
                                                borderColor: C.border,
                                                backgroundColor: "#FFFBF5",
                                            }}
                                        >
                                            <label
                                                className="mb-1.5 block text-xs font-semibold"
                                                style={{ color: C.orangeDark }}
                                            >
                                                🎯 Supervisor's Overall Comment
                                                on{" "}
                                                <span className="font-bold">
                                                    {cv.name}
                                                </span>
                                            </label>
                                            <textarea
                                                disabled={isCompleted}
                                                value={
                                                    coreValueComments[cv.id] ||
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    setCoreValueComments(
                                                        (prev) => ({
                                                            ...prev,
                                                            [cv.id]:
                                                                e.target.value,
                                                        }),
                                                    )
                                                }
                                                rows={3}
                                                placeholder="Provide your overall supervisory feedback for this core value (strengths, development areas, specific examples)..."
                                                className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-1 resize-none"
                                                style={{
                                                    borderColor: C.border,
                                                    color: C.textPrimary,
                                                    opacity: isCompleted
                                                        ? 0.7
                                                        : 1,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Overall Feedback Summary */}
                        <div
                            className="rounded-2xl border p-6 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                borderColor: C.border,
                            }}
                        >
                            <h3
                                className="text-base font-bold"
                                style={{ color: C.textPrimary }}
                            >
                                Overall Qualitative Feedback & Development
                                Recommendations
                            </h3>
                            <p
                                className="mt-0.5 text-xs"
                                style={{ color: C.textSecondary }}
                            >
                                Highlight key behavioral strengths, observed
                                demonstration of company values, and focus areas
                                for growth.
                            </p>
                            <textarea
                                rows={3}
                                disabled={isCompleted}
                                value={feedbackSummary}
                                onChange={(e) =>
                                    setFeedbackSummary(e.target.value)
                                }
                                placeholder="Provide high-level developmental commentary..."
                                className="mt-3 w-full rounded-xl border p-3 text-xs focus:outline-none"
                                style={{ borderColor: C.border }}
                            />
                        </div>

                        {/* Submission Buttons */}
                        {!isCompleted ? (
                            <div
                                className="flex items-center justify-between rounded-2xl border p-5 shadow-sm"
                                style={{
                                    backgroundColor: C.white,
                                    borderColor: C.border,
                                }}
                            >
                                <div
                                    className="text-xs"
                                    style={{ color: C.textSecondary }}
                                >
                                    {answeredQuestions === totalQuestions ? (
                                        <span
                                            className="flex items-center gap-1.5 font-bold"
                                            style={{ color: C.green }}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            All {totalQuestions} questions
                                            scored. Ready to lock & submit.
                                        </span>
                                    ) : (
                                        <span
                                            className="flex items-center gap-1.5 font-semibold"
                                            style={{ color: C.orange }}
                                        >
                                            <AlertCircle className="h-4 w-4" />
                                            {totalQuestions -
                                                answeredQuestions}{" "}
                                            questions remaining before
                                            submission.
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={isSubmitting || isSavingDraft}
                                        onClick={handleSaveAndReturnLater}
                                        className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{
                                            borderColor: C.border,
                                            color: C.textPrimary,
                                            backgroundColor: C.white,
                                        }}
                                    >
                                        <Save
                                            className="h-4 w-4"
                                            style={{ color: C.orange }}
                                        />
                                        {isSavingDraft
                                            ? "Saving Progress…"
                                            : "Save & Return Later"}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            isSubmitting ||
                                            isSavingDraft ||
                                            answeredQuestions < totalQuestions
                                        }
                                        className="inline-flex items-center gap-2 rounded-xl px-6 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                                        style={{ backgroundColor: C.orange }}
                                    >
                                        <Lock className="h-4 w-4" />
                                        {isSubmitting
                                            ? "Submitting…"
                                            : "Finalize & Lock Appraisal"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex items-center justify-between rounded-2xl border p-5 shadow-sm"
                                style={{
                                    backgroundColor: C.greenLight,
                                    borderColor: `${C.green}33`,
                                }}
                            >
                                <div
                                    className="flex items-center gap-2 text-xs font-bold"
                                    style={{ color: C.greenDark }}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    This 360° appraisal is finalized, scored (
                                    {evaluation.score} / 5.0), and locked.
                                </div>
                                <Link
                                    href={myEvaluationsRoute.url(teamSlug)}
                                    className="rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md"
                                    style={{ backgroundColor: C.greenDark }}
                                >
                                    Return to My Appraisals
                                </Link>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
}
