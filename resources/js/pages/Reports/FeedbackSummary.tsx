import { Head, router, Link } from "@inertiajs/react";
import React, { useState, useMemo } from "react";
import {
    MessageSquareText,
    FileText,
    Download,
    Search,
    Filter,
    Calendar,
    ChevronDown,
    ChevronRight,
    Users,
    Award,
    Shield,
    Lock,
    Building2,
    Compass,
    ArrowLeft,
    CheckCircle2,
    X,
    MessageSquareQuote,
    Star,
    Layers,
    MapPin,
    User,
    Check,
    ChevronLeft,
} from "lucide-react";
import {
    exportReportToPdf,
    exportReportToExcel,
    ReportMeta,
} from "@/lib/report-exporter";
import { SearchableSelect } from "@/components/ui/searchable-select";

const C = {
    orange: "#EA580C",
    orangeLight: "#FED7AA",
    orangeDark: "#C2410C",
    green: "#15803D",
    greenLight: "#DCFCE7",
    navy: "#1E3A5F",
    navyLight: "#EFF6FF",
    bg: "#F9FAFB",
    white: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    danger: "#DC2626",
    warn: "#D97706",
};

interface Cycle {
    id: number;
    name: string;
    status: string;
    period_start: string | null;
    period_end: string | null;
}

interface Region {
    id: number;
    name: string;
    code?: string | null;
}

interface Department {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
    type?: string | null;
    region_id?: number | null;
}

interface UserOption {
    id: number;
    name: string;
    employee_no: string | null;
    department_id: number | null;
    current_team_id: number | null;
}

interface FeedbackSummaryItem {
    evaluation_id: number;
    reviewer_label: string;
    relationship_type: string;
    relationship_label: string;
    score: number | null;
    feedback_summary: string;
    submitted_at: string | null;
}

interface SupervisorCvComment {
    reviewer_label: string;
    comment: string;
    submitted_at: string | null;
}

interface QuestionCommentItem {
    reviewer_label: string;
    relationship_label: string;
    score: number;
    comment: string;
    submitted_at: string | null;
}

interface QuestionData {
    id: number;
    question: string;
    description: string | null;
    weight: number;
    order: number;
    response_count?: number;
    avg_score: number | null;
    comments: QuestionCommentItem[];
}

interface CoreValueData {
    id: number;
    name: string;
    description: string | null;
    weight: number;
    supervisor_comments: SupervisorCvComment[];
    questions: QuestionData[];
}

interface EvaluateeRecord {
    user: {
        id: number;
        name: string;
        employee_no: string;
        job_title: string;
        department: string;
        branch: string;
        region: string;
    };
    evaluations_count: number;
    reviewers_summary?: Record<string, number>;
    overall_score: number | null;
    has_comments: boolean;
    feedback_summaries: FeedbackSummaryItem[];
    core_values: CoreValueData[];
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface Stats {
    total_evaluatees_reviewed: number;
    total_evaluations: number;
    total_feedback_summaries: number;
    total_core_value_comments: number;
    total_question_comments: number;
    avg_360_score: number | null;
}

interface CoreValueMeta {
    id: number;
    name: string;
    description: string | null;
    weight: number;
    questions: {
        id: number;
        question: string;
        description: string | null;
        weight: number;
        order: number;
    }[];
}

interface Props {
    cycles: Cycle[];
    selectedCycle: Cycle | null;
    regions: Region[];
    departments: Department[];
    branches: Branch[];
    availableUsers: UserOption[];
    relationshipLabels: Record<string, string>;
    stats: Stats;
    evaluatees: PaginatedData<EvaluateeRecord>;
    coreValues: CoreValueMeta[];
    filters: {
        cycle_id: number | null;
        region_id: number | null;
        department_id: number | null;
        team_id: number | null;
        evaluatee_id: number | null;
        relationship_type: string | null;
        search: string | null;
        only_with_comments: boolean;
        per_page: number;
        page: number;
    };
    currentTeam: {
        id: number;
        name: string;
        slug: string;
    };
}

export default function FeedbackSummaryReport({
    cycles = [],
    selectedCycle,
    regions = [],
    departments = [],
    branches = [],
    availableUsers = [],
    relationshipLabels = {},
    stats,
    evaluatees,
    coreValues = [],
    filters,
    currentTeam,
}: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || "");
    const [expandedUsers, setExpandedUsers] = useState<Record<number, boolean>>({});
    const [isExporting, setIsExporting] = useState(false);

    const evaluateeList = evaluatees.data || [];

