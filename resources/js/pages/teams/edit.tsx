import { Form, Head, router } from "@inertiajs/react";
import {
    ChevronDown,
    Mail,
    UserPlus,
    X,
    Building2,
    Users,
    Shield,
    Trash2,
    Edit,
    ArrowLeft,
    RotateCcw,
    UserX,
    Send,
    Search,
    Plus,
    Layers,
    MapPin,
} from "lucide-react";
import { useMemo, useState } from "react";
import CancelInvitationModal from "@/components/cancel-invitation-modal";
import DeleteTeamModal from "@/components/delete-team-modal";
import { confirmAction } from "@/lib/swal";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import InviteMemberModal from "@/components/invite-member-modal";
import RemoveMemberModal from "@/components/remove-member-modal";
import SuspendMemberModal from "@/components/suspend-member-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInitials } from "@/hooks/use-initials";
import { edit, index, update } from "@/routes/teams";
import { store as storeDepartment, destroy as destroyDepartment } from "@/routes/teams/departments";
import { update as updateMember } from "@/routes/teams/members";
import { resend as resendInvitation } from "@/routes/teams/invitations";
import type {
    RoleOption,
    Team,
    TeamInvitation,
    TeamMember,
    TeamPermissions,
    DepartmentItem,
} from "@/types";
import { Link } from "@inertiajs/react";
import { Toaster } from "sonner";

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

const THEME = {
    primary: C.navy,
    secondary: C.orange,
    secondaryLight: C.orangeLight,
    secondaryDark: C.orangeDark,
    light: C.bg,
    text: C.textPrimary,
    textLight: C.textSecondary,
    border: C.border,
    success: C.green,
    danger: C.danger,
};

type Props = {
    team: Team;
    members: TeamMember[];
    invitations: TeamInvitation[];
    permissions: TeamPermissions;
    availableRoles: RoleOption[];
    orgRoleOptions?: string[];
    departments?: DepartmentItem[];
};

