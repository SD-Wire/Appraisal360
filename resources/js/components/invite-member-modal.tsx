import { Form } from "@inertiajs/react";
import { useState } from "react";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { store as storeInvitation } from "@/routes/teams/invitations";
import type { Team } from "@/types";
import { Mail, UserPlus, Building2, Users, Send, MapPin } from "lucide-react";

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
    success: "#2D7D46",
    danger: "#C0392B",
};

type Department = { id: number; name: string };

type Props = {
    team: Team & { type?: "hq" | "branch" | "region" };
    orgRoleOptions?: string[]; // ['Branch Manager', 'Staff'] or ['HOD', 'Staff'] or ['RM', 'RSTL']
    departments?: Department[]; // only populated for HQ teams
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function InviteMemberModal({
    team,
    orgRoleOptions = [],
    departments = [],
    open,
    onOpenChange,
}: Props) {
    const defaultOrgRole = orgRoleOptions.includes("Staff")
        ? "Staff"
        : orgRoleOptions[0] || "Staff";
    const [orgRole, setOrgRole] = useState<string>(defaultOrgRole);
    const [departmentId, setDepartmentId] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    const isHq = team.type === "hq";
    const isRegion = team.type === "region";

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setOrgRole(defaultOrgRole);
            setDepartmentId("");
            setEmail("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-md rounded-xl border border-[#E0DDD6] bg-white p-0 shadow-xl">
                <Form
                    key={String(open)}
                    {...storeInvitation.form(team.slug)}
                    className="space-y-6"
                    onSuccess={() => onOpenChange(false)}
                >
                    {({ errors, processing }) => (
                        <>
                            {/* Header */}
                            <DialogHeader className="border-b border-[#E0DDD6] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#003366]/10">
                                        <UserPlus className="h-5 w-5 text-[#003366]" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-semibold text-[#1A1A1A]">
                                            Invite Team Member
                                        </DialogTitle>
                                        <DialogDescription className="text-sm text-[#5A5A5A]">
                                            Send an invitation to join{" "}
                                            {team.name}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Content */}
                            <div className="space-y-5 px-6">
                                {/* Team Info */}
                                <div className="rounded-lg bg-[#F8F6F1] p-3">
                                    <div className="flex items-center gap-2 text-sm text-[#5A5A5A]">
                                        <Building2 className="h-4 w-4 text-[#003366]" />
                                        <span className="font-medium text-[#1A1A1A]">
                                            Team:
                                        </span>
                                        <span>{team.name}</span>
                                        <span className="mx-1 text-[#E0DDD6]">
                                            |
                                        </span>
                                        <span className="capitalize">
                                            {team.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Region context banner (region teams only) */}
                                {isRegion && (
                                    <div className="rounded-lg border border-[#E8A83C]/40 bg-[#F5D88E]/20 px-3 py-2.5">
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C9922E]" />
                                            <div>
                                                <p className="font-medium text-[#1A1A1A]">
                                                    Region:{" "}
                                                    <span className="text-[#003366]">
                                                        {team.region?.name ?? "Unassigned"}
                                                        {team.region?.code ? ` (${team.region.code})` : ""}
                                                    </span>
                                                </p>
                                                <p className="mt-0.5 text-xs text-[#5A5A5A]">
                                                    The invited RM/RSTL will be automatically scoped to this region and can appraise branch managers within it.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Email */}
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm font-medium text-[#1A1A1A]"
                                    >
                                        Email Address{" "}
                                        <span className="text-[#C0392B]">
                                            *
                                        </span>
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5A5A5A]" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            data-test="invite-email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="colleague@example.com"
                                            required
                                            className="h-11 w-full rounded-lg border-[#E0DDD6] pl-10 pr-4 text-sm transition-colors focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                                        />
                                    </div>
                                    <InputError message={errors.email} />
                                </div>

                                {/* Role */}
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="org_role"
                                        className="text-sm font-medium text-[#1A1A1A]"
                                    >
                                        Role{" "}
                                        <span className="text-[#C0392B]">
                                            *
                                        </span>
                                    </Label>
                                    <SearchableSelect
                                        name="org_role"
                                        options={orgRoleOptions.map((role) => ({
                                            value: role,
                                            label: role,
                                        }))}
                                        value={orgRole}
                                        onChange={(val) => setOrgRole(String(val))}
                                        placeholder="Select a role"
                                        searchPlaceholder="Search roles..."
                                        required
                                    />
                                    <InputError message={errors.org_role} />
                                </div>

                                {/* Department (HQ only) */}
                                {isHq && (
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="department_id"
                                            className="text-sm font-medium text-[#1A1A1A]"
                                        >
                                            Department{" "}
                                            <span className="text-[#C0392B]">
                                                *
                                            </span>
                                        </Label>
                                        <SearchableSelect
                                            name="department_id"
                                            options={departments.map((department) => ({
                                                value: String(department.id),
                                                label: department.name,
                                            }))}
                                            value={departmentId}
                                            onChange={(val) => setDepartmentId(String(val))}
                                            placeholder="Select a department"
                                            searchPlaceholder="Search departments..."
                                            required
                                        />
                                        <InputError
                                            message={errors.department_id}
                                        />
                                    </div>
                                )}

                                {/* Summary */}
                                <div className="rounded-lg bg-[#003366]/5 p-3 border border-[#003366]/10">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5A5A]">
                                        <Users className="h-3.5 w-3.5 text-[#003366]" />
                                        <span className="font-medium text-[#1A1A1A]">
                                            Summary:
                                        </span>
                                        <span>
                                            Inviting as{" "}
                                            <strong className="text-[#003366]">
                                                {orgRole}
                                            </strong>
                                        </span>
                                        {isRegion && team.region?.name && (
                                            <>
                                                <span className="text-[#E0DDD6]">
                                                    |
                                                </span>
                                                <span>
                                                    Region:{" "}
                                                    <strong className="text-[#003366]">
                                                        {team.region.name}
                                                    </strong>
                                                </span>
                                            </>
                                        )}
                                        {isHq && departmentId && (
                                            <>
                                                <span className="text-[#E0DDD6]">
                                                    |
                                                </span>
                                                <span>
                                                    Department:{" "}
                                                    <strong className="text-[#003366]">
                                                        {departments.find(
                                                            (d) =>
                                                                String(d.id) ===
                                                                departmentId,
                                                        )?.name || ""}
                                                    </strong>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <DialogFooter className="border-t border-[#E0DDD6] px-6 py-4">
                                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <DialogClose asChild>
                                        <Button
                                            variant="secondary"
                                            className="h-10 rounded-lg border-[#E0DDD6] text-sm font-medium text-[#5A5A5A] transition-colors hover:bg-[#F8F6F1] hover:text-[#1A1A1A]"
                                        >
                                            Cancel
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        data-test="invite-submit"
                                        disabled={
                                            processing ||
                                            !email.trim() ||
                                            !orgRole ||
                                            (isHq && !departmentId)
                                        }
                                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#003366] px-4 text-sm font-medium text-white transition-all hover:bg-[#003366]/90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                Send Invitation
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