    // Toggle expand for single evaluatee card
    const toggleExpand = (userId: number) => {
        setExpandedUsers((prev) => ({
            ...prev,
            [userId]: prev[userId] === undefined ? false : !prev[userId],
        }));
    };

    // Expand all or collapse all
    const expandAll = () => {
        const next: Record<number, boolean> = {};
        evaluateeList.forEach((e) => {
            next[e.user.id] = true;
        });
        setExpandedUsers(next);
    };

    const collapseAll = () => {
        const next: Record<number, boolean> = {};
        evaluateeList.forEach((e) => {
            next[e.user.id] = false;
        });
        setExpandedUsers(next);
    };

    // Filter application via Inertia router
    const applyFilter = (newParams: Record<string, any>) => {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        Object.entries(newParams).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== "") {
                params.set(k, String(v));
            } else {
                params.delete(k);
            }
        });

        // Reset page to 1 when changing filters other than page itself
        if (!("page" in newParams)) {
            params.delete("page");
        }

        router.get(
            window.location.pathname + "?" + params.toString(),
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    const resetFilters = () => {
        router.get(window.location.pathname, { cycle_id: selectedCycle?.id });
    };

    // Filter branches when a region is selected
    const filteredBranches = useMemo(() => {
        if (!filters.region_id) return branches;
        return branches.filter((b) => Number(b.region_id) === Number(filters.region_id));
    }, [branches, filters.region_id]);

    // Helper for Relationship Badge Styling
    const getRelationshipBadge = (label: string) => {
        const isSupervisor = label.toLowerCase().includes("supervisor");
        const isSubordinate = label.toLowerCase().includes("subordinate") || label.toLowerCase().includes("direct report");
        const isPeer = label.toLowerCase().includes("peer");

        if (isSupervisor) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                    <Award className="h-3 w-3 text-amber-700" />
                    {label}
                </span>
            );
        }
        if (isSubordinate) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-900 border border-purple-200">
                    <Users className="h-3 w-3 text-purple-700" />
                    {label}
                </span>
            );
        }
        if (isPeer) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-900 border border-blue-200">
                    <CheckCircle2 className="h-3 w-3 text-blue-700" />
                    {label}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-800 border border-gray-200">
                {label}
            </span>
        );
    };

    // Helper for Score Badges
    const getScoreBadge = (score: number | null) => {
        if (score === null || score === undefined) {
            return (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                    N/A
                </span>
            );
        }
        let colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-300";
        if (score < 2.5) {
            colorClasses = "bg-red-100 text-red-800 border-red-300";
        } else if (score < 3.5) {
            colorClasses = "bg-amber-100 text-amber-800 border-amber-300";
        } else if (score < 4.2) {
            colorClasses = "bg-blue-100 text-blue-800 border-blue-300";
        }

        return (
            <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${colorClasses}`}
            >
                <Star className="h-3 w-3 fill-current" />
                {score.toFixed(2)} / 5.0
            </span>
        );
    };

    // Export Full Dataset (Fetches ?export=all to guarantee entire filtered dataset is exported)
    const fetchExportDataset = async (): Promise<EvaluateeRecord[]> => {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("export", "all");
        const res = await fetch(currentUrl.toString(), {
            headers: { Accept: "application/json" },
        });
        if (!res.ok) {
            throw new Error("Failed to load export data");
        }
        return await res.json();
    };

    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const dataset = await fetchExportDataset();

            const meta: ReportMeta = {
                title: "360° Feedback Summary & Core Value Questions Comments Report",
                subtitle: "Progressive Credit Limited • Confidential HRBP & Super Admin Report (Reviewers Anonymized)",
                cycleName: selectedCycle ? selectedCycle.name : undefined,
                filterInfo: [
                    filters.region_id ? `Region: ${regions.find((r) => r.id === filters.region_id)?.name}` : "",
                    filters.department_id ? `Dept: ${departments.find((d) => d.id === filters.department_id)?.name}` : "",
                    filters.team_id ? `Branch: ${branches.find((b) => b.id === filters.team_id)?.name}` : "",
                    filters.evaluatee_id ? `Individual: ${availableUsers.find((u) => u.id === filters.evaluatee_id)?.name}` : "",
                    filters.relationship_type ? `Perspective: ${relationshipLabels[filters.relationship_type] || filters.relationship_type}` : "",
                ]
                    .filter(Boolean)
                    .join(" | "),
            };

            const headers = [
                "Staff Name",
                "Employee No",
                "Job Title",
                "Department",
                "Branch",
                "Region",
                "Overall 360 Score",
                "Reviewer (Anonymous)",
                "Reviewer Role / Perspective",
                "Reviewer Overall Score",
                "Overall Feedback Summary Comment",
                "Core Value",
                "Core Value Supervisor Comment",
                "Question Detail",
                "Question Score",
                "Question Comment",
                "Date",
            ];

            const rows: (string | number | null | undefined)[][] = [];

            dataset.forEach((item) => {
                // Feedback summaries
                if (item.feedback_summaries.length > 0) {
                    item.feedback_summaries.forEach((f) => {
                        rows.push([
                            item.user.name,
                            item.user.employee_no,
                            item.user.job_title,
                            item.user.department,
                            item.user.branch,
                            item.user.region,
                            item.overall_score,
                            f.reviewer_label,
                            f.relationship_label,
                            f.score,
                            f.feedback_summary,
                            "",
                            "",
                            "",
                            "",
                            "",
                            f.submitted_at,
                        ]);
                    });
                }

                // Core value supervisor comments and question comments
                item.core_values.forEach((cv) => {
                    cv.supervisor_comments.forEach((sc) => {
                        rows.push([
                            item.user.name,
                            item.user.employee_no,
                            item.user.job_title,
                            item.user.department,
                            item.user.branch,
                            item.user.region,
                            item.overall_score,
                            sc.reviewer_label,
                            "Immediate Supervisor",
                            "",
                            "",
                            `${cv.name} (${cv.weight}%)`,
                            sc.comment,
                            "",
                            "",
                            "",
                            sc.submitted_at,
                        ]);
                    });

                    cv.questions.forEach((q) => {
                        q.comments.forEach((qc) => {
                            rows.push([
                                item.user.name,
                                item.user.employee_no,
                                item.user.job_title,
                                item.user.department,
                                item.user.branch,
                                item.user.region,
                                item.overall_score,
                                qc.reviewer_label,
                                qc.relationship_label,
                                "",
                                "",
                                `${cv.name} (${cv.weight}%)`,
                                "",
                                q.question,
                                qc.score,
                                qc.comment,
                                qc.submitted_at,
                            ]);
                        });
                    });
                });

                // If no comments at all
                if (
                    item.feedback_summaries.length === 0 &&
                    !item.core_values.some(
                        (cv) => cv.supervisor_comments.length > 0 || cv.questions.some((q) => q.comments.length > 0)
                    )
                ) {
                    rows.push([
                        item.user.name,
                        item.user.employee_no,
                        item.user.job_title,
                        item.user.department,
                        item.user.branch,
                        item.user.region,
                        item.overall_score,
                        "—",
                        "—",
                        "",
                        "No narrative comments logged",
                        "",
                        "",
                        "",
                        "",
                        "",
                        "",
                    ]);
                }
            });

            exportReportToExcel(
                meta,
                headers,
                rows,
                `360-Feedback-Comments-${(selectedCycle?.name || "Report").replace(/\s+/g, "-")}`
            );
        } catch (e) {
            console.error(e);
            alert("Could not export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        try {
            setIsExporting(true);
            const dataset = await fetchExportDataset();

            const meta: ReportMeta = {
                title: "360° Feedback Summary & Core Value Questions Comments Report",
                subtitle: "Progressive Credit Limited • Confidential HRBP & Super Admin Report (Reviewers Anonymized)",
                cycleName: selectedCycle ? selectedCycle.name : undefined,
                filterInfo: [
                    filters.region_id ? `Region: ${regions.find((r) => r.id === filters.region_id)?.name}` : "",
                    filters.department_id ? `Dept: ${departments.find((d) => d.id === filters.department_id)?.name}` : "",
                    filters.team_id ? `Branch: ${branches.find((b) => b.id === filters.team_id)?.name}` : "",
                    filters.evaluatee_id ? `Individual: ${availableUsers.find((u) => u.id === filters.evaluatee_id)?.name}` : "",
                    filters.relationship_type ? `Perspective: ${relationshipLabels[filters.relationship_type] || filters.relationship_type}` : "",
                ]
                    .filter(Boolean)
                    .join(" | "),
                orientation: "portrait",
            };

            let contentHtml = `
                <div style="margin-bottom: 15px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 6px; padding: 10px; font-size: 11px;">
                    <strong>Report Scope:</strong> ${dataset.length} Staff Appraised | ${stats.total_evaluations} Total Reviews | ${stats.total_feedback_summaries} Feedback Summaries | ${stats.total_question_comments} Question Remarks
                    <br/><span style="color: #9A3412;">🔒 All reviewer identities are strictly anonymized.</span>
                </div>
            `;

            dataset.forEach((item) => {
                contentHtml += `
                    <div style="margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #1E3A5F; color: white; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="font-size: 14px; font-weight: bold;">${item.user.name}</span>
                                <span style="font-size: 11px; opacity: 0.85; margin-left: 8px;">(${item.user.employee_no || "N/A"}) • ${item.user.job_title} • ${item.user.department} • ${item.user.branch} (${item.user.region})</span>
                            </div>
                            <div>
                                <strong style="color: #FED7AA; font-size: 13px;">Score: ${item.overall_score !== null ? item.overall_score.toFixed(2) + " / 5.0" : "N/A"}</strong>
                                <span style="font-size: 10px; opacity: 0.8; margin-left: 6px;">(${item.evaluations_count} Reviews)</span>
                            </div>
                        </div>
                        <div style="padding: 12px 14px;">
                `;

                // 1. Feedback Summaries
                if (item.feedback_summaries.length > 0) {
                    contentHtml += `
                        <div style="margin-bottom: 14px;">
                            <div style="font-size: 11px; font-weight: bold; color: #EA580C; text-transform: uppercase; margin-bottom: 6px;">💬 Overall Qualitative Feedback Summaries:</div>
                    `;
                    item.feedback_summaries.forEach((f) => {
                        contentHtml += `
                            <div style="margin-bottom: 8px; padding: 8px 10px; background: #FFFDF9; border-left: 3px solid #EA580C; border-radius: 4px; font-size: 10.5px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; color: #64748B;">
                                    <span><strong>${f.reviewer_label}</strong> ${f.score !== null ? `• Score: <strong>${f.score} / 5</strong>` : ""}</span>
                                    <span>${f.submitted_at || ""}</span>
                                </div>
                                <div style="color: #1F2937; line-height: 1.4;">${f.feedback_summary}</div>
                            </div>
                        `;
                    });
                    contentHtml += `</div>`;
                }

                // 2. Core Values & Question Comments
                contentHtml += `
                    <div>
                        <div style="font-size: 11px; font-weight: bold; color: #15803D; text-transform: uppercase; margin-bottom: 8px;">🧭 Core Value Questions Comments:</div>
                `;

                item.core_values.forEach((cv, cvIdx) => {
                    contentHtml += `
                        <div style="margin-bottom: 12px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; background: #FAFBFD;">
                            <div style="font-size: 12px; font-weight: bold; color: #1E3A5F; margin-bottom: 2px;">
                                ${cvIdx + 1}. ${cv.name} <span style="font-size: 10px; font-weight: normal; color: #64748B;">(Weight: ${cv.weight}%)</span>
                            </div>
                            ${cv.description ? `<div style="font-size: 9.5px; color: #64748B; margin-bottom: 8px;">${cv.description}</div>` : ""}
                    `;

                    // Supervisor comments on CV
                    if (cv.supervisor_comments.length > 0) {
                        cv.supervisor_comments.forEach((sc) => {
                            contentHtml += `
                                <div style="margin-bottom: 8px; padding: 6px 8px; background: #FEF3C7; border-left: 3px solid #D97706; border-radius: 4px; font-size: 10px;">
                                    <strong>Supervisor Overall Remark:</strong> "${sc.comment}"
                                </div>
                            `;
                        });
                    }

                    // Questions & Question comments
                    cv.questions.forEach((q, qIdx) => {
                        const hasComments = q.comments.length > 0;
                        contentHtml += `
                            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #CBD5E1; font-size: 10.5px;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="font-weight: 600; color: #1E293B;">Q${cvIdx + 1}.${qIdx + 1} ${q.question}</span>
                                    <span style="font-weight: bold; color: #0284C7; font-size: 10px;">Avg: ${q.avg_score !== null ? q.avg_score + " / 5" : "—"}</span>
                                </div>
                        `;

                        if (hasComments) {
                            q.comments.forEach((qc) => {
                                contentHtml += `
                                    <div style="margin-top: 4px; padding: 4px 8px; background: #F1F5F9; border-radius: 4px; font-size: 10px;">
                                        <span style="color: #475569; font-weight: 600;">${qc.reviewer_label} [${qc.score}/5]:</span>
                                        <span style="color: #1E293B;"> "${qc.comment}"</span>
                                    </div>
                                `;
                            });
                        } else {
                            contentHtml += `<div style="font-size: 9px; color: #94A3B8; font-style: italic; margin-top: 2px;">No written comments for this question.</div>`;
                        }

                        contentHtml += `</div>`;
                    });

                    contentHtml += `</div>`;
                });

                contentHtml += `</div></div></div>`;
            });

            exportReportToPdf(meta, contentHtml);
        } catch (e) {
            console.error(e);
            alert("Could not export PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Head title="360° Feedback Summary & Question Comments Report" />

            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* Header */}
                    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <Link
                                    href={`/${currentTeam.slug}/reports/performance`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Performance Reports
                                </Link>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100 px-3 py-0.5 text-xs font-bold text-purple-900 shadow-xs">
                                    <Lock className="h-3.5 w-3.5 text-purple-700" />
                                    HRBP & Super Admin Restricted
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900 shadow-xs">
                                    <Shield className="h-3.5 w-3.5 text-emerald-700" />
                                    Reviewers Anonymized
                                </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                                <MessageSquareText
                                    className="h-7 w-7"
                                    style={{ color: C.orange }}
                                />
                                <h1
                                    className="text-2xl font-bold tracking-tight"
                                    style={{ color: C.navy }}
                                >
                                    360° Feedback Summary & Core Value Comments Report
                                </h1>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Detailed qualitative feedback summaries, supervisory remarks, and individual core value question comments. Filterable per Individual, Branch, Department, or Region.
                            </p>
                        </div>

                        {/* Top Actions: Cycle Selector + Export Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Cycle Selector */}
                            {cycles.length > 0 && (
                                <div
                                    className="flex items-center gap-2 rounded-xl border bg-white px-3 py-1.5 shadow-xs"
                                    style={{ borderColor: C.border }}
                                >
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span className="text-xs font-bold text-gray-700">Cycle:</span>
                                    <SearchableSelect
                                        size="sm"
                                        className="min-w-[210px]"
                                        options={cycles.map((c) => ({
                                            value: c.id,
                                            label: `${c.name} [${c.status.toUpperCase()}]`,
                                        }))}
                                        value={selectedCycle?.id || ""}
                                        onChange={(val) =>
                                            applyFilter({
                                                cycle_id: Number(val),
                                            })
                                        }
                                        placeholder="Select 360 cycle..."
                                        searchPlaceholder="Search cycle..."
                                    />
                                </div>
                            )}

                            {/* Export Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={isExporting}
                                    onClick={handleExportPdf}
                                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow-xs transition-all hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
                                >
                                    <FileText className="h-3.5 w-3.5 text-red-600" />
                                    {isExporting ? "Exporting..." : "Export PDF"}
                                </button>
                                <button
                                    disabled={isExporting}
                                    onClick={handleExportExcel}
                                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs transition-all hover:bg-emerald-100 hover:text-emerald-900 disabled:opacity-50"
                                >
                                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                                    {isExporting ? "Exporting..." : "Export Excel"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Overview Grid */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">Staff in Filter</span>
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold" style={{ color: C.navy }}>
                                {stats.total_evaluatees_reviewed}
                            </div>
                            <span className="text-[10px] text-gray-400">matching criteria</span>
                        </div>

                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">Completed Reviews</span>
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold" style={{ color: C.green }}>
                                {stats.total_evaluations}
                            </div>
                            <span className="text-[10px] text-gray-400">anonymized appraisals</span>
                        </div>

                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">Feedback Summaries</span>
                                <MessageSquareText className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold" style={{ color: C.orange }}>
                                {stats.total_feedback_summaries}
                            </div>
                            <span className="text-[10px] text-gray-400">narrative summaries</span>
                        </div>

                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">CV Supervisor Remarks</span>
                                <Compass className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-purple-800">
                                {stats.total_core_value_comments}
                            </div>
                            <span className="text-[10px] text-gray-400">supervisor evaluations</span>
                        </div>

                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">Question Remarks</span>
                                <MessageSquareQuote className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="mt-1 text-xl font-bold text-amber-800">
                                {stats.total_question_comments}
                            </div>
                            <span className="text-[10px] text-gray-400">Q-level justifications</span>
                        </div>

                        <div
                            className="rounded-2xl border bg-white p-3.5 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between text-gray-500">
                                <span className="text-[11px] font-semibold">Average 360 Score</span>
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            </div>
                            <div className="mt-1 text-xl font-bold" style={{ color: C.navy }}>
                                {stats.avg_360_score !== null ? `${stats.avg_360_score} / 5.0` : "—"}
                            </div>
                            <span className="text-[10px] text-gray-400">across filter scope</span>
                        </div>
                    </div>

                    {/* Filter Bar with Region, Branch, Department, Individual */}
                    <div
                        className="mb-6 rounded-2xl border bg-white p-4 shadow-xs"
                        style={{ borderColor: C.border }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                                    <Filter className="h-4 w-4 text-orange-600" />
                                    <span>Filter:</span>
                                </div>

                                {/* 1. Region Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[160px]"
                                    options={[
                                        { value: "", label: "All Regions" },
                                        ...regions.map((r) => ({
                                            value: r.id,
                                            label: r.name,
                                        })),
                                    ]}
                                    value={filters.region_id || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            region_id: val ? String(val) : "",
                                            team_id: "",
                                            evaluatee_id: "",
                                        })
                                    }
                                    placeholder="All Regions"
                                    searchPlaceholder="Search regions..."
                                />

                                {/* 2. Branch Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[170px]"
                                    options={[
                                        { value: "", label: "All Branches" },
                                        ...filteredBranches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} ${b.type ? `(${b.type})` : ""}`,
                                        })),
                                    ]}
                                    value={filters.team_id || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            team_id: val ? String(val) : "",
                                            evaluatee_id: "",
                                        })
                                    }
                                    placeholder="All Branches"
                                    searchPlaceholder="Search branches..."
                                />

                                {/* 3. Department Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[170px]"
                                    options={[
                                        { value: "", label: "All Departments" },
                                        ...departments.map((d) => ({
                                            value: d.id,
                                            label: d.name,
                                        })),
                                    ]}
                                    value={filters.department_id || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            department_id: val ? String(val) : "",
                                            evaluatee_id: "",
                                        })
                                    }
                                    placeholder="All Departments"
                                    searchPlaceholder="Search departments..."
                                />

                                {/* 4. Individual / Staff Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[190px]"
                                    options={[
                                        { value: "", label: "All Individuals" },
                                        ...availableUsers.map((u) => ({
                                            value: u.id,
                                            label: `${u.name} ${u.employee_no ? `(${u.employee_no})` : ""}`,
                                        })),
                                    ]}
                                    value={filters.evaluatee_id || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            evaluatee_id: val ? String(val) : "",
                                        })
                                    }
                                    placeholder="All Individuals"
                                    searchPlaceholder="Search staff member..."
                                />

                                {/* 5. Reviewer Perspective / Relationship Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[190px]"
                                    options={[
                                        { value: "", label: "All Reviewer Roles" },
                                        ...Object.entries(relationshipLabels).map(([key, label]) => ({
                                            value: key,
                                            label: label,
                                        })),
                                    ]}
                                    value={filters.relationship_type || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            relationship_type: val ? String(val) : "",
                                        })
                                    }
                                    placeholder="All Reviewer Roles"
                                    searchPlaceholder="Filter perspective..."
                                />

                                {/* Only with comments toggle */}
                                <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={filters.only_with_comments}
                                        onChange={(e) =>
                                            applyFilter({
                                                only_with_comments: e.target.checked,
                                            })
                                        }
                                        className="h-3.5 w-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                    />
                                    <span>Only With Comments</span>
                                </label>
                            </div>

                            {/* Search & Reset */}
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                applyFilter({ search: searchTerm });
                                            }
                                        }}
                                        placeholder="Search staff name / role..."
                                        className="rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-700 shadow-xs placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm("");
                                                applyFilter({ search: "" });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={resetFilters}
                                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pagination Bar & Expand Controls */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 text-gray-600">
                            {evaluatees.total > 0 ? (
                                <span>
                                    Showing <strong className="text-gray-900">{evaluatees.from}</strong> to{" "}
                                    <strong className="text-gray-900">{evaluatees.to}</strong> of{" "}
                                    <strong className="text-gray-900">{evaluatees.total}</strong> staff members
                                </span>
                            ) : (
                                <span>No staff members found matching filter</span>
                            )}

                            {/* Per page selector */}
                            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                <span>Per page:</span>
                                <select
                                    value={filters.per_page || 10}
                                    onChange={(e) =>
                                        applyFilter({
                                            per_page: Number(e.target.value),
                                        })
                                    }
                                    className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>

                        {evaluateeList.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={expandAll}
                                    className="font-semibold text-orange-700 hover:underline"
                                >
                                    Expand All on Page
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                    onClick={collapseAll}
                                    className="font-semibold text-gray-500 hover:underline"
                                >
                                    Collapse All on Page
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Staff List with Core Value Questions & Feedback Summaries */}
                    <div className="space-y-5">
                        {evaluateeList.length === 0 ? (
                            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
                                <MessageSquareQuote className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-3 text-base font-bold text-gray-800">
                                    No Feedback Summaries or Question Comments Found
                                </h3>
                                <p className="mt-1 text-xs text-gray-500">
                                    No evaluation records match the selected Individual, Branch, Department, or Region filter.
                                </p>
                                <button
                                    onClick={resetFilters}
                                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        ) : (
                            evaluateeList.map((item) => {
                                const isExpanded = expandedUsers[item.user.id] ?? true;

                                return (
                                    <div
                                        key={item.user.id}
                                        className="overflow-hidden rounded-2xl border bg-white shadow-xs transition-shadow hover:shadow-sm"
                                        style={{ borderColor: C.border }}
                                    >
                                        {/* Employee Card Header */}
                                        <div
                                            onClick={() => toggleExpand(item.user.id)}
                                            className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/80 px-5 py-4 transition hover:bg-gray-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-400">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-5 w-5 text-orange-600" />
                                                    ) : (
                                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {item.user.name}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-500">
                                                            ({item.user.employee_no || "N/A"})
                                                        </span>
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center text-xs text-gray-500">
                                                        <span>{item.user.job_title}</span>
                                                        <span className="mx-1.5 text-gray-300">•</span>
                                                        <span>{item.user.department}</span>
                                                        <span className="mx-1.5 text-gray-300">•</span>
                                                        <span>{item.user.branch}</span>
                                                        {item.user.region && item.user.region !== "—" && (
                                                            <>
                                                                <span className="mx-1.5 text-gray-300">•</span>
                                                                <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                                                                    <MapPin className="h-3 w-3 text-gray-400" />
                                                                    {item.user.region}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="text-right">
                                                    <div className="flex items-center gap-2">
                                                        {getScoreBadge(item.overall_score)}
                                                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                            {item.evaluations_count} Anonymous Review{item.evaluations_count === 1 ? "" : "s"}
                                                        </span>
                                                    </div>
                                                    {item.reviewers_summary && Object.keys(item.reviewers_summary).length > 0 && (
                                                        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
                                                            {Object.entries(item.reviewers_summary).map(([label, count]) => (
                                                                <span
                                                                    key={label}
                                                                    className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10.5px] font-medium text-gray-600 border border-gray-200 shadow-2xs"
                                                                >
                                                                    <strong className="text-gray-900 mr-1">{count}</strong> {label}{count === 1 ? "" : "s"}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Employee Card Body */}
                                        {isExpanded && (
                                            <div className="p-5 space-y-6">
                                                {/* Section 1: Feedback Summaries */}
                                                <div>
                                                    <div className="mb-3 flex items-center justify-between border-b border-orange-100 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <MessageSquareText className="h-4 w-4 text-orange-600" />
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-950">
                                                                Overall Qualitative Feedback Summaries & Developmental Recommendations
                                                            </h4>
                                                        </div>
                                                        <span className="text-[11px] font-semibold text-gray-400">
                                                            Reviewers Anonymized
                                                        </span>
                                                    </div>

                                                    {item.feedback_summaries.length === 0 ? (
                                                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-400">
                                                            No overall qualitative feedback summary was logged by reviewers for this employee.
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-3 md:grid-cols-2">
                                                            {item.feedback_summaries.map((f, fIdx) => (
                                                                <div
                                                                    key={fIdx}
                                                                    className="flex flex-col justify-between rounded-xl border border-orange-200/70 bg-[#FFFDF9] p-4 shadow-xs"
                                                                >
                                                                    <div>
                                                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-bold text-gray-900">
                                                                                    {f.reviewer_label}
                                                                                </span>
                                                                                {getRelationshipBadge(f.relationship_label)}
                                                                            </div>
                                                                            {f.score !== null && (
                                                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                                                                    {f.score} / 5.0
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
                                                                            "{f.feedback_summary}"
                                                                        </p>
                                                                    </div>
                                                                    <div className="mt-3 pt-2 border-t border-orange-50 text-[10px] text-gray-400 text-right">
                                                                        {f.submitted_at || "Submitted"}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Section 2: Core Values & Question Comments (Formatted exactly per user's screenshot) */}
                                                <div>
                                                    <div className="mb-3 flex items-center justify-between border-b border-emerald-100 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Compass className="h-4 w-4 text-emerald-700" />
                                                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                                                                Core Values & Question Justification Comments
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        {item.core_values.map((cv, cvIndex) => (
                                                            <div
                                                                key={cv.id}
                                                                className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xs"
                                                            >
                                                                {/* Core Value Header (Matches Screenshot) */}
                                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/70 p-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1E3A5F] text-xs font-bold text-white shadow-xs">
                                                                            {cvIndex + 1}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-bold text-gray-900">
                                                                                {cv.name}
                                                                            </h3>
                                                                            {cv.description && (
                                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                                    {cv.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-900 border border-orange-200">
                                                                        Weight: {cv.weight}%
                                                                    </span>
                                                                </div>

                                                                {/* Supervisor Overall Remark for this Core Value (if present) */}
                                                                {cv.supervisor_comments.length > 0 && (
                                                                    <div className="border-b border-amber-100 bg-amber-50/60 p-4">
                                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                                                                            <Award className="h-3.5 w-3.5 text-amber-700" />
                                                                            <span>Supervisor Overall Remark on {cv.name}:</span>
                                                                        </div>
                                                                        {cv.supervisor_comments.map((sc, scIdx) => (
                                                                            <div key={scIdx} className="text-xs text-amber-950 leading-relaxed pl-5">
                                                                                "{sc.comment}"
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Core Value Questions & Reviewers' Comments */}
                                                                <div className="p-4 space-y-4">
                                                                    {cv.questions.map((q, qIndex) => {
                                                                        const hasComments = q.comments.length > 0;

                                                                        return (
                                                                            <div
                                                                                key={q.id}
                                                                                className="rounded-xl border border-gray-100 bg-[#FAFBFD] p-3.5"
                                                                            >
                                                                                {/* Question Title & Description */}
                                                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                                                    <div>
                                                                                        <h4 className="text-xs font-bold text-gray-900">
                                                                                            <span className="text-orange-600 font-extrabold mr-1">
                                                                                                Q{qIndex + 1}.
                                                                                            </span>
                                                                                            {q.question}
                                                                                        </h4>
                                                                                        {q.description && (
                                                                                            <p className="text-[11px] text-gray-500 mt-0.5">
                                                                                                {q.description}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>

                                                                                    {q.avg_score !== null && (
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            {q.response_count !== undefined && q.response_count > 0 && (
                                                                                                <span className="text-[11px] text-gray-500 font-medium">
                                                                                                    {q.response_count} response{q.response_count === 1 ? "" : "s"} •
                                                                                                </span>
                                                                                            )}
                                                                                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                                                                                                Avg Score: {q.avg_score} / 5
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Reviewers' Specific Comments */}
                                                                                <div className="mt-3 space-y-2">
                                                                                    {hasComments ? (
                                                                                        q.comments.map((qc, cIdx) => (
                                                                                            <div
                                                                                                key={cIdx}
                                                                                                className="rounded-lg border border-gray-200/80 bg-white p-2.5 text-xs shadow-xs"
                                                                                            >
                                                                                                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                                        <span className="font-bold text-gray-800">
                                                                                                            {qc.reviewer_label}
                                                                                                        </span>
                                                                                                        {getRelationshipBadge(qc.relationship_label)}
                                                                                                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                                                                                            Score: {qc.score} / 5
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <span className="text-[10px] text-gray-400">
                                                                                                        {qc.submitted_at || ""}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <p className="text-xs text-gray-800 italic leading-relaxed">
                                                                                                    "{qc.comment}"
                                                                                                </p>
                                                                                            </div>
                                                                                        ))
                                                                                    ) : (
                                                                                        <div className="text-[11px] text-gray-400 italic">
                                                                                            No justification comments provided for this question.
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination Links (Accommodates large enterprise datasets) */}
                    {evaluatees.last_page > 1 && (
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                            <div className="text-xs text-gray-500">
                                Page <strong className="text-gray-900">{evaluatees.current_page}</strong> of{" "}
                                <strong className="text-gray-900">{evaluatees.last_page}</strong>
                            </div>

                            <div className="flex items-center gap-1">
                                {evaluatees.links.map((link, idx) => {
                                    // Parse page from URL
                                    let pageNum: number | null = null;
                                    if (link.url) {
                                        try {
                                            const u = new URL(link.url, window.location.origin);
                                            pageNum = Number(u.searchParams.get("page"));
                                        } catch {
                                            pageNum = null;
                                        }
                                    }

                                    const isPrev = link.label.includes("Previous");
                                    const isNext = link.label.includes("Next");

                                    return (
                                        <button
                                            key={idx}
                                            disabled={!link.url}
                                            onClick={() => pageNum && applyFilter({ page: pageNum })}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                link.active
                                                    ? "bg-[#1E3A5F] text-white"
                                                    : link.url
                                                    ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                                                    : "cursor-not-allowed text-gray-300 border border-transparent"
                                            }`}
                                        >
                                            {isPrev ? "← Prev" : isNext ? "Next →" : link.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
