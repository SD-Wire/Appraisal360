import { Link } from "@inertiajs/react";
import type { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrentUrl } from "@/hooks/use-current-url";
import { cn, toUrl } from "@/lib/utils";
import { edit as editAppearance } from "@/routes/appearance";
import { edit } from "@/routes/profile";
import { edit as editSecurity } from "@/routes/security";
import { index as teams } from "@/routes/teams";
import type { NavItem } from "@/types";
import { User, Shield, Building2, Palette, Settings } from "lucide-react";

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

const sidebarNavItems: NavItem[] = [
    {
        title: "Profile",
        href: edit(),
        icon: User,
    },
    {
        title: "Security",
        href: editSecurity(),
        icon: Shield,
    },
    {
        title: "Teams",
        href: teams(),
        icon: Building2,
    },
    {
        title: "Appearance",
        href: editAppearance(),
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="flex h-full w-full flex-1 flex-col" style={{ backgroundColor: C.bg, padding: "1.5rem" }}>
            <div className="w-full flex-1 flex flex-col">
                {/* Header */}
                <div className="mb-6 flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                        style={{ backgroundColor: C.navy }}>
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary }}>
                                Settings & Security
                            </h1>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                style={{ backgroundColor: C.navyLight, color: C.navy }}>
                                Account
                            </span>
                        </div>
                        <p className="mt-0.5 text-sm" style={{ color: C.textSecondary }}>
                            Manage your personal profile, account credentials, teams, and workspace preferences.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 flex-1">
                    {/* Navigation Sidebar */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <nav
                            className="flex flex-col space-y-1.5 rounded-2xl p-2.5 shadow-sm"
                            style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                            aria-label="Settings navigation"
                        >
                            {sidebarNavItems.map((item, index) => {
                                const isActive = isCurrentOrParentUrl(item.href);
                                const Icon = item.icon;

                                return (
                                    <Button
                                        key={`${toUrl(item.href)}-${index}`}
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className={cn(
                                            "h-11 w-full justify-start gap-3 rounded-xl px-4 text-sm font-semibold transition-all",
                                            isActive
                                                ? "text-white shadow-sm"
                                                : "hover:bg-gray-50",
                                        )}
                                        style={{
                                            backgroundColor: isActive ? C.orange : "transparent",
                                            color: isActive ? C.white : C.textSecondary,
                                        }}
                                    >
                                        <Link href={item.href}>
                                            {Icon && (
                                                <Icon
                                                    className={cn(
                                                        "h-4 w-4 transition-colors",
                                                        isActive ? "text-white" : "text-gray-500",
                                                    )}
                                                />
                                            )}
                                            {item.title}
                                            {isActive && (
                                                <span
                                                    className="ml-auto h-2 w-2 rounded-full bg-white/90"
                                                    aria-hidden="true"
                                                />
                                            )}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Mobile Separator */}
                    <Separator className="lg:hidden" />

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        <div className="space-y-6">{children}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
