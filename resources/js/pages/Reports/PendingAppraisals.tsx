import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    AlertCircle,
    Award,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    EyeOff,
    FileSpreadsheet,
    FileText,
    Filter,
    HelpCircle,
    ListTodo,
    Mail,
    Printer,
    RefreshCw,
    Search,
    Send,
    ShieldAlert,
    Target,
    UserCheck,
    Users,
    UserX,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    exportReportToPdf,
    exportReportToExcel,
    ReportMeta,
} from "@/lib/report-exporter";
import type { BreadcrumbItem } from "@/types";

interface UserAppraisalItem {
    user_id: number;
    name: string;
    employee_no: string | null;
    email: string;
    job_title: string | null;
    department_name: string;
    branch_name: string;
    region_name: string;
    three_sixty: {
        assigned: number;
        completed: number;
        remaining: number;
        appraisees_remaining: string[];
        deadline: string | null;
        days_left: number | null;
        is_overdue: boolean;
    };
    kpi: {
        assigned: number;
        completed: number;
        remaining: number;
        appraisees_remaining: string[];
        deadline: string | null;
        days_left: number | null;
        is_overdue: boolean;
    };
    total_assigned: number;
    total_completed: number;
    total_remaining: number;
    all_appraisees_remaining: string[];
    earliest_deadline: string | null;
    days_left: number | null;
    is_overdue: boolean;
    status: "completed" | "in_progress" | "pending" | "overdue" | "not_assigned";
}

