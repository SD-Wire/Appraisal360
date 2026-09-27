export type TeamRole = 'owner' | 'admin' | 'member';

export type RegionItem = {
    id: number;
    name: string;
    code: string;
};

export type DepartmentItem = {
    id: number;
    name: string;
    code?: string;
    staff_count?: number;
};

export type Team = {
    id: number;
    name: string;
    slug: string;
    isPersonal: boolean;
    type?: 'hq' | 'branch' | 'region';
    role?: TeamRole;
    roleLabel?: string;
    isCurrent?: boolean;
    region?: RegionItem | null;
    regionName?: string | null;
    regionCode?: string | null;
    regionId?: number | null;
};

export type TeamMember = {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: TeamRole;
    role_label: string;
    suspended: boolean;
    
};

export type TeamInvitation = {
    code: string;
    email: string;
    role: TeamRole;
    role_label: string;
    created_at: string;
};

export type TeamInvitationContext = {
    code: string;
    teamName: string;
};

export type DashboardInvitation = {
    code: string;
    inviterName: string;
    team: {
        name: string;
        slug: string;
    };
};

export type TeamPermissions = {
    canUpdateTeam: boolean;
    canDeleteTeam: boolean;
    canAddMember: boolean;
    canUpdateMember: boolean;
    canRemoveMember: boolean;
    canCreateInvitation: boolean;
    canCancelInvitation: boolean;
};

export type RoleOption = {
    value: TeamRole;
    label: string;
};
