// resources/js/pages/three-sixty/Index.tsx
import { Head, useForm, router } from "@inertiajs/react";
import { useState, useMemo, FormEventHandler } from "react";
import {
    store as storeCycleRoute,
    update as updateCycleRoute,
    destroy as destroyCycleRoute,
    open as openCycleRoute,
    close as closeCycleRoute,
    generate as generateEvaluationsRoute,
} from "@/routes/three-sixty/cycles";
import {
    store as storeRuleRoute,
    update as updateRuleRoute,
    destroy as destroyRuleRoute,
} from "@/routes/three-sixty/rules";
import {
    GitFork,
    Calendar,
    Settings2,
    Users,
    CheckCircle2,
    Clock,
    Plus,
    Pencil,
    Trash2,
    Play,
    Pause,
    Sparkles,
    ArrowRightLeft,
    ArrowRight,
    ArrowLeft,
    Shield,
    Building2,
    Layers,
    Filter,
    X,
    Info,
    AlertCircle,
    CheckSquare,
} from "lucide-react";
import Swal from "sweetalert2";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Spinner } from "@/components/ui/spinner";

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

interface RuleItem {
    id: number;
    name: string;
    rule_type: string;
    source_ids: number[] | null;
    target_ids: number[] | null;
    direction: "mutual" | "source_evaluates_target" | "target_evaluates_source";
    include_peers: boolean;
    is_active: boolean;
}

interface CycleItem {
    id: number;
    name: string;
    kpi_cycle_id: number | null;
    kpi_cycle_name?: string | null;
    period_start: string;
    period_end: string;
    evaluation_deadline: string;
    status: "draft" | "open" | "closed";
    description: string | null;
    rules_count: number;
    active_rules_count: number;
    evaluations_count: number;
    completed_count: number;
    rules: RuleItem[];
}

interface OptionItem {
    id: number;
    name: string;
    code?: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
    job_title?: string | null;
    employee_no?: string | null;
    branch_id?: number | null;
    branch?: string | null;
    department_id?: number | null;
    department?: string | null;
}

interface Props {
    cycles: CycleItem[];
    kpiCycles: { id: number; name: string; status: string }[];
    branches: OptionItem[];
    departments: OptionItem[];
    regions?: OptionItem[];
    users?: UserOption[];
    stats: {
        total_cycles: number;
        open_cycles: number;
        total_evaluations: number;
        completed_evals: number;
    };
    ruleTypes: string[];
    directions: string[];
}