interface PageProps {
    scope: {
        isSuperAdmin: boolean;
        isHrbp: boolean;
        isHod: boolean;
        isBranchManager: boolean;
        roleLabel: string;
    };
    stats: {
        total_evaluators: number;
        total_incomplete_evaluators: number;
        total_completed_evaluators: number;
        total_360_remaining: number;
        total_kpi_remaining: number;
        total_overdue_evaluators: number;
    };
    users: {
        data: UserAppraisalItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    threeSixtyCycles: Array<{ id: number; name: string; status: string; evaluation_deadline: string | null }>;
    kpiCycles: Array<{ id: number; name: string; status: string; evaluation_deadline: string | null; submission_deadline: string | null }>;
    selected360Cycle: { id: number; name: string; evaluation_deadline: string | null } | null;
    selectedKpiCycle: { id: number; name: string; evaluation_deadline: string | null; submission_deadline: string | null } | null;
    departments: Array<{ id: number; name: string; code: string }>;
    teams: Array<{ id: number; name: string; slug: string; region_id: number | null }>;
    regions: Array<{ id: number; name: string; code: string }>;
    filters: {
        three_sixty_cycle_id: number | null;
        kpi_cycle_id: number | null;
        appraisal_type: string;
        status: string;
        department_id: number | null;
        team_id: number | null;
        region_id: number | null;
        search: string;
        per_page: number;
        page: number;
    };
    flash?: {
        success?: string;
        error?: string;
        info?: string;
    };
}

function formatDate(dateString?: string | null): string {
    if (!dateString) return "—";
    try {
        const parts = dateString.split("T")[0].split("-").map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateString;
    }
}

export default function PendingAppraisals({
    scope,
    stats,
    users,
    threeSixtyCycles,
    kpiCycles,
    selected360Cycle,
    selectedKpiCycle,
    departments,
    teams,
    regions,
    filters,
    flash,
}: PageProps) {
    const { currentTeam } = usePage().props as any;
    const teamSlug = currentTeam?.slug ?? "default";

    const [search, setSearch] = useState(filters.search || "");
    const [expandedAppraisees, setExpandedAppraisees] = useState<Record<number, boolean>>({});

    // Upgraded Reminder Modal State
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [targetUser, setTargetUser] = useState<UserAppraisalItem | null>(null);
    const [managerNote, setManagerNote] = useState("");
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

    const applyFilter = (newFilters: Partial<typeof filters>) => {
        router.get(
            `/${teamSlug}/reports/pending-appraisals`,
            {
                ...filters,
                ...newFilters,
                page: 1, // Reset to first page
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter({ search });
    };

    const openReminderModal = (user: UserAppraisalItem | null) => {
        setTargetUser(user);
        setManagerNote("");
        setShowEmailPreview(false);
        setReminderModalOpen(true);
    };

    const confirmSendReminder = () => {
        setIsSubmittingReminder(true);
        router.post(
            `/${teamSlug}/reports/pending-appraisals/send-reminders`,
            {
                user_id: targetUser ? targetUser.user_id : undefined,
                manager_note: managerNote.trim() ? managerNote.trim() : undefined,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsSubmittingReminder(false);
                    setReminderModalOpen(false);
                    setTargetUser(null);
                    setManagerNote("");
                },
            }
        );
    };

    const handleExportExcel = () => {
        if (!users.data || users.data.length === 0) {
            alert("No appraisal data available to export.");
            return;
        }

        const activeCycleLabel =
            filters.appraisal_type === "360"
                ? (selected360Cycle?.name || "All 360 Cycles")
                : filters.appraisal_type === "kpi"
                ? (selectedKpiCycle?.name || "All KPI Cycles")
                : `${selected360Cycle?.name ?? "360"} / ${selectedKpiCycle?.name ?? "KPI"}`;

        const filterSummary = [
            `Type: ${filters.appraisal_type.toUpperCase()}`,
            `Status: ${filters.status.toUpperCase()}`,
            filters.department_id ? `Dept: ${departments.find((d) => d.id === filters.department_id)?.name}` : "",
            filters.team_id ? `Branch: ${teams.find((t) => t.id === filters.team_id)?.name}` : "",
            filters.region_id ? `Region: ${regions.find((r) => r.id === filters.region_id)?.name}` : "",
            filters.search ? `Search: "${filters.search}"` : "",
        ]
            .filter(Boolean)
            .join(" | ");

        const meta: ReportMeta = {
            title: "Appraisal Completion & Pending Status Report",
            subtitle: `Progressive Credit Limited • ${scope.roleLabel} Audit • Evaluators and Pending Appraisals`,
            cycleName: activeCycleLabel,
            filterInfo: filterSummary,
            orientation: "landscape",
        };

        const headers = [
            "#",
            "Employee No",
            "Evaluator Name",
            "Email Address",
            "Job Title",
            "Department",
            "Branch / Team",
            "Region",
            "360 Assigned",
            "360 Completed",
            "360 Remaining",
            "KPI Assigned",
            "KPI Completed",
            "KPI Remaining",
            "Total Completed",
            "Total Remaining",
            "Overall Status",
            "Submission Deadline",
            "Days Remaining",
            "Appraisees Awaiting Evaluation",
        ];

        const rows = users.data.map((u, index) => [
            index + 1,
            u.employee_no || "—",
            u.name,
            u.email,
            u.job_title || "—",
            u.department_name,
            u.branch_name,
            u.region_name,
            u.three_sixty.assigned,
            u.three_sixty.completed,
            u.three_sixty.remaining,
            u.kpi.assigned,
            u.kpi.completed,
            u.kpi.remaining,
            u.total_completed,
            u.total_remaining,
            u.status.toUpperCase().replace("_", " "),
            u.earliest_deadline || "—",
            u.days_left !== null
                ? (u.days_left < 0 ? `Overdue by ${Math.abs(u.days_left)}d` : `${u.days_left}d left`)
                : "—",
            u.all_appraisees_remaining.join("; ") || "All Completed",
        ]);

        exportReportToExcel(
            meta,
            headers,
            rows,
            `Progressive_Credit_Pending_Appraisals_${new Date().toISOString().slice(0, 10)}`
        );
    };

    const handleExportPdf = () => {
        if (!users.data || users.data.length === 0) {
            alert("No appraisal data available to export.");
            return;
        }

        const activeCycleLabel =
            filters.appraisal_type === "360"
                ? (selected360Cycle?.name || "All 360 Cycles")
                : filters.appraisal_type === "kpi"
                ? (selectedKpiCycle?.name || "All KPI Cycles")
                : `${selected360Cycle?.name ?? "360"} / ${selectedKpiCycle?.name ?? "KPI"}`;

        const filterSummary = [
            `Type: ${filters.appraisal_type.toUpperCase()}`,
            `Status: ${filters.status.toUpperCase()}`,
            filters.department_id ? `Dept: ${departments.find((d) => d.id === filters.department_id)?.name}` : "",
            filters.team_id ? `Branch: ${teams.find((t) => t.id === filters.team_id)?.name}` : "",
            filters.region_id ? `Region: ${regions.find((r) => r.id === filters.region_id)?.name}` : "",
        ]
            .filter(Boolean)
            .join(" • ");

        const meta: ReportMeta = {
            title: "Appraisal Completion & Pending Status Report",
            subtitle: "Comprehensive Audit of 360° Appraisals & KPI Evaluations Completion Status",
            cycleName: activeCycleLabel,
            filterInfo: filterSummary,
            orientation: "landscape",
        };

        const customStyles = `
            .kpi-summary-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 8px;
                margin-bottom: 14px;
            }
            .kpi-stat-card {
                border: 1px solid #D1D5DB;
                border-radius: 6px;
                padding: 6px 8px;
                text-align: center;
                background-color: #FFFFFF;
            }
            .kpi-stat-title {
                font-size: 9px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6B7280;
            }
            .kpi-stat-val {
                font-size: 16px;
                font-weight: 900;
                margin-top: 2px;
                color: #111827;
            }
            .border-orange { border-color: #FED7AA !important; background-color: #FFF7ED !important; }
            .border-green { border-color: #BBF7D0 !important; background-color: #F0FDF4 !important; }
            .border-red { border-color: #FECACA !important; background-color: #FEF2F2 !important; }
            .text-orange { color: #EA580C !important; }
            .text-green { color: #15803D !important; }
            .text-red { color: #DC2626 !important; }
            .text-purple { color: #7C3AED !important; }
            .text-amber { color: #D97706 !important; }
            .badge {
                display: inline-block;
                padding: 2px 6px;
                border-radius: 9999px;
                font-size: 8.5px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .badge-completed { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
            .badge-overdue { background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA; }
            .badge-in_progress { background: #DBEAFE; color: #1D4ED8; border: 1px solid #BFDBFE; }
            .badge-pending { background: #FFEDD5; color: #C2410C; border: 1px solid #FED7AA; }
            .badge-not_assigned { background: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; }
            .chip {
                display: inline-block;
                background: #F3F4F6;
                border: 1px solid #E5E7EB;
                border-radius: 4px;
                padding: 1px 4px;
                font-size: 8.5px;
                margin: 1px;
                color: #374151;
            }
            .signoff-box {
                margin-top: 20px;
                border-top: 2px solid #15803D;
                padding-top: 14px;
                page-break-inside: avoid;
            }
            .signoff-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }
            .signoff-card {
                border: 1px solid #E5E7EB;
                border-radius: 6px;
                padding: 8px 10px;
                background: #F9FAFB;
                font-size: 9.5px;
            }
        `;

        let tableRowsHtml = "";
        users.data.forEach((u, idx) => {
            const statusClass = `badge-${u.status}`;
            const remainingChips =
                u.all_appraisees_remaining.length > 0
                    ? u.all_appraisees_remaining.map((a) => `<span class="chip">${a}</span>`).join(" ")
                    : `<span style="color: #15803D; font-weight: 600;">✓ All Completed</span>`;

            tableRowsHtml += `
                <tr>
                    <td style="text-align: center; color: #6B7280; font-weight: 600;">${idx + 1}</td>
                    <td>
                        <strong style="color: #111827; font-size: 11px;">${u.name}</strong>
                        ${u.employee_no ? `<br/><span style="font-family: monospace; font-size: 9px; background: #F3F4F6; padding: 1px 4px; border-radius: 3px;">${u.employee_no}</span>` : ""}
                        <br/><span style="color: #6B7280; font-size: 9.5px;">${u.email}</span>
                        ${u.job_title ? `<br/><span style="color: #9CA3AF; font-style: italic; font-size: 9px;">${u.job_title}</span>` : ""}
                    </td>
                    <td>
                        <strong style="color: #374151;">${u.department_name}</strong>
                        <br/><span style="color: #6B7280;">${u.branch_name}</span>
                        <br/><span style="color: #9CA3AF; font-size: 8.5px; text-transform: uppercase;">${u.region_name}</span>
                    </td>
                    <td style="text-align: center;">
                        ${u.three_sixty.assigned === 0 ? "—" : u.three_sixty.remaining === 0 ? '<span style="color: #15803D; font-weight: bold;">Done</span>' : `<strong class="text-purple">${u.three_sixty.remaining}</strong> <span style="font-size: 8.5px; color: #6B7280;">/ ${u.three_sixty.assigned}</span>`}
                    </td>
                    <td style="text-align: center;">
                        ${u.kpi.assigned === 0 ? "—" : u.kpi.remaining === 0 ? '<span style="color: #15803D; font-weight: bold;">Done</span>' : `<strong class="text-amber">${u.kpi.remaining}</strong> <span style="font-size: 8.5px; color: #6B7280;">/ ${u.kpi.assigned}</span>`}
                    </td>
                    <td style="text-align: center;">
                        <strong style="font-size: 13px; color: ${u.total_remaining > 0 ? '#EA580C' : '#15803D'};">${u.total_remaining}</strong>
                        <br/><span class="badge ${statusClass}">${u.status.replace("_", " ")}</span>
                    </td>
                    <td>
                        ${u.earliest_deadline ? `<strong>${formatDate(u.earliest_deadline)}</strong>` : "—"}
                        ${u.days_left !== null ? `<br/><span style="font-size: 9px; font-weight: bold; color: ${u.days_left < 0 ? '#DC2626' : u.days_left <= 3 ? '#EA580C' : '#15803D'};">${u.days_left < 0 ? `${Math.abs(u.days_left)}d overdue` : u.days_left === 0 ? 'Due today' : `${u.days_left}d left`}</span>` : ""}
                    </td>
                    <td style="max-width: 280px; line-height: 1.35;">
                        ${remainingChips}
                    </td>
                </tr>
            `;
        });

        const contentHtml = `
            <!-- Executive Summary Cards -->
            <div class="kpi-summary-grid">
                <div class="kpi-stat-card">
                    <div class="kpi-stat-title">Total Evaluators</div>
                    <div class="kpi-stat-val">${stats.total_evaluators}</div>
                </div>
                <div class="kpi-stat-card border-orange">
                    <div class="kpi-stat-title text-orange">Incomplete</div>
                    <div class="kpi-stat-val text-orange">${stats.total_incomplete_evaluators}</div>
                </div>
                <div class="kpi-stat-card border-green">
                    <div class="kpi-stat-title text-green">Completed</div>
                    <div class="kpi-stat-val text-green">${stats.total_completed_evaluators}</div>
                </div>
                <div class="kpi-stat-card">
                    <div class="kpi-stat-title text-purple">360° Left</div>
                    <div class="kpi-stat-val text-purple">${stats.total_360_remaining}</div>
                </div>
                <div class="kpi-stat-card">
                    <div class="kpi-stat-title text-amber">KPI Left</div>
                    <div class="kpi-stat-val text-amber">${stats.total_kpi_remaining}</div>
                </div>
                <div class="kpi-stat-card border-red">
                    <div class="kpi-stat-title text-red">Overdue</div>
                    <div class="kpi-stat-val text-red">${stats.total_overdue_evaluators}</div>
                </div>
            </div>

            <!-- Table of Evaluators -->
            <table>
                <thead>
                    <tr>
                        <th style="width: 25px; text-align: center;">#</th>
                        <th style="width: 170px;">Evaluator / Staff</th>
                        <th style="width: 130px;">Unit & Branch</th>
                        <th style="width: 65px; text-align: center;">360 Left</th>
                        <th style="width: 65px; text-align: center;">KPI Left</th>
                        <th style="width: 80px; text-align: center;">Total Pending</th>
                        <th style="width: 95px;">Deadline</th>
                        <th>Appraisees Awaiting Evaluation</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <!-- Formal 3-Tier Sign-off Section -->
            <div class="signoff-box">
                <div class="signoff-grid">
                    <div class="signoff-card">
                        <strong style="color: #111827; text-transform: uppercase;">Compiled By</strong>
                        <div style="margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px; line-height: 1.6; color: #4B5563;">
                            Name: _______________________________<br/>
                            Sign: _______________________________<br/>
                            Date: _______________________________
                        </div>
                    </div>
                    <div class="signoff-card">
                        <strong style="color: #111827; text-transform: uppercase;">Verified By HRBP / HOD</strong>
                        <div style="margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px; line-height: 1.6; color: #4B5563;">
                            Name: _______________________________<br/>
                            Sign: _______________________________<br/>
                            Date: _______________________________
                        </div>
                    </div>
                    <div class="signoff-card">
                        <strong style="color: #111827; text-transform: uppercase;">Approved by Head of HR / GM</strong>
                        <div style="margin-top: 8px; border-top: 1px dashed #CBD5E1; padding-top: 6px; line-height: 1.6; color: #4B5563;">
                            Name: _______________________________<br/>
                            Sign: _______________________________<br/>
                            Date: _______________________________
                        </div>
                    </div>
                </div>
            </div>
        `;

        exportReportToPdf(meta, contentHtml, customStyles);
    };

    const exportCsv = () => {
        if (!users.data || users.data.length === 0) {
            alert("No data available to export.");
            return;
        }

        const headers = [
            "Employee No",
            "Name",
            "Email",
            "Job Title",
            "Department",
            "Branch",
            "Region",
            "360 Assigned",
            "360 Completed",
            "360 Remaining",
            "KPI Assigned",
            "KPI Completed",
            "KPI Remaining",
            "Total Completed",
            "Total Remaining",
            "Submission Deadline",
            "Status",
            "Appraisees Remaining",
        ];

        const rows = users.data.map((u) => [
            `"${u.employee_no || ""}"`,
            `"${u.name}"`,
            `"${u.email}"`,
            `"${u.job_title || ""}"`,
            `"${u.department_name}"`,
            `"${u.branch_name}"`,
            `"${u.region_name}"`,
            u.three_sixty.assigned,
            u.three_sixty.completed,
            u.three_sixty.remaining,
            u.kpi.assigned,
            u.kpi.completed,
            u.kpi.remaining,
            u.total_completed,
            u.total_remaining,
            `"${u.earliest_deadline || ""}"`,
            `"${u.status.toUpperCase()}"`,
            `"${u.all_appraisees_remaining.join("; ")}"`,
        ]);

        const csvContent =
            "data:text/csv;charset=utf-8," +
            [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
            "download",
            `Appraise360_Pending_Appraisals_${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleAppraisees = (id: number) => {
        setExpandedAppraisees((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    return (
        <>
            <Head title="Pending Appraisals Completion Report — Progressive Credit" />

            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 8mm 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background: #FFFFFF !important;
                    }
                    header, aside, nav, [data-sidebar="sidebar"], [data-sidebar="header"], .no-print {
                        display: none !important;
                    }
                    .print-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    thead {
                        display: table-header-group !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                    th, td {
                        border: 1px solid #CBD5E1 !important;
                    }
                }
            `}</style>

            <div className="print-container flex h-full w-full flex-1 flex-col bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 print:bg-white print:p-0">
                <div className="mx-auto w-full max-w-8xl space-y-6 print:space-y-4">
                    
                    {/* ── Official Corporate Header with Logo ─────────────── */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs print:border-none print:shadow-none print:p-0 print:border-b-2 print:border-orange-500 print:pb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 shadow-2xs print:border-none print:shadow-none">
                                <img
                                    src="/images/logo.png"
                                    alt="Progressive Credit"
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                                        PROGRESSIVE CREDIT LIMITED
                                    </span>
                                    <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                                        {scope.roleLabel}
                                    </span>
                                </div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 mt-0.5">
                                    Appraisal Completion & Pending Status Report
                                </h1>
                                <p className="text-xs text-slate-500 mt-1 max-w-2xl print:max-w-none">
                                    Comprehensive audit of 360° Appraisals and KPI Evaluations completion status across departments, branches, and regions.
                                </p>
                            </div>
                        </div>

                        {/* Top Metadata & Action CTAs */}
                        <div className="flex flex-col sm:items-end gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600 print:text-[11px]">
                                <span className="font-semibold text-slate-500">Generated:</span>
                                <span className="font-bold text-slate-800">
                                    {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                                <span className="text-slate-400">at</span>
                                <span className="font-medium text-slate-600">
                                    {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 print:text-[11px]">
                                <span className="font-semibold text-slate-500">Target Cycle:</span>
                                <span className="font-bold text-green-700">
                                    {filters.appraisal_type === "360"
                                        ? (selected360Cycle?.name || "All 360 Cycles")
                                        : filters.appraisal_type === "kpi"
                                        ? (selectedKpiCycle?.name || "All KPI Cycles")
                                        : `${selected360Cycle?.name ?? "360"} / ${selectedKpiCycle?.name ?? "KPI"}`}
                                </span>
                            </div>

                            {/* Buttons Hidden in Print Mode */}
                            <div className="no-print print:hidden flex flex-wrap items-center gap-2 pt-1">
                                <button
                                    onClick={handleExportExcel}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-green-700 bg-green-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-green-800 cursor-pointer"
                                    title="Download formatted Excel (.xlsx) report with metadata and headers"
                                >
                                    <FileSpreadsheet className="h-4 w-4 text-green-100" />
                                    <span>Export Excel</span>
                                </button>

                                <button
                                    onClick={handleExportPdf}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-orange-600 bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-orange-700 cursor-pointer"
                                    title="Generate print-ready PDF with Progressive Credit letterhead, executive KPIs, and sign-offs"
                                >
                                    <FileText className="h-4 w-4 text-orange-100" />
                                    <span>Export PDF</span>
                                </button>

                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all hover:bg-slate-800 cursor-pointer"
                                    title="Print report directly with letterhead and sign-off block"
                                >
                                    <Printer className="h-4 w-4 text-slate-200" />
                                    <span>Print Report</span>
                                </button>

                                <button
                                    onClick={exportCsv}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                                    title="Export currently filtered table to CSV"
                                >
                                    <Download className="h-4 w-4 text-slate-500" />
                                    <span>CSV</span>
                                </button>

                                <button
                                    onClick={() => openReminderModal(null)}
                                    disabled={stats.total_incomplete_evaluators === 0}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 disabled:opacity-50 cursor-pointer"
                                    title="Send reminder emails to all incomplete users with unexpired deadlines"
                                >
                                    <Send className="h-4 w-4" />
                                    <span>Send Reminders ({stats.total_incomplete_evaluators})</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Flash Alert Feedback (Hidden in Print) ───────────── */}
                    <div className="no-print print:hidden space-y-2">
                        {flash?.success && (
                            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs font-bold text-green-900 shadow-2xs">
                                <CheckCircle2 className="h-5 w-5 text-green-700 flex-shrink-0" />
                                <span>{flash.success}</span>
                            </div>
                        )}
                        {flash?.info && (
                            <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold text-blue-900 shadow-2xs">
                                <HelpCircle className="h-5 w-5 text-blue-700 flex-shrink-0" />
                                <span>{flash.info}</span>
                            </div>
                        )}
                        {flash?.error && (
                            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-900 shadow-2xs">
                                <AlertCircle className="h-5 w-5 text-red-700 flex-shrink-0" />
                                <span>{flash.error}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Executive Stat Cards (Corporate Orange, Green, Slate) ─ */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-6 print:gap-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs print:p-2 print:border-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Total Evaluators
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <Users className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900 print:text-lg">
                                {stats.total_evaluators}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">assigned evaluations</p>
                        </div>

                        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 shadow-2xs print:p-2 print:border-slate-300 print:bg-white">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">
                                    Users Incomplete
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                                    <UserX className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-orange-700 print:text-lg">
                                {stats.total_incomplete_evaluators}
                            </div>
                            <p className="text-[11px] text-orange-600 mt-0.5">has remaining tasks</p>
                        </div>

                        <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-2xs print:p-2 print:border-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                                    Users Completed
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                    <UserCheck className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-green-700 print:text-lg">
                                {stats.total_completed_evaluators}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">100% submitted</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs print:p-2 print:border-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    360° Remaining
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                                    <Award className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-800 print:text-lg">
                                {stats.total_360_remaining}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">peer/sup reviews</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs print:p-2 print:border-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    KPI Remaining
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                    <Target className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-800 print:text-lg">
                                {stats.total_kpi_remaining}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">self/moderation</p>
                        </div>

                        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-2xs print:p-2 print:border-slate-300 print:bg-white">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                                    Overdue Users
                                </span>
                                <div className="no-print print:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700">
                                    <ShieldAlert className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-red-700 print:text-lg">
                                {stats.total_overdue_evaluators}
                            </div>
                            <p className="text-[11px] text-red-600 mt-0.5">deadline elapsed</p>
                        </div>
                    </div>

                    {/* ── Filter Controls Panel with SearchableSelect (Hidden in Print) ── */}
                    <div className="no-print print:hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                            {/* Status Filter Tabs */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { key: "incomplete", label: `Incomplete (${stats.total_incomplete_evaluators})` },
                                    { key: "overdue", label: `Overdue (${stats.total_overdue_evaluators})` },
                                    { key: "completed", label: `Completed (${stats.total_completed_evaluators})` },
                                    { key: "all", label: `All Evaluators (${stats.total_evaluators})` },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => applyFilter({ status: tab.key })}
                                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                            filters.status === tab.key
                                                ? "bg-orange-600 text-white shadow-xs"
                                                : "text-slate-600 hover:text-orange-600 hover:bg-orange-50"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Appraisal Scope Filter */}
                            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
                                <span className="text-slate-500 font-semibold px-2">Type:</span>
                                {[
                                    { key: "all", label: "All (360 + KPI)" },
                                    { key: "360", label: "360° Appraisals" },
                                    { key: "kpi", label: "KPI Evaluations" },
                                ].map((type) => (
                                    <button
                                        key={type.key}
                                        onClick={() => applyFilter({ appraisal_type: type.key })}
                                        className={`rounded-lg px-2.5 py-1 font-bold transition-all cursor-pointer ${
                                            filters.appraisal_type === type.key
                                                ? "bg-white text-slate-900 shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search and Searchable Select Controls */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Live Search */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-600">Search Evaluator</label>
                                <form onSubmit={handleSearchSubmit} className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Name, email, employee no..."
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-hidden"
                                    />
                                </form>
                            </div>

                            {/* Department Searchable Select (SuperAdmin or HRBP) */}
                            {(scope.isSuperAdmin || scope.isHrbp) && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Department</label>
                                    <SearchableSelect
                                        value={filters.department_id ? String(filters.department_id) : ""}
                                        onChange={(val) => applyFilter({ department_id: val ? Number(val) : null })}
                                        options={[
                                            { value: "", label: "All Departments" },
                                            ...departments.map((d) => ({
                                                value: String(d.id),
                                                label: `${d.name} (${d.code})`,
                                            })),
                                        ]}
                                        placeholder="All Departments"
                                        searchPlaceholder="Search department..."
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* Branch / Team Searchable Select (SuperAdmin, HRBP, HOD) */}
                            {!scope.isBranchManager && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Branch / Team</label>
                                    <SearchableSelect
                                        value={filters.team_id ? String(filters.team_id) : ""}
                                        onChange={(val) => applyFilter({ team_id: val ? Number(val) : null })}
                                        options={[
                                            { value: "", label: "All Branches" },
                                            ...teams.map((t) => ({
                                                value: String(t.id),
                                                label: t.name,
                                            })),
                                        ]}
                                        placeholder="All Branches"
                                        searchPlaceholder="Search branch..."
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* Region Searchable Select (SuperAdmin only) */}
                            {scope.isSuperAdmin && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">Region</label>
                                    <SearchableSelect
                                        value={filters.region_id ? String(filters.region_id) : ""}
                                        onChange={(val) => applyFilter({ region_id: val ? Number(val) : null })}
                                        options={[
                                            { value: "", label: "All Regions" },
                                            ...regions.map((r) => ({
                                                value: String(r.id),
                                                label: `${r.name} (${r.code})`,
                                            })),
                                        ]}
                                        placeholder="All Regions"
                                        searchPlaceholder="Search region..."
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* 360 Cycle Searchable Select */}
                            {filters.appraisal_type !== "kpi" && threeSixtyCycles.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">360° Appraisal Cycle</label>
                                    <SearchableSelect
                                        value={filters.three_sixty_cycle_id ? String(filters.three_sixty_cycle_id) : ""}
                                        onChange={(val) => applyFilter({ three_sixty_cycle_id: val ? Number(val) : null })}
                                        options={threeSixtyCycles.map((c) => ({
                                            value: String(c.id),
                                            label: c.name,
                                            sublabel: `Status: ${c.status}`,
                                        }))}
                                        placeholder="Select 360 Cycle..."
                                        searchPlaceholder="Search 360 cycle..."
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* KPI Cycle Searchable Select */}
                            {filters.appraisal_type !== "360" && kpiCycles.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-slate-600">KPI Evaluation Cycle</label>
                                    <SearchableSelect
                                        value={filters.kpi_cycle_id ? String(filters.kpi_cycle_id) : ""}
                                        onChange={(val) => applyFilter({ kpi_cycle_id: val ? Number(val) : null })}
                                        options={kpiCycles.map((c) => ({
                                            value: String(c.id),
                                            label: c.name,
                                            sublabel: `Status: ${c.status}`,
                                        }))}
                                        placeholder="Select KPI Cycle..."
                                        searchPlaceholder="Search KPI cycle..."
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* Rows Per Page Searchable Select */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-600">Rows Per Page</label>
                                <SearchableSelect
                                    value={String(filters.per_page || 15)}
                                    onChange={(val) => applyFilter({ per_page: Number(val) })}
                                    options={[
                                        { value: "15", label: "15 rows per page" },
                                        { value: "25", label: "25 rows per page" },
                                        { value: "50", label: "50 rows per page" },
                                        { value: "100", label: "100 rows per page" },
                                        { value: "250", label: "250 rows per page" },
                                    ]}
                                    placeholder="Per page"
                                    size="sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Main Data Table ─────────────────────────────────── */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs print:rounded-none print:border-slate-300 print:shadow-none">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse print:text-[10px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                                        <th className="py-4 px-6 min-w-[220px] print:py-2 print:px-3">User / Evaluator</th>
                                        <th className="py-4 px-4 min-w-[160px] print:py-2 print:px-3">Department & Branch</th>
                                        <th className="py-4 px-4 text-center min-w-[100px] print:py-2 print:px-2">360° Left</th>
                                        <th className="py-4 px-4 text-center min-w-[100px] print:py-2 print:px-2">KPI Left</th>
                                        <th className="py-4 px-4 text-center min-w-[110px] print:py-2 print:px-2">Total Status</th>
                                        <th className="py-4 px-4 min-w-[140px] print:py-2 print:px-3">Submission Deadline</th>
                                        <th className="py-4 px-4 min-w-[280px] print:py-2 print:px-3">Appraisees Remaining</th>
                                        <th className="no-print print:hidden py-4 px-6 text-right min-w-[140px]">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs print:divide-slate-300 print:text-[10px]">
                                    {users.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-16 text-center text-slate-400 print:py-8">
                                                <div className="flex flex-col items-center justify-center">
                                                    <CheckCircle2 className="h-10 w-10 text-green-600 mb-2" />
                                                    <span className="text-sm font-bold text-slate-800">
                                                        No Outstanding Appraisals Found
                                                    </span>
                                                    <span className="text-xs text-slate-500 mt-1">
                                                        All users in this scope have completed their assigned appraisals, or no records match the filter.
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.data.map((item) => {
                                            const isOverdue = item.is_overdue;
                                            const isCompleted = item.total_remaining === 0;
                                            const isExpanded = !!expandedAppraisees[item.user_id];
                                            const remainingList = item.all_appraisees_remaining;
                                            const displayList = isExpanded ? remainingList : remainingList.slice(0, 3);
                                            const hasMore = remainingList.length > 3;

                                            return (
                                                <tr
                                                    key={item.user_id}
                                                    className={`transition-colors hover:bg-slate-50/80 print:hover:bg-white ${
                                                        isOverdue
                                                            ? "bg-red-50/20"
                                                            : isCompleted
                                                            ? "bg-emerald-50/15"
                                                            : ""
                                                    }`}
                                                >
                                                    {/* User / Evaluator */}
                                                    <td className="py-4 px-6 print:py-2 print:px-3 align-top">
                                                        <div className="font-bold text-slate-900 text-sm print:text-xs">
                                                            {item.name}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 print:text-[9px]">
                                                            {item.employee_no && (
                                                                <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-700">
                                                                    {item.employee_no}
                                                                </span>
                                                            )}
                                                            <span className="truncate max-w-[180px]">{item.email}</span>
                                                        </div>
                                                        {item.job_title && (
                                                            <div className="text-[11px] text-slate-400 mt-0.5 italic print:text-[9px]">
                                                                {item.job_title}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Department & Branch */}
                                                    <td className="py-4 px-4 print:py-2 print:px-3 align-top">
                                                        <div className="font-semibold text-slate-800">
                                                            {item.department_name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {item.branch_name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                            {item.region_name}
                                                        </div>
                                                    </td>

                                                    {/* 360 Progress */}
                                                    <td className="py-4 px-4 text-center print:py-2 print:px-2 align-top">
                                                        {item.three_sixty.assigned === 0 ? (
                                                            <span className="text-slate-400 font-medium">—</span>
                                                        ) : item.three_sixty.remaining === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Done ({item.three_sixty.completed})
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <span className="inline-flex rounded-md bg-purple-50 px-2 py-0.5 text-xs font-black text-purple-700 border border-purple-200">
                                                                    {item.three_sixty.remaining} left
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                    of {item.three_sixty.assigned} assigned
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* KPI Progress */}
                                                    <td className="py-4 px-4 text-center print:py-2 print:px-2 align-top">
                                                        {item.kpi.assigned === 0 ? (
                                                            <span className="text-slate-400 font-medium">—</span>
                                                        ) : item.kpi.remaining === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                Done ({item.kpi.completed})
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 border border-amber-200">
                                                                    {item.kpi.remaining} left
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                    of {item.kpi.assigned} assigned
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Total Status */}
                                                    <td className="py-4 px-4 text-center print:py-2 print:px-2 align-top">
                                                        {item.status === "completed" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                Completed
                                                            </span>
                                                        ) : item.status === "overdue" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                                                                <ShieldAlert className="h-3 w-3" />
                                                                Overdue ({item.total_remaining})
                                                            </span>
                                                        ) : item.status === "in_progress" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                                                                <Clock className="h-3 w-3" />
                                                                In Progress ({item.total_remaining})
                                                            </span>
                                                        ) : item.status === "pending" ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 border border-orange-200">
                                                                Pending ({item.total_remaining})
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                                                                Not Assigned
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Submission Deadline */}
                                                    <td className="py-4 px-4 print:py-2 print:px-3 align-top">
                                                        {item.earliest_deadline ? (
                                                            <div>
                                                                <div className="font-semibold text-slate-800">
                                                                    {formatDate(item.earliest_deadline)}
                                                                </div>
                                                                {item.days_left !== null && (
                                                                    <div
                                                                        className={`text-[11px] font-bold mt-0.5 ${
                                                                            item.days_left < 0
                                                                                ? "text-red-600"
                                                                                : item.days_left <= 3
                                                                                ? "text-orange-600"
                                                                                : "text-slate-500"
                                                                        }`}
                                                                    >
                                                                        {item.days_left < 0
                                                                            ? `${Math.abs(item.days_left)} days overdue`
                                                                            : item.days_left === 0
                                                                            ? "Due today"
                                                                            : `${item.days_left} days left`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 font-medium">—</span>
                                                        )}
                                                    </td>

                                                    {/* Appraisees Remaining */}
                                                    <td className="py-4 px-4 print:py-2 print:px-3 align-top">
                                                        {remainingList.length === 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                                All finished
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                {/* On Screen: Tag chips with expand toggle */}
                                                                <div className="no-print print:hidden flex flex-wrap gap-1.5">
                                                                    {displayList.map((appraisee, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 shadow-2xs"
                                                                        >
                                                                            {appraisee}
                                                                        </span>
                                                                    ))}
                                                                    {hasMore && (
                                                                        <button
                                                                            onClick={() => toggleAppraisees(item.user_id)}
                                                                            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
                                                                        >
                                                                            {isExpanded
                                                                                ? "Show less"
                                                                                : `+${remainingList.length - 3} more`}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Print Only: Show all appraisees completely */}
                                                                <div className="hidden print:block text-[9px] text-slate-700 leading-tight">
                                                                    {remainingList.join(", ")}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions (Hidden in Print Mode) */}
                                                    <td className="no-print print:hidden py-4 px-6 text-right align-top">
                                                        {item.total_remaining > 0 ? (
                                                            <button
                                                                onClick={() => openReminderModal(item)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-2xs transition-all hover:bg-orange-100 hover:border-orange-300 cursor-pointer"
                                                                title={`Send reminder email to ${item.name}`}
                                                            >
                                                                <Mail className="h-3.5 w-3.5" />
                                                                <span>Nudge User</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] font-semibold text-slate-400">
                                                                Finished
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Table Footer & Pagination (Hidden in Print) ─────── */}
                        <div className="no-print print:hidden flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 text-xs text-slate-600">
                            <div>
                                Showing <strong className="text-slate-900">{users.data.length}</strong> of{" "}
                                <strong className="text-slate-900">{users.total}</strong> eligible users
                            </div>

                            {users.last_page > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => applyFilter({ page: users.current_page - 1 })}
                                        disabled={!users.prev_page_url}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                                    >
                                        Previous
                                    </button>
                                    <span className="font-semibold text-slate-700">
                                        Page {users.current_page} of {users.last_page}
                                    </span>
                                    <button
                                        onClick={() => applyFilter({ page: users.current_page + 1 })}
                                        disabled={!users.next_page_url}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Official Sign-Off Block for Print ───────────────── */}
                    <div className="hidden print:block mt-8 border-t-2 border-slate-400 pt-6 space-y-6">
                        <div className="grid grid-cols-3 gap-6 text-xs text-slate-800">
                            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/30">
                                <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">
                                    Report Compiled By
                                </p>
                                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[10px]">
                                    <p>Name: _______________________________</p>
                                    <p>Sign: _______________________________</p>
                                    <p>Date: _______________________________</p>
                                </div>
                            </div>
                            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/30">
                                <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">
                                    Verified By HRBP / HOD
                                </p>
                                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[10px]">
                                    <p>Name: _______________________________</p>
                                    <p>Sign: _______________________________</p>
                                    <p>Date: _______________________________</p>
                                </div>
                            </div>
                            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/30">
                                <p className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">
                                    Approved by Head of HR / GM
                                </p>
                                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[10px]">
                                    <p>Name: _______________________________</p>
                                    <p>Sign: _______________________________</p>
                                    <p>Date: _______________________________</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-200">
                            <span>Confidential • Progressive Credit Limited Internal Audit</span>
                            <span>Appraise360 Performance Management System</span>
                            <span>Generated: {new Date().toLocaleDateString("en-GB")}</span>
                        </div>
                    </div>

                    {/* ── Automated Daily Notification Policy Card (Hidden in Print) ── */}
                    <div className="no-print print:hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Automated Daily Notification & Submission Deadline Policy
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
                                    <strong>How automated notifications work:</strong> The system scans all evaluators across Progressive Credit daily at <strong>08:00 AM</strong>.
                                    If a user has any remaining assigned 360° appraisals or KPI evaluations, an automated email is dispatched notifying them of their completed vs. remaining count,
                                    listing the specific appraisees awaiting their completion, and providing the submission deadline.
                                </p>
                                <p className="text-xs text-slate-600 font-semibold pt-1">
                                    • Automated emails stop immediately once the user completes all assigned appraisals OR once the official submission deadline is reached.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ── Upgraded Send Reminder Modal ────────────────────────── */}
            <Dialog open={reminderModalOpen} onOpenChange={setReminderModalOpen}>
                <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7 border-slate-200 bg-white shadow-2xl">
                    <DialogHeader className="space-y-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-2xs">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <DialogTitle className="text-lg font-black text-slate-900">
                                        {targetUser
                                            ? `Send Reminder: ${targetUser.name}`
                                            : `Dispatch Reminders to All Pending Users`}
                                    </DialogTitle>
                                    <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                        {targetUser ? "Direct Nudge" : "Batch Dispatch"}
                                    </span>
                                </div>
                                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                                    {targetUser
                                        ? `Send a targeted appraisal reminder email with pending evaluatees and deadline details.`
                                        : `Send automated reminder emails to all ${stats.total_incomplete_evaluators} pending evaluator(s) whose submission deadlines have not yet expired.`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Recipient Details Card */}
                        {targetUser ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{targetUser.name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                            {targetUser.employee_no && (
                                                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold text-[11px]">
                                                    {targetUser.employee_no}
                                                </span>
                                            )}
                                            <span>{targetUser.email}</span>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs">
                                        <span className="font-semibold text-slate-700">{targetUser.department_name}</span>
                                        <div className="text-[11px] text-slate-400">{targetUser.branch_name}</div>
                                    </div>
                                </div>

                                {/* Breakdown Tiles */}
                                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200/80">
                                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-purple-700">360° Pending</span>
                                        <div className="text-base font-black text-slate-900 mt-0.5">
                                            {targetUser.three_sixty.remaining}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-amber-700">KPI Pending</span>
                                        <div className="text-base font-black text-slate-900 mt-0.5">
                                            {targetUser.kpi.remaining}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-orange-700">Total Pending</span>
                                        <div className="text-base font-black text-orange-700 mt-0.5">
                                            {targetUser.total_remaining}
                                        </div>
                                    </div>
                                </div>

                                {/* Appraisees awaiting review */}
                                {targetUser.all_appraisees_remaining.length > 0 && (
                                    <div className="pt-1">
                                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                            Appraisees Awaiting Evaluation ({targetUser.all_appraisees_remaining.length}):
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                            {targetUser.all_appraisees_remaining.map((appraisee, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 shadow-2xs"
                                                >
                                                    {appraisee}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Deadline status */}
                                {targetUser.earliest_deadline && (
                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                        <span className="text-slate-500 font-medium">Submission Deadline:</span>
                                        <span className="font-bold text-slate-800">
                                            {formatDate(targetUser.earliest_deadline)}
                                            {targetUser.days_left !== null && (
                                                <span className={`ml-1.5 font-bold ${
                                                    targetUser.days_left < 0 ? "text-red-600" : targetUser.days_left <= 3 ? "text-orange-600" : "text-green-700"
                                                }`}>
                                                    ({targetUser.days_left < 0 ? `${Math.abs(targetUser.days_left)}d overdue` : `${targetUser.days_left}d left`})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-slate-500">Recipients</span>
                                        <div className="text-xl font-black text-slate-900 mt-0.5">
                                            {stats.total_incomplete_evaluators}
                                        </div>
                                        <span className="text-[10px] text-slate-400">evaluators</span>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-purple-700">360° Pending</span>
                                        <div className="text-xl font-black text-slate-900 mt-0.5">
                                            {stats.total_360_remaining}
                                        </div>
                                        <span className="text-[10px] text-slate-400">reviews left</span>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase text-amber-700">KPI Pending</span>
                                        <div className="text-xl font-black text-slate-900 mt-0.5">
                                            {stats.total_kpi_remaining}
                                        </div>
                                        <span className="text-[10px] text-slate-400">evaluations left</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                                    <ShieldAlert className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                                    <div className="text-[11px] leading-relaxed">
                                        <strong>Strict Cutoff Rule:</strong> Notifications will only be dispatched to evaluators whose official submission deadline has not elapsed. Overdue cycles are automatically filtered out to stop unwanted messages.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Custom Manager Note */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <span>Personalized Note from Management</span>
                                    <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                                </label>
                                <span className="text-[10px] text-slate-400">{managerNote.length}/300 characters</span>
                            </div>
                            <textarea
                                value={managerNote}
                                maxLength={300}
                                onChange={(e) => setManagerNote(e.target.value)}
                                placeholder="e.g. Please ensure all peer reviews and KPI self-evaluations are finalized before tomorrow afternoon for moderation..."
                                rows={2}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-hidden"
                            />
                            <p className="text-[10px] text-slate-400">
                                This note will be prominently highlighted in an executive callout box inside the recipient's email.
                            </p>
                        </div>

                        {/* Email Preview Accordion Toggle */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowEmailPreview(!showEmailPreview)}
                                className="w-full flex items-center justify-between bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    {showEmailPreview ? <EyeOff className="h-4 w-4 text-orange-600" /> : <Eye className="h-4 w-4 text-orange-600" />}
                                    <span>Live Email Preview</span>
                                </div>
                                <span className="text-[11px] text-orange-600 font-semibold">
                                    {showEmailPreview ? "Hide Preview" : "Show Email Preview"}
                                </span>
                            </button>

                            {showEmailPreview && (
                                <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-xs font-sans">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px] space-y-1 text-slate-600">
                                        <div><strong>Subject:</strong> Appraisal Action Required: {targetUser ? targetUser.total_remaining : stats.total_incomplete_evaluators} Outstanding Appraisal(s) — Progressive Credit</div>
                                        <div><strong>From:</strong> Appraise360 Notifications &lt;notifications@progressivecredit.co.ke&gt;</div>
                                        <div><strong>To:</strong> {targetUser ? `${targetUser.name} <${targetUser.email}>` : "Eligible Pending Evaluators..."}</div>
                                    </div>

                                    {/* Simulated Email Body */}
                                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                                        <div className="flex items-center gap-3 border-b border-orange-500 pb-2">
                                            <img src="/images/logo.png" alt="Progressive Credit" className="h-8 w-auto object-contain" />
                                            <span className="text-xs font-extrabold text-orange-600 tracking-wider uppercase">
                                                Progressive Credit — Appraise360
                                            </span>
                                        </div>

                                        <p className="font-semibold text-slate-900">
                                            Hello {targetUser ? targetUser.name : "Staff Member"},
                                        </p>

                                        <p className="text-slate-600 text-[11px]">
                                            This is an automated notification from <strong>Appraise360</strong>. You have outstanding appraisals that require your completion.
                                        </p>

                                        {managerNote.trim() && (
                                            <div className="rounded-lg border-l-4 border-orange-500 bg-orange-50/70 p-2.5 text-[11px] text-orange-950">
                                                <strong className="text-orange-900">Note from Management / HR:</strong>
                                                <div className="mt-0.5 italic">"{managerNote.trim()}"</div>
                                            </div>
                                        )}

                                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5 text-[11px]">
                                            <div className="font-bold text-slate-800">Appraisal Status Summary</div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Appraisals Remaining:</span>
                                                <span className="font-black text-orange-600">{targetUser ? targetUser.total_remaining : stats.total_incomplete_evaluators}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Submission Deadline:</span>
                                                <span className="font-bold text-slate-800">{targetUser ? formatDate(targetUser.earliest_deadline) : "Cycle Deadline"}</span>
                                            </div>
                                        </div>

                                        <div className="text-center pt-2">
                                            <span className="inline-block rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-xs">
                                                Complete Your Appraisals Now →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setReminderModalOpen(false)}
                            disabled={isSubmittingReminder}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={confirmSendReminder}
                            disabled={isSubmittingReminder || (!targetUser && stats.total_incomplete_evaluators === 0)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-orange-700 hover:to-orange-800 cursor-pointer disabled:opacity-50"
                        >
                            {isSubmittingReminder ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Sending Notification...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    <span>
                                        {targetUser
                                            ? "Send Reminder Now"
                                            : `Dispatch to ${stats.total_incomplete_evaluators} Evaluator(s)`}
                                    </span>
                                </>
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

PendingAppraisals.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: "Dashboard",
            href: props.currentTeam ? `/${props.currentTeam.slug}/dashboard` : "/",
        },
        {
            title: "Performance Reports",
            href: props.currentTeam ? `/${props.currentTeam.slug}/reports/performance` : "#",
        },
        {
            title: "Pending Appraisals Report",
            href: "#",
        },
    ],
});
