import { Link, usePage } from "@inertiajs/react";
import {
    Award,
    CheckSquare,
    ClipboardList,
    LayoutGrid,
    Settings2,
    ShieldCheck,
    Users,
    Compass,
    GitFork,
    CheckCircle2,
    FileCheck2,
    BarChart2,
    SlidersHorizontal,
    MessageSquareText,
    ListTodo,
} from "lucide-react";
import AppLogo from "@/components/app-logo";
import { NavFooter } from "@/components/nav-footer";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { dashboard } from "@/routes";
import { index as kpiIndex, reviewQueue as kpiReviewQueue } from "@/routes/kpi";
import { index as kpiEvaluationIndex, reviewQueue as kpiEvaluationReviewQueue } from "@/routes/kpi/evaluation";
import { index as kpiAppraisalCycle } from "@/routes/kpi/cycles";
import { index as rolesIndex } from "@/routes/roles";
import { index as usersIndex } from "@/routes/users";
import { index as coreValuesIndex } from "@/routes/core-values";
import { index as threeSixtyIndex } from "@/routes/three-sixty";
import { index as myEvaluationsIndex } from "@/routes/three-sixty/evaluations";
import type { NavItem } from "@/types";

// Theme colours from Progressive Credit logo
const THEME = {
    primary: "#003366",
    secondary: "#E8A83C",
    secondaryLight: "#F5D88E",
    secondaryDark: "#C9922E",
    light: "#F8F6F1",
    text: "#1A1A1A",
    textLight: "#5A5A5A",
    border: "#E0DDD6",
} as const;

type Permission =
    | "kpi.review-supervisor"
    | "kpi.approve-hr"
    | "kpi.view-all-branches"
    | "kpi.view-department"
    | "kpi.view-branch"
    | "cycles.manage"
    | "roles.manage";

type PermissionChecker = (permission: Permission) => boolean;

export function AppSidebar() {
    const { props } = usePage();
    const currentTeam = props.currentTeam;
    const permissions = props.auth?.permissions ?? [];

    const hasPermission: PermissionChecker = (permission) =>
        permissions.includes(permission);

    const dashboardUrl = currentTeam ? dashboard(currentTeam.slug) : "/";

    const canReviewSupervisor = hasPermission("kpi.review-supervisor");
    const canApproveHr = hasPermission("kpi.approve-hr");
    const canManageCycles = hasPermission("cycles.manage");
    const canManageRoles = hasPermission("roles.manage");

    const roles: string[] = (props.auth as any)?.roles ?? [];
    const isSuperAdmin = Boolean((props.auth as any)?.canManageTeams || roles.includes("Super Admin"));
    const isHrbp = roles.includes("HR Business Partner") || hasPermission("kpi.approve-hr") || hasPermission("kpi.view-all-branches");
    const isHod = roles.includes("HOD") || hasPermission("kpi.view-department");
    const isBranchManager = roles.includes("Branch Manager") || hasPermission("kpi.view-branch");
    const canView360FeedbackReport = isSuperAdmin || isHrbp;
    const canViewPendingAppraisalsReport = isSuperAdmin || isHrbp || isHod || isBranchManager;

    const mainNavItems: NavItem[] = [
        {
            title: "Dashboard",
            href: dashboardUrl,
            icon: LayoutGrid,
        },
        {
            title: "My KPIs",
            href: currentTeam ? kpiIndex(currentTeam.slug) : "#",
            icon: ClipboardList,
        },
        {
            title: "KPI Evaluation",
            href: currentTeam ? kpiEvaluationIndex(currentTeam.slug) : "#",
            icon: CheckCircle2,
        },
        {
            title: "My 360° Appraisals",
            href: currentTeam ? myEvaluationsIndex(currentTeam.slug) : "#",
            icon: Award,
        },
        ...withPermission(canReviewSupervisor || canApproveHr, {
            title: "Review queue",
            href: currentTeam ? kpiReviewQueue(currentTeam.slug) : "#",
            icon: CheckSquare,
        }),
        ...withPermission(canReviewSupervisor, {
            title: "Evaluation Reviews",
            href: currentTeam ? kpiEvaluationReviewQueue(currentTeam.slug) : "#",
            icon: FileCheck2,
        }),
        ...withPermission(canManageCycles, {
            title: "Appraisal cycles",
            href: currentTeam ? kpiAppraisalCycle(currentTeam.slug) : "#",
            icon: Settings2,
        }),
        ...withPermission(canManageRoles, {
            title: "Roles & permissions",
            href: rolesIndex(),
            icon: ShieldCheck,
        }),
        ...withPermission(canManageRoles, {
            title: "User roles",
            href: usersIndex(),
            icon: Users,
        }),
        ...withPermission(canManageRoles, {
            title: "Core Values (360°)",
            href: coreValuesIndex(),
            icon: Compass,
        }),
        ...withPermission(canManageRoles, {
            title: "360° Appraisal Setup",
            href: threeSixtyIndex(),
            icon: GitFork,
        }),
        ...withPermission(canManageRoles, {
            title: "Performance Weights",
            href: "/settings/performance-weights",
            icon: SlidersHorizontal,
        }),
        {
            title: "Performance Reports",
            href: currentTeam ? `/${currentTeam.slug}/reports/performance` : "#",
            icon: BarChart2,
        },
        ...withPermission(canView360FeedbackReport, {
            title: "360 Feedback & Comments",
            href: currentTeam ? `/${currentTeam.slug}/reports/feedback-summary` : "#",
            icon: MessageSquareText,
        }),
        ...withPermission(canViewPendingAppraisalsReport, {
            title: "Pending Appraisals Report",
            href: currentTeam ? `/${currentTeam.slug}/reports/pending-appraisals` : "#",
            icon: ListTodo,
        }),
    ];

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r border-[#E0DDD6] bg-[#F8F6F1]"
            style={
                {
                    "--sidebar-primary": THEME.primary,
                    "--sidebar-primary-foreground": "#FFFFFF",
                    "--sidebar-accent": THEME.secondary,
                    "--sidebar-accent-foreground": "#FFFFFF",
                    "--sidebar-border": THEME.border,
                    "--sidebar-ring": THEME.secondary,
                } as React.CSSProperties
            }
        >
            <SidebarHeader className="border-b border-[#E0DDD6] pb-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link
                                href={dashboardUrl}
                                prefetch
                                className="transition-opacity hover:opacity-80"
                            >
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <SidebarMenu className="mt-2">
                    <SidebarMenuItem>
                        <TeamSwitcher />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4">
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter className="border-t border-[#E0DDD6] pt-4">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

function withPermission(condition: boolean, item: NavItem): NavItem[] {
    return condition ? [item] : [];
}
