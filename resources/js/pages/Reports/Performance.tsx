// resources/js/pages/Reports/Performance.tsx
import { Head, router, Link, usePage } from "@inertiajs/react";
import React, { useState, useEffect, useMemo } from "react";
import {
    BarChart2,
    Trophy,
    ClipboardList,
    Building2,
    Download,
    TrendingUp,
    Star,
    Users,
    MessageSquare,
    FileText,
    Sliders,
    Layers,
    Medal,
    ChevronDown,
    ChevronRight,
    Search,
    Filter,
    Calendar,
    Lock,
    CheckCircle2,
    MessageSquareQuote,
    FileEdit,
    AlertCircle,
    Save,
    Send,
    Clock,
    ShieldCheck,
    BadgeCheck,
    History,
    UserCheck,
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

type TabId =
    | "combined"
    | "top-5-cv"
    | "detailed-360"
    | "branch-360"
    | "kpi-reports"
    | "org-ranking"
    | "unit-summary";

interface CoreValueQuestion {
    id: number;
    question: string;
    weight: number;
    avg_score: number | null;
    respondents: number;
}

interface CoreValueReport {
    id: number;
    name: string;
    weight: number;
    avg_score: number | null;
    supervisor_comment: string | null;
    questions: CoreValueQuestion[];
}

interface OrgRankingItem {
    id: number;
    name: string;
    weight: number;
    avg_score: number | null;
    respondents: number;
}

interface KpiReportItem {
    id: number;
    title: string;
    description: string | null;
    target: string | null;
    actual_result: string | null;
    weight: number;
    self_rating: number | null;
    self_comment: string | null;
    supervisor_rating: number | null;
    supervisor_comment: string | null;
    evaluation_status: string | null;
    weighted_score: number | null;
}

interface UnitSummaryItem {
    team_id: number;
    team_name: string;
    team_type: string | null;
    member_count: number;
    avg_kpi_score: number | null;
    avg_360_score: number | null;
    combined_score: number | null;
}

interface Detailed360Question {
    id: number;
    number: string;
    parameter: string;
    parameter_detail: string;
    actual_score: number | null;
    ranking: number | null;
    peer_average: number | null;
    diversion: number | null;
    statistical_comment: string | null;
    staff_comment: string | null;
}

interface Detailed360Section {
    section_name: string;
    core_value_name: string;
    weight: number;
    questions: Detailed360Question[];
    section_actual_score: number | null;
    section_peer_average: number | null;
    section_diversion: number | null;
    section_statistical_comment: string | null;
}

interface Detailed360Report {
    user: {
        id: number;
        name: string;
        job_title: string | null;
        employee_no: string | null;
        team_name?: string | null;
        department_name?: string | null;
        branch_name?: string | null;
    };
    total_staff_ranked: number;
    overall_rank?: number | null;
    sections: Detailed360Section[];
    staff_comment?: {
        has_submitted: boolean;
        status: string;
        overall_comment: string;
        parameter_comments: Record<string, string>;
        submitted_at: string | null;
        audit_logs?: Array<{
            id: number;
            actor_name: string;
            actor_role: string;
            action: string;
            details: string;
            created_at: string;
        }>;
    };
    sign_off?: {
        staff: {
            name: string;
            employee_no: string;
            job_title: string;
            department: string;
            branch: string;
            team?: string;
            is_signed: boolean;
            signed_at: string | null;
        };
        supervisor: {
            name: string;
            employee_no: string;
            job_title: string;
            is_signed: boolean;
            signed_at: string | null;
        };
        hrbp: {
            name: string;
            employee_no: string;
            job_title: string;
            region_name: string;
            is_presigned: boolean;
            presigned_at: string;
            stamp_code: string;
        };
    };
    totals: {
        total_parameters_score: number;
        total_parameters_peer: number;
        total_parameters_diversion: number;
        total_parameters_stat: string | null;
        total_unweighted_score: number;
        total_unweighted_peer: number;
        total_unweighted_diversion: number;
        total_unweighted_stat: string | null;
        weighted_score: number;
        weighted_rank?: number | null;
        weighted_peer: number;
        weighted_diversion: number;
        weighted_stat: string | null;
    };
}

interface TopStaffItem {
    rank: number;
    user_id: number;
    user_name: string;
    employee_no: string | null;
    job_title: string | null;
    department_name: string;
    branch_name: string;
    avg_score: number;
    review_count: number;
}

interface TopCoreValueRanking {
    core_value_id: number;
    core_value_name: string;
    weight: number;
    total_staff?: number;
    top_staff: TopStaffItem[];
    bottom_staff?: TopStaffItem[];
}

interface KpiAppraisalCommentData {
    id?: number;
    kpi_cycle_id: number;
    user_id: number;
    supervisor_positives?: string | null;
    supervisor_areas_to_improve?: string | null;
    supervisor_concluding_remarks?: string | null;
    staff_achievement_reasons?: string | null;
    staff_future_commitment?: string | null;
    staff_training_requests?: string | null;
    status?: "draft" | "submitted";
    staff_submitted_at?: string | null;
    supervisor_submitted_at?: string | null;
}

interface KpiSignOffParty {
    name: string;
    employee_no: string;
    job_title: string;
    department?: string;
    branch?: string;
    team?: string;
    region_name?: string;
    stamp_code?: string;
}

interface KpiSignOffData {
    staff: KpiSignOffParty;
    supervisor: KpiSignOffParty;
    hrbp: KpiSignOffParty;
}

interface KpiAppraisalData {
    comment: KpiAppraisalCommentData | null;
    sign_off: KpiSignOffData | null;
}

interface BranchDeptKpiMember {
    user_id: number;
    user_name: string;
    employee_no: string | null;
    job_title: string | null;
    department_name: string;
    branch_name: string;
    kpi_count: number;
    avg_self_rating: number | null;
    avg_sup_rating: number | null;
    weighted_score: number | null;
    kpi_entries: {
        id: number;
        title: string;
        description?: string | null;
        target: string | null;
        actual_result: string | null;
        weight: number;
        self_rating: number | null;
        self_comment?: string | null;
        supervisor_rating: number | null;
        supervisor_comment?: string | null;
        status: string | null;
        weighted_score?: number | null;
    }[];
    appraisal_data?: KpiAppraisalData;
}

interface BranchDept360Member {
    user_id: number;
    user_name: string;
    employee_no: string | null;
    job_title: string | null;
    department_name: string;
    branch_name: string;
    reviews_received: number;
    overall_score: number | null;
    overall_percent: number | null;
    core_values: {
        core_value_id: number;
        core_value_name: string;
        weight: number;
        score: number | null;
    }[];
}

interface CombinedMember {
    user_id: number;
    user_name: string;
    employee_no: string | null;
    job_title: string | null;
    department_name: string;
    branch_name: string;
    kpi_score: number | null;
    three_sixty_raw: number | null;
    three_sixty_percent: number | null;
    kpi_weight: number;
    three_sixty_weight: number;
    combined_score: number | null;
    performance_tier: string;
}

interface CycleOption {
    id: number;
    name: string;
    status: string;
    period_start?: string | null;
    period_end?: string | null;
    kpi_cycle_id?: number | null;
}

interface Props {
    kpiCycle: { id: number; name: string } | null;
    threeSixtyCycle: { id: number; name: string } | null;
    kpiCycles?: CycleOption[];
    threeSixtyCycles?: CycleOption[];
    orgCoreValueRanking: OrgRankingItem[];
    topCoreValueRankings: TopCoreValueRanking[];
    unitSummary: UnitSummaryItem[];
    myKpiReport: KpiReportItem[];
    kpiAppraisalData?: KpiAppraisalData | null;
    targetKpiUser?: {
        id: number;
        name: string;
        employee_no: string | null;
        job_title: string | null;
        department: string;
        branch: string;
    } | null;
    canEditKpiComments?: {
        canEditStaff: boolean;
        canEditSupervisor: boolean;
    };
    myCoreValueReport: CoreValueReport[];
    canManage: boolean;
    departments: { id: number; name: string }[];
    branches: { id: number; name: string; type: string | null }[];
    availableUsers: {
        id: number;
        name: string;
        employee_no: string | null;
        department_id: number | null;
        current_team_id: number | null;
    }[];
    detailed360Report?: Detailed360Report | null;
    selectedEvaluateeId?: number | null;
    branchDeptKpiReport: BranchDeptKpiMember[];
    branchDept360Report: {
        core_values: { id: number; name: string; weight: number }[];
        members: BranchDept360Member[];
    };
    combinedPerformance: CombinedMember[];
    savedKpiWeight?: number;
    savedThreeSixtyWeight?: number;
    isIndividualOnly?: boolean;
    isThreeSixtyPeriodElapsed?: boolean;
    threeSixtyCycleDeadline?: string | null;
    canEditSubmittedComments?: boolean;
    isSuperAdmin?: boolean;
    isHrbp?: boolean;
    isSupervisor?: boolean;
    currentUser?: {
        id: number;
        name: string;
        employee_no: string | null;
        job_title: string | null;
        department: string;
        branch: string;
    };
    filters: {
        kpi_cycle_id?: number | null;
        three_sixty_cycle_id?: number | null;
        department_id: number | null;
        team_id: number | null;
        user_id: number | null;
        kpi_weight: number;
        three_sixty_weight: number;
    };
}

function ScoreBadge({
    score,
    outOf = 5,
}: {
    score: number | null | undefined;
    outOf?: number;
}) {
    if (score === null || score === undefined)
        return <span className="text-xs text-gray-400">—</span>;
    const pct = (score / outOf) * 100;
    const color = pct >= 80 ? C.green : pct >= 60 ? C.warn : C.danger;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: color }}
        >
            <Star className="h-3 w-3" />
            {score.toFixed(2)}
        </span>
    );
}

function PercentBadge({ value }: { value: number | null | undefined }) {
    if (value === null || value === undefined)
        return <span className="text-xs text-gray-400">—</span>;
    const color = value >= 80 ? C.green : value >= 60 ? C.warn : C.danger;
    return (
        <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold text-white shadow-xs"
            style={{ backgroundColor: color }}
        >
            {value.toFixed(1)}%
        </span>
    );
}

function TierBadge({ tier }: { tier: string }) {
    let bg = "#6B7280";
    let text = "#FFFFFF";

    if (tier.includes("Exceptional")) {
        bg = "#15803D"; // green-700
    } else if (tier.includes("Very Good")) {
        bg = "#059669"; // emerald-600
    } else if (tier.includes("Good")) {
        bg = "#2563EB"; // blue-600
    } else if (tier.includes("Average") || tier.includes("Needs Improvement")) {
        bg = "#D97706"; // amber-600
    } else if (tier.includes("Unsatisfactory") || tier.includes("Below")) {
        bg = "#DC2626"; // red-600
    }

    return (
        <span
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: bg, color: text }}
        >
            {tier}
        </span>
    );
}

function ExportButtons({
    onExportPdf,
    onExportExcel,
    disabled = false,
    disabledMessage,
}: {
    onExportPdf: () => void;
    onExportExcel: () => void;
    disabled?: boolean;
    disabledMessage?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                disabled={disabled}
                onClick={onExportPdf}
                title={disabled ? disabledMessage : "Export PDF"}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-xs transition-all ${
                    disabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                }`}
            >
                <FileText className={`h-3.5 w-3.5 ${disabled ? "text-gray-400" : "text-red-600"}`} /> Export PDF
            </button>
            <button
                disabled={disabled}
                onClick={onExportExcel}
                title={disabled ? disabledMessage : "Export Excel"}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-xs transition-all ${
                    disabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-60"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                }`}
            >
                <Download className={`h-3.5 w-3.5 ${disabled ? "text-gray-400" : "text-emerald-600"}`} /> Export Excel
            </button>
        </div>
    );
}

