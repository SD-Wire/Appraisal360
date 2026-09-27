import { Link } from "@inertiajs/react";
import { LogOut, Settings } from "lucide-react";
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserInfo } from "@/components/user-info";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { edit } from "@/routes/profile";
import LogoutModal from "@/components/logout-modal";
import type { User } from "@/types";

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

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-3 py-2 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E0DDD6]" />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    asChild
                    className="cursor-pointer hover:bg-[#003366]/10 focus:bg-[#003366]/10"
                >
                    <Link
                        className="flex w-full items-center gap-3 px-3 py-2 text-[#1A1A1A] transition-colors hover:text-[#003366]"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="h-4 w-4 text-[#5A5A5A] transition-colors group-hover:text-[#003366]" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-[#E0DDD6]" />
            <LogoutModal>
                <DropdownMenuItem
                    className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700"
                    onSelect={(e) => {
                        e.preventDefault();
                        cleanup();
                    }}
                    data-test="logout-button"
                >
                    <div className="flex w-full items-center gap-3 px-1 py-0.5 font-medium">
                        <LogOut className="h-4 w-4 text-red-500 transition-colors group-hover:text-red-600" />
                        <span>Log out</span>
                    </div>
                </DropdownMenuItem>
            </LogoutModal>
        </>
    );
}