export default function ThreeSixtyIndex({
    cycles,
    kpiCycles,
    branches,
    departments,
    regions = [],
    users = [],
    stats,
    ruleTypes,
    directions,
}: Props) {
    const [activeTab, setActiveTab] = useState<"cycles" | "rules" | "matrix">("cycles");
    const [selectedCycleId, setSelectedCycleId] = useState<number>(
        cycles.length > 0 ? cycles[0].id : 0
    );

    const selectedCycle = useMemo(() => {
        return cycles.find((c) => c.id === selectedCycleId) || cycles[0] || null;
    }, [cycles, selectedCycleId]);

    // Modals
    const [showCycleModal, setShowCycleModal] = useState(false);
    const [editingCycle, setEditingCycle] = useState<CycleItem | null>(null);

    const [showRuleModal, setShowRuleModal] = useState(false);
    const [editingRule, setEditingRule] = useState<RuleItem | null>(null);
    const [targetSearch, setTargetSearch] = useState("");
    const [targetBranchFilter, setTargetBranchFilter] = useState<string | number>("");
    const [targetDeptFilter, setTargetDeptFilter] = useState<string | number>("");
    const [evaluatorSearch, setEvaluatorSearch] = useState("");
    const [evaluatorBranchFilter, setEvaluatorBranchFilter] = useState<string | number>("");
    const [evaluatorDeptFilter, setEvaluatorDeptFilter] = useState<string | number>("");

    // Cycle Form
    const cycleForm = useForm({
        name: "",
        kpi_cycle_id: "" as string | number,
        period_start: "",
        period_end: "",
        evaluation_deadline: "",
        description: "",
    });

    // Rule Form
    const ruleForm = useForm({
        name: "",
        rule_type: "branch_internal",
        source_ids: [] as number[],
        target_ids: [] as number[],
        direction: "mutual",
        include_peers: true,
        is_active: true,
    });

    // ── Cycle actions ────────────────────────────────────────────────────────
    const openCreateCycleModal = () => {
        const today = new Date().toISOString().split("T")[0];
        cycleForm.setData({
            name: "",
            kpi_cycle_id: kpiCycles.length > 0 ? kpiCycles[0].id : "",
            period_start: today,
            period_end: today,
            evaluation_deadline: today,
            description: "",
        });
        cycleForm.clearErrors();
        setEditingCycle(null);
        setShowCycleModal(true);
    };

    const openEditCycleModal = (cycle: CycleItem) => {
        cycleForm.setData({
            name: cycle.name,
            kpi_cycle_id: cycle.kpi_cycle_id || "",
            period_start: cycle.period_start,
            period_end: cycle.period_end,
            evaluation_deadline: cycle.evaluation_deadline,
            description: cycle.description || "",
        });
        cycleForm.clearErrors();
        setEditingCycle(cycle);
        setShowCycleModal(true);
    };

    const submitCycleForm: FormEventHandler = (e) => {
        e.preventDefault();
        if (editingCycle) {
            cycleForm.put(updateCycleRoute.url(editingCycle.id), {
                preserveScroll: true,
                onSuccess: () => setShowCycleModal(false),
            });
        } else {
            cycleForm.post(storeCycleRoute.url(), {
                preserveScroll: true,
                onSuccess: () => setShowCycleModal(false),
            });
        }
    };

    const toggleCycleStatus = async (cycle: CycleItem) => {
        if (cycle.status === "open") {
            const res = await Swal.fire({
                icon: "warning",
                title: "Close Appraisal Cycle?",
                text: `Close 360° appraisal cycle "${cycle.name}"? Submissions will be locked.`,
                showCancelButton: true,
                confirmButtonText: "Yes, close cycle",
                cancelButtonText: "Cancel",
                confirmButtonColor: C.warn,
                cancelButtonColor: "#6B7280",
            });
            if (res.isConfirmed) {
                router.post(closeCycleRoute.url(cycle.id), {}, { preserveScroll: true });
            }
        } else {
            const res = await Swal.fire({
                icon: "question",
                title: "Open Appraisal Cycle?",
                text: `Open 360° appraisal cycle "${cycle.name}"? Any other open 360° cycle will be closed.`,
                showCancelButton: true,
                confirmButtonText: "Yes, open cycle",
                cancelButtonText: "Cancel",
                confirmButtonColor: C.green,
                cancelButtonColor: "#6B7280",
            });
            if (res.isConfirmed) {
                router.post(openCycleRoute.url(cycle.id), {}, { preserveScroll: true });
            }
        }
    };

    const deleteCycle = async (cycle: CycleItem) => {
        const res = await Swal.fire({
            icon: "warning",
            title: "Delete Appraisal Cycle?",
            text: `Are you sure you want to delete cycle "${cycle.name}" and all associated rules and evaluations? This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.danger,
            cancelButtonColor: "#6B7280",
        });
        if (res.isConfirmed) {
            router.delete(destroyCycleRoute.url(cycle.id), { preserveScroll: true });
        }
    };

    const generateAssignments = async (cycle: CycleItem) => {
        if (cycle.status !== "open") {
            await Swal.fire({
                icon: "info",
                title: "Cycle Not Open",
                text: "Please open the appraisal cycle first before generating participant assignments.",
                confirmButtonColor: C.orange,
            });
            return;
        }

        const res = await Swal.fire({
            icon: "question",
            title: "Generate Evaluation Pairs?",
            text: `Generate 360° evaluation pairs for "${cycle.name}" based on its ${cycle.active_rules_count} active rule(s)? Existing pairs will not be duplicated.`,
            showCancelButton: true,
            confirmButtonText: "Yes, generate pairs",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.orange,
            cancelButtonColor: "#6B7280",
        });

        if (res.isConfirmed) {
            router.post(generateEvaluationsRoute.url(cycle.id), {}, { preserveScroll: true });
        }
    };

    // ── Rule actions ─────────────────────────────────────────────────────────
    const openCreateRuleModal = () => {
        ruleForm.setData({
            name: "",
            rule_type: "branch_internal",
            source_ids: branches.map((b) => b.id),
            target_ids: [],
            direction: "mutual",
            include_peers: true,
            is_active: true,
        });
        ruleForm.clearErrors();
        setTargetSearch("");
        setTargetBranchFilter("");
        setTargetDeptFilter("");
        setEvaluatorSearch("");
        setEvaluatorBranchFilter("");
        setEvaluatorDeptFilter("");
        setEditingRule(null);
        setShowRuleModal(true);
    };

    const openEditRuleModal = (rule: RuleItem) => {
        ruleForm.setData({
            name: rule.name,
            rule_type: rule.rule_type,
            source_ids: rule.source_ids || [],
            target_ids: rule.target_ids || [],
            direction: rule.direction,
            include_peers: rule.include_peers,
            is_active: rule.is_active,
        });
        ruleForm.clearErrors();
        setTargetSearch("");
        setTargetBranchFilter("");
        setTargetDeptFilter("");
        setEvaluatorSearch("");
        setEvaluatorBranchFilter("");
        setEvaluatorDeptFilter("");
        setEditingRule(rule);
        setShowRuleModal(true);
    };

    const submitRuleForm: FormEventHandler = (e) => {
        e.preventDefault();
        if (!selectedCycle) return;

        if (ruleForm.data.rule_type === "individual_staff") {
            if (!ruleForm.data.target_ids || ruleForm.data.target_ids.length === 0) {
                Swal.fire({
                    icon: "warning",
                    title: "Target Staff Required",
                    text: "Please select at least one staff member to be appraised.",
                    confirmButtonColor: C.orange,
                });
                return;
            }
            if (!ruleForm.data.source_ids || ruleForm.data.source_ids.length === 0) {
                Swal.fire({
                    icon: "warning",
                    title: "Appraisers Required",
                    text: "Please select at least one appraiser / evaluator.",
                    confirmButtonColor: C.orange,
                });
                return;
            }
        }

        if (editingRule) {
            ruleForm.put(updateRuleRoute.url(editingRule.id), {
                preserveScroll: true,
                onSuccess: () => setShowRuleModal(false),
            });
        } else {
            ruleForm.post(storeRuleRoute.url(selectedCycle.id), {
                preserveScroll: true,
                onSuccess: () => setShowRuleModal(false),
            });
        }
    };

    const deleteRule = async (rule: RuleItem) => {
        const res = await Swal.fire({
            icon: "warning",
            title: "Delete Relationship Rule?",
            text: `Are you sure you want to delete rule "${rule.name}"?`,
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel",
            confirmButtonColor: C.danger,
            cancelButtonColor: "#6B7280",
        });
        if (res.isConfirmed) {
            router.delete(destroyRuleRoute.url(rule.id), { preserveScroll: true });
        }
    };

    const toggleRuleActive = (rule: RuleItem) => {
        router.put(
            updateRuleRoute.url(rule.id),
            {
                name: rule.name,
                rule_type: rule.rule_type,
                source_ids: rule.source_ids || [],
                target_ids: rule.target_ids || [],
                direction: rule.direction,
                include_peers: rule.include_peers,
                is_active: !rule.is_active,
            },
            { preserveScroll: true }
        );
    };

    // Rule helpers
    const formatRuleType = (type: string) => {
        switch (type) {
            case "branch_internal":
                return "Branch Internal (BM ↔ Staff & Branch Peers)";
            case "dept_internal":
                return "Department Internal (HOD ↔ Staff & Dept Peers)";
            case "cross_dept":
                return "Cross-Department (HQ Inter-Departmental)";
            case "bm_peers":
                return "Branch Managers Peer-to-Peer";
            case "hod_and_bm":
                return "HODs ↔ Branch Managers Cross-Functional";
            case "bm_to_dept_staff":
                return "Branch Managers → HQ Support Staff (e.g. IT/HR)";
            case "rm_bm_region":
                return "Regional Manager (RM) ↔ Branch Managers in Region";
            case "rstl_bm_region":
                return "Regional Sales Team Lead (RSTL) ↔ Branch Managers in Region";
            case "regional_and_hod":
                return "Regional Leaders (RM/RSTL) ↔ Head of Departments (HODs)";
            case "regional_to_dept_staff":
                return "Regional Leaders (RM/RSTL) ↔ HQ Department Support Staff";
            case "individual_staff":
                return "Specific Staff Member (New Staff / Targeted Appraisal)";
            default:
                return type;
        }
    };

    const isIndividualStaff = ruleForm.data.rule_type === "individual_staff";
    const isSourceBranch = ["branch_internal", "bm_peers", "bm_to_dept_staff"].includes(ruleForm.data.rule_type);
    const isTargetBranch = ["hod_and_bm"].includes(ruleForm.data.rule_type);
    const isSourceDept = ["dept_internal", "cross_dept", "hod_and_bm"].includes(ruleForm.data.rule_type);
    const isTargetDept = ["cross_dept", "bm_to_dept_staff", "regional_and_hod", "regional_to_dept_staff"].includes(ruleForm.data.rule_type);
    const isSourceRegion = ["rm_bm_region", "rstl_bm_region", "regional_and_hod", "regional_to_dept_staff"].includes(ruleForm.data.rule_type);

    const filteredTargetUsers = useMemo(() => {
        return users.filter((u) => {
            if (targetBranchFilter !== "" && u.branch_id !== Number(targetBranchFilter)) {
                return false;
            }
            if (targetDeptFilter !== "" && u.department_id !== Number(targetDeptFilter)) {
                return false;
            }
            if (targetSearch.trim()) {
                const q = targetSearch.toLowerCase();
                const matches =
                    u.name.toLowerCase().includes(q) ||
                    (u.job_title && u.job_title.toLowerCase().includes(q)) ||
                    (u.branch && u.branch.toLowerCase().includes(q)) ||
                    (u.department && u.department.toLowerCase().includes(q)) ||
                    (u.email && u.email.toLowerCase().includes(q));
                if (!matches) return false;
            }
            return true;
        });
    }, [users, targetBranchFilter, targetDeptFilter, targetSearch]);

    const filteredEvaluatorUsers = useMemo(() => {
        return users.filter((u) => {
            if (evaluatorBranchFilter !== "" && u.branch_id !== Number(evaluatorBranchFilter)) {
                return false;
            }
            if (evaluatorDeptFilter !== "" && u.department_id !== Number(evaluatorDeptFilter)) {
                return false;
            }
            if (evaluatorSearch.trim()) {
                const q = evaluatorSearch.toLowerCase();
                const matches =
                    u.name.toLowerCase().includes(q) ||
                    (u.job_title && u.job_title.toLowerCase().includes(q)) ||
                    (u.branch && u.branch.toLowerCase().includes(q)) ||
                    (u.department && u.department.toLowerCase().includes(q)) ||
                    (u.email && u.email.toLowerCase().includes(q));
                if (!matches) return false;
            }
            return true;
        });
    }, [users, evaluatorBranchFilter, evaluatorDeptFilter, evaluatorSearch]);

    const isCycleFormValid = Boolean(
        cycleForm.data.name?.trim() &&
        cycleForm.data.period_start &&
        cycleForm.data.period_end &&
        cycleForm.data.evaluation_deadline
    );

    const isRuleFormValid = useMemo(() => {
        if (!ruleForm.data.name?.trim()) return false;
        if (ruleForm.data.rule_type === "individual_staff") {
            return (
                ruleForm.data.target_ids.length > 0 &&
                ruleForm.data.source_ids.length > 0
            );
        }
        if (isSourceBranch && ruleForm.data.source_ids.length === 0) return false;
        if (isTargetBranch && ruleForm.data.target_ids.length === 0) return false;
        if (isSourceDept && ruleForm.data.source_ids.length === 0) return false;
        if (isTargetDept && ruleForm.data.target_ids.length === 0) return false;
        if (isSourceRegion && ruleForm.data.source_ids.length === 0) return false;
        return true;
    }, [
        ruleForm.data,
        isSourceBranch,
        isTargetBranch,
        isSourceDept,
        isTargetDept,
        isSourceRegion,
    ]);

    return (
        <>
            <Head title="360° Appraisal Setup & Matrix" />

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
                                    360° Appraisal Setup & Matrix
                                </h1>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                    style={{
                                        backgroundColor: C.orangeLight,
                                        color: C.orangeDark,
                                    }}
                                >
                                    <GitFork className="h-3.5 w-3.5" />
                                    Multi-Rater Setup
                                </span>
                            </div>
                            <p
                                className="mt-1 text-sm"
                                style={{ color: C.textSecondary }}
                            >
                                Configure appraisal periods, review relationships across branches and HQ departments, and generate evaluator assignments based on core values.
                            </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={openCreateCycleModal}
                                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                                style={{ backgroundColor: C.orange }}
                            >
                                <Plus className="h-4 w-4" />
                                New 360° Period
                            </button>
                        </div>
                    </div>

                    {/* ── Metric Cards Grid ──────────────────────────────── */}
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div
                            className="rounded-2xl border p-5 shadow-sm transition-all"
                            style={{ backgroundColor: C.white, borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Total 360° Periods
                                </span>
                                <div className="rounded-xl p-2" style={{ backgroundColor: C.navyLight }}>
                                    <Calendar className="h-4 w-4" style={{ color: C.navy }} />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold" style={{ color: C.textPrimary }}>
                                    {stats.total_cycles}
                                </span>
                                <span className="text-xs font-medium" style={{ color: C.green }}>
                                    {stats.open_cycles} Active / Open
                                </span>
                            </div>
                        </div>

                        <div
                            className="rounded-2xl border p-5 shadow-sm transition-all"
                            style={{ backgroundColor: C.white, borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Relationship Rules
                                </span>
                                <div className="rounded-xl p-2" style={{ backgroundColor: C.orangeLight }}>
                                    <Settings2 className="h-4 w-4" style={{ color: C.orangeDark }} />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold" style={{ color: C.textPrimary }}>
                                    {selectedCycle ? selectedCycle.rules_count : 0}
                                </span>
                                <span className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    in selected cycle ({selectedCycle ? selectedCycle.active_rules_count : 0} active)
                                </span>
                            </div>
                        </div>

                        <div
                            className="rounded-2xl border p-5 shadow-sm transition-all"
                            style={{ backgroundColor: C.white, borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Evaluation Pairs
                                </span>
                                <div className="rounded-xl p-2" style={{ backgroundColor: C.navyLight }}>
                                    <Users className="h-4 w-4" style={{ color: C.navy }} />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold" style={{ color: C.textPrimary }}>
                                    {selectedCycle ? selectedCycle.evaluations_count : stats.total_evaluations}
                                </span>
                                <span className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    pair assignments generated
                                </span>
                            </div>
                        </div>

                        <div
                            className="rounded-2xl border p-5 shadow-sm transition-all"
                            style={{ backgroundColor: C.white, borderColor: C.border }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Submissions Done
                                </span>
                                <div className="rounded-xl p-2" style={{ backgroundColor: C.greenLight }}>
                                    <CheckCircle2 className="h-4 w-4" style={{ color: C.greenDark }} />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold" style={{ color: C.textPrimary }}>
                                    {selectedCycle ? selectedCycle.completed_count : stats.completed_evals}
                                </span>
                                <span className="text-xs font-medium" style={{ color: C.green }}>
                                    {selectedCycle && selectedCycle.evaluations_count > 0
                                        ? `${Math.round((selectedCycle.completed_count / selectedCycle.evaluations_count) * 100)}% complete`
                                        : "0% complete"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Main Tab Navigation & Cycle Switcher ───────────── */}
                    <div
                        className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
                        style={{ backgroundColor: C.white, borderColor: C.border }}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab("cycles")}
                                className="rounded-xl px-4 py-2 text-xs font-bold transition-all"
                                style={{
                                    backgroundColor: activeTab === "cycles" ? C.orange : "transparent",
                                    color: activeTab === "cycles" ? C.white : C.textSecondary,
                                }}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    1. Appraisal Periods ({cycles.length})
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab("rules")}
                                className="rounded-xl px-4 py-2 text-xs font-bold transition-all"
                                style={{
                                    backgroundColor: activeTab === "rules" ? C.orange : "transparent",
                                    color: activeTab === "rules" ? C.white : C.textSecondary,
                                }}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Settings2 className="h-4 w-4" />
                                    2. Relationship Rules ({selectedCycle ? selectedCycle.rules_count : 0})
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab("matrix")}
                                className="rounded-xl px-4 py-2 text-xs font-bold transition-all"
                                style={{
                                    backgroundColor: activeTab === "matrix" ? C.orange : "transparent",
                                    color: activeTab === "matrix" ? C.white : C.textSecondary,
                                }}
                            >
                                <span className="flex items-center gap-1.5">
                                    <Layers className="h-4 w-4" />
                                    3. Assignment Matrix & Actions
                                </span>
                            </button>
                        </div>

                        {/* Cycle selector dropdown */}
                        <div className="flex items-center gap-2 min-w-[220px]">
                            <span className="text-xs font-semibold shrink-0" style={{ color: C.textSecondary }}>
                                Active Cycle:
                            </span>
                            <SearchableSelect
                                options={cycles.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                    sublabel: c.status.toUpperCase(),
                                }))}
                                value={selectedCycleId}
                                onChange={(val) => setSelectedCycleId(Number(val))}
                                placeholder="Select cycle..."
                                searchPlaceholder="Search cycle..."
                                size="sm"
                            />
                        </div>
                    </div>

                    {/* ── TAB 1: Appraisal Periods ───────────────────────── */}
                    {activeTab === "cycles" && (
                        <div
                            className="overflow-hidden rounded-2xl border shadow-sm"
                            style={{ backgroundColor: C.white, borderColor: C.border }}
                        >
                            <div className="border-b px-6 py-4" style={{ borderColor: C.border }}>
                                <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                    360° Appraisal Periods
                                </h2>
                                <p className="text-xs" style={{ color: C.textSecondary }}>
                                    Define the evaluation window and synchronize with organizational KPI cycles.
                                </p>
                            </div>

                            {cycles.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Calendar className="mx-auto h-12 w-12 opacity-30" style={{ color: C.textSecondary }} />
                                    <p className="mt-3 text-sm font-semibold" style={{ color: C.textPrimary }}>
                                        No 360° appraisal periods defined yet.
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: C.textSecondary }}>
                                        Create a period to begin configuring multi-rater evaluations.
                                    </p>
                                    <button
                                        onClick={openCreateCycleModal}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: C.orange }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create First Period
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b bg-gray-50/50" style={{ borderColor: C.border }}>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Period Name</th>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Linked KPI Cycle</th>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Date Window</th>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Deadline</th>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Status</th>
                                                <th className="px-6 py-3 font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Rules & Pairs</th>
                                                <th className="px-6 py-3 text-right font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: C.border }}>
                                            {cycles.map((cycle) => {
                                                const isOpen = cycle.status === "open";
                                                return (
                                                    <tr key={cycle.id} className="transition-colors hover:bg-gray-50/70">
                                                        <td className="px-6 py-4 font-bold" style={{ color: C.textPrimary }}>
                                                            {cycle.name}
                                                            {cycle.description && (
                                                                <p className="mt-0.5 text-[11px] font-normal" style={{ color: C.textSecondary }}>
                                                                    {cycle.description}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium" style={{ color: C.textSecondary }}>
                                                            {cycle.kpi_cycle_name ? (
                                                                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: C.navyLight, color: C.navy }}>
                                                                    {cycle.kpi_cycle_name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">Standalone</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium" style={{ color: C.textSecondary }}>
                                                            {cycle.period_start} → {cycle.period_end}
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold" style={{ color: C.orangeDark }}>
                                                            {cycle.evaluation_deadline}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                                                                style={{
                                                                    backgroundColor: isOpen ? C.greenLight : C.border,
                                                                    color: isOpen ? C.greenDark : C.textSecondary,
                                                                }}
                                                            >
                                                                {isOpen ? <Play className="h-3 w-3 fill-current" /> : <Clock className="h-3 w-3" />}
                                                                {cycle.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-semibold" style={{ color: C.textPrimary }}>
                                                                    {cycle.rules_count} rules ({cycle.active_rules_count} active)
                                                                </span>
                                                                <span className="text-[11px]" style={{ color: C.textSecondary }}>
                                                                    {cycle.evaluations_count} pairs generated
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => toggleCycleStatus(cycle)}
                                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all"
                                                                    style={{
                                                                        backgroundColor: isOpen ? C.warnLight : C.greenLight,
                                                                        color: isOpen ? C.warn : C.greenDark,
                                                                    }}
                                                                    title={isOpen ? "Close cycle" : "Open cycle"}
                                                                >
                                                                    {isOpen ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                                                    {isOpen ? "Close" : "Open"}
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditCycleModal(cycle)}
                                                                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                                                                    title="Edit cycle"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteCycle(cycle)}
                                                                    disabled={isOpen}
                                                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                                                                    title="Delete cycle"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB 2: Relationship Rules ──────────────────────── */}
                    {activeTab === "rules" && (
                        <div className="flex flex-col gap-6">
                            <div
                                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6 shadow-sm"
                                style={{ backgroundColor: C.white, borderColor: C.border }}
                            >
                                <div>
                                    <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                        Relationship Rules for: {selectedCycle?.name || "No cycle selected"}
                                    </h2>
                                    <p className="mt-1 text-xs" style={{ color: C.textSecondary }}>
                                        Rules control which groups and roles evaluate each other (Branch internal, Dept internal, Cross-department, BM peer-to-peer, HOD & BM, etc.)
                                    </p>
                                </div>
                                <button
                                    onClick={openCreateRuleModal}
                                    disabled={!selectedCycle}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Relationship Rule
                                </button>
                            </div>

                            {selectedCycle && selectedCycle.rules.length === 0 ? (
                                <div
                                    className="rounded-2xl border p-12 text-center shadow-sm"
                                    style={{ backgroundColor: C.white, borderColor: C.border }}
                                >
                                    <Settings2 className="mx-auto h-12 w-12 opacity-30" style={{ color: C.textSecondary }} />
                                    <p className="mt-3 text-sm font-semibold" style={{ color: C.textPrimary }}>
                                        No relationship rules defined for this cycle.
                                    </p>
                                    <p className="mt-1 text-xs" style={{ color: C.textSecondary }}>
                                        Add rules to specify how branches, departments, and managers evaluate one another.
                                    </p>
                                    <button
                                        onClick={openCreateRuleModal}
                                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: C.orange }}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add First Rule
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {selectedCycle?.rules.map((rule) => {
                                        return (
                                            <div
                                                key={rule.id}
                                                className="flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all"
                                                style={{
                                                    backgroundColor: C.white,
                                                    borderColor: rule.is_active ? C.border : "#F3F4F6",
                                                    opacity: rule.is_active ? 1 : 0.6,
                                                }}
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                                                                style={{ backgroundColor: C.navyLight, color: C.navy }}
                                                            >
                                                                {rule.rule_type.replace(/_/g, " ")}
                                                            </span>
                                                            <h3 className="mt-2 text-sm font-bold" style={{ color: C.textPrimary }}>
                                                                {rule.name}
                                                            </h3>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleRuleActive(rule)}
                                                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                                                            style={{
                                                                backgroundColor: rule.is_active ? C.greenLight : C.border,
                                                                color: rule.is_active ? C.greenDark : C.textSecondary,
                                                            }}
                                                        >
                                                            {rule.is_active ? "Active" : "Inactive"}
                                                        </button>
                                                    </div>

                                                    <p className="mt-2 text-xs font-medium" style={{ color: C.textSecondary }}>
                                                        {formatRuleType(rule.rule_type)}
                                                    </p>

                                                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                                        <span className="font-semibold" style={{ color: C.textSecondary }}>
                                                            Direction:
                                                        </span>
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold"
                                                            style={{ backgroundColor: C.orangeLight, color: C.orangeDark }}
                                                        >
                                                            {rule.direction === "mutual" && <ArrowRightLeft className="h-3 w-3" />}
                                                            {rule.direction === "source_evaluates_target" && <ArrowRight className="h-3 w-3" />}
                                                            {rule.direction === "target_evaluates_source" && <ArrowLeft className="h-3 w-3" />}
                                                            {rule.direction.replace(/_/g, " ")}
                                                        </span>

                                                        {rule.include_peers && (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium"
                                                                style={{ backgroundColor: C.greenLight, color: C.greenDark }}
                                                            >
                                                                <CheckSquare className="h-3 w-3" />
                                                                Includes Peer-to-Peer
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 text-[11px]" style={{ color: C.textSecondary }}>
                                                        {rule.rule_type === "individual_staff" ? (
                                                            <>
                                                                {rule.target_ids && rule.target_ids.length > 0 && (
                                                                    <div>
                                                                        <span className="font-semibold text-gray-800">
                                                                            Target Staff ({rule.target_ids.length}):
                                                                        </span>{" "}
                                                                        {rule.target_ids
                                                                            .map((tid) => users.find((u) => u.id === tid)?.name || `#${tid}`)
                                                                            .slice(0, 4)
                                                                            .join(", ")}
                                                                        {rule.target_ids.length > 4 && ` and ${rule.target_ids.length - 4} more`}
                                                                    </div>
                                                                )}
                                                                {rule.source_ids && rule.source_ids.length > 0 && (
                                                                    <div className="mt-1">
                                                                        <span className="font-semibold text-gray-800">Appraisers ({rule.source_ids.length}):</span>{" "}
                                                                        {rule.source_ids
                                                                            .map((sid) => users.find((u) => u.id === sid)?.name || `#${sid}`)
                                                                            .slice(0, 4)
                                                                            .join(", ")}
                                                                        {rule.source_ids.length > 4 && ` and ${rule.source_ids.length - 4} more`}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {rule.source_ids && rule.source_ids.length > 0 && (
                                                                    <div>
                                                                        <span className="font-semibold">Sources ({rule.source_ids.length}):</span>{" "}
                                                                        {rule.source_ids.length > 5
                                                                            ? `${rule.source_ids.length} entities selected`
                                                                            : rule.source_ids.join(", ")}
                                                                    </div>
                                                                )}
                                                                {rule.target_ids && rule.target_ids.length > 0 && (
                                                                    <div className="mt-0.5">
                                                                        <span className="font-semibold">Targets ({rule.target_ids.length}):</span>{" "}
                                                                        {rule.target_ids.length > 5
                                                                            ? `${rule.target_ids.length} entities selected`
                                                                            : rule.target_ids.join(", ")}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3" style={{ borderColor: C.border }}>
                                                    <button
                                                        onClick={() => openEditRuleModal(rule)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => deleteRule(rule)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB 3: Assignment Matrix & Actions ─────────────── */}
                    {activeTab === "matrix" && (
                        <div className="flex flex-col gap-6">
                            <div
                                className="rounded-2xl border p-6 shadow-sm"
                                style={{ backgroundColor: C.white, borderColor: C.border }}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                            Evaluation Pair Generation Engine
                                        </h2>
                                        <p className="mt-1 text-xs" style={{ color: C.textSecondary }}>
                                            Trigger the automated matrix generator to resolve branch, department, and cross-functional rules into individual evaluator ↔ evaluatee tasks.
                                        </p>
                                    </div>

                                    {selectedCycle && (
                                        <button
                                            onClick={() => generateAssignments(selectedCycle)}
                                            disabled={selectedCycle.status !== "open"}
                                            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                            style={{ backgroundColor: C.green }}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            Generate Evaluations for {selectedCycle.name}
                                        </button>
                                    )}
                                </div>

                                {selectedCycle?.status !== "open" && (
                                    <div
                                        className="mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs"
                                        style={{ backgroundColor: C.warnLight, color: C.warn }}
                                    >
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            The cycle <strong>{selectedCycle?.name}</strong> is currently <strong>{selectedCycle?.status}</strong>. Please switch it to <strong>OPEN</strong> in the Periods tab to generate and dispatch assignments to staff.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Summary breakdown card */}
                            <div
                                className="rounded-2xl border p-6 shadow-sm"
                                style={{ backgroundColor: C.white, borderColor: C.border }}
                            >
                                <h3 className="text-sm font-bold" style={{ color: C.textPrimary }}>
                                    Cycle Matrix Status & Overview
                                </h3>
                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-xl border p-4" style={{ borderColor: C.border }}>
                                        <div className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                                            Active Rules Configured
                                        </div>
                                        <div className="mt-1 text-2xl font-bold" style={{ color: C.navy }}>
                                            {selectedCycle ? selectedCycle.active_rules_count : 0}
                                        </div>
                                        <div className="mt-1 text-[11px]" style={{ color: C.textSecondary }}>
                                            ready for evaluation pair resolution
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-4" style={{ borderColor: C.border }}>
                                        <div className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                                            Generated Evaluations
                                        </div>
                                        <div className="mt-1 text-2xl font-bold" style={{ color: C.orange }}>
                                            {selectedCycle ? selectedCycle.evaluations_count : 0}
                                        </div>
                                        <div className="mt-1 text-[11px]" style={{ color: C.textSecondary }}>
                                            individual 360° reviewer assignments
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-4" style={{ borderColor: C.border }}>
                                        <div className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                                            Submissions Completed
                                        </div>
                                        <div className="mt-1 text-2xl font-bold" style={{ color: C.green }}>
                                            {selectedCycle ? selectedCycle.completed_count : 0}
                                        </div>
                                        <div className="mt-1 text-[11px]" style={{ color: C.textSecondary }}>
                                            ratings saved across 5 core values
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MODAL: Create/Edit Cycle ─────────────────────────────── */}
            {showCycleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="w-full max-w-lg rounded-2xl border shadow-xl"
                        style={{ backgroundColor: C.white, borderColor: C.border }}
                    >
                        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.border }}>
                            <h3 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                {editingCycle ? "Edit 360° Appraisal Period" : "Create New 360° Appraisal Period"}
                            </h3>
                            <button
                                onClick={() => setShowCycleModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={submitCycleForm} className="p-6">
                            <div className="flex flex-col gap-4 text-xs">
                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Period Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={cycleForm.data.name}
                                        onChange={(e) => cycleForm.setData("name", e.target.value)}
                                        placeholder="e.g. FY2026 H1 360° Core Values Appraisal"
                                        className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                        style={{ borderColor: C.border }}
                                    />
                                    {cycleForm.errors.name && (
                                        <p className="mt-1 text-red-500">{cycleForm.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Link to KPI Cycle (Optional)
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: "", label: "-- No linked KPI cycle (Standalone) --" },
                                            ...kpiCycles.map((kc) => ({
                                                value: kc.id,
                                                label: kc.name,
                                                sublabel: kc.status.toUpperCase(),
                                            })),
                                        ]}
                                        value={cycleForm.data.kpi_cycle_id}
                                        onChange={(val) => cycleForm.setData("kpi_cycle_id", val)}
                                        placeholder="-- No linked KPI cycle (Standalone) --"
                                        searchPlaceholder="Search KPI cycles..."
                                        size="sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                            Period Start *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={cycleForm.data.period_start}
                                            onChange={(e) => cycleForm.setData("period_start", e.target.value)}
                                            className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                            style={{ borderColor: C.border }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                            Period End *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={cycleForm.data.period_end}
                                            onChange={(e) => cycleForm.setData("period_end", e.target.value)}
                                            className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                            style={{ borderColor: C.border }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Evaluation Submission Deadline *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={cycleForm.data.evaluation_deadline}
                                        onChange={(e) => cycleForm.setData("evaluation_deadline", e.target.value)}
                                        className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                        style={{ borderColor: C.border }}
                                    />
                                    {cycleForm.errors.evaluation_deadline && (
                                        <p className="mt-1 text-red-500">{cycleForm.errors.evaluation_deadline}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Description / Instructions
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={cycleForm.data.description}
                                        onChange={(e) => cycleForm.setData("description", e.target.value)}
                                        placeholder="Notes on the appraisal scope..."
                                        className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                        style={{ borderColor: C.border }}
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCycleModal(false)}
                                    className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-gray-50"
                                    style={{ borderColor: C.border, color: C.textSecondary }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={cycleForm.processing || !isCycleFormValid}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    {cycleForm.processing && <Spinner className="h-3.5 w-3.5 animate-spin text-white" />}
                                    {cycleForm.processing ? "Saving…" : editingCycle ? "Update Period" : "Create Period"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: Create/Edit Rule ──────────────────────────────── */}
            {showRuleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border shadow-xl"
                        style={{ backgroundColor: C.white, borderColor: C.border }}
                    >
                        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.border }}>
                            <h3 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                {editingRule ? "Edit Relationship Rule" : "Add Relationship Rule"}
                            </h3>
                            <button
                                onClick={() => setShowRuleModal(false)}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={submitRuleForm} className="p-6">
                            <div className="flex flex-col gap-4 text-xs">
                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Rule Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={ruleForm.data.name}
                                        onChange={(e) => ruleForm.setData("name", e.target.value)}
                                        placeholder="e.g. All Branches: Manager & Staff Mutual Appraisal"
                                        className="w-full rounded-xl border px-3 py-2 text-xs focus:outline-none"
                                        style={{ borderColor: C.border }}
                                    />
                                    {ruleForm.errors.name && (
                                        <p className="mt-1 text-red-500">{ruleForm.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                        Rule Type *
                                    </label>
                                    <SearchableSelect
                                        options={[
                                            { value: "branch_internal", label: "Branch Internal", sublabel: "Branch Manager & Staff + Branch Peers" },
                                            { value: "dept_internal", label: "Department Internal", sublabel: "HOD & Staff + Dept Peers" },
                                            { value: "cross_dept", label: "Cross Department", sublabel: "HQ Dept A ↔ HQ Dept B" },
                                            { value: "bm_peers", label: "Branch Managers Peer-to-Peer", sublabel: "Across Branches" },
                                            { value: "hod_and_bm", label: "HODs & Branch Managers Cross-Functional", sublabel: "Branch Managers & HQ HODs" },
                                            { value: "bm_to_dept_staff", label: "Branch Managers → HQ Department Support Staff", sublabel: "Branch to Dept" },
                                            { value: "rm_bm_region", label: "Regional Manager (RM) ↔ Branch Managers in Region", sublabel: "RM & Region BMs" },
                                            { value: "rstl_bm_region", label: "Regional Sales Team Lead (RSTL) ↔ Branch Managers in Region", sublabel: "RSTL & Region BMs" },
                                            { value: "regional_and_hod", label: "Regional Leaders (RM/RSTL) ↔ Head of Departments (HODs)", sublabel: "Regional Leaders & HODs" },
                                            { value: "regional_to_dept_staff", label: "Regional Leaders (RM/RSTL) ↔ HQ Department Support Staff", sublabel: "Regional to HQ Support" },
                                            { value: "individual_staff", label: "Specific Staff Member (New Staff / Targeted Appraisal)", sublabel: "Selected Individual(s)" },
                                        ]}
                                        value={ruleForm.data.rule_type}
                                        onChange={(val) => {
                                            const type = String(val);
                                            ruleForm.setData((prev) => ({
                                                ...prev,
                                                rule_type: type,
                                                direction: type === "individual_staff" ? "source_evaluates_target" : prev.direction,
                                                include_peers: type === "individual_staff" ? false : prev.include_peers,
                                                source_ids: ["branch_internal", "bm_peers"].includes(type)
                                                    ? branches.map((b) => b.id)
                                                    : ["dept_internal"].includes(type)
                                                    ? departments.map((d) => d.id)
                                                    : ["rm_bm_region", "rstl_bm_region", "regional_and_hod", "regional_to_dept_staff"].includes(type)
                                                    ? regions.map((r) => r.id)
                                                    : [],
                                                target_ids: ["regional_and_hod", "regional_to_dept_staff"].includes(type)
                                                    ? departments.map((d) => d.id)
                                                    : [],
                                            }));
                                        }}
                                        placeholder="Select rule type..."
                                        searchPlaceholder="Search rule type..."
                                        size="sm"
                                    />
                                </div>

                                <div className={isIndividualStaff ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
                                    <div>
                                        <label className="mb-1 block font-semibold" style={{ color: C.textPrimary }}>
                                            Evaluation Direction *
                                        </label>
                                        <SearchableSelect
                                            options={
                                                isIndividualStaff
                                                    ? [
                                                          {
                                                              value: "source_evaluates_target",
                                                              label: "Selected Appraisers evaluate Staff Member",
                                                              sublabel: "Recommended for New Staff",
                                                          },
                                                          {
                                                              value: "mutual",
                                                              label: "Mutual (Both evaluate each other)",
                                                              sublabel: "Appraisers & Staff evaluate each other",
                                                          },
                                                          {
                                                              value: "target_evaluates_source",
                                                              label: "Staff Member evaluates Appraisers only",
                                                              sublabel: "Target evaluates Source only",
                                                          },
                                                      ]
                                                    : [
                                                          {
                                                              value: "mutual",
                                                              label: "Mutual (Both evaluate each other)",
                                                              sublabel: "Bi-directional review",
                                                          },
                                                          {
                                                              value: "source_evaluates_target",
                                                              label: "Source evaluates Target only",
                                                              sublabel: "One-way downward/cross",
                                                          },
                                                          {
                                                              value: "target_evaluates_source",
                                                              label: "Target evaluates Source only",
                                                              sublabel: "One-way upward/reverse",
                                                          },
                                                      ]
                                            }
                                            value={ruleForm.data.direction}
                                            onChange={(val) => ruleForm.setData("direction", val as any)}
                                            placeholder="Select direction..."
                                            searchPlaceholder="Search direction..."
                                            size="sm"
                                        />
                                    </div>

                                    <div className="flex flex-col justify-end gap-2 pb-1">
                                        {(!isIndividualStaff || ruleForm.data.target_ids.length > 1) && (
                                            <label className="flex items-center gap-2 font-semibold" style={{ color: C.textPrimary }}>
                                                <input
                                                    type="checkbox"
                                                    checked={ruleForm.data.include_peers}
                                                    onChange={(e) => ruleForm.setData("include_peers", e.target.checked)}
                                                    className="rounded"
                                                />
                                                {isIndividualStaff ? "Include Peer-to-Peer among selected staff" : "Include Internal Peer-to-Peer"}
                                            </label>
                                        )}
                                        <label className="flex items-center gap-2 font-semibold" style={{ color: C.textPrimary }}>
                                            <input
                                                type="checkbox"
                                                checked={ruleForm.data.is_active}
                                                onChange={(e) => ruleForm.setData("is_active", e.target.checked)}
                                                className="rounded"
                                            />
                                            Rule Active
                                        </label>
                                    </div>
                                </div>

                                {/* INDIVIDUAL APPRAISAL: Target Staff Selection (One or Many) */}
                                {isIndividualStaff && (
                                    <div className="rounded-xl border p-3.5" style={{ borderColor: C.border, backgroundColor: "#F9FAFB" }}>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <div>
                                                <label className="font-semibold text-gray-800 flex items-center gap-2">
                                                    <span>Staff Member(s) to be Appraised *</span>
                                                    <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-bold">
                                                        {ruleForm.data.target_ids.length} selected
                                                    </span>
                                                    {(targetBranchFilter !== "" || targetDeptFilter !== "" || targetSearch.trim() !== "") && (
                                                        <span className="text-[10px] text-gray-500 font-normal">
                                                            ({filteredTargetUsers.length} of {users.length} shown)
                                                        </span>
                                                    )}
                                                </label>
                                                <p className="text-[11px] text-gray-500">
                                                    Select one or multiple staff members who are undergoing this 360° appraisal (e.g. new hires or specific individuals).
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(targetBranchFilter !== "" || targetDeptFilter !== "" || targetSearch !== "") && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetBranchFilter("");
                                                            setTargetDeptFilter("");
                                                            setTargetSearch("");
                                                        }}
                                                        className="text-[11px] font-medium text-blue-600 hover:underline"
                                                    >
                                                        Reset Filters
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const filteredIds = filteredTargetUsers.map((u) => u.id);
                                                        const allSelected = filteredIds.length > 0 && filteredIds.every((id) =>
                                                            ruleForm.data.target_ids.includes(id)
                                                        );
                                                        ruleForm.setData(
                                                            "target_ids",
                                                            allSelected
                                                                ? ruleForm.data.target_ids.filter((id) => !filteredIds.includes(id))
                                                                : Array.from(new Set([...ruleForm.data.target_ids, ...filteredIds]))
                                                        );
                                                    }}
                                                    className="text-[11px] font-bold"
                                                    style={{ color: C.orange }}
                                                >
                                                    Select / Clear Filtered
                                                </button>
                                                {ruleForm.data.target_ids.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => ruleForm.setData("target_ids", [])}
                                                        className="text-[11px] font-semibold text-gray-500 hover:text-red-500"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Filters: Branch, Department & Search for target staff */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                            <SearchableSelect
                                                options={[
                                                    { value: "", label: "All Branches" },
                                                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                                                ]}
                                                value={targetBranchFilter}
                                                onChange={(val) => setTargetBranchFilter(val ? Number(val) : "")}
                                                placeholder="All Branches"
                                                searchPlaceholder="Search branches..."
                                                size="sm"
                                            />
                                            <SearchableSelect
                                                options={[
                                                    { value: "", label: "All Departments" },
                                                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                                                ]}
                                                value={targetDeptFilter}
                                                onChange={(val) => setTargetDeptFilter(val ? Number(val) : "")}
                                                placeholder="All Departments"
                                                searchPlaceholder="Search departments..."
                                                size="sm"
                                            />
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={targetSearch}
                                                    onChange={(e) => setTargetSearch(e.target.value)}
                                                    placeholder="Search name / job title..."
                                                    className="w-full rounded-lg border bg-white pl-3 pr-7 py-1.5 text-xs focus:outline-none"
                                                    style={{ borderColor: C.border }}
                                                />
                                                {targetSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setTargetSearch("")}
                                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Target staff checkboxes */}
                                        <div className="max-h-44 overflow-y-auto rounded-xl border bg-white p-2 text-[11px]" style={{ borderColor: C.border }}>
                                            {filteredTargetUsers.length === 0 ? (
                                                <p className="py-4 text-center text-gray-400">No staff match your search.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                    {filteredTargetUsers.map((item) => {
                                                        const checked = ruleForm.data.target_ids.includes(item.id);
                                                        return (
                                                            <label
                                                                key={item.id}
                                                                className="flex items-start gap-2 rounded p-1.5 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        const cur = ruleForm.data.target_ids;
                                                                        ruleForm.setData(
                                                                            "target_ids",
                                                                            e.target.checked
                                                                                ? [...cur, item.id]
                                                                                : cur.filter((id) => id !== item.id)
                                                                        );
                                                                    }}
                                                                    className="mt-0.5 rounded"
                                                                />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-semibold text-gray-800 truncate">
                                                                        {item.name}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-500 truncate">
                                                                        {item.job_title || "Staff"} • {item.branch || item.department || "HQ"}
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {ruleForm.errors.target_ids && (
                                            <p className="mt-1 text-red-500">{ruleForm.errors.target_ids}</p>
                                        )}
                                    </div>
                                )}

                                {/* INDIVIDUAL APPRAISAL: Selected Appraisers Multi-Selection */}
                                {isIndividualStaff && (
                                    <div className="rounded-xl border p-3.5" style={{ borderColor: C.border }}>
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <div>
                                                <label className="font-semibold text-gray-800 flex items-center gap-2">
                                                    <span>Select Appraisers / Evaluators *</span>
                                                    <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-bold">
                                                        {ruleForm.data.source_ids.length} selected
                                                    </span>
                                                    {(evaluatorBranchFilter !== "" || evaluatorDeptFilter !== "" || evaluatorSearch.trim() !== "") && (
                                                        <span className="text-[10px] text-gray-500 font-normal">
                                                            ({filteredEvaluatorUsers.length} of {users.length} shown)
                                                        </span>
                                                    )}
                                                </label>
                                                <p className="text-[11px] text-gray-500">
                                                    Colleagues, peers, or supervisors selected to rate the chosen staff member(s).
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {(evaluatorBranchFilter !== "" || evaluatorDeptFilter !== "" || evaluatorSearch !== "") && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEvaluatorBranchFilter("");
                                                            setEvaluatorDeptFilter("");
                                                            setEvaluatorSearch("");
                                                        }}
                                                        className="text-[11px] font-medium text-blue-600 hover:underline"
                                                    >
                                                        Reset Filters
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const filteredIds = filteredEvaluatorUsers.map((u) => u.id);
                                                        const allSelected = filteredIds.length > 0 && filteredIds.every((id) =>
                                                            ruleForm.data.source_ids.includes(id)
                                                        );
                                                        ruleForm.setData(
                                                            "source_ids",
                                                            allSelected
                                                                ? ruleForm.data.source_ids.filter((id) => !filteredIds.includes(id))
                                                                : Array.from(new Set([...ruleForm.data.source_ids, ...filteredIds]))
                                                        );
                                                    }}
                                                    className="text-[11px] font-bold"
                                                    style={{ color: C.orange }}
                                                >
                                                    Select / Clear Filtered
                                                </button>
                                                {ruleForm.data.source_ids.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => ruleForm.setData("source_ids", [])}
                                                        className="text-[11px] font-semibold text-gray-500 hover:text-red-500"
                                                    >
                                                        Clear All
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Filters: Branch, Department & Search for evaluators */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                                            <SearchableSelect
                                                options={[
                                                    { value: "", label: "All Branches" },
                                                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                                                ]}
                                                value={evaluatorBranchFilter}
                                                onChange={(val) => setEvaluatorBranchFilter(val ? Number(val) : "")}
                                                placeholder="All Branches"
                                                searchPlaceholder="Search branches..."
                                                size="sm"
                                            />
                                            <SearchableSelect
                                                options={[
                                                    { value: "", label: "All Departments" },
                                                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                                                ]}
                                                value={evaluatorDeptFilter}
                                                onChange={(val) => setEvaluatorDeptFilter(val ? Number(val) : "")}
                                                placeholder="All Departments"
                                                searchPlaceholder="Search departments..."
                                                size="sm"
                                            />
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={evaluatorSearch}
                                                    onChange={(e) => setEvaluatorSearch(e.target.value)}
                                                    placeholder="Search name / job title..."
                                                    className="w-full rounded-lg border bg-white pl-3 pr-7 py-1.5 text-xs focus:outline-none"
                                                    style={{ borderColor: C.border }}
                                                />
                                                {evaluatorSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEvaluatorSearch("")}
                                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Evaluator checkboxes */}
                                        <div className="max-h-48 overflow-y-auto rounded-xl border p-2 text-[11px]" style={{ borderColor: C.border }}>
                                            {filteredEvaluatorUsers.length === 0 ? (
                                                <p className="py-4 text-center text-gray-400">No colleagues match your search.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                    {filteredEvaluatorUsers.map((item) => {
                                                        const isAlsoTarget = ruleForm.data.target_ids.includes(item.id);
                                                        const checked = ruleForm.data.source_ids.includes(item.id);
                                                        return (
                                                            <label
                                                                key={item.id}
                                                                className="flex items-start gap-2 rounded p-1.5 transition-colors cursor-pointer hover:bg-gray-50"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        const cur = ruleForm.data.source_ids;
                                                                        ruleForm.setData(
                                                                            "source_ids",
                                                                            e.target.checked
                                                                                ? [...cur, item.id]
                                                                                : cur.filter((id) => id !== item.id)
                                                                        );
                                                                    }}
                                                                    className="mt-0.5 rounded"
                                                                />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-semibold text-gray-800 truncate">
                                                                        {item.name}
                                                                        {isAlsoTarget && (
                                                                            <span className="ml-1 text-[10px] font-normal text-amber-600 bg-amber-50 px-1 rounded">
                                                                                Appraisee
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-500 truncate">
                                                                        {item.job_title || "Staff"} • {item.branch || item.department || "HQ"}
                                                                    </span>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        {ruleForm.errors.source_ids && (
                                            <p className="mt-1 text-red-500">{ruleForm.errors.source_ids}</p>
                                        )}
                                    </div>
                                )}

                                {/* Source IDs Selection (For non-individual rules) */}
                                {!isIndividualStaff && (
                                    <div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <label className="font-semibold" style={{ color: C.textPrimary }}>
                                                Source {isSourceRegion ? "Regions" : isSourceBranch ? "Branches" : "Departments"} ({ruleForm.data.source_ids.length} selected)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIds = isSourceRegion
                                                        ? regions.map((r) => r.id)
                                                        : isSourceBranch
                                                        ? branches.map((b) => b.id)
                                                        : departments.map((d) => d.id);
                                                    ruleForm.setData(
                                                        "source_ids",
                                                        ruleForm.data.source_ids.length === allIds.length ? [] : allIds
                                                    );
                                                }}
                                                className="text-[11px] font-bold"
                                                style={{ color: C.orange }}
                                            >
                                                Select / Clear All
                                            </button>
                                        </div>

                                        <div className="max-h-36 overflow-y-auto rounded-xl border p-2 text-[11px]" style={{ borderColor: C.border }}>
                                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                                {(isSourceRegion ? regions : isSourceBranch ? branches : departments).map((item) => {
                                                    const checked = ruleForm.data.source_ids.includes(item.id);
                                                    return (
                                                        <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const cur = ruleForm.data.source_ids;
                                                                    ruleForm.setData(
                                                                        "source_ids",
                                                                        e.target.checked ? [...cur, item.id] : cur.filter((id) => id !== item.id)
                                                                    );
                                                                }}
                                                                className="rounded"
                                                            />
                                                            <span className="truncate">{item.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Target IDs Selection (if applicable) */}
                                {!isIndividualStaff && (isTargetBranch || isTargetDept) && (
                                    <div>
                                        <div className="mb-1 flex items-center justify-between">
                                            <label className="font-semibold" style={{ color: C.textPrimary }}>
                                                Target {isTargetBranch ? "Branches" : "Departments"} ({ruleForm.data.target_ids.length} selected)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allIds = isTargetBranch ? branches.map((b) => b.id) : departments.map((d) => d.id);
                                                    ruleForm.setData(
                                                        "target_ids",
                                                        ruleForm.data.target_ids.length === allIds.length ? [] : allIds
                                                    );
                                                }}
                                                className="text-[11px] font-bold"
                                                style={{ color: C.orange }}
                                            >
                                                Select / Clear All
                                            </button>
                                        </div>

                                        <div className="max-h-36 overflow-y-auto rounded-xl border p-2 text-[11px]" style={{ borderColor: C.border }}>
                                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                                {(isTargetBranch ? branches : departments).map((item) => {
                                                    const checked = ruleForm.data.target_ids.includes(item.id);
                                                    return (
                                                        <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={(e) => {
                                                                    const cur = ruleForm.data.target_ids;
                                                                    ruleForm.setData(
                                                                        "target_ids",
                                                                        e.target.checked ? [...cur, item.id] : cur.filter((id) => id !== item.id)
                                                                    );
                                                                }}
                                                                className="rounded"
                                                            />
                                                            <span className="truncate">{item.name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4" style={{ borderColor: C.border }}>
                                <button
                                    type="button"
                                    onClick={() => setShowRuleModal(false)}
                                    className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-gray-50"
                                    style={{ borderColor: C.border, color: C.textSecondary }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={ruleForm.processing || !isRuleFormValid}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: C.orange }}
                                >
                                    {ruleForm.processing && <Spinner className="h-3.5 w-3.5 animate-spin text-white" />}
                                    {ruleForm.processing ? "Saving…" : editingRule ? "Update Rule" : "Add Rule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
