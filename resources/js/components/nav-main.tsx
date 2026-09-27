import { Link } from "@inertiajs/react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUrl } from "@/hooks/use-current-url";
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
};

export function NavMain({ items }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-[#5A5A5A]">
                Platform
            </SidebarGroupLabel>
            <SidebarMenu className="mt-1 space-y-0.5">
                {items.map((item) => {
                    const isActive = isCurrentUrl(item.href);
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                                className={`
                                    relative h-9 w-full rounded-lg px-3 text-sm font-medium transition-all duration-200
                                    ${
                                        isActive
                                            ? "bg-[#003366] text-white shadow-sm hover:bg-[#003366]/90"
                                            : "text-[#1A1A1A] hover:bg-[#003366]/10 hover:text-[#003366]"
                                    }
                                `}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && (
                                        <item.icon
                                            className={`h-4 w-4 shrink-0 transition-colors ${
                                                isActive
                                                    ? "text-white"
                                                    : "text-[#5A5A5A] group-hover:text-[#003366]"
                                            }`}
                                        />
                                    )}
                                    <span className="truncate">
                                        {item.title}
                                    </span>
                                    {isActive && (
                                        <span
                                            className="ml-auto h-1.5 w-1.5 rounded-full bg-[#E8A83C]"
                                            aria-hidden="true"
                                        />
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
