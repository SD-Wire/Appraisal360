// resources/js/pages/performance-weights/Index.tsx
import { Head, useForm, usePage, Link } from "@inertiajs/react";
import { useState, useMemo, FormEventHandler, useEffect } from "react";
import {
    Sliders,
    Award,
    Target,
    CheckCircle2,
    AlertCircle,
    RotateCcw,
    Save,
    Sparkles,
    BarChart2,
    Shield,
    Info,
    HelpCircle,
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

interface AppSettingItem {
    id: number;
    key: string;
    value: string | null;
    type: string;
    group: string;
    label: string | null;
    description: string | null;
}

interface Props {
    kpiWeight: number;
    threeSixtyWeight: number;
    settings?: AppSettingItem[];
}

export default function PerformanceWeights({
    kpiWeight: initialKpiWeight,
    threeSixtyWeight: initialThreeSixtyWeight,
}: Props) {
    const { props } = usePage();
    const currentTeam = (props as unknown as { currentTeam?: { slug: string } })
        .currentTeam;

    const [autoBalance, setAutoBalance] = useState<boolean>(true);

    const form = useForm({
        kpi_weight: initialKpiWeight,
        three_sixty_weight: initialThreeSixtyWeight,
    });

    const totalWeight = useMemo(() => {
        const kpi = Number(form.data.kpi_weight) || 0;
        const threeSixty = Number(form.data.three_sixty_weight) || 0;
        return Math.round((kpi + threeSixty) * 100) / 100;
    }, [form.data.kpi_weight, form.data.three_sixty_weight]);

    const isValid = totalWeight === 100;

    // Simulation sample scores
    const [sampleKpiScore, setSampleKpiScore] = useState<number>(85);
    const [sample360Rating, setSample360Rating] = useState<number>(4.2);

    const sample360Percent = useMemo(() => {
        return Math.round((sample360Rating / 5) * 100 * 10) / 10;
    }, [sample360Rating]);

    const simulatedCombined = useMemo(() => {
        const kpiContribution =
            (sampleKpiScore * (Number(form.data.kpi_weight) || 0)) / 100;
        const threeSixtyContribution =
            (sample360Percent * (Number(form.data.three_sixty_weight) || 0)) /
            100;
        return (
            Math.round((kpiContribution + threeSixtyContribution) * 100) / 100
        );
    }, [
        sampleKpiScore,
        sample360Percent,
        form.data.kpi_weight,
        form.data.three_sixty_weight,
    ]);

    const sampleTier = useMemo(() => {
        if (simulatedCombined >= 90)
            return { label: "Exceptional", color: C.green, bg: C.greenLight };
        if (simulatedCombined >= 80)
            return { label: "Very Good", color: "#2563EB", bg: "#DBEAFE" };
        if (simulatedCombined >= 70)
            return { label: "Good", color: C.orange, bg: C.orangeLight };
        if (simulatedCombined >= 50)
            return { label: "Fair", color: C.warn, bg: C.warnLight };
        return {
            label: "Needs Improvement",
            color: C.danger,
            bg: C.dangerLight,
        };
    }, [simulatedCombined]);

    const handleKpiChange = (val: number) => {
        const clamped = Math.max(0, Math.min(100, val));
        if (autoBalance) {
            form.setData({
                kpi_weight: clamped,
                three_sixty_weight: Math.round((100 - clamped) * 100) / 100,
            });
        } else {
            form.setData("kpi_weight", clamped);
        }
    };

    const handle360Change = (val: number) => {
        const clamped = Math.max(0, Math.min(100, val));
        if (autoBalance) {
            form.setData({
                kpi_weight: Math.round((100 - clamped) * 100) / 100,
                three_sixty_weight: clamped,
            });
        } else {
            form.setData("three_sixty_weight", clamped);
        }
    };

    const applyPreset = (kpi: number, threeSixty: number) => {
        form.setData({
            kpi_weight: kpi,
            three_sixty_weight: threeSixty,
        });
    };

    const resetToDefaults = () => {
        form.setData({
            kpi_weight: initialKpiWeight,
            three_sixty_weight: initialThreeSixtyWeight,
        });
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!isValid) {
            Swal.fire({
                icon: "error",
                title: "Weight Total Must Equal 100%",
                text: `Current total is ${totalWeight}%. Please adjust the weights so their sum is exactly 100%.`,
                confirmButtonColor: C.orange,
            });
            return;
        }

        form.put("/settings/performance-weights", {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: "success",
                    title: "Weights Saved & Applied!",
                    text: `KPI (${form.data.kpi_weight}%) and 360° Appraisal (${form.data.three_sixty_weight}%) weights have been saved as system defaults and applied across all reports.`,
                    confirmButtonColor: C.navy,
                });
            },
            onError: (errors) => {
                const message =
                    Object.values(errors)[0] ||
                    "Failed to update performance weights.";
                Swal.fire({
                    icon: "error",
                    title: "Update Failed",
                    text: message,
                    confirmButtonColor: C.orange,
                });
            },
        });
    };

    return (
        <>
            <Head title="Performance Evaluation Weights" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* ── Page Header ───────────────────────────────────────── */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1
                                    className="text-2xl font-bold tracking-tight"
                                    style={{ color: C.textPrimary }}
                                >
                                    Performance Evaluation Weights
                                </h1>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.navyLight,
                                        color: C.navy,
                                    }}
                                >
                                    <Shield className="h-3.5 w-3.5" />
                                    Admin Config
                                </span>
                            </div>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Configure the organization-wide weighting
                                between objective KPI results and 360°
                                behavioral appraisals. Saved weights are
                                automatically applied across all performance
                                reports and unit summaries.
                            </p>
                        </div>

                        {currentTeam && (
                            <Link
                                href={`/${currentTeam.slug}/reports/performance`}
                                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-95"
                                style={{ backgroundColor: C.navy }}
                            >
                                <BarChart2 className="h-4 w-4" />
                                View Performance Reports
                            </Link>
                        )}
                    </div>

                    {/* ── Metric Summary Tiles ───────────────────────────────── */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {/* KPI Tile */}
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
                                <Target
                                    className="h-6 w-6"
                                    style={{ color: C.navy }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.navy }}
                                >
                                    {form.data.kpi_weight}%
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    KPI Objective Weight
                                </p>
                            </div>
                        </div>

                        {/* 360 Tile */}
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
                                <Award
                                    className="h-6 w-6"
                                    style={{ color: C.orangeDark }}
                                />
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: C.orangeDark }}
                                >
                                    {form.data.three_sixty_weight}%
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    360° Appraisal Weight
                                </p>
                            </div>
                        </div>

                        {/* Total Allocation Check */}
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
                                    backgroundColor: isValid
                                        ? C.greenLight
                                        : C.dangerLight,
                                }}
                            >
                                {isValid ? (
                                    <CheckCircle2
                                        className="h-6 w-6"
                                        style={{ color: C.greenDark }}
                                    />
                                ) : (
                                    <AlertCircle
                                        className="h-6 w-6"
                                        style={{ color: C.danger }}
                                    />
                                )}
                            </span>
                            <div>
                                <p
                                    className="text-2xl font-bold"
                                    style={{
                                        color: isValid ? C.greenDark : C.danger,
                                    }}
                                >
                                    {totalWeight}%
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    {isValid
                                        ? "Total Valid (100%)"
                                        : "Must equal 100%"}
                                </p>
                            </div>
                        </div>

                        {/* Status Tile */}
                        <div
                            className="flex items-center gap-4 rounded-2xl p-4 shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <span
                                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: "#F3F4F6" }}
                            >
                                <Sparkles
                                    className="h-6 w-6"
                                    style={{ color: "#4B5563" }}
                                />
                            </span>
                            <div>
                                <p className="text-sm font-bold text-gray-800">
                                    Auto-Applied
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: C.textSecondary }}
                                >
                                    Default for all reports
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Main Configuration Form Card ──────────────────────── */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div
                            className="overflow-hidden rounded-2xl shadow-sm"
                            style={{
                                backgroundColor: C.white,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            {/* Card Header */}
                            <div
                                className="flex flex-wrap items-center justify-between border-b px-6 py-4"
                                style={{
                                    borderColor: C.border,
                                    backgroundColor: "#FAFAFA",
                                }}
                            >
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-orange-600" />
                                        Performance Formula Weight Configuration
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Use the sliders or numeric fields below
                                        to balance performance criteria.
                                    </p>
                                </div>

                                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={autoBalance}
                                        onChange={(e) =>
                                            setAutoBalance(e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    Auto-balance weights (Sum = 100%)
                                </label>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Presets Bar */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                        Quick Standard Presets
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(70, 30)}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                form.data.kpi_weight === 70 &&
                                                form.data.three_sixty_weight ===
                                                    30
                                                    ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            ⭐ 70% KPI / 30% 360° (Standard
                                            Default)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(60, 40)}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                form.data.kpi_weight === 60 &&
                                                form.data.three_sixty_weight ===
                                                    40
                                                    ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            🤝 60% KPI / 40% 360° (Culture &
                                            Leadership)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(80, 20)}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                form.data.kpi_weight === 80 &&
                                                form.data.three_sixty_weight ===
                                                    20
                                                    ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            📈 80% KPI / 20% 360° (Results &
                                            Sales Focus)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyPreset(50, 50)}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                form.data.kpi_weight === 50 &&
                                                form.data.three_sixty_weight ===
                                                    50
                                                    ? "border-orange-600 bg-orange-50 text-orange-700 shadow-sm"
                                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            ⚖️ 50% KPI / 50% 360° (Equal
                                            Weighting)
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Split Bar Visualizer */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                                        <span
                                            className="text-navy"
                                            style={{ color: C.navy }}
                                        >
                                            KPI Achievement:{" "}
                                            {form.data.kpi_weight}%
                                        </span>
                                        <span style={{ color: C.orangeDark }}>
                                            360° Behavioral Competency:{" "}
                                            {form.data.three_sixty_weight}%
                                        </span>
                                    </div>
                                    <div
                                        className="h-6 w-full overflow-hidden rounded-xl bg-gray-100 flex p-0.5 border"
                                        style={{ borderColor: C.border }}
                                    >
                                        <div
                                            className="h-full rounded-l-lg transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                                            style={{
                                                width: `${Math.min(100, Math.max(0, form.data.kpi_weight))}%`,
                                                backgroundColor: C.navy,
                                            }}
                                        >
                                            {form.data.kpi_weight >= 10
                                                ? `${form.data.kpi_weight}%`
                                                : ""}
                                        </div>
                                        <div
                                            className="h-full rounded-r-lg transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
                                            style={{
                                                width: `${Math.min(100, Math.max(0, form.data.three_sixty_weight))}%`,
                                                backgroundColor: C.orange,
                                            }}
                                        >
                                            {form.data.three_sixty_weight >= 10
                                                ? `${form.data.three_sixty_weight}%`
                                                : ""}
                                        </div>
                                    </div>
                                    {!isValid && (
                                        <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Total sum is {totalWeight}%. The sum
                                            of KPI and 360° weights must equal
                                            100%.
                                        </p>
                                    )}
                                </div>

                                {/* Slider 1: KPI Weight */}
                                <div
                                    className="rounded-xl border p-4 bg-slate-50/50 space-y-3"
                                    style={{ borderColor: C.border }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                                                style={{
                                                    backgroundColor: C.navy,
                                                }}
                                            >
                                                <Target className="h-4 w-4" />
                                            </span>
                                            <div>
                                                <label className="text-sm font-bold text-gray-900 block">
                                                    KPI Performance Weight
                                                </label>
                                                <span className="text-xs text-gray-500">
                                                    Weight assigned to
                                                    task-based and quantitative
                                                    goals
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={form.data.kpi_weight}
                                                onChange={(e) =>
                                                    handleKpiChange(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right font-bold text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                                            />
                                            <span className="text-sm font-bold text-gray-500">
                                                %
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={form.data.kpi_weight}
                                        onChange={(e) =>
                                            handleKpiChange(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full accent-navy cursor-pointer"
                                        style={{ accentColor: C.navy }}
                                    />
                                    <div className="flex justify-between text-[11px] text-gray-400">
                                        <span>0% (No KPI weight)</span>
                                        <span>50%</span>
                                        <span>100% (KPI only)</span>
                                    </div>
                                </div>

                                {/* Slider 2: 360° Weight */}
                                <div
                                    className="rounded-xl border p-4 bg-orange-50/30 space-y-3"
                                    style={{ borderColor: C.border }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                                                style={{
                                                    backgroundColor: C.orange,
                                                }}
                                            >
                                                <Award className="h-4 w-4" />
                                            </span>
                                            <div>
                                                <label className="text-sm font-bold text-gray-900 block">
                                                    360° Appraisal Weight
                                                </label>
                                                <span className="text-xs text-gray-500">
                                                    Weight assigned to
                                                    behavioral competencies &
                                                    core values
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={
                                                    form.data.three_sixty_weight
                                                }
                                                onChange={(e) =>
                                                    handle360Change(
                                                        Number(e.target.value),
                                                    )
                                                }
                                                className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right font-bold text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                                            />
                                            <span className="text-sm font-bold text-gray-500">
                                                %
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={form.data.three_sixty_weight}
                                        onChange={(e) =>
                                            handle360Change(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full accent-orange-600 cursor-pointer"
                                        style={{ accentColor: C.orange }}
                                    />
                                    <div className="flex justify-between text-[11px] text-gray-400">
                                        <span>0% (No 360° weight)</span>
                                        <span>50%</span>
                                        <span>100% (360° only)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div
                                className="flex flex-wrap items-center justify-between border-t px-6 py-4"
                                style={{
                                    borderColor: C.border,
                                    backgroundColor: "#FAFAFA",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={resetToDefaults}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset to Previous
                                </button>

                                <button
                                    type="submit"
                                    disabled={form.processing || !isValid}
                                    className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    <Save className="h-4 w-4" />
                                    {form.processing
                                        ? "Saving Changes…"
                                        : "Save & Apply Weights Automatically"}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* ── Interactive Live Simulation Card ────────────────────── */}
                    <div
                        className="mt-6 overflow-hidden rounded-2xl shadow-sm"
                        style={{
                            backgroundColor: C.white,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        <div
                            className="border-b px-6 py-3"
                            style={{
                                borderColor: C.border,
                                backgroundColor: "#FFFBF5",
                            }}
                        >
                            <h3
                                className="text-sm font-bold flex items-center gap-2"
                                style={{ color: C.orangeDark }}
                            >
                                <Sparkles className="h-4 w-4" />
                                Live Calculation Formula Preview
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                See how an employee's score calculates under the
                                selected {form.data.kpi_weight}% KPI /{" "}
                                {form.data.three_sixty_weight}% 360° weighting.
                            </p>
                        </div>

                        <div className="p-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Interactive Inputs */}
                                <div className="space-y-4">
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Test Input Scores:
                                    </p>
                                    <div>
                                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                            <span>Sample KPI Score:</span>
                                            <span
                                                className="font-bold text-navy"
                                                style={{ color: C.navy }}
                                            >
                                                {sampleKpiScore}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={sampleKpiScore}
                                            onChange={(e) =>
                                                setSampleKpiScore(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full accent-navy"
                                            style={{ accentColor: C.navy }}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                                            <span>
                                                Sample 360° Score (1 to 5):
                                            </span>
                                            <span
                                                className="font-bold"
                                                style={{ color: C.orangeDark }}
                                            >
                                                {sample360Rating.toFixed(1)} /
                                                5.0 ({sample360Percent}%)
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            step="0.1"
                                            value={sample360Rating}
                                            onChange={(e) =>
                                                setSample360Rating(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full accent-orange-600"
                                            style={{ accentColor: C.orange }}
                                        />
                                    </div>
                                </div>

                                {/* Calculation Breakdown Box */}
                                <div
                                    className="rounded-xl border p-4 bg-gray-50 space-y-3"
                                    style={{ borderColor: C.border }}
                                >
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                        Formula Breakdown:
                                    </p>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                KPI Contribution:
                                            </span>
                                            <span className="font-mono font-semibold text-gray-900">
                                                {sampleKpiScore}% ×{" "}
                                                {form.data.kpi_weight}% ={" "}
                                                <strong
                                                    className="text-navy"
                                                    style={{ color: C.navy }}
                                                >
                                                    {(
                                                        (sampleKpiScore *
                                                            form.data
                                                                .kpi_weight) /
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                360° Contribution:
                                            </span>
                                            <span className="font-mono font-semibold text-gray-900">
                                                {sample360Percent}% ×{" "}
                                                {form.data.three_sixty_weight}%
                                                ={" "}
                                                <strong
                                                    style={{
                                                        color: C.orangeDark,
                                                    }}
                                                >
                                                    {(
                                                        (sample360Percent *
                                                            form.data
                                                                .three_sixty_weight) /
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </strong>
                                            </span>
                                        </div>
                                        <div
                                            className="border-t pt-2 flex justify-between items-center"
                                            style={{ borderColor: C.border }}
                                        >
                                            <span className="font-bold text-gray-900">
                                                Combined Score:
                                            </span>
                                            <div className="text-right">
                                                <span className="text-lg font-bold text-gray-900 block font-mono">
                                                    {simulatedCombined.toFixed(
                                                        2,
                                                    )}
                                                    %
                                                </span>
                                                <span
                                                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                    style={{
                                                        backgroundColor:
                                                            sampleTier.bg,
                                                        color: sampleTier.color,
                                                    }}
                                                >
                                                    {sampleTier.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
