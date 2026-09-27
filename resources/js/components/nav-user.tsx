import { usePage } from "@inertiajs/react";
import { ChevronsUpDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { UserInfo } from "@/components/user-info";
import { UserMenuContent } from "@/components/user-menu-content";
import { useIsMobile } from "@/hooks/use-mobile";

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

export function NavUser() {
    const { auth, currentTeam } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={`
                                group w-full rounded-lg px-3 py-2 transition-all duration-200
                                hover:bg-[#003366]/10 hover:text-[#003366]
                                data-[state=open]:bg-[#003366]/10 data-[state=open]:text-[#003366]
                            `}
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo user={auth.user} team={currentTeam} />
                            <ChevronsUpDown className="ml-auto size-4 text-[#5A5A5A] transition-colors group-hover:text-[#003366]" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-[#E0DDD6] bg-white shadow-lg"
                        align="end"
                        side={
                            isMobile
                                ? "bottom"
                                : state === "collapsed"
                                  ? "left"
                                  : "bottom"
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
