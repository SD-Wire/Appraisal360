import { Head } from "@inertiajs/react";
import AppearanceTabs from "@/components/appearance-tabs";
import { edit as editAppearance } from "@/routes/appearance";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";

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
};

export default function Appearance() {
    return (
        <>
            <Head title="Appearance Settings" />

            <div className="space-y-6">
                <div className="overflow-hidden rounded-2xl shadow-sm"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between border-b px-6 py-4"
                        style={{ backgroundColor: C.bg, borderColor: C.border }}>
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundColor: C.navy }}>
                                <Palette className="h-4 w-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                    Interface Appearance
                                </h2>
                                <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    Customize your theme preference across light, dark, and system defaults
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="max-w-md">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-wider" style={{ color: C.textPrimary }}>
                                Theme Mode
                            </label>
                            <AppearanceTabs />
                            <p className="mt-3 text-xs leading-relaxed" style={{ color: C.textSecondary }}>
                                Select <strong>System</strong> to automatically adapt with your operating system display settings.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: "Appearance settings",
            href: editAppearance(),
        },
    ],
};
