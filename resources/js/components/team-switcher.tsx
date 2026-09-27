import { router, usePage } from "@inertiajs/react";
import { Check, ChevronsUpDown, Plus, Users, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import CreateTeamModal from "@/components/create-team-modal";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { switchMethod } from "@/routes/teams";
import type { Team } from "@/types";
import { cn } from "@/lib/utils";

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

type TeamSwitcherProps = {
    inHeader?: boolean;
};

export function TeamSwitcher({ inHeader = false }: TeamSwitcherProps) {
    const page = usePage();
    const isMobile = useIsMobile();
    const currentTeam = page.props.currentTeam;
    const teams = page.props.teams ?? [];
    const canManageTeams = page.props.auth?.canManageTeams ?? false;

    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const switchTeam = (team: Team) => {
        const previousTeamSlug = currentTeam?.slug;

        router.visit(switchMethod(team.slug), {
            onFinish: () => {
                if (!previousTeamSlug || typeof window === "undefined") {
                    router.reload();
                    return;
                }

                const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
                const segment = `/${previousTeamSlug}`;

                if (currentUrl.includes(segment)) {
                    router.visit(currentUrl.replace(segment, `/${team.slug}`), {
                        replace: true,
                    });
                    return;
                }

                router.reload();
            },
        });

        setIsOpen(false);
        setSearchQuery("");
    };

    const filteredTeams = useMemo(() => {
        if (!searchQuery.trim()) return teams;

        const query = searchQuery.toLowerCase().trim();
        return teams.filter((team) => team.name.toLowerCase().includes(query));
    }, [teams, searchQuery]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setSearchQuery("");
        }
    };

    // Non-manageable view
    if (!canManageTeams) {
        return (
            <div
                className={cn(
                    inHeader
                        ? "flex h-8 items-center gap-2 px-2 text-sm"
                        : "flex items-center gap-2 px-2 py-1.5 text-sm",
                )}
            >
                <Users
                    className={cn(
                        "size-4 shrink-0",
                        inHeader
                            ? "hidden"
                            : "hidden group-data-[collapsible=icon]:block",
                    )}
                />
                <span
                    className={cn(
                        inHeader
                            ? "max-w-[120px] truncate font-medium text-[#5A5A5A]"
                            : "truncate font-semibold text-[#5A5A5A] group-data-[collapsible=icon]:hidden",
                    )}
                >
                    {currentTeam?.name ?? "No team"}
                </span>
            </div>
        );
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    data-test="team-switcher-trigger"
                    className={cn(
                        inHeader
                            ? "h-8 gap-1 px-2 hover:bg-[#003366]/10 hover:text-[#003366]"
                            : "w-full justify-start px-2 hover:bg-[#003366]/10 hover:text-[#003366] data-[state=open]:bg-[#003366]/10 data-[state=open]:text-[#003366]",
                    )}
                >
                    <Users
                        className={cn(
                            "size-4 shrink-0",
                            inHeader
                                ? "hidden"
                                : "hidden group-data-[collapsible=icon]:block",
                        )}
                    />
                    <div
                        className={cn(
                            "grid flex-1 text-left text-sm leading-tight",
                            inHeader
                                ? ""
                                : "group-data-[collapsible=icon]:hidden",
                        )}
                    >
                        <span
                            className={cn(
                                "truncate font-medium",
                                inHeader ? "max-w-[120px]" : "font-semibold",
                            )}
                        >
                            {currentTeam?.name ?? "Select team"}
                        </span>
                    </div>
                    <ChevronsUpDown
                        className={cn(
                            "size-4 opacity-50",
                            inHeader
                                ? ""
                                : "ml-auto group-data-[collapsible=icon]:hidden",
                        )}
                    />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className={cn(
                    "border border-[#E0DDD6] bg-white shadow-lg",
                    inHeader
                        ? "w-56"
                        : "w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg",
                )}
                side={inHeader ? undefined : isMobile ? "bottom" : "right"}
                align={inHeader ? "end" : "start"}
                sideOffset={inHeader ? undefined : 4}
            >
                <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-[#5A5A5A]">
                    Teams
                </DropdownMenuLabel>

                {/* Search Input */}
                <div className="relative px-2 py-1.5">
                    <Search className="absolute left-4 top-3.5 h-3.5 w-3.5 text-[#5A5A5A]" />
                    <Input
                        placeholder="Search teams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 w-full rounded-lg border-[#E0DDD6] pl-8 pr-8 text-sm transition-colors focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                        autoFocus={isOpen}
                        onClick={(e) => e.stopPropagation()}
                    />
                    {searchQuery && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery("");
                            }}
                            className="absolute right-3.5 top-3.5 text-[#5A5A5A] hover:text-[#1A1A1A]"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <DropdownMenuSeparator className="bg-[#E0DDD6]" />

                {/* Team List */}
                <div className="max-h-64 overflow-y-auto">
                    {filteredTeams.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-[#5A5A5A]">
                            {searchQuery
                                ? "No teams found"
                                : "No teams available"}
                        </div>
                    ) : (
                        filteredTeams.map((team) => (
                            <DropdownMenuItem
                                key={team.id}
                                data-test="team-switcher-item"
                                className={cn(
                                    "cursor-pointer gap-2 transition-colors hover:bg-[#003366]/10 hover:text-[#003366] focus:bg-[#003366]/10 focus:text-[#003366]",
                                    inHeader ? "p-2" : "p-2",
                                )}
                                onSelect={() => switchTeam(team)}
                            >
                                <span className="truncate text-[#1A1A1A]">
                                    {team.name}
                                </span>
                                {team.isPersonal && (
                                    <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-[#E8A83C]">
                                        Personal
                                    </span>
                                )}
                                {currentTeam?.id === team.id && (
                                    <Check className="ml-auto h-4 w-4 text-[#003366]" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </div>

                <DropdownMenuSeparator className="bg-[#E0DDD6]" />

                {/* New Team Option */}
                <CreateTeamModal>
                    <DropdownMenuItem
                        data-test="team-switcher-new-team"
                        className={cn(
                            "cursor-pointer gap-2 transition-colors hover:bg-[#003366]/10 hover:text-[#003366] focus:bg-[#003366]/10 focus:text-[#003366]",
                            inHeader ? "p-2" : "p-2",
                        )}
                        onSelect={(event) => event.preventDefault()}
                    >
                        <Plus className="h-4 w-4 text-[#E8A83C]" />
                        <span className="font-medium text-[#003366]">
                            Add branch or department
                        </span>
                    </DropdownMenuItem>
                </CreateTeamModal>

                {/* Team Count */}
                <div className="border-t border-[#E0DDD6] px-2 py-1.5">
                    <span className="text-xs text-[#5A5A5A]">
                        {filteredTeams.length} of {teams.length} teams
                    </span>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
