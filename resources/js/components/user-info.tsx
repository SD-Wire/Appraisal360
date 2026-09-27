import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInitials } from "@/hooks/use-initials";
import type { Team, User } from "@/types";

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
};

export function UserInfo({
    user,
    showEmail = false,
    team = null,
}: {
    user: User;
    showEmail?: boolean;
    team?: Team | null;
}) {
    const getInitials = useInitials();
    const showAvatar = Boolean(user.avatar && user.avatar !== "");

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-lg border-2 border-[#E0DDD6] transition-colors group-hover:border-[#003366]">
                {showAvatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="rounded-lg bg-[#003366] text-sm font-medium text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-[#1A1A1A] transition-colors group-hover:text-[#003366]">
                    {user.name}
                </span>
                {team ? (
                    <span className="truncate text-[10px] font-medium uppercase tracking-wider text-[#E8A83C]">
                        {team.name}
                    </span>
                ) : null}
                {!team && showEmail ? (
                    <span className="truncate text-xs text-[#5A5A5A]">
                        {user.email}
                    </span>
                ) : null}
            </div>
        </>
    );
}