function buildKpiReportPdfHtml(
    entries: KpiReportItem[],
    targetStaff: any,
    cycleName: string,
    appraisalComment: KpiAppraisalCommentData | null,
    signOffData: KpiSignOffData | null
): string {
    const totalWeight = entries.reduce((acc, k) => acc + (Number(k.weight) || 0), 0);
    const selfRated = entries.filter((k) => k.self_rating !== null && k.self_rating !== undefined);
    const avgSelf = selfRated.length ? selfRated.reduce((acc, k) => acc + Number(k.self_rating), 0) / selfRated.length : null;
    const supRated = entries.filter((k) => k.supervisor_rating !== null && k.supervisor_rating !== undefined);
    const avgSup = supRated.length ? supRated.reduce((acc, k) => acc + Number(k.supervisor_rating), 0) / supRated.length : null;
    const totalWeighted = entries.reduce((acc, k) => acc + (Number(k.weighted_score) || 0), 0);

    const supPositives = appraisalComment?.supervisor_positives || "—";
    const supAreas = appraisalComment?.supervisor_areas_to_improve || "—";
    const supConcluding = appraisalComment?.supervisor_concluding_remarks || "";
    const staffReasons = appraisalComment?.staff_achievement_reasons || "—";
    const staffCommitment = appraisalComment?.staff_future_commitment || "—";
    const staffTraining = appraisalComment?.staff_training_requests || "—";

    const staffName = signOffData?.staff?.name || targetStaff?.name || "Staff Member";
    const staffEmpNo = signOffData?.staff?.employee_no || targetStaff?.employee_no || "—";
    const staffTitle = signOffData?.staff?.job_title || targetStaff?.job_title || "Staff";
    const staffDept = signOffData?.staff?.department || targetStaff?.department || "—";
    const staffBranch = signOffData?.staff?.branch || targetStaff?.branch || "—";

    const supervisorName = signOffData?.supervisor?.name || "Immediate Supervisor";
    const supervisorEmpNo = signOffData?.supervisor?.employee_no || "—";
    const supervisorTitle = signOffData?.supervisor?.job_title || "Supervisor";

    const hrbpName = signOffData?.hrbp?.name || "Regional HR Business Partner";
    const hrbpRegion = signOffData?.hrbp?.region_name || "Head Office / Regional";
    const hrbpTitle = signOffData?.hrbp?.job_title || "HR Business Partner";

    return `
        <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 6px;">
            <div>
                <span style="font-size: 11px; font-weight: bold; color: #1E3A5F;">Staff: ${staffName} ${staffEmpNo !== "—" ? `(${staffEmpNo})` : ""}</span>
                <span style="font-size: 10px; color: #64748B; margin-left: 10px;">${staffTitle} • ${staffDept} • ${staffBranch}</span>
            </div>
            <div style="font-size: 11px; font-weight: bold; color: #15803D;">
                Total KPI Weighted Score: ${totalWeighted.toFixed(2)}%
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 24%;">KPI Title & Description</th>
                    <th style="width: 18%;">Target & Actual</th>
                    <th class="text-center" style="width: 8%;">Weight</th>
                    <th class="text-center" style="width: 11%;">Self Rating</th>
                    <th class="text-center" style="width: 11%;">Supervisor Rating</th>
                    <th class="text-center" style="width: 10%;">Weighted Score</th>
                    <th class="text-center" style="width: 8%;">Status</th>
                    <th style="width: 10%;">Sup. Comment</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map((kpi) => `
                    <tr>
                        <td>
                            <strong>${kpi.title}</strong>
                            ${kpi.description ? `<div style="font-size: 9px; color: #64748B; margin-top: 2px;">${kpi.description}</div>` : ""}
                        </td>
                        <td style="font-size: 9px;">
                            ${kpi.target ? `<div><strong>Target:</strong> ${kpi.target}</div>` : ""}
                            ${kpi.actual_result ? `<div style="margin-top: 2px; color: #1E3A5F;"><strong>Actual:</strong> ${kpi.actual_result}</div>` : ""}
                        </td>
                        <td class="text-center font-bold">${kpi.weight}%</td>
                        <td class="text-center">
                            ${kpi.self_rating !== null && kpi.self_rating !== undefined ? Number(kpi.self_rating).toFixed(2) : "—"}
                            ${kpi.self_comment ? `<div style="font-size: 8px; color: #64748B; font-style: italic;">"${kpi.self_comment}"</div>` : ""}
                        </td>
                        <td class="text-center">
                            ${kpi.supervisor_rating !== null && kpi.supervisor_rating !== undefined ? Number(kpi.supervisor_rating).toFixed(2) : "—"}
                        </td>
                        <td class="text-center font-bold" style="color: #15803D;">
                            ${kpi.weighted_score !== null && kpi.weighted_score !== undefined ? `${Number(kpi.weighted_score).toFixed(2)}%` : "—"}
                        </td>
                        <td class="text-center" style="font-size: 8.5px; text-transform: uppercase;">
                            ${kpi.evaluation_status || "—"}
                        </td>
                        <td style="font-size: 8.5px; font-style: italic; color: #C2410C;">
                            ${kpi.supervisor_comment || "—"}
                        </td>
                    </tr>
                `).join("")}
                <tr class="bg-gray-100 font-bold">
                    <td colspan="2" class="text-right">Total / Average</td>
                    <td class="text-center">${totalWeight}%</td>
                    <td class="text-center">${avgSelf !== null ? avgSelf.toFixed(2) : "—"}</td>
                    <td class="text-center">${avgSup !== null ? avgSup.toFixed(2) : "—"}</td>
                    <td class="text-center" style="color: #15803D;">${totalWeighted.toFixed(2)}%</td>
                    <td colspan="2"></td>
                </tr>
            </tbody>
        </table>

        <!-- Section 1: Comments by Staff -->
        <div style="margin-top: 14px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; page-break-inside: avoid;">
            <div style="background-color: #F8FAFC; border-bottom: 2px solid #15803D; padding: 6px 12px; font-weight: bold; font-size: 10.5px; color: #15803D; display: flex; justify-content: space-between;">
                <span>SECTION 1: COMMENTS BY STAFF / APPRAISEE</span>
                <span style="font-size: 9px; font-weight: normal; color: #6B7280;">Self-Reflection & Commitments</span>
            </div>
            <div style="padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div style="border: 1px solid #BBF7D0; background-color: #F0FDF4; padding: 8px 10px; border-radius: 4px;">
                    <div style="font-weight: bold; font-size: 9px; color: #166534; margin-bottom: 4px; text-transform: uppercase;">
                        A. Staff Comments on Appraisal - Why Achieved Results As Above
                    </div>
                    <div style="font-size: 9px; color: #374151; white-space: pre-line; line-height: 1.4; min-height: 35px;">
                        ${staffReasons}
                    </div>
                </div>
                <div style="border: 1px solid #BBF7D0; background-color: #F0FDF4; padding: 8px 10px; border-radius: 4px;">
                    <div style="font-weight: bold; font-size: 9px; color: #166534; margin-bottom: 4px; text-transform: uppercase;">
                        B. Staff Commitment on Future Performance
                    </div>
                    <div style="font-size: 9px; color: #374151; white-space: pre-line; line-height: 1.4; min-height: 35px;">
                        ${staffCommitment}
                    </div>
                </div>
                <div style="border: 1px solid #BBF7D0; background-color: #F0FDF4; padding: 8px 10px; border-radius: 4px;">
                    <div style="font-weight: bold; font-size: 9px; color: #166534; margin-bottom: 4px; text-transform: uppercase;">
                        C. Staff Requests for Training / Development
                    </div>
                    <div style="font-size: 9px; color: #374151; white-space: pre-line; line-height: 1.4; min-height: 35px;">
                        ${staffTraining}
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 2: Comments by Supervisor -->
        <div style="margin-top: 12px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; page-break-inside: avoid;">
            <div style="background-color: #F8FAFC; border-bottom: 2px solid #EA580C; padding: 6px 12px; font-weight: bold; font-size: 10.5px; color: #1E3A5F; display: flex; justify-content: space-between;">
                <span>SECTION 2: COMMENTS BY SUPERVISOR</span>
                <span style="font-size: 9px; font-weight: normal; color: #6B7280;">Supervisory Review & Coaching</span>
            </div>
            <div style="padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div style="border: 1px solid #FED7AA; background-color: #FFF7ED; padding: 8px 10px; border-radius: 4px;">
                    <div style="font-weight: bold; font-size: 9.5px; color: #C2410C; margin-bottom: 4px; text-transform: uppercase;">
                        A. Employee's Positives / Strengths
                    </div>
                    <div style="font-size: 9.5px; color: #374151; white-space: pre-line; line-height: 1.4; min-height: 35px;">
                        ${supPositives}
                    </div>
                </div>
                <div style="border: 1px solid #FED7AA; background-color: #FFF7ED; padding: 8px 10px; border-radius: 4px;">
                    <div style="font-weight: bold; font-size: 9.5px; color: #C2410C; margin-bottom: 4px; text-transform: uppercase;">
                        B. Areas Employee / Appraisee Should Concentrate In To Improve Performance
                    </div>
                    <div style="font-size: 9.5px; color: #374151; white-space: pre-line; line-height: 1.4; min-height: 35px;">
                        ${supAreas}
                    </div>
                </div>
            </div>
        </div>

        <!-- Section 3: Concluding Remarks by Supervisor -->
        <div style="margin-top: 12px; border: 1px solid #D1D5DB; border-radius: 6px; overflow: hidden; page-break-inside: avoid;">
            <div style="background-color: #F8FAFC; border-bottom: 1px solid #D1D5DB; padding: 6px 12px; font-weight: bold; font-size: 10px; color: #111827;">
                SECTION 3: CONCLUDING REMARKS BY SUPERVISOR <span style="font-weight: normal; font-size: 9px; color: #6B7280;">(To be completed after report printing)</span>
            </div>
            <div style="padding: 10px 12px;">
                ${supConcluding ? `<div style="font-size: 9.5px; color: #111827; margin-bottom: 8px; font-weight: 500;">${supConcluding}</div>` : ""}
                <div style="border-bottom: 1px dashed #CBD5E1; height: 18px; margin-bottom: 6px;"></div>
                <div style="border-bottom: 1px dashed #CBD5E1; height: 18px; margin-bottom: 6px;"></div>
                <div style="border-bottom: 1px dashed #CBD5E1; height: 18px; margin-bottom: 6px;"></div>
            </div>
        </div>

        <!-- Section 4: Sign-Off and Official Stamp -->
        <div style="margin-top: 14px; border: 1px solid #D1D5DB; border-radius: 6px; overflow: hidden; page-break-inside: avoid;">
            <div style="background-color: #F8FAFC; border-bottom: 2px solid #15803D; padding: 6px 12px; font-weight: bold; font-size: 10.5px; color: #15803D; display: flex; justify-content: space-between;">
                <span>SECTION 4: APPRAISAL SIGN-OFF & OFFICIAL APPROVALS</span>
                <span style="font-size: 9px; font-weight: normal; color: #6B7280;">To be signed and stamped upon download/print</span>
            </div>
            <div style="padding: 10px 14px; display: grid; grid-template-columns: 1.1fr 1.1fr 1.4fr; gap: 14px; font-size: 9.5px;">
                <div style="border: 1px solid #E5E7EB; border-radius: 4px; padding: 8px 10px; background-color: #FFFFFF;">
                    <div style="font-weight: bold; color: #111827; border-bottom: 1px solid #F3F4F6; padding-bottom: 4px; margin-bottom: 6px;">
                        1. Appraisee / Staff Member
                    </div>
                    <div>Name: <strong>${staffName}</strong></div>
                    <div style="margin-top: 2px;">Emp No: <strong>${staffEmpNo}</strong></div>
                    <div style="margin-top: 2px;">Title: <strong>${staffTitle}</strong></div>
                    <div style="margin-top: 16px;">Signature: <span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 120px;"></span></div>
                    <div style="margin-top: 6px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 120px;"></span></div>
                </div>

                <div style="border: 1px solid #E5E7EB; border-radius: 4px; padding: 8px 10px; background-color: #FFFFFF;">
                    <div style="font-weight: bold; color: #111827; border-bottom: 1px solid #F3F4F6; padding-bottom: 4px; margin-bottom: 6px;">
                        2. Immediate Supervisor
                    </div>
                    <div>Name: <strong>${supervisorName}</strong></div>
                    <div style="margin-top: 2px;">Emp No: <strong>${supervisorEmpNo}</strong></div>
                    <div style="margin-top: 2px;">Title: <strong>${supervisorTitle}</strong></div>
                    <div style="margin-top: 16px;">Signature: <span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 120px;"></span></div>
                    <div style="margin-top: 6px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 120px;"></span></div>
                </div>

                <div style="border: 1px solid #E5E7EB; border-radius: 4px; padding: 8px 10px; background-color: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <div style="font-weight: bold; color: #15803D; border-bottom: 1px solid #F3F4F6; padding-bottom: 4px; margin-bottom: 6px;">
                            3. Regional HR Business Partner
                        </div>
                        <div>Name: <strong>${hrbpName}</strong></div>
                        <div style="margin-top: 2px;">Region: <strong>${hrbpRegion}</strong></div>
                        <div style="margin-top: 2px;">Title: <strong>${hrbpTitle}</strong></div>
                        <div style="margin-top: 10px;">Signature: <span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 110px;"></span></div>
                        <div style="margin-top: 5px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="display: inline-block; border-bottom: 1px solid #6B7280; width: 110px;"></span></div>
                    </div>
                    <div style="margin-top: 8px; border: 2px dashed #15803D; border-radius: 4px; padding: 6px; text-align: center; background-color: #F0FDF4;">
                        <div style="font-size: 8px; font-weight: bold; color: #15803D; text-transform: uppercase; letter-spacing: 0.5px;">
                            OFFICIAL HRBP STAMP
                        </div>
                        <div style="font-size: 7.5px; color: #6B7280; margin-top: 2px;">
                            (To be affixed after report print)
                        </div>
                        <div style="font-size: 8px; font-weight: bold; color: #EA580C; margin-top: 8px;">
                            PROGRESSIVE CREDIT LTD
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export default function PerformanceReports({
    kpiCycle,
    threeSixtyCycle,
    kpiCycles = [],
    threeSixtyCycles = [],
    orgCoreValueRanking,
    topCoreValueRankings = [],
    unitSummary,
    myKpiReport = [],
    kpiAppraisalData = null,
    targetKpiUser = null,
    canEditKpiComments = { canEditStaff: false, canEditSupervisor: false },
    myCoreValueReport = [],
    canManage,
    isIndividualOnly = false,
    currentUser,
    departments = [],
    branches = [],
    availableUsers = [],
    detailed360Report = null,
    selectedEvaluateeId = null,
    branchDeptKpiReport = [],
    branchDept360Report = { core_values: [], members: [] },
    combinedPerformance = [],
    savedKpiWeight = 70,
    savedThreeSixtyWeight = 30,
    isThreeSixtyPeriodElapsed = false,
    threeSixtyCycleDeadline = null,
    canEditSubmittedComments = false,
    isSupervisor: isSupervisorProp = false,
    filters,
}: Props) {
    const { props } = usePage();
    const roles: string[] = (props.auth as any)?.roles ?? [];
    const isSuperAdmin = Boolean((props.auth as any)?.canManageTeams || roles.includes("Super Admin"));
    const isHrbp = roles.includes("HR Business Partner");
    const isHrbpOrSuperAdmin = isSuperAdmin || isHrbp;
    const currentTeamSlug = (props.currentTeam as any)?.slug;

    const [activeTab, setActiveTab] = useState<TabId>(
        selectedEvaluateeId && !isIndividualOnly ? "detailed-360" : "combined",
    );

    const [kpiWeight, setKpiWeight] = useState<number>(
        filters.kpi_weight || savedKpiWeight,
    );
    const [threeSixtyWeight, setThreeSixtyWeight] = useState<number>(
        filters.three_sixty_weight || savedThreeSixtyWeight,
    );
    const [expandedKpiUserId, setExpandedKpiUserId] = useState<number | null>(
        null,
    );
    const [searchTerm, setSearchTerm] = useState("");
    const [cvRankingView, setCvRankingView] = useState<
        "all" | "top" | "bottom"
    >("all");

    // Staff appraisal comments state
    const [isEditingStaffComments, setIsEditingStaffComments] = useState<boolean>(false);
    const [staffOverallComment, setStaffOverallComment] = useState<string>(
        detailed360Report?.staff_comment?.overall_comment || ""
    );
    const [staffParameterComments, setStaffParameterComments] = useState<Record<string, string>>(
        detailed360Report?.staff_comment?.parameter_comments || {}
    );
    const [isSubmittingStaffComments, setIsSubmittingStaffComments] = useState<boolean>(false);
    const [highlightMissingComments, setHighlightMissingComments] = useState<boolean>(false);

    useEffect(() => {
        if (detailed360Report?.staff_comment) {
            setStaffOverallComment(detailed360Report.staff_comment.overall_comment || "");
            setStaffParameterComments(detailed360Report.staff_comment.parameter_comments || {});
        } else {
            setStaffOverallComment("");
            setStaffParameterComments({});
        }
        setHighlightMissingComments(false);
    }, [detailed360Report]);

    const allDetailedQuestions = useMemo(() => {
        if (!detailed360Report?.sections) return [];
        return detailed360Report.sections.flatMap((s) => s.questions);
    }, [detailed360Report]);

    const pendingQuestionIds = useMemo(() => {
        return allDetailedQuestions
            .filter((q) => !staffParameterComments[String(q.id)]?.trim())
            .map((q) => q.id);
    }, [allDetailedQuestions, staffParameterComments]);

    const isOverallCommentPending = !staffOverallComment?.trim();
    const totalPendingCommentsCount = pendingQuestionIds.length + (isOverallCommentPending ? 1 : 0);

    const handleParamCommentChange = (qId: number | string, val: string) => {
        setStaffParameterComments((prev) => ({
            ...prev,
            [String(qId)]: val,
        }));
    };

    const handleSaveStaffComments = (status: "draft" | "submitted") => {
        if (!threeSixtyCycle?.id) return;

        // Block final submission if any comment is pending
        if (status === "submitted" && totalPendingCommentsCount > 0) {
            setHighlightMissingComments(true);
            return;
        }

        setIsSubmittingStaffComments(true);

        router.post(
            `/${currentTeamSlug}/reports/three-sixty/staff-comment`,
            {
                three_sixty_cycle_id: threeSixtyCycle.id,
                evaluatee_id: detailed360Report?.user?.id,
                overall_comment: staffOverallComment,
                parameter_comments: staffParameterComments,
                status: status,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingStaffComments(false);
                    setHighlightMissingComments(false);
                },
                onFinish: () => {
                    setIsSubmittingStaffComments(false);
                },
            }
        );
    };

    // KPI appraisal comments state
    const [kpiSupervisorPositives, setKpiSupervisorPositives] = useState<string>(
        kpiAppraisalData?.comment?.supervisor_positives || ""
    );
    const [kpiSupervisorAreasToImprove, setKpiSupervisorAreasToImprove] = useState<string>(
        kpiAppraisalData?.comment?.supervisor_areas_to_improve || ""
    );
    const [kpiSupervisorConcludingRemarks, setKpiSupervisorConcludingRemarks] = useState<string>(
        kpiAppraisalData?.comment?.supervisor_concluding_remarks || ""
    );
    const [kpiStaffAchievementReasons, setKpiStaffAchievementReasons] = useState<string>(
        kpiAppraisalData?.comment?.staff_achievement_reasons || ""
    );
    const [kpiStaffFutureCommitment, setKpiStaffFutureCommitment] = useState<string>(
        kpiAppraisalData?.comment?.staff_future_commitment || ""
    );
    const [kpiStaffTrainingRequests, setKpiStaffTrainingRequests] = useState<string>(
        kpiAppraisalData?.comment?.staff_training_requests || ""
    );
    const [isSubmittingKpiComments, setIsSubmittingKpiComments] = useState<boolean>(false);

    useEffect(() => {
        setKpiSupervisorPositives(kpiAppraisalData?.comment?.supervisor_positives || "");
        setKpiSupervisorAreasToImprove(kpiAppraisalData?.comment?.supervisor_areas_to_improve || "");
        setKpiSupervisorConcludingRemarks(kpiAppraisalData?.comment?.supervisor_concluding_remarks || "");
        setKpiStaffAchievementReasons(kpiAppraisalData?.comment?.staff_achievement_reasons || "");
        setKpiStaffFutureCommitment(kpiAppraisalData?.comment?.staff_future_commitment || "");
        setKpiStaffTrainingRequests(kpiAppraisalData?.comment?.staff_training_requests || "");
    }, [kpiAppraisalData]);

    const handleSaveKpiComments = (status: "draft" | "submitted") => {
        if (!kpiCycle?.id) return;
        setIsSubmittingKpiComments(true);

        const targetUserId = targetKpiUser?.id || currentUser?.id;

        router.post(
            `/${currentTeamSlug}/reports/kpi/comment`,
            {
                kpi_cycle_id: kpiCycle.id,
                user_id: targetUserId,
                supervisor_positives: kpiSupervisorPositives,
                supervisor_areas_to_improve: kpiSupervisorAreasToImprove,
                supervisor_concluding_remarks: kpiSupervisorConcludingRemarks,
                staff_achievement_reasons: kpiStaffAchievementReasons,
                staff_future_commitment: kpiStaffFutureCommitment,
                staff_training_requests: kpiStaffTrainingRequests,
                status: status,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsSubmittingKpiComments(false);
                },
            }
        );
    };

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

        router.get(
            window.location.pathname + "?" + params.toString(),
            {},
            { preserveState: true },
        );
    };

    const getFilterInfo = () => {
        if (isIndividualOnly) {
            return `Staff: ${currentUser?.name || "Self"} | Department: ${currentUser?.department || "—"} | Branch: ${currentUser?.branch || "—"}`;
        }
        const parts: string[] = [];
        if (filters.department_id) {
            const d = departments.find(
                (dept) => dept.id === filters.department_id,
            );
            if (d) parts.push(`Department: ${d.name}`);
        }
        if (filters.team_id) {
            const b = branches.find((branch) => branch.id === filters.team_id);
            if (b) parts.push(`Branch: ${b.name}`);
        }
        if (filters.user_id) {
            const u = availableUsers.find(
                (user) => user.id === filters.user_id,
            );
            if (u) parts.push(`Staff: ${u.name}`);
        }
        return parts.join(" | ") || "All Departments & Branches";
    };

    const getStaffTeamName = (report: Detailed360Report | null | undefined): string | null => {
        if (!report) return null;
        const raw =
            report.user.team_name ||
            report.sign_off?.staff?.team ||
            report.sign_off?.staff?.branch ||
            report.user.branch_name ||
            report.sign_off?.staff?.department ||
            report.user.department_name;
        if (!raw || raw === "—" || raw === "-") return null;
        return raw.trim();
    };

    const getStaffReportTitle = (report: Detailed360Report | null | undefined): string => {
        const team = getStaffTeamName(report);
        if (!team) {
            return "Staff 360Degrees Performance Appraisal - Feedback";
        }
        if (/staff$/i.test(team)) {
            return `${team} 360Degrees Performance Appraisal - Feedback`;
        }
        return `${team} Staff 360Degrees Performance Appraisal - Feedback`;
    };

    const getStaffPeerBannerText = (report: Detailed360Report | null | undefined): string => {
        const team = getStaffTeamName(report);
        if (!team) {
            return "360 Degrees feedback by Peers - Staff";
        }
        if (/staff$/i.test(team)) {
            return `360 Degrees feedback by Peers - ${team}`;
        }
        return `360 Degrees feedback by Peers - ${team} Staff`;
    };

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = isIndividualOnly
        ? [
            {
                id: "combined",
                label: "My Combined Performance",
                icon: <Sliders className="h-4 w-4" />,
            },
            {
                id: "kpi-reports",
                label: "My KPI Performance",
                icon: <ClipboardList className="h-4 w-4" />,
            },
            {
                id: "detailed-360",
                label: "My 360° Appraisal Report",
                icon: <FileText className="h-4 w-4" />,
            },
            {
                id: "org-ranking",
                label: "Company Core Values Benchmark",
                icon: <BarChart2 className="h-4 w-4" />,
            },
        ]
        : [
            {
                id: "combined",
                label: "Combined Performance (Weighted)",
                icon: <Sliders className="h-4 w-4" />,
            },
            {
                id: "top-5-cv",
                label: "Top 5 & Last 3 (Growth Areas) Rankings",
                icon: <Trophy className="h-4 w-4" />,
            },
            {
                id: "detailed-360",
                label: "360° Individual Report",
                icon: <FileText className="h-4 w-4" />,
            },
            {
                id: "branch-360",
                label: "360° Branch / Dept Overview",
                icon: <Layers className="h-4 w-4" />,
            },
            {
                id: "kpi-reports",
                label: "KPI Performance Reports",
                icon: <ClipboardList className="h-4 w-4" />,
            },
            {
                id: "org-ranking",
                label: "Org Core Value Ranking",
                icon: <BarChart2 className="h-4 w-4" />,
            },
            {
                id: "unit-summary",
                label: "Unit / Branch Summary",
                icon: <Building2 className="h-4 w-4" />,
            },
        ];

    const filteredCombined = combinedPerformance.filter(
        (m) =>
            m.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.employee_no &&
                m.employee_no
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())) ||
            m.department_name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            m.branch_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <>
            <Head title="Performance Reports" />
            <div
                className="flex h-full w-full flex-1 flex-col"
                style={{ backgroundColor: C.bg, padding: "1.5rem" }}
            >
                <div className="mx-auto w-full max-w-8xl">
                    {/* Header */}
                    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1
                                    className="text-2xl font-bold tracking-tight"
                                    style={{ color: C.navy }}
                                >
                                    {isIndividualOnly
                                        ? "My Performance & Appraisal Reports"
                                        : "Performance & Appraisal Reports"}
                                </h1>
                                {isIndividualOnly && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800">
                                        Personal Report
                                    </span>
                                )}
                                {isHrbpOrSuperAdmin && currentTeamSlug && (
                                    <Link
                                        href={`/${currentTeamSlug}/reports/feedback-summary`}
                                        className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-900 shadow-xs transition hover:bg-purple-100"
                                    >
                                        <MessageSquare className="h-3.5 w-3.5 text-purple-700" />
                                        360 Feedback & Comments Report
                                    </Link>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                {isIndividualOnly && currentUser ? (
                                    <span>
                                        Employee: <strong className="text-gray-800">{currentUser.name}</strong>
                                        {currentUser.employee_no && ` (${currentUser.employee_no})`} • {currentUser.job_title || "Staff"} • {currentUser.department} • {currentUser.branch}
                                        {" "}•{" "}
                                    </span>
                                ) : null}
                                <span>Period: </span>
                                {kpiCycle && (
                                    <span>
                                        KPI: <strong className="text-gray-800">{kpiCycle.name}</strong>
                                        {" "}&nbsp;|&nbsp;{" "}
                                    </span>
                                )}
                                {threeSixtyCycle && (
                                    <span>
                                        360°: <strong className="text-gray-800">{threeSixtyCycle.name}</strong>
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Appraisal Cycle Selector Dropdown */}
                        {kpiCycles.length > 0 && (
                            <div
                                className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2 shadow-xs"
                                style={{ borderColor: C.border }}
                            >
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                    <Calendar className="h-4 w-4 text-orange-600" />
                                    <span>Appraisal Cycle:</span>
                                </div>
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[220px]"
                                    options={kpiCycles.map((c) => ({
                                        value: c.id,
                                        label: `${c.name} ${c.period_start ? `(${new Date(c.period_start).getFullYear()})` : ""} [${c.status.toUpperCase()}]`,
                                    }))}
                                    value={kpiCycle?.id || ""}
                                    onChange={(val) => {
                                        const selectedId = Number(val);
                                        const matched360 = threeSixtyCycles.find(
                                            (c) => c.kpi_cycle_id === selectedId,
                                        );
                                        applyFilter({
                                            kpi_cycle_id: selectedId,
                                            three_sixty_cycle_id: matched360 ? matched360.id : null,
                                        });
                                    }}
                                    placeholder="Select cycle..."
                                    searchPlaceholder="Search cycle..."
                                />

                                {threeSixtyCycles.length > 1 && (
                                    <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2.5">
                                        <span className="text-[11px] font-semibold text-gray-500">
                                            360°:
                                        </span>
                                        <SearchableSelect
                                            size="sm"
                                            className="min-w-[190px]"
                                            options={threeSixtyCycles.map((c) => ({
                                                value: c.id,
                                                label: `${c.name} [${c.status.toUpperCase()}]`,
                                            }))}
                                            value={threeSixtyCycle?.id || ""}
                                            onChange={(val) => {
                                                applyFilter({
                                                    three_sixty_cycle_id: Number(val),
                                                });
                                            }}
                                            placeholder="Select 360° cycle..."
                                            searchPlaceholder="Search 360° cycle..."
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition-all ${
                                    activeTab === tab.id
                                        ? "border-orange-600 text-orange-600 bg-orange-50/50 rounded-t-lg"
                                        : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter Bar (Common for multi-member views - Hidden for individual users) */}
                    {!isIndividualOnly && ["combined", "branch-360", "kpi-reports"].includes(
                        activeTab,
                    ) && (
                        <div
                            className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-xs"
                            style={{ borderColor: C.border }}
                        >
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                                    <Filter className="h-3.5 w-3.5 text-orange-600" />
                                    Filter by:
                                </div>

                                {/* Department Filter */}
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
                                            department_id: String(val),
                                            user_id: "",
                                        })
                                    }
                                    placeholder="All Departments"
                                    searchPlaceholder="Search departments..."
                                />

                                {/* Branch/Team Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[180px]"
                                    options={[
                                        { value: "", label: "All Branches / Units" },
                                        ...branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} ${b.type ? `(${b.type})` : ""}`,
                                        })),
                                    ]}
                                    value={filters.team_id || ""}
                                    onChange={(val) =>
                                        applyFilter({
                                            team_id: String(val),
                                            user_id: "",
                                        })
                                    }
                                    placeholder="All Branches / Units"
                                    searchPlaceholder="Search branches..."
                                />

                                {/* Individual Staff Filter */}
                                <SearchableSelect
                                    size="sm"
                                    className="min-w-[190px]"
                                    options={[
                                        { value: "", label: "All Staff Members" },
                                        ...availableUsers.map((u) => ({
                                            value: u.id,
                                            label: `${u.name} ${u.employee_no ? `(${u.employee_no})` : ""}`,
                                        })),
                                    ]}
                                    value={filters.user_id || ""}
                                    onChange={(val) =>
                                        applyFilter({ user_id: String(val) })
                                    }
                                    placeholder="All Staff Members"
                                    searchPlaceholder="Search staff..."
                                />

                                {(filters.department_id ||
                                    filters.team_id ||
                                    filters.user_id) && (
                                    <button
                                        onClick={() =>
                                            applyFilter({
                                                department_id: "",
                                                team_id: "",
                                                user_id: "",
                                            })
                                        }
                                        className="text-xs font-semibold text-orange-600 hover:underline"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>

                            {/* Search box */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search staff name..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="rounded-lg border py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    style={{ borderColor: C.border }}
                                />
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 1: COMBINED PERFORMANCE REPORT (WEIGHTED) */}
                    {/* ========================================================= */}
                    {activeTab === "combined" && (
                        <div className="space-y-6">
                            {/* Weight Configuration Banner */}
                            <div
                                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-linear-to-r from-orange-50/70 to-blue-50/70 p-4 shadow-xs"
                                style={{ borderColor: C.border }}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-gray-900">
                                            ⚖️ Performance Weight Configuration
                                        </h3>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                                            System Default: {savedKpiWeight}%
                                            KPI / {savedThreeSixtyWeight}% 360°
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Applied automatically from system
                                        settings. Tweak below for ad-hoc
                                        analysis, or{" "}
                                        {canManage ? (
                                            <Link
                                                href="/settings/performance-weights"
                                                className="font-bold underline transition-colors hover:text-orange-700"
                                                style={{ color: C.orangeDark }}
                                            >
                                                manage org-wide defaults in
                                                Settings →
                                            </Link>
                                        ) : (
                                            <span>
                                                configured by system
                                                administrators.
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                        <span>KPI:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={kpiWeight}
                                            onChange={(e) => {
                                                const val = Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        Number(e.target.value),
                                                    ),
                                                );
                                                setKpiWeight(val);
                                                setThreeSixtyWeight(100 - val);
                                            }}
                                            className="w-16 rounded-md border bg-white px-2 py-1 text-center font-bold text-gray-800"
                                            style={{ borderColor: C.border }}
                                        />
                                        <span>%</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                        <span>360°:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={threeSixtyWeight}
                                            onChange={(e) => {
                                                const val = Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        Number(e.target.value),
                                                    ),
                                                );
                                                setThreeSixtyWeight(val);
                                                setKpiWeight(100 - val);
                                            }}
                                            className="w-16 rounded-md border bg-white px-2 py-1 text-center font-bold text-gray-800"
                                            style={{ borderColor: C.border }}
                                        />
                                        <span>%</span>
                                    </div>
                                    <button
                                        onClick={() =>
                                            applyFilter({
                                                kpi_weight: kpiWeight,
                                                three_sixty_weight:
                                                    threeSixtyWeight,
                                            })
                                        }
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:opacity-90"
                                        style={{
                                            backgroundColor: C.orangeDark,
                                        }}
                                    >
                                        Apply Weights
                                    </button>
                                    {(kpiWeight !== savedKpiWeight ||
                                        threeSixtyWeight !==
                                            savedThreeSixtyWeight) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKpiWeight(savedKpiWeight);
                                                setThreeSixtyWeight(
                                                    savedThreeSixtyWeight,
                                                );
                                                applyFilter({
                                                    kpi_weight: savedKpiWeight,
                                                    three_sixty_weight:
                                                        savedThreeSixtyWeight,
                                                });
                                            }}
                                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
                                        >
                                            Reset to Default
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Personal Score Summary Cards for Individual User */}
                            {isIndividualOnly && combinedPerformance.length > 0 && (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                        <p className="text-xs font-semibold text-gray-500">Overall Combined Score</p>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold text-gray-900">
                                                {combinedPerformance[0].combined_score !== null ? `${combinedPerformance[0].combined_score}%` : "—"}
                                            </span>
                                            <TierBadge tier={combinedPerformance[0].performance_tier} />
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Formula: ({kpiWeight}% KPI + {threeSixtyWeight}% 360°)
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                        <p className="text-xs font-semibold text-gray-500">KPI Goal Score</p>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold" style={{ color: C.navy }}>
                                                {combinedPerformance[0].kpi_score !== null ? `${combinedPerformance[0].kpi_score}%` : "—"}
                                            </span>
                                            <span className="text-xs font-semibold text-gray-500">
                                                (Weight: {kpiWeight}%)
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Contribution: {combinedPerformance[0].kpi_score !== null ? `${((combinedPerformance[0].kpi_score * kpiWeight) / 100).toFixed(2)}%` : "—"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                        <p className="text-xs font-semibold text-gray-500">360° Behavioral Competency</p>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <span className="text-3xl font-extrabold" style={{ color: C.orangeDark }}>
                                                {combinedPerformance[0].three_sixty_raw !== null ? `${combinedPerformance[0].three_sixty_raw.toFixed(2)} / 5` : "—"}
                                            </span>
                                            <span className="text-xs font-bold text-gray-700">
                                                ({combinedPerformance[0].three_sixty_percent !== null ? `${combinedPerformance[0].three_sixty_percent}%` : "—"})
                                            </span>
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Contribution: {combinedPerformance[0].three_sixty_percent !== null ? `${((combinedPerformance[0].three_sixty_percent * threeSixtyWeight) / 100).toFixed(2)}%` : "—"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                        <p className="text-xs font-semibold text-gray-500">Appraisal Standing</p>
                                        <div className="mt-2">
                                            <p className="text-sm font-bold text-gray-900">
                                                {combinedPerformance[0].performance_tier}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-[11px] text-gray-400">
                                            Staff: {currentUser?.name}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Export Bar */}
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900">
                                    {isIndividualOnly
                                        ? "My Performance Appraisal & Weighted Score"
                                        : `Staff Combined Performance Rankings (${filteredCombined.length} Staff Members)`}
                                </h2>
                                <ExportButtons
                                    onExportPdf={() => {
                                        const meta: ReportMeta = {
                                            title: isIndividualOnly
                                                ? "Personal Combined Performance & Appraisal Report"
                                                : "Combined Performance & Appraisal Report",
                                            subtitle: isIndividualOnly
                                                ? `Staff: ${currentUser?.name || ""} (${currentUser?.employee_no || ""}) • Weighted Score: KPI (${kpiWeight}%) + 360° Appraisals (${threeSixtyWeight}%)`
                                                : `Weighted Score: KPI (${kpiWeight}%) + 360° Appraisals (${threeSixtyWeight}%)`,
                                            cycleName: `${kpiCycle?.name || ""} / ${threeSixtyCycle?.name || ""}`,
                                            filterInfo: getFilterInfo(),
                                            orientation: "landscape",
                                        };

                                        const tableHtml = `
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th class="text-center" style="width: 45px;">Rank</th>
                                                        <th>Staff Name</th>
                                                        <th>Emp No</th>
                                                        <th>Job Title</th>
                                                        <th>Department</th>
                                                        <th>Branch</th>
                                                        <th class="text-center">KPI (${kpiWeight}%)</th>
                                                        <th class="text-center">360° Raw (/5)</th>
                                                        <th class="text-center">360° (${threeSixtyWeight}%)</th>
                                                        <th class="text-center">Combined Final Score</th>
                                                        <th class="text-center">Performance Tier</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${filteredCombined
                                                        .map(
                                                            (m, idx) => `
                                                        <tr>
                                                            <td class="text-center font-bold">#${idx + 1}</td>
                                                            <td class="font-bold">${m.user_name}</td>
                                                            <td>${m.employee_no || "—"}</td>
                                                            <td>${m.job_title || "Staff"}</td>
                                                            <td>${m.department_name}</td>
                                                            <td>${m.branch_name}</td>
                                                            <td class="text-center font-semibold">${m.kpi_score !== null ? `${m.kpi_score}%` : "—"}</td>
                                                            <td class="text-center">${m.three_sixty_raw !== null ? m.three_sixty_raw.toFixed(2) : "—"}</td>
                                                            <td class="text-center font-semibold">${m.three_sixty_percent !== null ? `${m.three_sixty_percent}%` : "—"}</td>
                                                            <td class="text-center font-bold" style="color: #EA580C; font-size: 11px;">${m.combined_score !== null ? `${m.combined_score}%` : "—"}</td>
                                                            <td class="text-center font-semibold">${m.performance_tier}</td>
                                                        </tr>
                                                    `,
                                                        )
                                                        .join("")}
                                                </tbody>
                                            </table>
                                        `;

                                        exportReportToPdf(meta, tableHtml);
                                    }}
                                    onExportExcel={() => {
                                        const meta: ReportMeta = {
                                            title: "Combined Performance & Appraisal Report",
                                            subtitle: `Weighted Score: KPI (${kpiWeight}%) + 360° Appraisals (${threeSixtyWeight}%)`,
                                            cycleName: `${kpiCycle?.name || ""} / ${threeSixtyCycle?.name || ""}`,
                                            filterInfo: getFilterInfo(),
                                        };

                                        const headers = [
                                            "Rank",
                                            "Staff Name",
                                            "Employee No",
                                            "Job Title",
                                            "Department",
                                            "Branch",
                                            `KPI Score (${kpiWeight}%)`,
                                            "360 Raw Score (/5)",
                                            `360 Score (${threeSixtyWeight}%)`,
                                            "Combined Final Score (%)",
                                            "Performance Tier",
                                        ];

                                        const rows = filteredCombined.map(
                                            (m, idx) => [
                                                idx + 1,
                                                m.user_name,
                                                m.employee_no || "",
                                                m.job_title || "",
                                                m.department_name,
                                                m.branch_name,
                                                m.kpi_score !== null
                                                    ? `${m.kpi_score}%`
                                                    : "",
                                                m.three_sixty_raw !== null
                                                    ? m.three_sixty_raw
                                                    : "",
                                                m.three_sixty_percent !== null
                                                    ? `${m.three_sixty_percent}%`
                                                    : "",
                                                m.combined_score !== null
                                                    ? `${m.combined_score}%`
                                                    : "",
                                                m.performance_tier,
                                            ],
                                        );

                                        exportReportToExcel(
                                            meta,
                                            headers,
                                            rows,
                                            "Combined-Performance-Report",
                                        );
                                    }}
                                />
                            </div>

                            {/* Table */}
                            {filteredCombined.length === 0 ? (
                                <EmptyState message="No performance records found matching the selected filters." />
                            ) : (
                                <div
                                    className="overflow-hidden rounded-xl border bg-white shadow-xs"
                                    style={{ borderColor: C.border }}
                                >
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr
                                                className="border-b bg-gray-50 text-left font-semibold text-gray-600"
                                                style={{
                                                    borderColor: C.border,
                                                }}
                                            >
                                                <th
                                                    className="px-4 py-3 text-center"
                                                    style={{ width: "60px" }}
                                                >
                                                    Rank
                                                </th>
                                                <th className="px-4 py-3">
                                                    Staff Details
                                                </th>
                                                <th className="px-4 py-3">
                                                    Branch / Department
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    KPI Score ({kpiWeight}%)
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    360° Score (
                                                    {threeSixtyWeight}%)
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Final Score
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Performance Tier
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            className="divide-y"
                                            style={{ borderColor: C.border }}
                                        >
                                            {filteredCombined.map((m, idx) => (
                                                <tr
                                                    key={m.user_id}
                                                    className={`hover:bg-gray-50/80 ${idx < 3 ? "bg-amber-50/20" : ""}`}
                                                >
                                                    <td className="px-4 py-3 text-center">
                                                        {idx === 0 ? (
                                                            <Medal className="mx-auto h-5 w-5 text-amber-500" />
                                                        ) : idx === 1 ? (
                                                            <Medal className="mx-auto h-5 w-5 text-gray-400" />
                                                        ) : idx === 2 ? (
                                                            <Medal className="mx-auto h-5 w-5 text-amber-700" />
                                                        ) : (
                                                            <span className="font-bold text-gray-600">
                                                                #{idx + 1}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-900">
                                                            {m.user_name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            {m.job_title ||
                                                                "Staff"}{" "}
                                                            {m.employee_no
                                                                ? `• ${m.employee_no}`
                                                                : ""}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-800">
                                                            {m.department_name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            {m.branch_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <PercentBadge
                                                            value={m.kpi_score}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <ScoreBadge
                                                                score={
                                                                    m.three_sixty_raw
                                                                }
                                                            />
                                                            {m.three_sixty_percent !==
                                                                null && (
                                                                <span className="text-[10px] text-gray-500">
                                                                    (
                                                                    {
                                                                        m.three_sixty_percent
                                                                    }
                                                                    %)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            className="inline-flex items-center gap-1.5 font-extrabold text-sm"
                                                            style={{
                                                                color: C.orangeDark,
                                                            }}
                                                        >
                                                            <TrendingUp className="h-4 w-4" />
                                                            {m.combined_score !==
                                                            null
                                                                ? `${m.combined_score}%`
                                                                : "—"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <TierBadge
                                                            tier={
                                                                m.performance_tier
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 2: Top 5 & Last 3 RANKINGS PER CORE VALUE */}
                    {/* ========================================================= */}
                    {activeTab === "top-5-cv" && (
                        <div className="space-y-6">
                            {/* Header & Export */}
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                                <div>
                                    <h2 className="text-base font-bold text-gray-900">
                                        🏆 Core Value Staff Rankings (Top 5 &
                                        Last 3 Growth Areas)
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Organization-wide top performers and
                                        development focus areas for each core
                                        value.
                                    </p>
                                </div>
                                <ExportButtons
                                    onExportPdf={() => {
                                        const viewSubtitle =
                                            cvRankingView === "top"
                                                ? "Top 5 Performers per Core Value"
                                                : cvRankingView === "bottom"
                                                  ? "Last 3 Ranked (Growth & Support Focus Areas) per Core Value"
                                                  : "Top 5 Performers & Last 3 Ranked (Growth Focus Areas)";

                                        const meta: ReportMeta = {
                                            title: "Core Value Staff Rankings (Top 5 & Last 3)",
                                            subtitle: viewSubtitle,
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                            orientation: "landscape",
                                        };

                                        const tableHtml = topCoreValueRankings
                                            .map((cv) => {
                                                const showTop =
                                                    cvRankingView === "all" ||
                                                    cvRankingView === "top";
                                                const showBottom =
                                                    cvRankingView === "all" ||
                                                    cvRankingView === "bottom";

                                                return `
                                            <div style="margin-bottom: 22px;">
                                                <div style="background-color: #FFF7ED; border: 1px solid #FED7AA; padding: 6px 10px; font-weight: bold; font-size: 12px; color: #9A3412;">
                                                    ${cv.core_value_name} (Weight: ${cv.weight}%) • Total Evaluated: ${cv.total_staff || cv.top_staff.length}
                                                </div>
                                                
                                                ${
                                                    showTop
                                                        ? `
                                                <div style="margin-top: 6px; font-weight: bold; font-size: 11px; color: #15803D;">🌟 Top 5 Performers</div>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th class="text-center" style="width: 45px;">Rank</th>
                                                            <th>Staff Name</th>
                                                            <th>Employee No</th>
                                                            <th>Job Title</th>
                                                            <th>Department</th>
                                                            <th>Branch</th>
                                                            <th class="text-center">Average Score (/5)</th>
                                                            <th class="text-center">Reviews</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${
                                                            cv.top_staff
                                                                .length === 0
                                                                ? `<tr><td colspan="8" class="text-center" style="color: #9CA3AF;">No evaluations found</td></tr>`
                                                                : cv.top_staff
                                                                      .map(
                                                                          (
                                                                              s,
                                                                          ) => `
                                                            <tr>
                                                                <td class="text-center font-bold">#${s.rank}</td>
                                                                <td class="font-bold">${s.user_name}</td>
                                                                <td>${s.employee_no || "—"}</td>
                                                                <td>${s.job_title || "Staff"}</td>
                                                                <td>${s.department_name}</td>
                                                                <td>${s.branch_name}</td>
                                                                <td class="text-center font-bold" style="color: #15803D;">${s.avg_score.toFixed(2)}</td>
                                                                <td class="text-center">${s.review_count}</td>
                                                            </tr>
                                                        `,
                                                                      )
                                                                      .join("")
                                                        }
                                                    </tbody>
                                                </table>
                                                `
                                                        : ""
                                                }

                                                ${
                                                    showBottom &&
                                                    cv.bottom_staff &&
                                                    cv.bottom_staff.length > 0
                                                        ? `
                                                    <div style="margin-top: 10px; font-weight: bold; font-size: 11px; color: #DC2626;">⚠️ Last 3 Ranked (Growth & Development Focus)</div>
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                <th class="text-center" style="width: 45px;">Rank</th>
                                                                <th>Staff Name</th>
                                                                <th>Employee No</th>
                                                                <th>Job Title</th>
                                                                <th>Department</th>
                                                                <th>Branch</th>
                                                                <th class="text-center">Average Score (/5)</th>
                                                                <th class="text-center">Reviews</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${cv.bottom_staff
                                                                .map(
                                                                    (s) => `
                                                                <tr>
                                                                    <td class="text-center font-bold" style="color: #DC2626;">#${s.rank}</td>
                                                                    <td class="font-bold">${s.user_name}</td>
                                                                    <td>${s.employee_no || "—"}</td>
                                                                    <td>${s.job_title || "Staff"}</td>
                                                                    <td>${s.department_name}</td>
                                                                    <td>${s.branch_name}</td>
                                                                    <td class="text-center font-bold" style="color: #DC2626;">${s.avg_score.toFixed(2)}</td>
                                                                    <td class="text-center">${s.review_count}</td>
                                                                </tr>
                                                            `,
                                                                )
                                                                .join("")}
                                                        </tbody>
                                                    </table>
                                                `
                                                        : ""
                                                }
                                            </div>
                                        `;
                                            })
                                            .join("");

                                        exportReportToPdf(meta, tableHtml);
                                    }}
                                    onExportExcel={() => {
                                        const viewSubtitle =
                                            cvRankingView === "top"
                                                ? "Top 5 Performers per Core Value"
                                                : cvRankingView === "bottom"
                                                  ? "Last 3 Ranked (Growth Focus Areas) per Core Value"
                                                  : "Top 5 Performers & Last 3 Ranked (Growth Focus Areas)";

                                        const meta: ReportMeta = {
                                            title: "Core Value Staff Rankings (Top 5 & Last 3)",
                                            subtitle: viewSubtitle,
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                        };

                                        const headers = [
                                            "Core Value",
                                            "Weight (%)",
                                            "Category",
                                            "Rank",
                                            "Staff Name",
                                            "Employee No",
                                            "Job Title",
                                            "Department",
                                            "Branch",
                                            "Average Score (/5)",
                                            "Reviews Received",
                                        ];

                                        const rows: (
                                            | string
                                            | number
                                            | null
                                            | undefined
                                        )[][] = [];

                                        topCoreValueRankings.forEach((cv) => {
                                            const showTop =
                                                cvRankingView === "all" ||
                                                cvRankingView === "top";
                                            const showBottom =
                                                cvRankingView === "all" ||
                                                cvRankingView === "bottom";

                                            if (showTop) {
                                                cv.top_staff.forEach((s) => {
                                                    rows.push([
                                                        cv.core_value_name,
                                                        `${cv.weight}%`,
                                                        "Top 5 Performer",
                                                        s.rank,
                                                        s.user_name,
                                                        s.employee_no || "",
                                                        s.job_title || "",
                                                        s.department_name,
                                                        s.branch_name,
                                                        s.avg_score,
                                                        s.review_count,
                                                    ]);
                                                });
                                            }

                                            if (showBottom && cv.bottom_staff) {
                                                cv.bottom_staff.forEach((s) => {
                                                    rows.push([
                                                        cv.core_value_name,
                                                        `${cv.weight}%`,
                                                        "Last 3 (Growth Area)",
                                                        s.rank,
                                                        s.user_name,
                                                        s.employee_no || "",
                                                        s.job_title || "",
                                                        s.department_name,
                                                        s.branch_name,
                                                        s.avg_score,
                                                        s.review_count,
                                                    ]);
                                                });
                                            }
                                        });

                                        exportReportToExcel(
                                            meta,
                                            headers,
                                            rows,
                                            `Core-Value-Rankings-${cvRankingView}`,
                                        );
                                    }}
                                />
                            </div>

                            {/* Ranking View Option Selector */}
                            <div
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-xs"
                                style={{ borderColor: C.border }}
                            >
                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-700">
                                    <span>Ranking View:</span>
                                    <div className="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCvRankingView("all")
                                            }
                                            className={`rounded-md px-3 py-1.5 font-semibold transition-all ${
                                                cvRankingView === "all"
                                                    ? "bg-white text-gray-900 shadow-xs"
                                                    : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            🌟 View Both (Top 5 & Last 3)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCvRankingView("top")
                                            }
                                            className={`rounded-md px-3 py-1.5 font-semibold transition-all ${
                                                cvRankingView === "top"
                                                    ? "bg-green-700 text-white shadow-xs"
                                                    : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            🏆 Top 5 Performers Only
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCvRankingView("bottom")
                                            }
                                            className={`rounded-md px-3 py-1.5 font-semibold transition-all ${
                                                cvRankingView === "bottom"
                                                    ? "bg-red-700 text-white shadow-xs"
                                                    : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            ⚠️ Last 3 (Growth Area) Only
                                        </button>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Showing:{" "}
                                    <strong className="text-gray-800">
                                        {cvRankingView === "all"
                                            ? "Top 5 & Last 3"
                                            : cvRankingView === "top"
                                              ? "Top 5 Performers"
                                              : "Last 3 (Growth Areas)"}
                                    </strong>{" "}
                                    across {topCoreValueRankings.length} Core
                                    Values
                                </div>
                            </div>

                            {topCoreValueRankings.length === 0 ? (
                                <EmptyState message="No 360° completed evaluations found to calculate Core Value rankings." />
                            ) : (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {topCoreValueRankings.map((cv) => {
                                        const showTop =
                                            cvRankingView === "all" ||
                                            cvRankingView === "top";
                                        const showBottom =
                                            cvRankingView === "all" ||
                                            cvRankingView === "bottom";

                                        return (
                                            <div
                                                key={cv.core_value_id}
                                                className="overflow-hidden rounded-2xl border bg-white shadow-xs"
                                                style={{
                                                    borderColor: C.border,
                                                }}
                                            >
                                                <div
                                                    className="flex items-center justify-between border-b px-5 py-3"
                                                    style={{
                                                        borderColor: C.border,
                                                        backgroundColor:
                                                            "#FFF8F0",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Trophy className="h-4 w-4 text-orange-600" />
                                                        <span className="font-bold text-gray-900">
                                                            {cv.core_value_name}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                                            {cv.total_staff ||
                                                                cv.top_staff
                                                                    .length}{" "}
                                                            evaluated
                                                        </span>
                                                        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">
                                                            Weight: {cv.weight}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {cv.top_staff.length === 0 ? (
                                                    <div className="p-6 text-center text-xs text-gray-400">
                                                        No evaluated staff for
                                                        this core value yet.
                                                    </div>
                                                ) : (
                                                    <div className="p-4 space-y-4">
                                                        {/* Top 5 Section */}
                                                        {showTop && (
                                                            <div>
                                                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-green-800">
                                                                    <span>
                                                                        🌟 Top 5
                                                                        Performers
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-normal">
                                                                        Highest
                                                                        Scoring
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    className="divide-y rounded-xl border border-green-100 bg-green-50/20"
                                                                    style={{
                                                                        borderColor:
                                                                            "#DCFCE7",
                                                                    }}
                                                                >
                                                                    {cv.top_staff.map(
                                                                        (s) => (
                                                                            <div
                                                                                key={`top-${s.user_id}`}
                                                                                className="flex items-center justify-between px-4 py-2.5 hover:bg-green-50/40"
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div
                                                                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                                                                            s.rank ===
                                                                                            1
                                                                                                ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                                                                                                : s.rank ===
                                                                                                    2
                                                                                                  ? "bg-gray-200 text-gray-800"
                                                                                                  : s.rank ===
                                                                                                      3
                                                                                                    ? "bg-amber-200 text-amber-900"
                                                                                                    : "bg-gray-100 text-gray-600"
                                                                                        }`}
                                                                                    >
                                                                                        #
                                                                                        {
                                                                                            s.rank
                                                                                        }
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-xs font-bold text-gray-900">
                                                                                            {
                                                                                                s.user_name
                                                                                            }
                                                                                        </div>
                                                                                        <div className="text-[11px] text-gray-500">
                                                                                            {s.job_title ||
                                                                                                "Staff"}{" "}
                                                                                            •{" "}
                                                                                            {
                                                                                                s.department_name
                                                                                            }{" "}
                                                                                            (
                                                                                            {
                                                                                                s.branch_name
                                                                                            }
                                                                                            )
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <ScoreBadge
                                                                                        score={
                                                                                            s.avg_score
                                                                                        }
                                                                                    />
                                                                                    <div className="mt-0.5 text-[10px] text-gray-400">
                                                                                        {
                                                                                            s.review_count
                                                                                        }{" "}
                                                                                        {s.review_count ===
                                                                                        1
                                                                                            ? "review"
                                                                                            : "reviews"}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Bottom 3 Section (Last 3 / Growth Area Focus) */}
                                                        {showBottom && (
                                                            <div>
                                                                <div className="mb-2 flex items-center justify-between text-xs font-bold text-red-800">
                                                                    <span>
                                                                        ⚠️ Last
                                                                        3 Ranked
                                                                        (Growth
                                                                        &
                                                                        Support
                                                                        Focus)
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 font-normal">
                                                                        Coaching
                                                                        Focus
                                                                    </span>
                                                                </div>
                                                                {cv.bottom_staff &&
                                                                cv.bottom_staff
                                                                    .length >
                                                                    0 ? (
                                                                    <div
                                                                        className="divide-y rounded-xl border border-red-100 bg-red-50/20"
                                                                        style={{
                                                                            borderColor:
                                                                                "#FEE2E2",
                                                                        }}
                                                                    >
                                                                        {cv.bottom_staff.map(
                                                                            (
                                                                                s,
                                                                            ) => (
                                                                                <div
                                                                                    key={`bot-${s.user_id}`}
                                                                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50/40"
                                                                                >
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700">
                                                                                            #
                                                                                            {
                                                                                                s.rank
                                                                                            }
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-xs font-bold text-gray-900">
                                                                                                {
                                                                                                    s.user_name
                                                                                                }
                                                                                            </div>
                                                                                            <div className="text-[11px] text-gray-500">
                                                                                                {s.job_title ||
                                                                                                    "Staff"}{" "}
                                                                                                •{" "}
                                                                                                {
                                                                                                    s.department_name
                                                                                                }{" "}
                                                                                                (
                                                                                                {
                                                                                                    s.branch_name
                                                                                                }
                                                                                                )
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <ScoreBadge
                                                                                            score={
                                                                                                s.avg_score
                                                                                            }
                                                                                        />
                                                                                        <div className="mt-0.5 text-[10px] text-gray-400">
                                                                                            {
                                                                                                s.review_count
                                                                                            }{" "}
                                                                                            {s.review_count ===
                                                                                            1
                                                                                                ? "review"
                                                                                                : "reviews"}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 p-3 text-center text-xs text-red-500">
                                                                        No
                                                                        growth
                                                                        area
                                                                        data
                                                                        available
                                                                        yet for
                                                                        this
                                                                        core
                                                                        value.
                                                                    </div>
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
                    )}

                    {/* ========================================================= */}
                    {/* TAB 3: 360° INDIVIDUAL DETAILED REPORT */}
                    {/* ========================================================= */}
                    {activeTab === "detailed-360" && (() => {
                        const isViewingOwnReport = Boolean(
                            (currentUser?.id && detailed360Report?.user?.id === currentUser.id) ||
                            (isIndividualOnly && (!selectedEvaluateeId || selectedEvaluateeId === currentUser?.id))
                        );
                        const canBypassPeriodLock = Boolean(isSuperAdmin || isHrbp);
                        const isPeriodLocked = !isThreeSixtyPeriodElapsed && !canBypassPeriodLock && (isIndividualOnly || (isViewingOwnReport && !canManage));
                        const hasSubmittedStaffComment = Boolean(detailed360Report?.staff_comment?.has_submitted);
                        const isSupervisorOfTarget = Boolean(
                            currentUser?.id &&
                            detailed360Report?.user?.id &&
                            currentUser.id !== detailed360Report.user.id &&
                            (canEditSubmittedComments || isSupervisorProp || canManage)
                        );
                        const canEditOnceSubmitted = Boolean(isSuperAdmin || isHrbp || isSupervisorOfTarget);
                        const canEditStaffComment = Boolean(
                            !hasSubmittedStaffComment
                                ? (isViewingOwnReport || canBypassPeriodLock || isSupervisorOfTarget) && (isThreeSixtyPeriodElapsed || canBypassPeriodLock)
                                : canEditOnceSubmitted
                        );
                        const isExportDisabled = isViewingOwnReport && !hasSubmittedStaffComment;

                        return (
                        <div className="space-y-6">
                            {/* Employee Selector Bar */}
                            <div
                                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-xs"
                                style={{ borderColor: C.border }}
                            >
                                {isIndividualOnly ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 font-bold text-sm">
                                            {currentUser?.name?.charAt(0) || "U"}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-900">
                                                {currentUser?.name} {currentUser?.employee_no && `(${currentUser.employee_no})`}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {currentUser?.job_title || "Staff"} • {currentUser?.department} • {currentUser?.branch}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                            Select Employee:
                                        </label>
                                        <SearchableSelect
                                            size="sm"
                                            className="min-w-[220px]"
                                            options={[
                                                { value: "", label: "-- Choose Employee --" },
                                                ...availableUsers.map((u) => ({
                                                    value: u.id,
                                                    label: `${u.name} ${u.employee_no ? `(${u.employee_no})` : ""}`,
                                                })),
                                            ]}
                                            value={selectedEvaluateeId || ""}
                                            onChange={(val) => {
                                                if (val) {
                                                    applyFilter({
                                                        evaluatee_id: String(val),
                                                    });
                                                }
                                            }}
                                            placeholder="-- Choose Employee --"
                                            searchPlaceholder="Search employee..."
                                        />
                                    </div>
                                )}
                                {detailed360Report && (
                                    <ExportButtons
                                        disabled={isExportDisabled}
                                        disabledMessage="Please submit your staff comments on this 360° appraisal to unlock export and download."
                                        onExportPdf={() => {
                                            const meta: ReportMeta = {
                                                title: getStaffReportTitle(detailed360Report),
                                                subtitle:
                                                    "Peer & Supervisory Competency Evaluation Feedback",
                                                cycleName:
                                                    threeSixtyCycle?.name || "",
                                                staffName:
                                                    detailed360Report.user.name,
                                                staffEmployeeNo:
                                                    detailed360Report.user
                                                        .employee_no || "",
                                                staffTitle:
                                                    detailed360Report.user
                                                        .job_title || "",
                                                orientation: "landscape",
                                            };

                                            const tableHtml = `
                                                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
                                                    <div style="font-size: 11px; font-weight: bold; background-color: #FFF7ED; border: 1px solid #FED7AA; padding: 6px 12px; border-radius: 4px; color: #EA580C;">
                                                        Staff: ${detailed360Report.user.name} ${detailed360Report.user.employee_no ? `(${detailed360Report.user.employee_no})` : ""} • ${detailed360Report.user.job_title || "Staff"}
                                                    </div>
                                                    <div style="border: 1px solid #86EFAC; text-align: center; font-size: 9px;">
                                                        <div style="background-color: #F0FDF4; font-weight: bold; padding: 2px 5px; border-bottom: 1px solid #86EFAC; color: #15803D;">Deviation Interpretation</div>
                                                        <div style="display: flex;">
                                                            <div style="padding: 2px 4px; border-right: 1px solid #86EFAC;"><strong>-0.25:</strong> Pls address issue</div>
                                                            <div style="padding: 2px 4px; border-right: 1px solid #86EFAC;"><strong>-0.1:</strong> Below avg</div>
                                                            <div style="padding: 2px 4px; border-right: 1px solid #86EFAC;"><strong>0.25:</strong> Above avg</div>
                                                            <div style="padding: 2px 4px;"><strong>0.4:</strong> Far above avg</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th class="text-center" style="width: 70px;">Section</th>
                                                            <th class="text-center" style="width: 35px;">No.</th>
                                                            <th style="width: 130px;">Parameter</th>
                                                            <th>Parameters Detail</th>
                                                            <th class="text-center" style="width: 50px;">Actual Score</th>
                                                            <th class="text-center" style="width: 45px;">Ranking</th>
                                                            <th class="text-center" style="width: 50px;">Peer Avg</th>
                                                            <th class="text-center" style="width: 60px;">Diversion</th>
                                                            <th class="text-center" style="width: 110px;">Statistical Comment</th>
                                                            <th style="width: 140px;">Staff Comment</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        ${detailed360Report.sections
                                                            .map(
                                                                (sec) => `
                                                            ${sec.questions
                                                                .map(
                                                                    (
                                                                        q,
                                                                        qIdx,
                                                                    ) => `
                                                                <tr>
                                                                    ${
                                                                        qIdx ===
                                                                        0
                                                                            ? `<td rowspan="${sec.questions.length + 1}" class="text-center font-bold bg-gray-50">${sec.section_name}</td>`
                                                                            : ""
                                                                    }
                                                                    <td class="text-center">${q.number}</td>
                                                                    <td class="font-semibold">${q.parameter || sec.core_value_name}</td>
                                                                    <td>${q.parameter_detail}</td>
                                                                    <td class="text-center font-bold">${q.actual_score !== null ? q.actual_score.toFixed(2) : "—"}</td>
                                                                    <td class="text-center">${q.ranking !== null ? q.ranking : "—"}</td>
                                                                    <td class="text-center">${q.peer_average !== null ? q.peer_average.toFixed(2) : "—"}</td>
                                                                    <td class="text-center font-semibold">${q.diversion !== null ? (q.diversion < 0 ? `(${Math.abs(q.diversion).toFixed(2)})` : q.diversion.toFixed(2)) : "—"}</td>
                                                                    <td class="text-center">${q.statistical_comment || "—"}</td>
                                                                    <td>${q.staff_comment || "—"}</td>
                                                                </tr>
                                                            `,
                                                                )
                                                                .join("")}
                                                            <tr class="bg-gray-100 font-bold">
                                                                <td colspan="3" class="text-right">Total ${sec.core_value_name}</td>
                                                                <td class="text-center">${sec.section_actual_score !== null ? sec.section_actual_score.toFixed(2) : "—"}</td>
                                                                <td class="text-center"></td>
                                                                <td class="text-center">${sec.section_peer_average !== null ? sec.section_peer_average.toFixed(2) : "—"}</td>
                                                                <td class="text-center">${sec.section_diversion !== null ? (sec.section_diversion < 0 ? `(${Math.abs(sec.section_diversion).toFixed(2)})` : sec.section_diversion.toFixed(2)) : "—"}</td>
                                                                <td class="text-center">${sec.section_statistical_comment || "—"}</td>
                                                                <td></td>
                                                            </tr>
                                                        `,
                                                            )
                                                            .join("")}
                                                        
                                                        <tr class="bg-gray-50 font-bold">
                                                            <td colspan="4" class="text-right">Total Parameters</td>
                                                            <td class="text-center font-bold" style="color: #EA580C;">${detailed360Report.totals.total_parameters_score.toFixed(2)}</td>
                                                            <td></td>
                                                            <td class="text-center">${detailed360Report.totals.total_parameters_peer.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.total_parameters_diversion < 0 ? `(${Math.abs(detailed360Report.totals.total_parameters_diversion).toFixed(2)})` : detailed360Report.totals.total_parameters_diversion.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.total_parameters_stat || "—"}</td>
                                                            <td></td>
                                                        </tr>

                                                        <tr class="bg-gray-50 font-bold">
                                                            <td colspan="4" class="text-right">Total Unweighted Core Values</td>
                                                            <td class="text-center">${detailed360Report.totals.total_unweighted_score.toFixed(2)}</td>
                                                            <td></td>
                                                            <td class="text-center">${detailed360Report.totals.total_unweighted_peer.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.total_unweighted_diversion < 0 ? `(${Math.abs(detailed360Report.totals.total_unweighted_diversion).toFixed(2)})` : detailed360Report.totals.total_unweighted_diversion.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.total_unweighted_stat || "—"}</td>
                                                            <td></td>
                                                        </tr>

                                                        <tr class="bg-gray-50 font-bold">
                                                            <td colspan="4" class="text-right">Weighted Core Values</td>
                                                            <td class="text-center font-bold" style="color: #EA580C;">${detailed360Report.totals.weighted_score.toFixed(2)}</td>
                                                            <td class="text-center font-bold" style="color: #EA580C;">${detailed360Report.overall_rank ?? "—"}</td>
                                                            <td class="text-center">${detailed360Report.totals.weighted_peer.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.weighted_diversion < 0 ? `(${Math.abs(detailed360Report.totals.weighted_diversion).toFixed(2)})` : detailed360Report.totals.weighted_diversion.toFixed(2)}</td>
                                                            <td class="text-center">${detailed360Report.totals.weighted_stat || "—"}</td>
                                                            <td></td>
                                                        </tr>

                                                        <tr>
                                                            <td colspan="4" class="text-right font-bold">Total staff Ranked</td>
                                                            <td class="text-center font-bold bg-gray-100">${detailed360Report.total_staff_ranked}</td>
                                                            <td colspan="5" class="bg-gray-50"></td>
                                                        </tr>
                                                        <tr class="bg-amber-50 font-bold">
                                                            <td colspan="4" class="text-right font-bold">Staff Ranking among Ranked Staff</td>
                                                            <td class="text-center font-bold" style="color: #EA580C;">${detailed360Report.overall_rank ? `#${detailed360Report.overall_rank} of ${detailed360Report.total_staff_ranked}` : "—"}</td>
                                                            <td colspan="5" class="bg-gray-50"></td>
                                                        </tr>
                                                    </tbody>
                                                </table>

                                                ${detailed360Report.staff_comment?.overall_comment ? `
                                                <div style="margin-top: 14px; border: 1px solid #FED7AA; border-radius: 4px; padding: 10px; background-color: #FFF7ED;">
                                                    <div style="font-size: 11px; font-weight: bold; color: #EA580C; margin-bottom: 4px;">Staff Appraisal Reflection & Comments</div>
                                                    <div style="font-size: 10px; color: #374151; white-space: pre-wrap; line-height: 1.4;">${detailed360Report.staff_comment.overall_comment}</div>
                                                </div>
                                                ` : ''}

                                                <div style="margin-top: 24px; page-break-inside: avoid; border: 1.5px solid #15803D; border-radius: 4px; overflow: hidden;">
                                                    <div style="background-color: #F0FDF4; padding: 6px 12px; border-bottom: 1.5px solid #15803D; display: flex; justify-content: space-between; align-items: center;">
                                                        <span style="font-size: 10.5px; font-weight: bold; color: #15803D; text-transform: uppercase; letter-spacing: 0.5px;">
                                                            Performance Appraisal Sign-Off & Verification
                                                        </span>
                                                        <span style="font-size: 9px; font-style: italic; color: #4B5563;">
                                                            (To be signed, dated, and stamped after download)
                                                        </span>
                                                    </div>
                                                    <table style="width: 100%; border-collapse: collapse; margin: 0;">
                                                        <thead>
                                                            <tr style="background-color: #FAFAFA; font-size: 9.5px; color: #374151; border-bottom: 1px solid #D1D5DB;">
                                                                <th style="width: 33.3%; padding: 6px 10px; text-align: left; border-right: 1px solid #D1D5DB;">1. Staff Member</th>
                                                                <th style="width: 33.3%; padding: 6px 10px; text-align: left; border-right: 1px solid #D1D5DB;">2. Immediate Supervisor</th>
                                                                <th style="width: 33.4%; padding: 6px 10px; text-align: left;">3. Regional HRBP</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr style="font-size: 9px; vertical-align: top;">
                                                                <td style="padding: 10px; border-right: 1px solid #D1D5DB; background-color: #FFFFFF;">
                                                                    <div style="font-weight: bold; font-size: 10px; color: #111827;">${detailed360Report.sign_off?.staff?.name || detailed360Report.user.name}</div>
                                                                    <div style="color: #4B5563; margin-top: 2px;">Emp No: <strong>${detailed360Report.sign_off?.staff?.employee_no || detailed360Report.user.employee_no || '—'}</strong></div>
                                                                    <div style="color: #4B5563;">Designation: ${detailed360Report.sign_off?.staff?.job_title || detailed360Report.user.job_title || 'Staff'}</div>
                                                                    <div style="color: #4B5563;">Unit: ${detailed360Report.sign_off?.staff?.department || '—'} / ${detailed360Report.sign_off?.staff?.branch || '—'}</div>
                                                                    <div style="margin-top: 22px;">
                                                                        <div style="color: #374151; margin-bottom: 3px;">Signature: ___________________________</div>
                                                                        <div style="color: #374151; margin-top: 10px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___________________________</div>
                                                                    </div>
                                                                </td>
                                                                <td style="padding: 10px; border-right: 1px solid #D1D5DB; background-color: #FFFFFF;">
                                                                    <div style="font-weight: bold; font-size: 10px; color: #111827;">${detailed360Report.sign_off?.supervisor?.name || 'Immediate Supervisor'}</div>
                                                                    <div style="color: #4B5563; margin-top: 2px;">Emp No: <strong>${detailed360Report.sign_off?.supervisor?.employee_no || '—'}</strong></div>
                                                                    <div style="color: #4B5563;">Designation: ${detailed360Report.sign_off?.supervisor?.job_title || 'Supervisor'}</div>
                                                                    <div style="margin-top: 34px;">
                                                                        <div style="color: #374151; margin-bottom: 3px;">Signature: ___________________________</div>
                                                                        <div style="color: #374151; margin-top: 10px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___________________________</div>
                                                                    </div>
                                                                </td>
                                                                <td style="padding: 10px; background-color: #FFFFFF;">
                                                                    <div style="font-weight: bold; font-size: 10px; color: #15803D;">${detailed360Report.sign_off?.hrbp?.name || 'Regional HRBP'}</div>
                                                                    <div style="color: #4B5563; margin-top: 2px;">Region: <strong>${detailed360Report.sign_off?.hrbp?.region_name || 'Designated Region'}</strong></div>
                                                                    <div style="color: #4B5563;">Designation: ${detailed360Report.sign_off?.hrbp?.job_title || 'HR Business Partner'}</div>
                                                                    <div style="margin-top: 8px;">
                                                                        <div style="color: #374151; margin-bottom: 3px;">Signature: ___________________________</div>
                                                                        <div style="color: #374151; margin-top: 8px;">Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;___________________________</div>
                                                                    </div>
                                                                    <div style="margin-top: 10px; border: 1.5px dashed #15803D; border-radius: 4px; padding: 8px 6px; text-align: center; background-color: #F0FDF4;">
                                                                        <div style="font-size: 8.5px; font-weight: bold; color: #15803D; text-transform: uppercase; letter-spacing: 0.5px;">Official HR Regional Stamp</div>
                                                                        <div style="font-size: 8px; color: #6B7280; margin-top: 4px; font-style: italic;">[ Stamp & Seal Here Upon Download ]</div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            `;

                                            exportReportToPdf(meta, tableHtml);
                                        }}
                                        onExportExcel={() => {
                                            const meta: ReportMeta = {
                                                title: getStaffReportTitle(detailed360Report),
                                                subtitle:
                                                    "Peer & Supervisory Competency Evaluation Feedback",
                                                cycleName:
                                                    threeSixtyCycle?.name || "",
                                                staffName:
                                                    detailed360Report.user.name,
                                                staffEmployeeNo:
                                                    detailed360Report.user
                                                        .employee_no || "",
                                                staffTitle:
                                                    detailed360Report.user
                                                        .job_title || "",
                                            };

                                            const headers = [
                                                "Section",
                                                "No.",
                                                "Parameter",
                                                "Parameters Detail",
                                                "Actual Score",
                                                "Ranking",
                                                "Peer Average",
                                                "Diversion From Average",
                                                "Statistical Comment",
                                                "Staff Comment",
                                            ];

                                            const rows: (
                                                | string
                                                | number
                                                | null
                                                | undefined
                                            )[][] = [];

                                            detailed360Report.sections.forEach(
                                                (sec) => {
                                                    sec.questions.forEach(
                                                        (q) => {
                                                            rows.push([
                                                                sec.section_name,
                                                                q.number,
                                                                q.parameter ||
                                                                    sec.core_value_name,
                                                                q.parameter_detail,
                                                                q.actual_score,
                                                                q.ranking,
                                                                q.peer_average,
                                                                q.diversion,
                                                                q.statistical_comment,
                                                                q.staff_comment ||
                                                                    "",
                                                            ]);
                                                        },
                                                    );
                                                    rows.push([
                                                        sec.section_name,
                                                        "",
                                                        `Total ${sec.core_value_name}`,
                                                        "",
                                                        sec.section_actual_score,
                                                        "",
                                                        sec.section_peer_average,
                                                        sec.section_diversion,
                                                        sec.section_statistical_comment,
                                                        "",
                                                    ]);
                                                },
                                            );

                                            rows.push([
                                                "Summary",
                                                "",
                                                "Total Parameters",
                                                "",
                                                detailed360Report.totals
                                                    .total_parameters_score,
                                                "",
                                                detailed360Report.totals
                                                    .total_parameters_peer,
                                                detailed360Report.totals
                                                    .total_parameters_diversion,
                                                detailed360Report.totals
                                                    .total_parameters_stat,
                                                "",
                                            ]);

                                            rows.push([
                                                "Summary",
                                                "",
                                                "Total Unweighted Core Values",
                                                "",
                                                detailed360Report.totals
                                                    .total_unweighted_score,
                                                "",
                                                detailed360Report.totals
                                                    .total_unweighted_peer,
                                                detailed360Report.totals
                                                    .total_unweighted_diversion,
                                                detailed360Report.totals
                                                    .total_unweighted_stat,
                                                "",
                                            ]);

                                            rows.push([
                                                "Summary",
                                                "",
                                                "Weighted Core Values",
                                                "",
                                                detailed360Report.totals
                                                    .weighted_score,
                                                detailed360Report.overall_rank ?? "",
                                                detailed360Report.totals
                                                    .weighted_peer,
                                                detailed360Report.totals
                                                    .weighted_diversion,
                                                detailed360Report.totals
                                                    .weighted_stat,
                                                "",
                                            ]);

                                            rows.push([
                                                "Summary",
                                                "",
                                                "Total staff Ranked",
                                                "",
                                                detailed360Report.total_staff_ranked,
                                                "",
                                                "",
                                                "",
                                                "",
                                                "",
                                            ]);

                                            rows.push([
                                                "Summary",
                                                "",
                                                "Staff Ranking among Ranked Staff",
                                                "",
                                                detailed360Report.overall_rank
                                                    ? `#${detailed360Report.overall_rank} of ${detailed360Report.total_staff_ranked}`
                                                    : "—",
                                                "",
                                                "",
                                                "",
                                                "",
                                                "",
                                            ]);

                                            if (detailed360Report.staff_comment?.overall_comment) {
                                                rows.push([]);
                                                rows.push([
                                                    "Staff Overall Appraisal Comment",
                                                    detailed360Report.staff_comment.overall_comment,
                                                ]);
                                            }

                                            if (detailed360Report.sign_off) {
                                                const s = detailed360Report.sign_off;
                                                rows.push([]);
                                                rows.push(["PERFORMANCE APPRAISAL SIGN-OFF & VERIFICATION (To be filled and stamped after download)", "", "", "", "", "", "", "", "", ""]);
                                                rows.push([
                                                    "1. Staff Member",
                                                    s.staff.name,
                                                    `Emp No: ${s.staff.employee_no}`,
                                                    `Role: ${s.staff.job_title}`,
                                                    "Signature: ___________________________",
                                                    "Date: ___________________________",
                                                ]);
                                                rows.push([
                                                    "2. Immediate Supervisor",
                                                    s.supervisor.name,
                                                    `Emp No: ${s.supervisor.employee_no}`,
                                                    `Role: ${s.supervisor.job_title}`,
                                                    "Signature: ___________________________",
                                                    "Date: ___________________________",
                                                ]);
                                                rows.push([
                                                    "3. Regional HRBP",
                                                    s.hrbp.name,
                                                    `Region: ${s.hrbp.region_name}`,
                                                    `Role: ${s.hrbp.job_title}`,
                                                    "Signature: ___________________________",
                                                    "Date: ___________________________",
                                                    "Official Stamp: [ STAMP & SEAL HERE ]",
                                                ]);
                                            }

                                            exportReportToExcel(
                                                meta,
                                                headers,
                                                rows,
                                                `360-Feedback-${detailed360Report.user.name.replace(/\s+/g, "-")}`,
                                            );
                                        }}
                                    />
                                )}
                            </div>

                            {isPeriodLocked ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-xs">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                                        <Lock className="h-7 w-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        360° Appraisal Period in Progress
                                    </h3>
                                    <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600 leading-relaxed">
                                        The 360-degree appraisal evaluation period is currently ongoing. Individual performance feedback reports and staff reflection comments will become available once the appraisal period has elapsed{threeSixtyCycleDeadline ? ` on ${threeSixtyCycleDeadline}` : ""}.
                                    </p>
                                    <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-amber-800 shadow-xs border border-amber-200">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        Appraisal Deadline: {threeSixtyCycleDeadline || "End of Cycle"}
                                    </div>
                                </div>
                            ) : !detailed360Report ? (
                                <EmptyState message="Please select an employee above to view their 360° appraisal detailed feedback report." />
                            ) : (
                                <div className="space-y-6">
                                    {/* Staff Appraisal Comments Action Banner */}
                                    {canEditStaffComment && (!hasSubmittedStaffComment || isEditingStaffComments) && (
                                        <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-5 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                                                        <MessageSquareQuote className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-bold text-orange-950">
                                                                Staff Comment on 360° Performance Appraisal
                                                            </h3>
                                                            {hasSubmittedStaffComment && isEditingStaffComments && (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow-2xs">
                                                                    <ShieldCheck className="h-3 w-3" /> Audit Mode
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-orange-800 mt-0.5">
                                                            Please review your 360° competency feedback and provide your comments for each parameter in the table below, as well as an overall reflection.
                                                        </p>
                                                        <p className="text-[11px] text-orange-700 mt-1 font-medium">
                                                            • Complete your comments in the <strong>Staff Comment</strong> column or in the overall section below.
                                                            <br />
                                                            • Click <strong>Submit & Unlock Report</strong> to finalize your appraisal and enable report download.
                                                        </p>
                                                        {highlightMissingComments && totalPendingCommentsCount > 0 && (
                                                            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-red-100 border border-red-300 px-3 py-2 text-xs font-semibold text-red-800">
                                                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                                                <span>
                                                                    Submission Blocked: All {totalPendingCommentsCount} pending comment(s) must be captured before unlocking the report ({pendingQuestionIds.length} question comment{pendingQuestionIds.length === 1 ? '' : 's'}{isOverallCommentPending ? `${pendingQuestionIds.length > 0 ? ' and ' : ''}overall reflection` : ''} remaining).
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                    {isEditingStaffComments && hasSubmittedStaffComment && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEditingStaffComments(false)}
                                                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={isSubmittingStaffComments}
                                                        onClick={() => handleSaveStaffComments("draft")}
                                                        className="flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-orange-800 shadow-xs hover:bg-orange-50 transition"
                                                    >
                                                        <Save className="h-3.5 w-3.5 text-orange-600" />
                                                        Save Draft
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSubmittingStaffComments}
                                                        onClick={() => handleSaveStaffComments("submitted")}
                                                        className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition"
                                                    >
                                                        <Send className="h-3.5 w-3.5" />
                                                        {isSubmittingStaffComments ? "Submitting..." : "Submit & Unlock Report"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hasSubmittedStaffComment && !isEditingStaffComments && (
                                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-bold text-emerald-900">
                                                            Staff Appraisal Comments Submitted
                                                        </h3>
                                                        <p className="text-[11px] text-emerald-700">
                                                            Submitted on {detailed360Report.staff_comment?.submitted_at || "recently"}. Your feedback is recorded in the Staff Comment column below and report download is unlocked.
                                                        </p>
                                                    </div>
                                                </div>
                                                {canEditStaffComment && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingStaffComments(true)}
                                                        className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-50 transition self-end sm:self-center"
                                                    >
                                                        <FileEdit className="h-3.5 w-3.5" /> Edit Comments (Audit Mode)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                <div
                                    className="overflow-x-auto rounded-xl border bg-white p-6 shadow-xs"
                                    style={{ borderColor: C.border }}
                                >
                                    {/* Company Title and Report Header with Progressive Logo */}
                                    <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b-2 border-orange-500 pb-4 sm:flex-row">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src="/images/logo.png"
                                                alt="Progressive Credit"
                                                className="h-12 w-auto object-contain"
                                            />
                                            <div>
                                                <h1 className="text-xl font-extrabold tracking-wide uppercase text-orange-600">
                                                    Progressive Credit
                                                </h1>
                                                <h2 className="text-sm font-bold text-green-700">
                                                    {getStaffReportTitle(detailed360Report)}
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    Peer & Supervisory Competency Evaluation Feedback
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end text-xs text-gray-600">
                                            <div>
                                                <span className="font-bold text-gray-800">Date:</span>{" "}
                                                {new Date().toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </div>
                                            {threeSixtyCycle && (
                                                <div className="mt-0.5">
                                                    <span className="font-bold text-gray-800">Cycle:</span>{" "}
                                                    <span className="font-semibold text-green-700">{threeSixtyCycle.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sub-header meta and Deviation Interpretation Box */}
                                    <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                        <div className="text-xs text-gray-600">
                                            <span className="font-bold text-gray-700">
                                                Employee:
                                            </span>{" "}
                                            <strong>{detailed360Report.user.name}</strong> {detailed360Report.user.employee_no ? `(${detailed360Report.user.employee_no})` : ""}
                                            {detailed360Report.user.job_title ? ` • ${detailed360Report.user.job_title}` : ""}
                                        </div>

                                        {/* Deviation Interpretation Table */}
                                        <div className="border border-green-300 text-center text-[10px] rounded overflow-hidden shadow-2xs">
                                            <div className="border-b border-green-200 bg-green-50 py-0.5 font-bold text-green-900">
                                                Deviation Interpretation
                                            </div>
                                            <div className="grid grid-cols-4 divide-x divide-green-200 border-b border-green-200 bg-orange-50/50 text-orange-950 font-bold">
                                                <div className="p-1 font-bold">-0.25</div>
                                                <div className="p-1 font-bold">-0.1</div>
                                                <div className="p-1 font-bold">0.25</div>
                                                <div className="p-1 font-bold">0.4</div>
                                            </div>
                                            <div className="grid grid-cols-4 divide-x divide-green-200 border-b border-green-200 bg-white text-[9px] leading-tight text-gray-700">
                                                <div className="p-1">average - Pls address issue</div>
                                                <div className="p-1">Below average</div>
                                                <div className="p-1">Above Average</div>
                                                <div className="p-1">Far above average - Keep up</div>
                                            </div>
                                            <div className="bg-green-50 py-0.5 font-bold text-green-800">
                                                Average
                                            </div>
                                        </div>
                                    </div>

                                    {/* Staff Feedback Banner */}
                                    <div className="mb-4 grid grid-cols-1 divide-y rounded-lg overflow-hidden border border-orange-200 text-xs md:grid-cols-12 md:divide-x md:divide-y-0 shadow-xs">
                                        <div className="bg-orange-50/80 p-3 text-center font-medium md:col-span-8 border-orange-200">
                                            <p className="font-bold text-orange-950 text-sm">
                                                {getStaffPeerBannerText(detailed360Report)}
                                            </p>
                                            <p className="text-[11px] text-orange-800 italic mt-0.5">
                                                For the exercise to be useful, please be Fair, Mature & Professional when scoring yourself or others
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center justify-center bg-green-50/90 p-3 font-bold text-green-950 md:col-span-4 text-center border-green-200">
                                            <span className="text-sm">
                                                {detailed360Report.user.name}{" "}
                                                {detailed360Report.user.job_title
                                                    ? `(${detailed360Report.user.job_title})`
                                                    : ""}
                                            </span>
                                            {detailed360Report.overall_rank && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white mt-1 shadow-xs">
                                                    ★ Ranked #{detailed360Report.overall_rank} of {detailed360Report.total_staff_ranked} Staff
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spreadsheet Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-gray-400 text-xs">
                                            <thead>
                                                <tr className="bg-gray-100 text-center font-bold text-gray-800">
                                                    <th
                                                        className="border border-gray-400 px-2 py-2 text-center"
                                                        style={{
                                                            width: "80px",
                                                        }}
                                                    >
                                                        Section
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-2 text-center"
                                                        style={{
                                                            width: "50px",
                                                        }}
                                                    >
                                                        No.
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-2 text-left"
                                                        style={{
                                                            width: "160px",
                                                        }}
                                                    >
                                                        Parameter
                                                    </th>
                                                    <th className="border border-gray-400 px-2 py-2 text-left">
                                                        Parameters Detail
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "65px",
                                                        }}
                                                    >
                                                        Actual Score
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "55px",
                                                        }}
                                                    >
                                                        Ranking
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "65px",
                                                        }}
                                                    >
                                                        Peer Average
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "80px",
                                                        }}
                                                    >
                                                        Diversion From Average
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "140px",
                                                        }}
                                                    >
                                                        Statistical Comment
                                                    </th>
                                                    <th
                                                        className="border border-gray-400 px-2 py-1 text-center"
                                                        style={{
                                                            width: "110px",
                                                        }}
                                                    >
                                                        Staff Comment
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailed360Report.sections.map(
                                                    (section, sIdx) => (
                                                        <React.Fragment
                                                            key={sIdx}
                                                        >
                                                            {section.questions.map(
                                                                (q, qIdx) => (
                                                                    <tr
                                                                        key={`${sIdx}-${qIdx}`}
                                                                        className="hover:bg-gray-50"
                                                                    >
                                                                        {qIdx ===
                                                                            0 && (
                                                                            <td
                                                                                rowSpan={
                                                                                    section
                                                                                        .questions
                                                                                        .length +
                                                                                    1
                                                                                }
                                                                                className="border border-gray-400 bg-gray-50 px-2 py-2 text-center font-bold text-gray-800"
                                                                                style={{
                                                                                    verticalAlign:
                                                                                        "middle",
                                                                                }}
                                                                            >
                                                                                {
                                                                                    section.section_name
                                                                                }
                                                                            </td>
                                                                        )}
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center font-semibold text-gray-700">
                                                                            {
                                                                                q.number
                                                                            }
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 font-medium text-gray-800">
                                                                            {q.parameter ||
                                                                                section.core_value_name}
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-gray-700">
                                                                            {
                                                                                q.parameter_detail
                                                                            }
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center font-bold text-gray-900">
                                                                            {q.actual_score !==
                                                                            null
                                                                                ? q.actual_score.toFixed(
                                                                                      2,
                                                                                  )
                                                                                : "—"}
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center font-semibold text-gray-700">
                                                                            {q.ranking !==
                                                                            null
                                                                                ? q.ranking
                                                                                : "—"}
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center text-gray-800">
                                                                            {q.peer_average !==
                                                                            null
                                                                                ? q.peer_average.toFixed(
                                                                                      2,
                                                                                  )
                                                                                : "—"}
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center font-semibold text-gray-800">
                                                                            {q.diversion !==
                                                                            null
                                                                                ? q.diversion <
                                                                                  0
                                                                                    ? `(${Math.abs(q.diversion).toFixed(2)})`
                                                                                    : q.diversion.toFixed(
                                                                                          2,
                                                                                      )
                                                                                : "—"}
                                                                        </td>
                                                                        <td className="border border-gray-400 px-2 py-1.5 text-center text-xs font-semibold text-gray-800">
                                                                            {q.statistical_comment ||
                                                                                "—"}
                                                                        </td>
                                                                        <td className="border border-gray-400 p-1.5 text-xs text-gray-700">
                                                                            {canEditStaffComment && (!hasSubmittedStaffComment || isEditingStaffComments) ? (
                                                                                <div>
                                                                                    <textarea
                                                                                        value={staffParameterComments[String(q.id)] ?? ""}
                                                                                        onChange={(e) => handleParamCommentChange(q.id, e.target.value)}
                                                                                        placeholder="Add staff comment..."
                                                                                        rows={2}
                                                                                        className={`w-full min-w-[140px] rounded border p-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition ${
                                                                                            highlightMissingComments && !staffParameterComments[String(q.id)]?.trim()
                                                                                                ? "border-red-500 bg-red-50/40 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                                                                                                : "border-gray-300 bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                                                        }`}
                                                                                    />
                                                                                    {highlightMissingComments && !staffParameterComments[String(q.id)]?.trim() && (
                                                                                        <p className="mt-0.5 text-[10px] font-semibold text-red-600 flex items-center gap-0.5">
                                                                                            <AlertCircle className="h-3 w-3 inline shrink-0" />
                                                                                            Required
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-gray-800 whitespace-pre-wrap">{q.staff_comment || "—"}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )}

                                                            {/* Section Subtotal Row */}
                                                            <tr
                                                                key={`total-${sIdx}`}
                                                                className="bg-gray-100 font-bold text-gray-900"
                                                            >
                                                                <td
                                                                    colSpan={3}
                                                                    className="border border-gray-400 px-4 py-2 text-right"
                                                                >
                                                                    Total{" "}
                                                                    {
                                                                        section.core_value_name
                                                                    }
                                                                </td>
                                                                <td className="border border-gray-400 px-2 py-2 text-center">
                                                                    {section.section_actual_score !==
                                                                    null
                                                                        ? section.section_actual_score.toFixed(
                                                                              2,
                                                                          )
                                                                        : "—"}
                                                                </td>
                                                                <td className="border border-gray-400 px-2 py-2 text-center text-gray-600"></td>
                                                                <td className="border border-gray-400 px-2 py-2 text-center">
                                                                    {section.section_peer_average !==
                                                                    null
                                                                        ? section.section_peer_average.toFixed(
                                                                              2,
                                                                          )
                                                                        : "—"}
                                                                </td>
                                                                <td className="border border-gray-400 px-2 py-2 text-center">
                                                                    {section.section_diversion !==
                                                                    null
                                                                        ? section.section_diversion <
                                                                          0
                                                                            ? `(${Math.abs(section.section_diversion).toFixed(2)})`
                                                                            : section.section_diversion.toFixed(
                                                                                  2,
                                                                              )
                                                                        : "—"}
                                                                </td>
                                                                <td className="border border-gray-400 px-2 py-2 text-center">
                                                                    {section.section_statistical_comment ||
                                                                        "—"}
                                                                </td>
                                                                <td className="border border-gray-400 px-2 py-2"></td>
                                                            </tr>
                                                        </React.Fragment>
                                                    ),
                                                )}

                                                {/* Bottom Summary Rows */}
                                                <tr className="bg-gray-50 font-bold text-gray-900">
                                                    <td
                                                        colSpan={4}
                                                        className="border border-gray-400 px-4 py-2 text-right"
                                                    >
                                                        Total Parameters
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center font-extrabold text-orange-600">
                                                        {detailed360Report.totals.total_parameters_score.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center"></td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report.totals.total_parameters_peer.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .total_parameters_diversion <
                                                        0
                                                            ? `(${Math.abs(detailed360Report.totals.total_parameters_diversion).toFixed(2)})`
                                                            : detailed360Report.totals.total_parameters_diversion.toFixed(
                                                                  2,
                                                              )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .total_parameters_stat ||
                                                            "—"}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2"></td>
                                                </tr>

                                                <tr className="bg-gray-50 font-bold text-gray-900">
                                                    <td
                                                        colSpan={4}
                                                        className="border border-gray-400 px-4 py-2 text-right"
                                                    >
                                                        Total Unweighted Core
                                                        Values
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report.totals.total_unweighted_score.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center"></td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report.totals.total_unweighted_peer.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .total_unweighted_diversion <
                                                        0
                                                            ? `(${Math.abs(detailed360Report.totals.total_unweighted_diversion).toFixed(2)})`
                                                            : detailed360Report.totals.total_unweighted_diversion.toFixed(
                                                                  2,
                                                              )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .total_unweighted_stat ||
                                                            "—"}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2"></td>
                                                </tr>

                                                <tr className="bg-gray-50 font-bold text-gray-900">
                                                    <td
                                                        colSpan={4}
                                                        className="border border-gray-400 px-4 py-2 text-right"
                                                    >
                                                        Weighted Core Values
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center font-extrabold text-orange-700">
                                                        {detailed360Report.totals.weighted_score.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center font-extrabold text-orange-800">
                                                        {detailed360Report.overall_rank ?? "—"}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report.totals.weighted_peer.toFixed(
                                                            2,
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .weighted_diversion <
                                                        0
                                                            ? `(${Math.abs(detailed360Report.totals.weighted_diversion).toFixed(2)})`
                                                            : detailed360Report.totals.weighted_diversion.toFixed(
                                                                  2,
                                                              )}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2 text-center">
                                                        {detailed360Report
                                                            .totals
                                                            .weighted_stat ||
                                                            "—"}
                                                    </td>
                                                    <td className="border border-gray-400 px-2 py-2"></td>
                                                </tr>

                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className="border border-gray-400 px-4 py-2 text-right font-bold text-gray-700"
                                                    >
                                                        Total staff Ranked
                                                    </td>
                                                    <td className="border border-gray-400 bg-gray-100 px-2 py-2 text-center font-extrabold text-gray-900">
                                                        {
                                                            detailed360Report.total_staff_ranked
                                                        }
                                                    </td>
                                                    <td
                                                        colSpan={5}
                                                        className="border border-gray-400 bg-gray-50"
                                                    ></td>
                                                </tr>

                                                <tr className="bg-amber-50/70 font-bold text-gray-900">
                                                    <td
                                                        colSpan={4}
                                                        className="border border-gray-400 px-4 py-2 text-right font-bold text-gray-800"
                                                    >
                                                        Staff Ranking among Ranked Staff
                                                    </td>
                                                    <td className="border border-gray-400 bg-amber-100/80 px-2 py-2 text-center font-extrabold text-orange-900">
                                                        {detailed360Report.overall_rank
                                                            ? `#${detailed360Report.overall_rank} of ${detailed360Report.total_staff_ranked}`
                                                            : "—"}
                                                    </td>
                                                    <td
                                                        colSpan={5}
                                                        className="border border-gray-400 bg-gray-50"
                                                    ></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Staff Overall Appraisal Comment inside Report Sheet if submitted */}
                                    {detailed360Report.staff_comment?.overall_comment && !isEditingStaffComments && (
                                        <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50/40 p-4 shadow-2xs">
                                            <div className="text-xs font-bold text-orange-950 flex items-center justify-between">
                                                <span className="flex items-center gap-1.5">
                                                    <MessageSquareQuote className="h-4 w-4 text-orange-600" />
                                                    Staff Overall Appraisal Reflection
                                                </span>
                                                {canEditStaffComment && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingStaffComments(true)}
                                                        className="flex items-center gap-1 text-[11px] font-semibold text-orange-700 hover:text-orange-900 transition"
                                                    >
                                                        <FileEdit className="h-3 w-3" /> Edit Reflection
                                                    </button>
                                                )}
                                            </div>
                                            <p className="mt-2 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded border border-orange-100">
                                                {detailed360Report.staff_comment.overall_comment}
                                            </p>
                                        </div>
                                    )}

                                    {/* Sign-Off & Verification Section on the Report Page */}
                                    {detailed360Report.sign_off && (
                                        <div className="mt-8 rounded-lg border border-green-600 overflow-hidden shadow-2xs">
                                            <div className="bg-green-50 px-4 py-2 border-b border-green-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                <span className="text-xs font-bold uppercase tracking-wider text-green-900">
                                                    Performance Appraisal Sign-Off & Verification
                                                </span>
                                                <span className="text-[11px] italic text-gray-600 font-medium">
                                                    (To be signed, dated, and stamped after download of the report)
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-300 bg-white text-xs">
                                                {/* 1. Staff Member */}
                                                <div className="p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                            1. Staff Member
                                                        </div>
                                                        <div className="mt-2 font-bold text-gray-900 text-sm">
                                                            {detailed360Report.sign_off.staff.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-0.5">
                                                            Emp No: <strong>{detailed360Report.sign_off.staff.employee_no}</strong>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Designation: {detailed360Report.sign_off.staff.job_title}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">
                                                            Unit: {detailed360Report.sign_off.staff.department} • {detailed360Report.sign_off.staff.branch}
                                                        </div>
                                                    </div>
                                                    <div className="mt-8 pt-4 border-t border-dashed border-gray-300 space-y-2">
                                                        <div className="text-xs text-gray-700">
                                                            Signature: <span className="inline-block border-b border-gray-400 w-36"></span>
                                                        </div>
                                                        <div className="text-xs text-gray-700">
                                                            Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="inline-block border-b border-gray-400 w-36"></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Immediate Supervisor */}
                                                <div className="p-4 flex flex-col justify-between">
                                                    <div>
                                                        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                            2. Immediate Supervisor
                                                        </div>
                                                        <div className="mt-2 font-bold text-gray-900 text-sm">
                                                            {detailed360Report.sign_off.supervisor.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-0.5">
                                                            Emp No: <strong>{detailed360Report.sign_off.supervisor.employee_no}</strong>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Designation: {detailed360Report.sign_off.supervisor.job_title}
                                                        </div>
                                                    </div>
                                                    <div className="mt-8 pt-4 border-t border-dashed border-gray-300 space-y-2">
                                                        <div className="text-xs text-gray-700">
                                                            Signature: <span className="inline-block border-b border-gray-400 w-36"></span>
                                                        </div>
                                                        <div className="text-xs text-gray-700">
                                                            Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="inline-block border-b border-gray-400 w-36"></span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. Regional HRBP */}
                                                <div className="p-4 flex flex-col justify-between bg-orange-50/20">
                                                    <div>
                                                        <div className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
                                                            3. Regional HRBP
                                                        </div>
                                                        <div className="mt-2 font-bold text-green-800 text-sm">
                                                            {detailed360Report.sign_off.hrbp.name}
                                                        </div>
                                                        <div className="text-xs text-gray-600 mt-0.5">
                                                            Region: <strong>{detailed360Report.sign_off.hrbp.region_name}</strong>
                                                        </div>
                                                        <div className="text-xs text-gray-600">
                                                            Designation: {detailed360Report.sign_off.hrbp.job_title}
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t border-dashed border-gray-300 space-y-3">
                                                        <div className="space-y-1.5">
                                                            <div className="text-xs text-gray-700">
                                                                Signature: <span className="inline-block border-b border-gray-400 w-32"></span>
                                                            </div>
                                                            <div className="text-xs text-gray-700">
                                                                Date: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="inline-block border-b border-gray-400 w-32"></span>
                                                            </div>
                                                        </div>
                                                        <div className="rounded border-2 border-dashed border-green-600 bg-green-50/50 p-2 text-center">
                                                            <div className="text-[10px] font-bold uppercase tracking-wider text-green-900">
                                                                Official HR Regional Stamp
                                                            </div>
                                                            <div className="text-[8.5px] text-gray-500 italic mt-0.5">
                                                                [ Stamp & Seal After Download ]
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                    {/* Overall Staff Appraisal Comment Edit Card (Only when editing or not yet submitted) */}
                                    {canEditStaffComment && (!hasSubmittedStaffComment || isEditingStaffComments) && (
                                        <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-xs space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        <MessageSquareQuote className="h-4 w-4 text-orange-600" />
                                                        Staff Overall Appraisal Comment & Reflection
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Provide your general reflection on the 360° feedback received, areas of alignment or improvement, and professional development commitments.
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-center">
                                                    <button
                                                        type="button"
                                                        disabled={isSubmittingStaffComments}
                                                        onClick={() => handleSaveStaffComments("draft")}
                                                        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                                                    >
                                                        <Save className="h-3.5 w-3.5 text-gray-500" /> Save Draft
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSubmittingStaffComments}
                                                        onClick={() => handleSaveStaffComments("submitted")}
                                                        className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition"
                                                    >
                                                        <Send className="h-3.5 w-3.5" />
                                                        {isSubmittingStaffComments ? "Submitting..." : "Submit Staff Comments & Unlock Final Report"}
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={staffOverallComment}
                                                onChange={(e) => setStaffOverallComment(e.target.value)}
                                                rows={4}
                                                placeholder="Enter your overall comments and reflections on this 360° performance appraisal..."
                                                className={`w-full rounded-lg border p-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none transition ${
                                                    highlightMissingComments && isOverallCommentPending
                                                        ? "border-red-500 bg-red-50/30 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                                                        : "border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                }`}
                                            />
                                            {highlightMissingComments && isOverallCommentPending && (
                                                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                                                    <AlertCircle className="h-3.5 w-3.5 inline shrink-0" />
                                                    Overall appraisal reflection is required before unlocking the final report.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Audit Trail & History Section */}
                                    {detailed360Report.staff_comment?.audit_logs && detailed360Report.staff_comment.audit_logs.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                                <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                                                    <History className="h-4 w-4 text-gray-500" />
                                                    Staff Appraisal Comment Audit Trail & History ({detailed360Report.staff_comment.audit_logs.length} {detailed360Report.staff_comment.audit_logs.length === 1 ? 'entry' : 'entries'})
                                                </h3>
                                                <span className="text-[11px] text-gray-400">
                                                    Audit Log Tracking Active
                                                </span>
                                            </div>
                                            <div className="divide-y divide-gray-100">
                                                {detailed360Report.staff_comment.audit_logs.map((log) => (
                                                    <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                log.actor_role === 'Super Admin'
                                                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                                    : log.actor_role === 'HR Business Partner'
                                                                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                                    : log.actor_role === 'Supervisor'
                                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                                            }`}>
                                                                {log.actor_role}
                                                            </span>
                                                            <strong className="text-gray-900">{log.actor_name}</strong>
                                                            <span className="text-gray-600">— {log.details}</span>
                                                        </div>
                                                        <span className="text-[11px] text-gray-400 whitespace-nowrap self-end sm:self-center">
                                                            {log.created_at}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* ========================================================= */}
                    {/* TAB 4: 360° BRANCH / DEPARTMENT OVERVIEW */}
                    {/* ========================================================= */}
                    {activeTab === "branch-360" && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900">
                                    360° Branch / Department Members Overview (
                                    {branchDept360Report.members.length}{" "}
                                    Members)
                                </h2>
                                <ExportButtons
                                    onExportPdf={() => {
                                        const meta: ReportMeta = {
                                            title: "360° Appraisal Branch & Department Overview",
                                            subtitle:
                                                "Summary of Core Value Competency Ratings by Member",
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                            filterInfo: getFilterInfo(),
                                            orientation: "landscape",
                                        };

                                        const tableHtml = `
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Staff Name</th>
                                                        <th>Emp No</th>
                                                        <th>Job Title</th>
                                                        <th>Department</th>
                                                        <th>Branch</th>
                                                        <th class="text-center">Reviews</th>
                                                        <th class="text-center">Overall Score (/5)</th>
                                                        <th class="text-center">Overall Score (%)</th>
                                                        ${branchDept360Report.core_values.map((cv) => `<th class="text-center">${cv.name}</th>`).join("")}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${branchDept360Report.members
                                                        .map(
                                                            (m) => `
                                                        <tr>
                                                            <td class="font-bold">${m.user_name}</td>
                                                            <td>${m.employee_no || "—"}</td>
                                                            <td>${m.job_title || "Staff"}</td>
                                                            <td>${m.department_name}</td>
                                                            <td>${m.branch_name}</td>
                                                            <td class="text-center">${m.reviews_received}</td>
                                                            <td class="text-center font-bold">${m.overall_score !== null ? m.overall_score.toFixed(2) : "—"}</td>
                                                            <td class="text-center font-semibold">${m.overall_percent !== null ? `${m.overall_percent}%` : "—"}</td>
                                                            ${m.core_values.map((cv) => `<td class="text-center">${cv.score !== null ? cv.score.toFixed(2) : "—"}</td>`).join("")}
                                                        </tr>
                                                    `,
                                                        )
                                                        .join("")}
                                                </tbody>
                                            </table>
                                        `;

                                        exportReportToPdf(meta, tableHtml);
                                    }}
                                    onExportExcel={() => {
                                        const meta: ReportMeta = {
                                            title: "360° Appraisal Branch & Department Overview",
                                            subtitle:
                                                "Summary of Core Value Competency Ratings by Member",
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                            filterInfo: getFilterInfo(),
                                        };

                                        const headers = [
                                            "Staff Name",
                                            "Employee No",
                                            "Job Title",
                                            "Department",
                                            "Branch",
                                            "Reviews Received",
                                            "Overall Score (/5)",
                                            "Overall Percentage (%)",
                                            ...branchDept360Report.core_values.map(
                                                (cv) => cv.name,
                                            ),
                                        ];

                                        const rows =
                                            branchDept360Report.members.map(
                                                (m) => [
                                                    m.user_name,
                                                    m.employee_no || "",
                                                    m.job_title || "",
                                                    m.department_name,
                                                    m.branch_name,
                                                    m.reviews_received,
                                                    m.overall_score !== null
                                                        ? m.overall_score
                                                        : "",
                                                    m.overall_percent !== null
                                                        ? `${m.overall_percent}%`
                                                        : "",
                                                    ...m.core_values.map(
                                                        (cv) =>
                                                            cv.score !== null
                                                                ? cv.score
                                                                : "",
                                                    ),
                                                ],
                                            );

                                        exportReportToExcel(
                                            meta,
                                            headers,
                                            rows,
                                            "360-Branch-Dept-Overview",
                                        );
                                    }}
                                />
                            </div>

                            {branchDept360Report.members.length === 0 ? (
                                <EmptyState message="No completed 360° appraisals found for the selected department or branch." />
                            ) : (
                                <div
                                    className="overflow-x-auto rounded-xl border bg-white shadow-xs"
                                    style={{ borderColor: C.border }}
                                >
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr
                                                className="border-b bg-gray-50 text-left font-semibold text-gray-600"
                                                style={{
                                                    borderColor: C.border,
                                                }}
                                            >
                                                <th className="px-4 py-3">
                                                    Staff Member
                                                </th>
                                                <th className="px-4 py-3">
                                                    Department / Branch
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Reviews
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Overall Score
                                                </th>
                                                {branchDept360Report.core_values.map(
                                                    (cv) => (
                                                        <th
                                                            key={cv.id}
                                                            className="px-3 py-3 text-center"
                                                        >
                                                            {cv.name}
                                                        </th>
                                                    ),
                                                )}
                                                <th className="px-4 py-3 text-center">
                                                    Action
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            className="divide-y"
                                            style={{ borderColor: C.border }}
                                        >
                                            {branchDept360Report.members.map(
                                                (m) => (
                                                    <tr
                                                        key={m.user_id}
                                                        className="hover:bg-gray-50/80"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-gray-900">
                                                                {m.user_name}
                                                            </div>
                                                            <div className="text-[11px] text-gray-500">
                                                                {m.job_title ||
                                                                    "Staff"}{" "}
                                                                {m.employee_no
                                                                    ? `• ${m.employee_no}`
                                                                    : ""}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-800">
                                                                {
                                                                    m.department_name
                                                                }
                                                            </div>
                                                            <div className="text-[11px] text-gray-500">
                                                                {m.branch_name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold text-gray-700">
                                                            {m.reviews_received}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <ScoreBadge
                                                                    score={
                                                                        m.overall_score
                                                                    }
                                                                />
                                                                {m.overall_percent !==
                                                                    null && (
                                                                    <span className="text-[10px] text-gray-500">
                                                                        (
                                                                        {
                                                                            m.overall_percent
                                                                        }
                                                                        %)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {m.core_values.map(
                                                            (cv) => (
                                                                <td
                                                                    key={
                                                                        cv.core_value_id
                                                                    }
                                                                    className="px-3 py-3 text-center"
                                                                >
                                                                    <ScoreBadge
                                                                        score={
                                                                            cv.score
                                                                        }
                                                                    />
                                                                </td>
                                                            ),
                                                        )}
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    applyFilter(
                                                                        {
                                                                            evaluatee_id:
                                                                                m.user_id,
                                                                        },
                                                                    );
                                                                    setActiveTab(
                                                                        "detailed-360",
                                                                    );
                                                                }}
                                                                className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 hover:bg-orange-100"
                                                            >
                                                                View Detailed
                                                                360
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 5: KPI PERFORMANCE REPORTS */}
                    {/* ========================================================= */}
                    {activeTab === "kpi-reports" && (
                        <div className="space-y-6">
                            {(() => {
                                const showIndividualKpiView = isIndividualOnly || Boolean(filters.user_id);
                                const activeStaff = targetKpiUser || currentUser;
                                const activeStaffName = activeStaff?.name || "Staff Member";
                                const isViewingSelf = !filters.user_id || (currentUser && targetKpiUser?.id === currentUser?.id);

                                if (showIndividualKpiView) {
                                    const myTotalWeight = myKpiReport.reduce((acc, k) => acc + (Number(k.weight) || 0), 0);
                                    const mySelfRated = myKpiReport.filter((k) => k.self_rating !== null && k.self_rating !== undefined);
                                    const myAvgSelf = mySelfRated.length ? mySelfRated.reduce((acc, k) => acc + Number(k.self_rating), 0) / mySelfRated.length : null;
                                    const mySupRated = myKpiReport.filter((k) => k.supervisor_rating !== null && k.supervisor_rating !== undefined);
                                    const myAvgSup = mySupRated.length ? mySupRated.reduce((acc, k) => acc + Number(k.supervisor_rating), 0) / mySupRated.length : null;
                                    const myTotalWeighted = myKpiReport.reduce((acc, k) => acc + (Number(k.weighted_score) || 0), 0);

                                    const signOffStaff = kpiAppraisalData?.sign_off?.staff || {
                                        name: activeStaffName,
                                        employee_no: activeStaff?.employee_no || "—",
                                        job_title: activeStaff?.job_title || "Staff",
                                        department: activeStaff?.department || "—",
                                        branch: activeStaff?.branch || "—",
                                    };

                                    const signOffSupervisor = kpiAppraisalData?.sign_off?.supervisor || {
                                        name: "Immediate Supervisor",
                                        employee_no: "—",
                                        job_title: "Supervisor",
                                        department: "—",
                                        branch: "—",
                                    };

                                    const signOffHrbp = kpiAppraisalData?.sign_off?.hrbp || {
                                        name: "Regional HR Business Partner",
                                        employee_no: "—",
                                        job_title: "HR Business Partner",
                                        region_name: activeStaff?.branch || "Regional / Head Office",
                                        stamp_code: "PCL-HRBP",
                                    };

                                    const canEditStaffFields = Boolean(canEditKpiComments?.canEditStaff || isSuperAdmin);
                                    const canEditSupervisorFields = Boolean(canEditKpiComments?.canEditSupervisor || isSuperAdmin);

                                    return (
                                        <div className="space-y-6">
                                            {/* Header & Export Actions */}
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div>
                                                    <h2 className="text-base font-bold text-gray-900">
                                                        {isViewingSelf
                                                            ? "My KPI Performance Report"
                                                            : `${activeStaffName}'s KPI Performance Report`}
                                                    </h2>
                                                    <p className="text-xs text-gray-500">
                                                        Itemized Goals, Targets, Self-Ratings & Supervisor Evaluation ({myKpiReport.length} Objectives)
                                                    </p>
                                                </div>
                                                <ExportButtons
                                                    onExportPdf={() => {
                                                        const meta: ReportMeta = {
                                                            title: "KPI Performance Appraisal Report",
                                                            subtitle: "Itemized Goals, Targets, Supervisor Evaluation & Sign-Off",
                                                            cycleName: kpiCycle?.name || "",
                                                            staffName: activeStaffName,
                                                            staffEmployeeNo: activeStaff?.employee_no || "",
                                                            staffTitle: activeStaff?.job_title || "",
                                                            filterInfo: `Department: ${activeStaff?.department || "—"} | Branch: ${activeStaff?.branch || "—"}`,
                                                            orientation: "portrait",
                                                        };

                                                        const tableHtml = buildKpiReportPdfHtml(
                                                            myKpiReport,
                                                            activeStaff,
                                                            kpiCycle?.name || "",
                                                            {
                                                                kpi_cycle_id: kpiCycle?.id || 0,
                                                                user_id: activeStaff?.id || 0,
                                                                supervisor_positives: kpiSupervisorPositives,
                                                                supervisor_areas_to_improve: kpiSupervisorAreasToImprove,
                                                                supervisor_concluding_remarks: kpiSupervisorConcludingRemarks,
                                                                staff_achievement_reasons: kpiStaffAchievementReasons,
                                                                staff_future_commitment: kpiStaffFutureCommitment,
                                                                staff_training_requests: kpiStaffTrainingRequests,
                                                                status: kpiAppraisalData?.comment?.status,
                                                            },
                                                            kpiAppraisalData?.sign_off || null,
                                                        );

                                                        exportReportToPdf(meta, tableHtml);
                                                    }}
                                                    onExportExcel={() => {
                                                        const meta: ReportMeta = {
                                                            title: "KPI Performance Report",
                                                            subtitle: "Itemized Goals, Targets, Self-Ratings & Supervisor Evaluation",
                                                            cycleName: kpiCycle?.name || "",
                                                            staffName: activeStaffName,
                                                            staffEmployeeNo: activeStaff?.employee_no || "",
                                                            staffTitle: activeStaff?.job_title || "",
                                                            filterInfo: `Department: ${activeStaff?.department || "—"} | Branch: ${activeStaff?.branch || "—"}`,
                                                        };

                                                        const headers = [
                                                            "KPI Title",
                                                            "Description",
                                                            "Target",
                                                            "Actual Result",
                                                            "Weight (%)",
                                                            "Self Rating",
                                                            "Self Comment",
                                                            "Supervisor Rating",
                                                            "Supervisor Comment",
                                                            "Weighted Score (%)",
                                                            "Evaluation Status",
                                                        ];

                                                        const rows = myKpiReport.map((kpi) => [
                                                            kpi.title,
                                                            kpi.description || "",
                                                            kpi.target || "",
                                                            kpi.actual_result || "",
                                                            kpi.weight,
                                                            kpi.self_rating !== null ? kpi.self_rating : "",
                                                            kpi.self_comment || "",
                                                            kpi.supervisor_rating !== null ? kpi.supervisor_rating : "",
                                                            kpi.supervisor_comment || "",
                                                            kpi.weighted_score !== null ? `${Number(kpi.weighted_score).toFixed(2)}%` : "",
                                                            kpi.evaluation_status || "",
                                                        ]);

                                                        rows.push([
                                                            "TOTAL / SUMMARY",
                                                            "",
                                                            "",
                                                            "",
                                                            myTotalWeight,
                                                            myAvgSelf !== null ? myAvgSelf.toFixed(2) : "",
                                                            "",
                                                            myAvgSup !== null ? myAvgSup.toFixed(2) : "",
                                                            "",
                                                            `${myTotalWeighted.toFixed(2)}%`,
                                                            "",
                                                        ]);

                                                        exportReportToExcel(
                                                            meta,
                                                            headers,
                                                            rows,
                                                            `KPI-Report-${activeStaffName.replace(/\s+/g, "-")}`,
                                                        );
                                                    }}
                                                />
                                            </div>

                                            {/* Scorecard Summary Cards */}
                                            {myKpiReport.length > 0 && (
                                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                                        <p className="text-xs font-semibold text-gray-500">Total KPI Objectives</p>
                                                        <div className="mt-2 flex items-baseline gap-2">
                                                            <span className="text-3xl font-extrabold text-gray-900">{myKpiReport.length}</span>
                                                            <span className="text-xs font-semibold text-gray-500">(Weight: {myTotalWeight}%)</span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-gray-400">Approved for evaluation</p>
                                                    </div>

                                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                                        <p className="text-xs font-semibold text-gray-500">Average Self Rating</p>
                                                        <div className="mt-2 flex items-baseline gap-2">
                                                            <span className="text-3xl font-extrabold" style={{ color: C.navy }}>
                                                                {myAvgSelf !== null ? myAvgSelf.toFixed(2) : "—"}
                                                            </span>
                                                            <span className="text-xs text-gray-400">/ 5.00</span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-gray-400">Across {mySelfRated.length} rated KPIs</p>
                                                    </div>

                                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                                        <p className="text-xs font-semibold text-gray-500">Average Supervisor Rating</p>
                                                        <div className="mt-2 flex items-baseline gap-2">
                                                            <span className="text-3xl font-extrabold" style={{ color: C.orangeDark }}>
                                                                {myAvgSup !== null ? myAvgSup.toFixed(2) : "—"}
                                                            </span>
                                                            <span className="text-xs text-gray-400">/ 5.00</span>
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-gray-400">Supervisory assessment</p>
                                                    </div>

                                                    <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: C.border }}>
                                                        <p className="text-xs font-semibold text-gray-500">Overall KPI Weighted Score</p>
                                                        <div className="mt-2 flex items-baseline gap-2">
                                                            <span className="text-3xl font-extrabold" style={{ color: C.green }}>
                                                                {myTotalWeighted.toFixed(2)}%
                                                            </span>
                                                            <PercentBadge value={myTotalWeighted} />
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-gray-400">Weighted sum of objectives</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Itemized KPI Objectives Table */}
                                            {myKpiReport.length === 0 ? (
                                                <EmptyState message="No KPI objectives or evaluations found for this cycle." />
                                            ) : (
                                                <div className="overflow-hidden rounded-xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b bg-gray-50 text-left font-semibold text-gray-600" style={{ borderColor: C.border }}>
                                                                <th className="px-5 py-3">KPI Objective & Description</th>
                                                                <th className="px-4 py-3">Target & Actual Result</th>
                                                                <th className="px-3 py-3 text-center">Weight</th>
                                                                <th className="px-3 py-3 text-center">Self Rating</th>
                                                                <th className="px-3 py-3 text-center">Supervisor Rating</th>
                                                                <th className="px-3 py-3 text-center">Weighted Score</th>
                                                                <th className="px-3 py-3 text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y" style={{ borderColor: C.border }}>
                                                            {myKpiReport.map((entry) => (
                                                                <tr key={entry.id} className="transition-colors hover:bg-gray-50/70">
                                                                    <td className="px-5 py-3.5">
                                                                        <p className="text-xs font-bold text-gray-900">{entry.title}</p>
                                                                        {entry.description && (
                                                                            <p className="mt-0.5 text-[11px] text-gray-500">{entry.description}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3.5">
                                                                        {entry.target && (
                                                                            <div className="text-[11px]">
                                                                                <span className="font-semibold text-gray-700">Target:</span> {entry.target}
                                                                            </div>
                                                                        )}
                                                                        {entry.actual_result && (
                                                                            <div className="mt-1 text-[11px]">
                                                                                <span className="font-semibold text-gray-700">Actual:</span> {entry.actual_result}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center font-bold text-gray-700">
                                                                        {entry.weight}%
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center">
                                                                        <ScoreBadge score={entry.self_rating} />
                                                                        {entry.self_comment && (
                                                                            <p className="mt-1 text-[10px] italic text-gray-500">"{entry.self_comment}"</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center">
                                                                        <ScoreBadge score={entry.supervisor_rating} />
                                                                        {entry.supervisor_comment && (
                                                                            <p className="mt-1 text-[10px] font-medium text-orange-700 italic">
                                                                                💬 {entry.supervisor_comment}
                                                                            </p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center">
                                                                        <PercentBadge value={entry.weighted_score} />
                                                                    </td>
                                                                    <td className="px-3 py-3.5 text-center">
                                                                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-gray-700">
                                                                            {entry.evaluation_status || "submitted"}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="border-t bg-gray-50 font-bold text-gray-900" style={{ borderColor: C.border }}>
                                                                <td colSpan={2} className="px-5 py-3 text-right text-xs">
                                                                    Overall Totals & Averages
                                                                </td>
                                                                <td className="px-3 py-3 text-center text-xs">
                                                                    {myTotalWeight}%
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <ScoreBadge score={myAvgSelf} />
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <ScoreBadge score={myAvgSup} />
                                                                </td>
                                                                <td className="px-3 py-3 text-center">
                                                                    <PercentBadge value={myTotalWeighted} />
                                                                </td>
                                                                <td></td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                            )}

                                            {/* SECTION 1: COMMENTS BY STAFF / APPRAISEE */}
                                            <div className="overflow-hidden rounded-2xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                <div className="flex flex-wrap items-center justify-between border-b px-5 py-3.5" style={{ borderColor: C.border, backgroundColor: "#F0FDF4" }}>
                                                    <div className="flex items-center gap-2.5">
                                                        <MessageSquareQuote className="h-5 w-5 text-emerald-600" />
                                                        <div>
                                                            <h3 className="text-sm font-bold text-emerald-950">
                                                                Section 1: Comments by Staff / Appraisee
                                                            </h3>
                                                            <p className="text-[11px] text-emerald-800/80">
                                                                Appraisal Self-Reflection, Future Performance Commitment & Training Requests
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {kpiAppraisalData?.comment?.staff_submitted_at && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                            <CheckCircle2 className="h-3 w-3" /> Submitted on {new Date(kpiAppraisalData.comment.staff_submitted_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid gap-5 p-5 lg:grid-cols-3">
                                                    <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                                                                A. Staff Comments on Appraisal
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Why he/she achieved results as above (context, hurdles, or enablers)
                                                            </p>
                                                        </div>
                                                        {canEditStaffFields ? (
                                                            <textarea
                                                                rows={4}
                                                                value={kpiStaffAchievementReasons}
                                                                onChange={(e) => setKpiStaffAchievementReasons(e.target.value)}
                                                                placeholder="Explain the background and key reasons for your performance results, highlighting enabling factors or obstacles encountered..."
                                                                className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                            />
                                                        ) : (
                                                            <div className="min-h-[90px] rounded-lg border border-emerald-100 bg-white p-3 text-xs text-gray-800 whitespace-pre-wrap">
                                                                {kpiStaffAchievementReasons || (
                                                                    <span className="italic text-gray-400">No staff explanation recorded yet.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                                                                B. Staff Commitment on Future Performance
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Pledge and actionable steps to sustain or improve performance standards
                                                            </p>
                                                        </div>
                                                        {canEditStaffFields ? (
                                                            <textarea
                                                                rows={4}
                                                                value={kpiStaffFutureCommitment}
                                                                onChange={(e) => setKpiStaffFutureCommitment(e.target.value)}
                                                                placeholder="State your personal commitment and specific actionable steps you pledge to take to sustain or elevate your performance in the next cycle..."
                                                                className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                            />
                                                        ) : (
                                                            <div className="min-h-[90px] rounded-lg border border-emerald-100 bg-white p-3 text-xs text-gray-800 whitespace-pre-wrap">
                                                                {kpiStaffFutureCommitment || (
                                                                    <span className="italic text-gray-400">No commitment statement recorded yet.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                                                                C. Staff Requests for Training / Development
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Specific skills, workshops, certifications, or coaching requested
                                                            </p>
                                                        </div>
                                                        {canEditStaffFields ? (
                                                            <textarea
                                                                rows={4}
                                                                value={kpiStaffTrainingRequests}
                                                                onChange={(e) => setKpiStaffTrainingRequests(e.target.value)}
                                                                placeholder="Specify relevant courses, coaching, systems training, or skill enhancements you request to boost your productivity..."
                                                                className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                                            />
                                                        ) : (
                                                            <div className="min-h-[90px] rounded-lg border border-emerald-100 bg-white p-3 text-xs text-gray-800 whitespace-pre-wrap">
                                                                {kpiStaffTrainingRequests || (
                                                                    <span className="italic text-gray-400">No training requests submitted yet.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECTION 2: COMMENTS BY SUPERVISOR */}
                                            <div className="overflow-hidden rounded-2xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                <div className="flex flex-wrap items-center justify-between border-b px-5 py-3.5" style={{ borderColor: C.border, backgroundColor: "#FFF7ED" }}>
                                                    <div className="flex items-center gap-2.5">
                                                        <UserCheck className="h-5 w-5 text-orange-600" />
                                                        <div>
                                                            <h3 className="text-sm font-bold text-orange-950">
                                                                Section 2: Comments by Supervisor
                                                            </h3>
                                                            <p className="text-[11px] text-orange-800/80">
                                                                Employee's Positives / Strengths and Developmental Focus Areas
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {kpiAppraisalData?.comment?.supervisor_submitted_at && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800">
                                                            <CheckCircle2 className="h-3 w-3" /> Submitted on {new Date(kpiAppraisalData.comment.supervisor_submitted_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid gap-5 p-5 md:grid-cols-2">
                                                    <div className="flex flex-col rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wide">
                                                                A. Employee's Positives / Strengths
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Key accomplishments, standout competencies, initiatives, and positive contributions
                                                            </p>
                                                        </div>
                                                        {canEditSupervisorFields ? (
                                                            <textarea
                                                                rows={4}
                                                                value={kpiSupervisorPositives}
                                                                onChange={(e) => setKpiSupervisorPositives(e.target.value)}
                                                                placeholder="Detail the employee's strengths, notable achievements, core competencies demonstrated, and positive values exhibited during this evaluation cycle..."
                                                                className="w-full rounded-lg border border-orange-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                            />
                                                        ) : (
                                                            <div className="min-h-[90px] rounded-lg border border-orange-100 bg-white p-3 text-xs text-gray-800 whitespace-pre-wrap">
                                                                {kpiSupervisorPositives || (
                                                                    <span className="italic text-gray-400">No supervisor positive feedback recorded yet.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col rounded-xl border border-orange-200 bg-orange-50/40 p-4">
                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wide">
                                                                B. Areas Employee / Appraisee Should Concentrate In To Improve Performance
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Specific developmental needs, competency gaps, or execution workflows to focus on
                                                            </p>
                                                        </div>
                                                        {canEditSupervisorFields ? (
                                                            <textarea
                                                                rows={4}
                                                                value={kpiSupervisorAreasToImprove}
                                                                onChange={(e) => setKpiSupervisorAreasToImprove(e.target.value)}
                                                                placeholder="Specify concrete areas, skills, operational habits, or key targets where the employee needs to concentrate to elevate performance..."
                                                                className="w-full rounded-lg border border-orange-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                            />
                                                        ) : (
                                                            <div className="min-h-[90px] rounded-lg border border-orange-100 bg-white p-3 text-xs text-gray-800 whitespace-pre-wrap">
                                                                {kpiSupervisorAreasToImprove || (
                                                                    <span className="italic text-gray-400">No improvement focus areas recorded yet.</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar for Comments Saving */}
                                            {(canEditStaffFields || canEditSupervisorFields) && (
                                                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/90 p-4 shadow-xs">
                                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="font-semibold text-gray-700">Appraisal Comments Status:</span>
                                                        {kpiAppraisalData?.comment?.status === "submitted" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> Comments Submitted
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                                                <Clock className="h-3.5 w-3.5" /> Draft In Progress
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={isSubmittingKpiComments}
                                                            onClick={() => handleSaveKpiComments("draft")}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <Save className="h-3.5 w-3.5" /> Save Draft
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isSubmittingKpiComments}
                                                            onClick={() => handleSaveKpiComments("submitted")}
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
                                                        >
                                                            <Send className="h-3.5 w-3.5" /> Save & Submit Comments
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* SECTION 3: CONCLUDING REMARKS BY SUPERVISOR */}
                                            <div className="overflow-hidden rounded-2xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                <div className="border-b px-5 py-3.5" style={{ borderColor: C.border, backgroundColor: "#F8FAFC" }}>
                                                    <h3 className="text-sm font-bold text-gray-900">
                                                        Section 3: Concluding Remarks by Supervisor
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500">
                                                        To be completed and signed by the supervisor after report printing
                                                    </p>
                                                </div>
                                                <div className="p-5 space-y-4">
                                                    {canEditSupervisorFields && (
                                                        <div>
                                                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                                                                Pre-Print Remarks (Optional — will appear printed on the report before final handwriting/signing):
                                                            </label>
                                                            <textarea
                                                                rows={3}
                                                                value={kpiSupervisorConcludingRemarks}
                                                                onChange={(e) => setKpiSupervisorConcludingRemarks(e.target.value)}
                                                                placeholder="Enter any preliminary concluding remarks to be included on the printed report..."
                                                                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
                                                        <div className="mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                                            Post-Print Handwriting Area Preview (Ruled Lines on Printout)
                                                        </div>
                                                        {kpiSupervisorConcludingRemarks && (
                                                            <p className="mb-3 text-xs text-gray-800 font-medium whitespace-pre-wrap">
                                                                {kpiSupervisorConcludingRemarks}
                                                            </p>
                                                        )}
                                                        <div className="space-y-4 pt-1">
                                                            <div className="border-b border-dashed border-gray-300"></div>
                                                            <div className="border-b border-dashed border-gray-300"></div>
                                                            <div className="border-b border-dashed border-gray-300"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECTION 4: APPRAISAL SIGN-OFF & OFFICIAL APPROVALS */}
                                            <div className="overflow-hidden rounded-2xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                <div className="flex flex-wrap items-center justify-between border-b px-5 py-3.5" style={{ borderColor: C.border, backgroundColor: "#F0FDF4" }}>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-emerald-950">
                                                            Section 4: Appraisal Sign-Off & Official Approvals
                                                        </h3>
                                                        <p className="text-[11px] text-emerald-800/80">
                                                            Physical execution panel for Staff, Supervisor, and Regional HRBP
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                        Hardcopy Ink Sign-off
                                                    </span>
                                                </div>

                                                <div className="p-5 space-y-4">
                                                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                                                        <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                                                        <div>
                                                            <span className="font-bold">Official Execution Instructions: </span>
                                                            The sign-off block below only appears on this reports page and the downloaded report. It is to be filled, physically signed, and officially stamped with the company HRBP seal after downloading and printing the report.
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-5 md:grid-cols-3">
                                                        {/* Appraisee / Staff */}
                                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                                                            <div className="border-b border-gray-100 pb-2 mb-3 font-bold text-xs text-gray-900 flex items-center justify-between">
                                                                <span>1. Appraisee / Staff Member</span>
                                                                <span className="text-[10px] text-gray-400 font-normal">Self</span>
                                                            </div>
                                                            <div className="space-y-2 text-xs text-gray-700">
                                                                <div>
                                                                    <span className="text-gray-500 text-[11px] block font-medium">Name:</span>
                                                                    <strong className="text-gray-900 text-xs">{signOffStaff.name}</strong>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500">
                                                                    Emp No: <strong>{signOffStaff.employee_no}</strong> • {signOffStaff.job_title}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500">
                                                                    Branch: {signOffStaff.branch || "—"}
                                                                </div>
                                                            </div>
                                                            <div className="mt-6 pt-3 border-t border-gray-100 space-y-3.5">
                                                                <div>
                                                                    <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                        <span className="font-bold text-gray-700">Signature:</span>
                                                                        <span className="italic text-[10px] text-gray-400">(In ink)</span>
                                                                    </div>
                                                                    <div className="border-b border-gray-400 h-5"></div>
                                                                </div>
                                                                <div>
                                                                    <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                        <span className="font-bold text-gray-700">Date:</span>
                                                                        <span className="italic text-[10px] text-gray-400">(DD/MM/YYYY)</span>
                                                                    </div>
                                                                    <div className="border-b border-gray-400 h-5"></div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Immediate Supervisor */}
                                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                                                            <div className="border-b border-gray-100 pb-2 mb-3 font-bold text-xs text-gray-900 flex items-center justify-between">
                                                                <span>2. Immediate Supervisor</span>
                                                                <span className="text-[10px] text-orange-600 font-medium">Supervisor</span>
                                                            </div>
                                                            <div className="space-y-2 text-xs text-gray-700">
                                                                <div>
                                                                    <span className="text-gray-500 text-[11px] block font-medium">Name:</span>
                                                                    <strong className="text-gray-900 text-xs">{signOffSupervisor.name}</strong>
                                                                </div>
                                                                <div className="text-[11px] text-gray-500">
                                                                    Emp No: <strong>{signOffSupervisor.employee_no}</strong> • {signOffSupervisor.job_title}
                                                                </div>
                                                                <div className="text-[11px] text-gray-500">
                                                                    Department: {signOffSupervisor.department || "—"}
                                                                </div>
                                                            </div>
                                                            <div className="mt-6 pt-3 border-t border-gray-100 space-y-3.5">
                                                                <div>
                                                                    <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                        <span className="font-bold text-gray-700">Signature:</span>
                                                                        <span className="italic text-[10px] text-gray-400">(In ink)</span>
                                                                    </div>
                                                                    <div className="border-b border-gray-400 h-5"></div>
                                                                </div>
                                                                <div>
                                                                    <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                        <span className="font-bold text-gray-700">Date:</span>
                                                                        <span className="italic text-[10px] text-gray-400">(DD/MM/YYYY)</span>
                                                                    </div>
                                                                    <div className="border-b border-gray-400 h-5"></div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Regional HRBP + Stamp Box */}
                                                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                                                            <div>
                                                                <div className="border-b border-gray-100 pb-2 mb-3 font-bold text-xs text-emerald-800 flex items-center justify-between">
                                                                    <span>3. Regional HRBP</span>
                                                                    <span className="text-[10px] text-emerald-600 font-medium">HR Approval</span>
                                                                </div>
                                                                <div className="space-y-2 text-xs text-gray-700">
                                                                    <div>
                                                                        <span className="text-gray-500 text-[11px] block font-medium">Name:</span>
                                                                        <strong className="text-gray-900 text-xs">{signOffHrbp.name}</strong>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500">
                                                                        Region: <strong>{signOffHrbp.region_name || "Head Office / Regional"}</strong>
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-500">
                                                                        Title: {signOffHrbp.job_title}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-6 pt-3 border-t border-gray-100 space-y-3.5">
                                                                    <div>
                                                                        <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                            <span className="font-bold text-gray-700">Signature:</span>
                                                                            <span className="italic text-[10px] text-gray-400">(In ink)</span>
                                                                        </div>
                                                                        <div className="border-b border-gray-400 h-5"></div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex justify-between text-[11px] text-gray-600 mb-1">
                                                                            <span className="font-bold text-gray-700">Date:</span>
                                                                            <span className="italic text-[10px] text-gray-400">(DD/MM/YYYY)</span>
                                                                        </div>
                                                                        <div className="border-b border-gray-400 h-5"></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* HRBP Stamp Box */}
                                                            <div className="mt-4 rounded-xl border-2 border-dashed border-emerald-600 bg-emerald-50/70 p-3 text-center">
                                                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                                                    OFFICIAL HRBP STAMP
                                                                </div>
                                                                <div className="mt-0.5 text-[9px] text-gray-500">
                                                                    (To be affixed after report download/print)
                                                                </div>
                                                                <div className="mt-2 text-[10px] font-bold text-orange-600 tracking-wide">
                                                                    PROGRESSIVE CREDIT LTD
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                // Multi-staff KPI breakdown list (Manager / HRBP / Admin overview)
                                return (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900">
                                                    KPI Performance Breakdown ({branchDeptKpiReport.length} Staff Members)
                                                </h2>
                                                <p className="text-xs text-gray-500">
                                                    Summary and itemized KPI evaluations by Individual, Department, or Branch.
                                                </p>
                                            </div>
                                            <ExportButtons
                                                onExportPdf={() => {
                                                    const meta: ReportMeta = {
                                                        title: "KPI Performance Breakdown Report",
                                                        subtitle: "Itemized Goal Ratings and Achievements by Member",
                                                        cycleName: kpiCycle?.name || "",
                                                        filterInfo: getFilterInfo(),
                                                        orientation: "landscape",
                                                    };

                                                    const tableHtml = `
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Staff Name</th>
                                                                    <th>Emp No</th>
                                                                    <th>Job Title</th>
                                                                    <th>Department</th>
                                                                    <th>Branch</th>
                                                                    <th class="text-center">KPI Count</th>
                                                                    <th class="text-center">Self Avg</th>
                                                                    <th class="text-center">Supervisor Avg</th>
                                                                    <th class="text-center">Weighted Score</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${branchDeptKpiReport
                                                                    .map(
                                                                        (m) => `
                                                                    <tr class="bg-gray-50 font-bold">
                                                                        <td>${m.user_name}</td>
                                                                        <td>${m.employee_no || "—"}</td>
                                                                        <td>${m.job_title || "Staff"}</td>
                                                                        <td>${m.department_name}</td>
                                                                        <td>${m.branch_name}</td>
                                                                        <td class="text-center">${m.kpi_count}</td>
                                                                        <td class="text-center">${m.avg_self_rating !== null ? m.avg_self_rating.toFixed(2) : "—"}</td>
                                                                        <td class="text-center">${m.avg_sup_rating !== null ? m.avg_sup_rating.toFixed(2) : "—"}</td>
                                                                        <td class="text-center" style="color: #15803D;">${m.weighted_score !== null ? `${m.weighted_score}%` : "—"}</td>
                                                                    </tr>
                                                                    ${m.kpi_entries
                                                                        .map(
                                                                            (kpi) => `
                                                                        <tr style="font-size: 10px;">
                                                                            <td style="padding-left: 20px;">• ${kpi.title}</td>
                                                                            <td colspan="4" style="color: #4B5563;">${kpi.target ? `Target: ${kpi.target}` : ""} ${kpi.actual_result ? `| Actual: ${kpi.actual_result}` : ""}</td>
                                                                            <td class="text-center">${kpi.weight}%</td>
                                                                            <td class="text-center">${kpi.self_rating !== null ? kpi.self_rating.toFixed(2) : "—"}</td>
                                                                            <td class="text-center">${kpi.supervisor_rating !== null ? kpi.supervisor_rating.toFixed(2) : "—"}</td>
                                                                            <td class="text-center" style="color: #6B7280;">${kpi.status || "—"}</td>
                                                                        </tr>
                                                                    `,
                                                                        )
                                                                        .join("")}
                                                                `,
                                                                    )
                                                                    .join("")}
                                                            </tbody>
                                                        </table>
                                                    `;

                                                    exportReportToPdf(meta, tableHtml);
                                                }}
                                                onExportExcel={() => {
                                                    const meta: ReportMeta = {
                                                        title: "KPI Performance Breakdown Report",
                                                        subtitle: "Itemized Goal Ratings and Achievements by Member",
                                                        cycleName: kpiCycle?.name || "",
                                                        filterInfo: getFilterInfo(),
                                                    };

                                                    const headers = [
                                                        "Staff Name",
                                                        "Employee No",
                                                        "Job Title",
                                                        "Department",
                                                        "Branch",
                                                        "Total Weighted Score (%)",
                                                        "KPI Title",
                                                        "Target",
                                                        "Actual Result",
                                                        "Weight (%)",
                                                        "Self Rating",
                                                        "Supervisor Rating",
                                                        "Status",
                                                    ];

                                                    const rows = branchDeptKpiReport.flatMap((m) =>
                                                        m.kpi_entries.map((kpi) => [
                                                            m.user_name,
                                                            m.employee_no || "",
                                                            m.job_title || "",
                                                            m.department_name,
                                                            m.branch_name,
                                                            m.weighted_score !== null ? `${m.weighted_score}%` : "",
                                                            kpi.title,
                                                            kpi.target || "",
                                                            kpi.actual_result || "",
                                                            kpi.weight,
                                                            kpi.self_rating !== null ? kpi.self_rating : "",
                                                            kpi.supervisor_rating !== null ? kpi.supervisor_rating : "",
                                                            kpi.status || "",
                                                        ]),
                                                    );

                                                    exportReportToExcel(meta, headers, rows, "KPI-Performance-Report");
                                                }}
                                            />
                                        </div>

                                        {branchDeptKpiReport.length === 0 ? (
                                            <EmptyState message="No KPI evaluations found for the selected department or branch." />
                                        ) : (
                                            <div className="space-y-4">
                                                {branchDeptKpiReport.map((m) => {
                                                    const isExpanded = expandedKpiUserId === m.user_id;
                                                    const mAppraisal = m.appraisal_data?.comment;
                                                    const mSignOff = m.appraisal_data?.sign_off;

                                                    return (
                                                        <div
                                                            key={m.user_id}
                                                            className="overflow-hidden rounded-xl border bg-white shadow-xs"
                                                            style={{ borderColor: C.border }}
                                                        >
                                                            <div
                                                                onClick={() => setExpandedKpiUserId(isExpanded ? null : m.user_id)}
                                                                className="flex cursor-pointer flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-gray-50"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="text-gray-400">
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 text-orange-600" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">{m.user_name}</div>
                                                                        <div className="text-[11px] text-gray-500">
                                                                            {m.job_title || "Staff"} • {m.department_name} ({m.branch_name})
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-6 text-xs">
                                                                    <div className="text-center">
                                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">KPIs</div>
                                                                        <div className="font-bold text-gray-800">{m.kpi_count}</div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Self Avg</div>
                                                                        <ScoreBadge score={m.avg_self_rating} />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Supervisor Avg</div>
                                                                        <ScoreBadge score={m.avg_sup_rating} />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">Weighted Score</div>
                                                                        <PercentBadge value={m.weighted_score} />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Expanded KPI Table & Appraisal Details */}
                                                            {isExpanded && (
                                                                <div className="border-t bg-gray-50/40 p-4 space-y-4" style={{ borderColor: C.border }}>
                                                                    {/* Row Header with Member Export Button */}
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <span className="text-xs font-bold text-gray-700">
                                                                            Individual KPI Performance Details & Sign-Off Preview
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const meta: ReportMeta = {
                                                                                    title: "KPI Performance Appraisal Report",
                                                                                    subtitle: "Itemized Goals, Ratings, Strengths, Commitments & Sign-Off",
                                                                                    cycleName: kpiCycle?.name || "",
                                                                                    staffName: m.user_name,
                                                                                    staffEmployeeNo: m.employee_no || "",
                                                                                    staffTitle: m.job_title || "",
                                                                                    filterInfo: `Department: ${m.department_name} | Branch: ${m.branch_name}`,
                                                                                    orientation: "portrait",
                                                                                };

                                                                                const tableHtml = buildKpiReportPdfHtml(
                                                                                    m.kpi_entries.map((k) => ({
                                                                                        id: k.id,
                                                                                        title: k.title,
                                                                                        description: k.description || null,
                                                                                        target: k.target || null,
                                                                                        actual_result: k.actual_result || null,
                                                                                        weight: k.weight,
                                                                                        self_rating: k.self_rating,
                                                                                        self_comment: k.self_comment || null,
                                                                                        supervisor_rating: k.supervisor_rating,
                                                                                        supervisor_comment: k.supervisor_comment || null,
                                                                                        evaluation_status: k.status,
                                                                                        weighted_score: k.weighted_score ?? (k.supervisor_rating !== null && k.supervisor_rating !== undefined ? (Number(k.supervisor_rating) / 5) * Number(k.weight) : null),
                                                                                    })),
                                                                                    {
                                                                                        name: m.user_name,
                                                                                        employee_no: m.employee_no,
                                                                                        job_title: m.job_title,
                                                                                        department: m.department_name,
                                                                                        branch: m.branch_name,
                                                                                    },
                                                                                    kpiCycle?.name || "",
                                                                                    mAppraisal || null,
                                                                                    mSignOff || null,
                                                                                );

                                                                                exportReportToPdf(meta, tableHtml);
                                                                            }}
                                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 shadow-xs hover:bg-red-100"
                                                                        >
                                                                            <FileText className="h-3.5 w-3.5 text-red-600" /> Export Staff KPI PDF
                                                                        </button>
                                                                    </div>

                                                                    <div className="overflow-hidden rounded-xl border bg-white shadow-xs" style={{ borderColor: C.border }}>
                                                                        <table className="w-full text-xs">
                                                                            <thead>
                                                                                <tr className="border-b text-left font-semibold text-gray-600 bg-gray-50" style={{ borderColor: C.border }}>
                                                                                    <th className="px-3 py-2">KPI Title & Description</th>
                                                                                    <th className="px-3 py-2">Target & Actual Result</th>
                                                                                    <th className="px-2 py-2 text-center">Weight</th>
                                                                                    <th className="px-2 py-2 text-center">Self Rating</th>
                                                                                    <th className="px-2 py-2 text-center">Supervisor Rating</th>
                                                                                    <th className="px-2 py-2 text-center">Status</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y" style={{ borderColor: C.border }}>
                                                                                {m.kpi_entries.map((kpi) => (
                                                                                    <tr key={kpi.id}>
                                                                                        <td className="px-3 py-2 font-medium text-gray-900">
                                                                                            <div>{kpi.title}</div>
                                                                                            {kpi.description && (
                                                                                                <div className="text-[10px] text-gray-500">{kpi.description}</div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-3 py-2 text-gray-600">
                                                                                            {kpi.target && (
                                                                                                <div><span className="font-semibold text-gray-700">Target:</span> {kpi.target}</div>
                                                                                            )}
                                                                                            {kpi.actual_result && (
                                                                                                <div><span className="font-semibold text-gray-700">Actual:</span> {kpi.actual_result}</div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-2 py-2 text-center font-bold text-gray-700">{kpi.weight}%</td>
                                                                                        <td className="px-2 py-2 text-center">
                                                                                            <ScoreBadge score={kpi.self_rating} />
                                                                                            {kpi.self_comment && (
                                                                                                <div className="text-[9px] italic text-gray-500 mt-0.5">"{kpi.self_comment}"</div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-2 py-2 text-center">
                                                                                            <ScoreBadge score={kpi.supervisor_rating} />
                                                                                            {kpi.supervisor_comment && (
                                                                                                <div className="text-[9px] italic text-orange-700 mt-0.5">💬 {kpi.supervisor_comment}</div>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="px-2 py-2 text-center">
                                                                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 uppercase">
                                                                                                {kpi.status || "draft"}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>

                                                                    {/* Section 1: Staff Comments Preview */}
                                                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5">
                                                                        <div className="flex items-center justify-between border-b border-emerald-100 pb-2 mb-2">
                                                                            <span className="font-bold text-xs text-emerald-950 uppercase">
                                                                                Section 1: Comments by Staff / Appraisee
                                                                            </span>
                                                                            <span className="text-[10px] text-emerald-700 font-medium">Self-Reflection & Commitments</span>
                                                                        </div>
                                                                        <div className="grid gap-3 sm:grid-cols-3 text-xs">
                                                                            <div>
                                                                                <span className="font-semibold text-emerald-900 block mb-0.5">A. Reason for Results:</span>
                                                                                <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-emerald-100 min-h-[50px] whitespace-pre-wrap">
                                                                                    {mAppraisal?.staff_achievement_reasons || <span className="italic text-gray-400">None recorded</span>}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-semibold text-emerald-900 block mb-0.5">B. Future Commitment:</span>
                                                                                <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-emerald-100 min-h-[50px] whitespace-pre-wrap">
                                                                                    {mAppraisal?.staff_future_commitment || <span className="italic text-gray-400">None recorded</span>}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-semibold text-emerald-900 block mb-0.5">C. Training Requests:</span>
                                                                                <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-emerald-100 min-h-[50px] whitespace-pre-wrap">
                                                                                    {mAppraisal?.staff_training_requests || <span className="italic text-gray-400">None recorded</span>}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 2: Supervisor Comments Preview */}
                                                                    <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-3.5">
                                                                        <div className="flex items-center justify-between border-b border-orange-100 pb-2 mb-2">
                                                                            <span className="font-bold text-xs text-orange-950 uppercase">
                                                                                Section 2: Comments by Supervisor
                                                                            </span>
                                                                            <span className="text-[10px] text-orange-700 font-medium">Review & Coaching</span>
                                                                        </div>
                                                                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                                                            <div>
                                                                                <span className="font-semibold text-orange-900 block mb-0.5">A. Employee's Positives / Strengths:</span>
                                                                                <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-orange-100 min-h-[50px] whitespace-pre-wrap">
                                                                                    {mAppraisal?.supervisor_positives || <span className="italic text-gray-400">None recorded</span>}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                <span className="font-semibold text-orange-900 block mb-0.5">B. Areas to Concentrate in for Improvement:</span>
                                                                                <p className="text-gray-700 bg-white p-2.5 rounded-lg border border-orange-100 min-h-[50px] whitespace-pre-wrap">
                                                                                    {mAppraisal?.supervisor_areas_to_improve || <span className="italic text-gray-400">None recorded</span>}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 3: Concluding Remarks by Supervisor Preview */}
                                                                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
                                                                        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                                                                            <span className="font-bold text-xs text-gray-900 uppercase">
                                                                                Section 3: Concluding Remarks by Supervisor
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-500 font-medium">Post-Printing Appraisal Summary</span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-700">
                                                                            {mAppraisal?.supervisor_concluding_remarks ? (
                                                                                <div className="p-2.5 bg-white rounded-lg border border-gray-200 mb-2 whitespace-pre-wrap">
                                                                                    {mAppraisal.supervisor_concluding_remarks}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="italic text-gray-500 text-[11px] mb-2">
                                                                                    No pre-printed remarks recorded. Dedicated ruled handwriting lines are provided on the exported PDF for supervisor notes.
                                                                                </p>
                                                                            )}
                                                                            <div className="space-y-1.5 opacity-60">
                                                                                <div className="border-b border-dashed border-gray-300 h-3"></div>
                                                                                <div className="border-b border-dashed border-gray-300 h-3"></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Section 4: Sign-Off Section Preview (Name, Signature, Date) */}
                                                                    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs space-y-3">
                                                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                                            <span className="font-bold text-xs text-emerald-950 uppercase flex items-center gap-1.5">
                                                                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                                                                Section 4: Appraisal Sign-Off & Official Approvals
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-400">Formal Validation</span>
                                                                        </div>
                                                                        <div className="grid gap-3 sm:grid-cols-3 text-xs">
                                                                            {/* Staff Sign-off */}
                                                                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                                                                                <div className="font-bold text-[11px] text-gray-800 border-b border-gray-200/60 pb-1 mb-1.5">
                                                                                    1. Appraisee / Staff Member
                                                                                </div>
                                                                                <div className="space-y-1 text-[11px] text-gray-600 mb-3">
                                                                                    <div><span className="text-gray-400">Name:</span> <strong>{mSignOff?.staff?.name || m.user_name}</strong></div>
                                                                                    <div><span className="text-gray-400">Emp No:</span> {mSignOff?.staff?.employee_no || m.employee_no || "—"}</div>
                                                                                    <div><span className="text-gray-400">Branch:</span> {mSignOff?.staff?.branch || m.branch_name || "—"}</div>
                                                                                </div>
                                                                                <div className="space-y-2 border-t border-gray-200/60 pt-2 text-[10px] text-gray-500">
                                                                                    <div className="flex justify-between"><span>Signature:</span> <span className="italic">(In ink)</span></div>
                                                                                    <div className="border-b border-gray-300 h-2.5"></div>
                                                                                    <div className="flex justify-between"><span>Date:</span> <span className="italic">(DD/MM/YYYY)</span></div>
                                                                                    <div className="border-b border-gray-300 h-2.5"></div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Supervisor Sign-off */}
                                                                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
                                                                                <div className="font-bold text-[11px] text-orange-900 border-b border-gray-200/60 pb-1 mb-1.5">
                                                                                    2. Immediate Supervisor
                                                                                </div>
                                                                                <div className="space-y-1 text-[11px] text-gray-600 mb-3">
                                                                                    <div><span className="text-gray-400">Name:</span> <strong>{mSignOff?.supervisor?.name || "Immediate Supervisor"}</strong></div>
                                                                                    <div><span className="text-gray-400">Emp No:</span> {mSignOff?.supervisor?.employee_no || "—"}</div>
                                                                                    <div><span className="text-gray-400">Title:</span> {mSignOff?.supervisor?.job_title || "Supervisor"}</div>
                                                                                </div>
                                                                                <div className="space-y-2 border-t border-gray-200/60 pt-2 text-[10px] text-gray-500">
                                                                                    <div className="flex justify-between"><span>Signature:</span> <span className="italic">(In ink)</span></div>
                                                                                    <div className="border-b border-gray-300 h-2.5"></div>
                                                                                    <div className="flex justify-between"><span>Date:</span> <span className="italic">(DD/MM/YYYY)</span></div>
                                                                                    <div className="border-b border-gray-300 h-2.5"></div>
                                                                                </div>
                                                                            </div>

                                                                            {/* HRBP Sign-off & Stamp */}
                                                                            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 flex flex-col justify-between">
                                                                                <div>
                                                                                    <div className="font-bold text-[11px] text-emerald-900 border-b border-gray-200/60 pb-1 mb-1.5">
                                                                                        3. Regional HRBP
                                                                                    </div>
                                                                                    <div className="space-y-1 text-[11px] text-gray-600 mb-2">
                                                                                        <div><span className="text-gray-400">Name:</span> <strong>{mSignOff?.hrbp?.name || "Regional HRBP"}</strong></div>
                                                                                        <div><span className="text-gray-400">Region:</span> {mSignOff?.hrbp?.region_name || "Head Office / Regional"}</div>
                                                                                    </div>
                                                                                    <div className="space-y-2 border-t border-gray-200/60 pt-2 text-[10px] text-gray-500 mb-2">
                                                                                        <div className="flex justify-between"><span>Signature:</span> <span className="italic">(In ink)</span></div>
                                                                                        <div className="border-b border-gray-300 h-2.5"></div>
                                                                                        <div className="flex justify-between"><span>Date:</span> <span className="italic">(DD/MM/YYYY)</span></div>
                                                                                        <div className="border-b border-gray-300 h-2.5"></div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="rounded border border-dashed border-emerald-500 bg-emerald-50/80 p-1.5 text-center text-[9px] font-bold text-emerald-800">
                                                                                    OFFICIAL HRBP STAMP
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 6: ORG CORE VALUE RANKING */}
                    {/* ========================================================= */}
                    {activeTab === "org-ranking" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2
                                    className="text-base font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Core Value Ranking — Organisation-wide
                                </h2>
                                <ExportButtons
                                    onExportPdf={() => {
                                        const meta: ReportMeta = {
                                            title: "Organization-wide Core Value Ranking",
                                            subtitle:
                                                "Summary Baseline Across All Evaluated Staff",
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                            orientation: "portrait",
                                        };

                                        const tableHtml = `
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th class="text-center" style="width: 50px;">Rank</th>
                                                        <th>Core Value</th>
                                                        <th class="text-center">Weight</th>
                                                        <th class="text-center">Org Average Score (/5)</th>
                                                        <th class="text-center">Total Respondents</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${orgCoreValueRanking
                                                        .map(
                                                            (row, idx) => `
                                                        <tr>
                                                            <td class="text-center font-bold">#${idx + 1}</td>
                                                            <td class="font-bold">${row.name}</td>
                                                            <td class="text-center">${row.weight}%</td>
                                                            <td class="text-center font-bold" style="color: #15803D;">${row.avg_score !== null ? row.avg_score.toFixed(2) : "—"}</td>
                                                            <td class="text-center">${row.respondents}</td>
                                                        </tr>
                                                    `,
                                                        )
                                                        .join("")}
                                                </tbody>
                                            </table>
                                        `;

                                        exportReportToPdf(meta, tableHtml);
                                    }}
                                    onExportExcel={() => {
                                        const meta: ReportMeta = {
                                            title: "Organization-wide Core Value Ranking",
                                            subtitle:
                                                "Summary Baseline Across All Evaluated Staff",
                                            cycleName:
                                                threeSixtyCycle?.name || "",
                                        };

                                        const headers = [
                                            "Rank",
                                            "Core Value",
                                            "Weight (%)",
                                            "Org Average Score (/5)",
                                            "Respondents",
                                        ];
                                        const rows = orgCoreValueRanking.map(
                                            (row, idx) => [
                                                idx + 1,
                                                row.name,
                                                `${row.weight}%`,
                                                row.avg_score !== null
                                                    ? row.avg_score
                                                    : "",
                                                row.respondents,
                                            ],
                                        );

                                        exportReportToExcel(
                                            meta,
                                            headers,
                                            rows,
                                            "Org-Core-Value-Ranking",
                                        );
                                    }}
                                />
                            </div>
                            <div
                                className="overflow-hidden rounded-xl border bg-white shadow-xs"
                                style={{ borderColor: C.border }}
                            >
                                {orgCoreValueRanking.length === 0 ? (
                                    <EmptyState message="No 360° data available for ranking." />
                                ) : (
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 font-semibold text-gray-600">
                                                <th className="px-6 py-3 text-left">
                                                    Rank
                                                </th>
                                                <th className="px-6 py-3 text-left">
                                                    Core Value
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Weight
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Org Avg Score
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Respondents
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            className="divide-y"
                                            style={{ borderColor: C.border }}
                                        >
                                            {orgCoreValueRanking.map(
                                                (row, idx) => (
                                                    <tr
                                                        key={row.id}
                                                        className={
                                                            idx === 0
                                                                ? "bg-amber-50/40"
                                                                : "hover:bg-gray-50"
                                                        }
                                                    >
                                                        <td className="px-6 py-3 text-center">
                                                            {idx === 0 ? (
                                                                <Trophy className="h-4 w-4 text-amber-500" />
                                                            ) : (
                                                                <span className="font-semibold text-gray-500">
                                                                    #{idx + 1}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td
                                                            className="px-6 py-3 text-sm font-semibold"
                                                            style={{
                                                                color: C.textPrimary,
                                                            }}
                                                        >
                                                            {row.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-semibold text-gray-700">
                                                            {row.weight}%
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <ScoreBadge
                                                                score={
                                                                    row.avg_score
                                                                }
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-600">
                                                            <Users className="inline h-3.5 w-3.5 mr-1" />
                                                            {row.respondents}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* TAB 7: UNIT / BRANCH SUMMARY */}
                    {/* ========================================================= */}
                    {activeTab === "unit-summary" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2
                                    className="text-base font-bold"
                                    style={{ color: C.textPrimary }}
                                >
                                    Unit / Branch Performance Summary
                                </h2>
                                <ExportButtons
                                    onExportPdf={() => {
                                        const meta: ReportMeta = {
                                            title: "Unit & Branch Performance Summary",
                                            subtitle:
                                                "Aggregated Team Performance Overview",
                                            cycleName: `${kpiCycle?.name || ""} / ${threeSixtyCycle?.name || ""}`,
                                            orientation: "portrait",
                                        };

                                        const tableHtml = `
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Unit / Branch</th>
                                                        <th>Type</th>
                                                        <th class="text-center">Members</th>
                                                        <th class="text-center">Avg KPI Score (%)</th>
                                                        <th class="text-center">Avg 360° Score (/5)</th>
                                                        <th class="text-center">Combined Score (%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${unitSummary
                                                        .map(
                                                            (row) => `
                                                        <tr>
                                                            <td class="font-bold">${row.team_name}</td>
                                                            <td>${row.team_type || "—"}</td>
                                                            <td class="text-center">${row.member_count}</td>
                                                            <td class="text-center font-semibold">${row.avg_kpi_score !== null ? `${row.avg_kpi_score}%` : "—"}</td>
                                                            <td class="text-center font-semibold">${row.avg_360_score !== null ? row.avg_360_score.toFixed(2) : "—"}</td>
                                                            <td class="text-center font-bold" style="color: #EA580C;">${row.combined_score !== null ? `${row.combined_score}%` : "—"}</td>
                                                        </tr>
                                                    `,
                                                        )
                                                        .join("")}
                                                </tbody>
                                            </table>
                                        `;

                                        exportReportToPdf(meta, tableHtml);
                                    }}
                                    onExportExcel={() => {
                                        const meta: ReportMeta = {
                                            title: "Unit & Branch Performance Summary",
                                            subtitle:
                                                "Aggregated Team Performance Overview",
                                            cycleName: `${kpiCycle?.name || ""} / ${threeSixtyCycle?.name || ""}`,
                                        };

                                        const headers = [
                                            "Unit / Branch",
                                            "Type",
                                            "Members",
                                            "Avg KPI Score (%)",
                                            "Avg 360 Score (/5)",
                                            "Combined Score (%)",
                                        ];

                                        const rows = unitSummary.map((row) => [
                                            row.team_name,
                                            row.team_type || "",
                                            row.member_count,
                                            row.avg_kpi_score !== null
                                                ? `${row.avg_kpi_score}%`
                                                : "",
                                            row.avg_360_score !== null
                                                ? row.avg_360_score
                                                : "",
                                            row.combined_score !== null
                                                ? `${row.combined_score}%`
                                                : "",
                                        ]);

                                        exportReportToExcel(
                                            meta,
                                            headers,
                                            rows,
                                            "Unit-Branch-Summary",
                                        );
                                    }}
                                />
                            </div>
                            {unitSummary.length === 0 ? (
                                <EmptyState message="No unit summary data available yet." />
                            ) : (
                                <div
                                    className="overflow-hidden rounded-xl border bg-white shadow-xs"
                                    style={{ borderColor: C.border }}
                                >
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 font-semibold text-gray-600">
                                                <th className="px-5 py-3 text-left">
                                                    Unit / Branch
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Members
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Avg KPI Score
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Avg 360° Score
                                                </th>
                                                <th className="px-4 py-3 text-center">
                                                    Combined Score
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody
                                            className="divide-y"
                                            style={{ borderColor: C.border }}
                                        >
                                            {unitSummary.map((row) => (
                                                <tr
                                                    key={row.team_id}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-5 py-3">
                                                        <p className="font-semibold text-gray-900">
                                                            {row.team_name}
                                                        </p>
                                                        {row.team_type && (
                                                            <p className="text-[11px] text-gray-500 capitalize">
                                                                {row.team_type}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-700 font-medium">
                                                        <Users className="inline h-3.5 w-3.5 mr-1" />
                                                        {row.member_count}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <PercentBadge
                                                            value={
                                                                row.avg_kpi_score
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <ScoreBadge
                                                            score={
                                                                row.avg_360_score
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <TrendingUp
                                                                className="h-3.5 w-3.5"
                                                                style={{
                                                                    color:
                                                                        row.combined_score &&
                                                                        row.combined_score >=
                                                                            75
                                                                            ? C.green
                                                                            : C.warn,
                                                                }}
                                                            />
                                                            <PercentBadge
                                                                value={
                                                                    row.combined_score
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div
            className="rounded-2xl border py-12 text-center"
            style={{ borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" }}
        >
            <p className="text-sm text-gray-400">{message}</p>
        </div>
    );
}