// ── HQ Departments Management ──────────────────────────────────────────────
function HqDepartmentsSection({ team, departments }: { team: Team; departments: DepartmentItem[] }) {
    const [deptName, setDeptName] = useState('');
    const [deptCode, setDeptCode] = useState('');
    const [adding, setAdding] = useState(false);

    const handleAdd = () => {
        if (!deptName.trim()) return;
        router.post(
            storeDepartment(team.slug),
            { name: deptName.trim(), code: deptCode.trim() || undefined },
            {
                preserveScroll: true,
                onSuccess: () => { setDeptName(''); setDeptCode(''); setAdding(false); },
            },
        );
    };

    const handleDelete = async (dept: DepartmentItem) => {
        const confirmed = await confirmAction({
            title: "Remove Department?",
            text: `Remove department "${dept.name}"? This cannot be undone.`,
            confirmButtonText: "Yes, remove",
            icon: "warning",
            danger: true,
        });
        if (!confirmed) return;
        router.delete(destroyDepartment([team.slug, dept.id]), { preserveScroll: true });
    };

    return (
        <div className="mb-6 rounded-xl border border-[#003366]/20 bg-white p-6 shadow-sm">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#003366]/10">
                        <Layers className="h-6 w-6 text-[#003366]" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-[#1A1A1A]">HQ Departments</h2>
                        <p className="text-sm text-[#5A5A5A]">
                            Manage departments — {departments.length} department{departments.length !== 1 ? 's' : ''} configured
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setAdding((v) => !v)}
                    className="h-9 rounded-lg bg-[#003366] px-4 text-xs font-semibold text-white hover:bg-[#003366]/90"
                >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Department
                </Button>
            </div>

            {/* Add form */}
            {adding && (
                <div className="mb-4 rounded-lg border border-[#003366]/20 bg-[#EFF6FF] p-4">
                    <p className="mb-3 text-xs font-semibold text-[#003366]">New Department</p>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex-1 min-w-40">
                            <Input
                                placeholder="Department name *"
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                className="h-9 rounded-lg border-[#E0DDD6] text-sm"
                            />
                        </div>
                        <div className="w-28">
                            <Input
                                placeholder="Code (opt.)"
                                value={deptCode}
                                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                                maxLength={10}
                                className="h-9 rounded-lg border-[#E0DDD6] text-sm"
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={!deptName.trim()} className="h-9 rounded-lg bg-[#003366] px-4 text-xs font-bold text-white">
                            Save
                        </Button>
                        <Button variant="ghost" onClick={() => { setAdding(false); setDeptName(''); setDeptCode(''); }} className="h-9 rounded-lg text-xs">
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Department list */}
            {departments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#E0DDD6] p-8 text-center">
                    <Layers className="mx-auto mb-2 h-8 w-8 text-[#E0DDD6]" />
                    <p className="text-sm text-[#5A5A5A]">No departments yet. Add one above.</p>
                </div>
            ) : (
                <div className="divide-y divide-[#E0DDD6] rounded-lg border border-[#E0DDD6] overflow-hidden">
                    {departments.map((dept) => (
                        <div key={dept.id} className="flex items-center justify-between gap-4 bg-white px-4 py-3 hover:bg-[#F8F6F1] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#003366]/10 text-[10px] font-bold text-[#003366]">
                                    {dept.code ?? dept.name.slice(0, 3).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#1A1A1A]">{dept.name}</p>
                                    {dept.staff_count !== undefined && (
                                        <p className="text-xs text-[#5A5A5A]">{dept.staff_count} staff member{dept.staff_count !== 1 ? 's' : ''}</p>
                                    )}
                                </div>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(dept)}
                                            className="h-8 w-8 rounded-lg p-0 text-[#5A5A5A] hover:bg-[#C0392B]/10 hover:text-[#C0392B]"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Remove department</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TeamEdit({
    team,
    members,
    invitations,
    permissions,
    availableRoles,
    orgRoleOptions = [],
    departments = [],
}: Props) {
    const getInitials = useInitials();

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(
        null,
    );
    const [cancelInvitationDialogOpen, setCancelInvitationDialogOpen] =
        useState(false);
    const [invitationToCancel, setInvitationToCancel] =
        useState<TeamInvitation | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [invitationSearchQuery, setInvitationSearchQuery] = useState("");
    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [memberToSuspend, setMemberToSuspend] = useState<TeamMember | null>(
        null,
    );

    const pageTitle = useMemo(
        () =>
            permissions.canUpdateTeam
                ? `Edit ${team.name}`
                : `View ${team.name}`,
        [permissions.canUpdateTeam, team.name],
    );

    const updateMemberRole = (member: TeamMember, newRole: string) => {
        router.visit(updateMember([team.slug, member.id]), {
            data: { role: newRole },
            preserveScroll: true,
        });
    };

    const confirmToggleSuspension = (member: TeamMember) => {
        setMemberToSuspend(member);
        setSuspendDialogOpen(true);
    };

    const resendInvite = (invitation: TeamInvitation) => {
        router.post(
            resendInvitation([team.slug, invitation.code]),
            {},
            { preserveScroll: true },
        );
    };

    const confirmRemoveMember = (member: TeamMember) => {
        setMemberToRemove(member);
        setRemoveMemberDialogOpen(true);
    };

    const confirmCancelInvitation = (invitation: TeamInvitation) => {
        setInvitationToCancel(invitation);
        setCancelInvitationDialogOpen(true);
    };

    const filteredMembers = useMemo(() => {
        if (!memberSearchQuery.trim()) return members;

        const query = memberSearchQuery.toLowerCase().trim();
        return members.filter(
            (member) =>
                member.name.toLowerCase().includes(query) ||
                member.email.toLowerCase().includes(query) ||
                member.role_label?.toLowerCase().includes(query) ||
                (member.suspended ? "suspended" : "").includes(query),
        );
    }, [members, memberSearchQuery]);

    const filteredInvitations = useMemo(() => {
        if (!invitationSearchQuery.trim()) return invitations;

        const query = invitationSearchQuery.toLowerCase().trim();
        return invitations.filter(
            (invitation) =>
                invitation.email.toLowerCase().includes(query) ||
                invitation.role_label?.toLowerCase().includes(query),
        );
    }, [invitations, invitationSearchQuery]);

    const memberCount = members.length;
    const invitationCount = invitations.length;
    const ownerCount = members.filter((m) => m.role === "owner").length;
    const activeCount = members.filter((m) => !m.suspended).length;
    const suspendedCount = members.filter((m) => m.suspended).length;
    const filteredMemberCount = filteredMembers.length;
    const filteredInvitationCount = filteredInvitations.length;

    return (
        <>
            <Head title={pageTitle} />
            <Toaster richColors />
            <div className="flex h-full w-full flex-1 flex-col" style={{ backgroundColor: C.bg, padding: "1.5rem" }}>
                <div className="w-full">
                    {/* Back Button */}
                    <Link
                        href={index()}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                        style={{ color: C.textSecondary }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.orange)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.textSecondary)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Teams
                    </Link>

                    {/* Header */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                                {pageTitle}
                            </h1>
                            <p className="mt-0.5 text-sm" style={{ color: C.textSecondary }}>
                                {team.isPersonal
                                    ? "Your personal workspace profile & members"
                                    : `Manage ${team.name} organizational settings, branch staffing, and access`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl px-4 py-2 shadow-sm border"
                            style={{ backgroundColor: C.white, borderColor: C.border }}>
                            <Building2 className="h-4 w-4" style={{ color: C.navy }} />
                            <span className="text-sm font-bold" style={{ color: C.textPrimary }}>
                                {team.name}
                            </span>
                            {team.isPersonal && (
                                <Badge
                                    variant="secondary"
                                    className="ml-1 text-xs"
                                >
                                    Personal
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-3">
                        <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                            style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: C.navyLight }}>
                                <Users className="h-5 w-5" style={{ color: C.navy }} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Team Members
                                </p>
                                <p className="text-xl font-bold" style={{ color: C.textPrimary }}>
                                    {memberCount}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                            style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: C.orangeLight }}>
                                <Mail className="h-5 w-5" style={{ color: C.orangeDark }} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Pending Invitations
                                </p>
                                <p className="text-xl font-bold" style={{ color: C.orangeDark }}>
                                    {invitationCount}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                            style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: C.greenLight }}>
                                <Shield className="h-5 w-5" style={{ color: C.greenDark }} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                    Active Staff
                                </p>
                                <p className="text-xl font-bold" style={{ color: C.greenDark }}>
                                    {activeCount}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team Settings Section */}
                    <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm"
                        style={{ borderColor: C.border }}>
                        <div className="mb-6 flex items-start gap-4">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundColor: C.navy }}>
                                {permissions.canUpdateTeam ? (
                                    <Edit className="h-5 w-5" />
                                ) : (
                                    <Building2 className="h-5 w-5" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-[#1A1A1A]">
                                    {permissions.canUpdateTeam
                                        ? "Team Settings"
                                        : "Team Details"}
                                </h2>
                                <p className="text-sm text-[#5A5A5A]">
                                    {permissions.canUpdateTeam
                                        ? "Update your team name and settings"
                                        : "View team information"}
                                </p>
                            </div>
                        </div>

                        {permissions.canUpdateTeam ? (
                            <Form
                                {...update.form(team.slug)}
                                className="space-y-6"
                            >
                                {({ errors, processing }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="name"
                                                className="text-sm font-medium text-[#1A1A1A]"
                                            >
                                                Team Name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                data-test="team-name-input"
                                                defaultValue={team.name}
                                                required
                                                className="h-11 rounded-xl border px-4 text-sm transition-all focus:outline-none"
                                                style={{
                                                    borderColor: errors.name ? C.danger : C.border,
                                                    backgroundColor: C.white,
                                                    color: C.textPrimary,
                                                }}
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="flex items-center justify-end gap-4 border-t pt-6"
                                            style={{ borderColor: C.border }}>
                                            <Button
                                                type="submit"
                                                data-test="team-save-button"
                                                disabled={processing}
                                                className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                                style={{ backgroundColor: C.orange }}
                                            >
                                                {processing ? (
                                                    <>
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        Saving…
                                                    </>
                                                ) : (
                                                    "Save Changes"
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        ) : (
                            <div className="rounded-lg bg-[#F8F6F1] p-4">
                                <p className="text-sm text-[#5A5A5A]">
                                    <span className="font-medium text-[#1A1A1A]">
                                        Team:
                                    </span>{" "}
                                    {team.name}
                                    {team.isPersonal && (
                                        <span className="ml-2 text-xs text-[#5A5A5A]">
                                            (Personal Team)
                                        </span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Team Members Section */}
                    <div className="mb-6 rounded-xl border border-[#E0DDD6] bg-white p-6 shadow-sm">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8A83C]/10">
                                    <Users className="h-6 w-6 text-[#E8A83C]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-[#1A1A1A]">
                                        Team Members
                                    </h2>
                                    <p className="text-sm text-[#5A5A5A]">
                                        {permissions.canCreateInvitation
                                            ? "Manage who belongs to this team"
                                            : `${memberCount} member${memberCount === 1 ? "" : "s"} on this team`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {permissions.canCreateInvitation && (
                                    <Button
                                        data-test="invite-member-button"
                                        onClick={() =>
                                            setInviteDialogOpen(true)
                                        }
                                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#003366] px-4 text-sm font-medium text-white transition-all hover:bg-[#003366]/90 hover:shadow-md"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        Invite Member
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Member Search Bar */}
                        <div className="mb-4">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#5A5A5A]" />
                                <Input
                                    placeholder="Search members by name, email, or role..."
                                    value={memberSearchQuery}
                                    onChange={(e) =>
                                        setMemberSearchQuery(e.target.value)
                                    }
                                    className="h-11 w-full rounded-lg border-[#E0DDD6] pl-10 pr-10 text-sm transition-colors focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                                />
                                {memberSearchQuery && (
                                    <button
                                        onClick={() => setMemberSearchQuery("")}
                                        className="absolute right-3.5 top-3 text-[#5A5A5A] transition-colors hover:text-[#1A1A1A]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            {memberSearchQuery && (
                                <p className="mt-2 text-sm text-[#5A5A5A]">
                                    Found {filteredMemberCount} member
                                    {filteredMemberCount === 1 ? "" : "s"}{" "}
                                    matching "{memberSearchQuery}"
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            {filteredMembers.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-[#E0DDD6] p-8 text-center">
                                    <p className="text-sm text-[#5A5A5A]">
                                        {memberSearchQuery
                                            ? `No members match "${memberSearchQuery}"`
                                            : "No members on this team yet."}
                                    </p>
                                    {memberSearchQuery && (
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                setMemberSearchQuery("")
                                            }
                                            className="mt-2 text-[#003366] hover:text-[#003366]/80 hover:bg-[#003366]/10"
                                        >
                                            Clear search
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                filteredMembers.map((member) => (
                                    <div
                                        key={member.id}
                                        data-test="member-row"
                                        className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 transition-colors ${
                                            member.suspended
                                                ? "border-[#C0392B]/20 bg-[#C0392B]/5"
                                                : "border-[#E0DDD6] hover:bg-[#F8F6F1]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <Avatar className="h-10 w-10 border-2 border-[#E0DDD6]">
                                                {member.avatar ? (
                                                    <AvatarImage
                                                        src={member.avatar}
                                                        alt={member.name}
                                                    />
                                                ) : null}
                                                <AvatarFallback className="bg-[#003366] text-sm font-medium text-white">
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-[#1A1A1A] truncate">
                                                        {member.name}
                                                    </div>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            member.suspended
                                                                ? "bg-[#C0392B]/10 text-[#C0392B] border border-[#C0392B]/20 text-[10px]"
                                                                : "bg-[#2D7D46]/10 text-[#2D7D46] border border-[#2D7D46]/20 text-[10px]"
                                                        }
                                                    >
                                                        {member.suspended
                                                            ? "Suspended"
                                                            : "Active"}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-[#5A5A5A] truncate">
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {member.role !== "owner" &&
                                            permissions.canUpdateMember ? (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            data-test="member-role-trigger"
                                                            className="border-[#E0DDD6] hover:border-[#003366] hover:bg-[#003366]/5"
                                                        >
                                                            {member.role_label}
                                                            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="border-[#E0DDD6] bg-white shadow-lg">
                                                        {availableRoles.map(
                                                            (role) => (
                                                                <DropdownMenuItem
                                                                    key={
                                                                        role.value
                                                                    }
                                                                    data-test="member-role-option"
                                                                    onSelect={() =>
                                                                        updateMemberRole(
                                                                            member,
                                                                            role.value,
                                                                        )
                                                                    }
                                                                    className="cursor-pointer hover:bg-[#003366]/10 focus:bg-[#003366]/10"
                                                                >
                                                                    {role.label}
                                                                </DropdownMenuItem>
                                                            ),
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-[#003366]/10 text-[#003366] border border-[#003366]/20"
                                                >
                                                    {member.role_label}
                                                </Badge>
                                            )}

                                            {member.role !== "owner" &&
                                            permissions.canUpdateMember ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                data-test="member-suspend-button"
                                                                onClick={() =>
                                                                    confirmToggleSuspension(
                                                                        member,
                                                                    )
                                                                }
                                                                className={
                                                                    member.suspended
                                                                        ? "text-[#5A5A5A] hover:text-[#2D7D46] hover:bg-[#2D7D46]/10"
                                                                        : "text-[#5A5A5A] hover:text-[#C0392B] hover:bg-[#C0392B]/10"
                                                                }
                                                            >
                                                                {member.suspended ? (
                                                                    <RotateCcw className="h-4 w-4" />
                                                                ) : (
                                                                    <UserX className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                {member.suspended
                                                                    ? "Reactivate"
                                                                    : "Suspend"}
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : null}
                                            {member.role !== "owner" &&
                                            permissions.canRemoveMember ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                data-test="member-remove-button"
                                                                onClick={() =>
                                                                    confirmRemoveMember(
                                                                        member,
                                                                    )
                                                                }
                                                                className="text-[#5A5A5A] hover:text-[#C0392B] hover:bg-[#C0392B]/10"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Remove member</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pending Invitations Section */}
                    {invitations.length > 0 && (
                        <div className="mb-6 rounded-xl border border-[#E0DDD6] bg-white p-6 shadow-sm">
                            <div className="mb-6 flex items-start gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#E8A83C]/10">
                                    <Mail className="h-6 w-6 text-[#E8A83C]" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-[#1A1A1A]">
                                        Pending Invitations
                                    </h2>
                                    <p className="text-sm text-[#5A5A5A]">
                                        {invitationCount} invitation
                                        {invitationCount === 1 ? "" : "s"}{" "}
                                        awaiting acceptance
                                    </p>
                                </div>
                            </div>

                            {/* Invitation Search Bar */}
                            <div className="mb-4">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#5A5A5A]" />
                                    <Input
                                        placeholder="Search invitations by email or role..."
                                        value={invitationSearchQuery}
                                        onChange={(e) =>
                                            setInvitationSearchQuery(
                                                e.target.value,
                                            )
                                        }
                                        className="h-11 w-full rounded-lg border-[#E0DDD6] pl-10 pr-10 text-sm transition-colors focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                                    />
                                    {invitationSearchQuery && (
                                        <button
                                            onClick={() =>
                                                setInvitationSearchQuery("")
                                            }
                                            className="absolute right-3.5 top-3 text-[#5A5A5A] transition-colors hover:text-[#1A1A1A]"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {invitationSearchQuery && (
                                    <p className="mt-2 text-sm text-[#5A5A5A]">
                                        Found {filteredInvitationCount}{" "}
                                        invitation
                                        {filteredInvitationCount === 1
                                            ? ""
                                            : "s"}{" "}
                                        matching "{invitationSearchQuery}"
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                {filteredInvitations.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-[#E0DDD6] p-8 text-center">
                                        <p className="text-sm text-[#5A5A5A]">
                                            {invitationSearchQuery
                                                ? `No invitations match "${invitationSearchQuery}"`
                                                : "No pending invitations."}
                                        </p>
                                        {invitationSearchQuery && (
                                            <Button
                                                variant="ghost"
                                                onClick={() =>
                                                    setInvitationSearchQuery("")
                                                }
                                                className="mt-2 text-[#003366] hover:text-[#003366]/80 hover:bg-[#003366]/10"
                                            >
                                                Clear search
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    filteredInvitations.map((invitation) => (
                                        <div
                                            key={invitation.code}
                                            data-test="invitation-row"
                                            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#E0DDD6] p-4 transition-colors hover:bg-[#F8F6F1]"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E8A83C]/10">
                                                    <Mail className="h-5 w-5 text-[#E8A83C]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-[#1A1A1A] truncate">
                                                        {invitation.email}
                                                    </div>
                                                    <div className="text-sm text-[#5A5A5A]">
                                                        Role:{" "}
                                                        {invitation.role_label}
                                                    </div>
                                                </div>
                                            </div>

                                            {permissions.canCancelInvitation ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                data-test="invitation-resend-button"
                                                                onClick={() =>
                                                                    resendInvite(
                                                                        invitation,
                                                                    )
                                                                }
                                                                className="text-[#5A5A5A] hover:text-[#003366] hover:bg-[#003366]/10"
                                                            >
                                                                <Send className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                Resend
                                                                invitation
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : null}

                                            {permissions.canCancelInvitation ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                data-test="invitation-cancel-button"
                                                                onClick={() =>
                                                                    confirmCancelInvitation(
                                                                        invitation,
                                                                    )
                                                                }
                                                                className="text-[#5A5A5A] hover:text-[#C0392B] hover:bg-[#C0392B]/10"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                Cancel
                                                                invitation
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* HQ Departments Management Section */}
                    {team.type === "hq" && permissions.canDeleteTeam && (
                        <HqDepartmentsSection team={team} departments={departments} />
                    )}

                    {/* Delete Team Section */}
                    {permissions.canDeleteTeam && !team.isPersonal && (
                        <div className="rounded-xl border border-[#C0392B]/30 bg-[#C0392B]/5 p-6 shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#C0392B]/10">
                                    <Trash2 className="h-6 w-6 text-[#C0392B]" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-sm font-semibold text-[#1A1A1A]">
                                        Delete Team
                                    </h2>
                                    <p className="text-sm text-[#5A5A5A]">
                                        Permanently delete this team and all
                                        associated data.
                                    </p>
                                    <div className="mt-3 rounded-lg bg-[#C0392B]/10 px-4 py-3">
                                        <p className="text-sm text-[#C0392B]">
                                            ⚠️ Warning: This action cannot be
                                            undone. All team data will be
                                            permanently removed.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        data-test="delete-team-button"
                                        onClick={() =>
                                            setDeleteDialogOpen(true)
                                        }
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#C0392B] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#C0392B]/90 hover:shadow-md"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Team
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {permissions.canCreateInvitation && (
                <InviteMemberModal
                    team={team}
                    orgRoleOptions={orgRoleOptions}
                    departments={departments}
                    open={inviteDialogOpen}
                    onOpenChange={setInviteDialogOpen}
                />
            )}

            <RemoveMemberModal
                team={team}
                member={memberToRemove}
                open={removeMemberDialogOpen}
                onOpenChange={setRemoveMemberDialogOpen}
            />

            <SuspendMemberModal
                team={team}
                member={memberToSuspend}
                open={suspendDialogOpen}
                onOpenChange={setSuspendDialogOpen}
            />

            <CancelInvitationModal
                team={team}
                invitation={invitationToCancel}
                open={cancelInvitationDialogOpen}
                onOpenChange={setCancelInvitationDialogOpen}
            />

            {permissions.canDeleteTeam && !team.isPersonal && (
                <DeleteTeamModal
                    team={team}
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                />
            )}
        </>
    );
}

TeamEdit.layout = (props: { team: { name: string; slug: string } }) => ({
    breadcrumbs: [
        {
            title: "Teams",
            href: index(),
        },
        {
            title: props.team.name,
            href: edit(props.team.slug),
        },
    ],
});
