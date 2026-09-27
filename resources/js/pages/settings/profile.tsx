import { Form, Head, usePage, Link } from "@inertiajs/react";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { edit } from "@/routes/profile";
import type { Auth } from "@/types";
import { send } from "@/routes/verification";
import {
    User,
    Mail,
    Shield,
    CheckCircle,
    AlertCircle,
    Save,
    Sparkles,
    Briefcase,
} from "lucide-react";

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

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile Settings" />

            <div className="space-y-6">
                {/* Profile Overview Card */}
                <div className="overflow-hidden rounded-2xl shadow-sm"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5"
                        style={{ backgroundColor: C.bg, borderColor: C.border }}>
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
                                style={{ backgroundColor: C.navy }}>
                                {auth.user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>
                                        {auth.user.name}
                                    </h2>
                                    {auth.user.email_verified_at && (
                                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                            style={{ backgroundColor: C.greenLight, color: C.greenDark }}>
                                            <CheckCircle className="h-3.5 w-3.5" /> Verified
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    {auth.user.email}
                                </p>
                            </div>
                        </div>

                        <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                            style={{ backgroundColor: C.orangeLight, color: C.orangeDark }}>
                            <Sparkles className="h-3.5 w-3.5" /> Personal Profile
                        </span>
                    </div>

                    <div className="p-6">
                        <Form
                            {...ProfileController.update.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            className="space-y-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {/* Name & Email Inputs in Responsive 2-Column Grid */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Name Input */}
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="name"
                                                className="text-xs font-bold uppercase tracking-wider"
                                                style={{ color: C.textPrimary }}
                                            >
                                                Full Name <span style={{ color: C.danger }}>*</span>
                                            </Label>
                                            <div className="relative">
                                                <User className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: C.textSecondary }} />
                                                <Input
                                                    id="name"
                                                    className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all focus:outline-none"
                                                    style={{
                                                        borderColor: errors.name ? C.danger : C.border,
                                                        backgroundColor: C.white,
                                                        color: C.textPrimary,
                                                    }}
                                                    defaultValue={auth.user.name}
                                                    name="name"
                                                    required
                                                    autoComplete="name"
                                                    placeholder="Enter full name"
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor = C.orange;
                                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = errors.name ? C.danger : C.border;
                                                        e.currentTarget.style.boxShadow = "none";
                                                    }}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1 text-xs"
                                                message={errors.name}
                                            />
                                        </div>

                                        {/* Email Input */}
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="email"
                                                className="text-xs font-bold uppercase tracking-wider"
                                                style={{ color: C.textPrimary }}
                                            >
                                                Work Email Address <span style={{ color: C.danger }}>*</span>
                                            </Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: C.textSecondary }} />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all focus:outline-none"
                                                    style={{
                                                        borderColor: errors.email ? C.danger : C.border,
                                                        backgroundColor: C.white,
                                                        color: C.textPrimary,
                                                    }}
                                                    defaultValue={auth.user.email}
                                                    name="email"
                                                    required
                                                    autoComplete="username"
                                                    placeholder="name@progressivecr.com"
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor = C.orange;
                                                        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.orangeLight}88`;
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = errors.email ? C.danger : C.border;
                                                        e.currentTarget.style.boxShadow = "none";
                                                    }}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1 text-xs"
                                                message={errors.email}
                                            />
                                        </div>
                                    </div>

                                    {/* Email Verification Banner */}
                                    {mustVerifyEmail && auth.user.email_verified_at === null && (
                                        <div className="rounded-xl border p-4 shadow-xs"
                                            style={{ backgroundColor: C.warnLight, borderColor: `${C.warn}44` }}>
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: C.warn }} />
                                                <div>
                                                    <p className="text-xs font-medium" style={{ color: C.textPrimary }}>
                                                        Your work email address has not been verified yet.
                                                        <Link
                                                            href={send()}
                                                            as="button"
                                                            className="ml-1.5 font-bold underline transition-colors"
                                                            style={{ color: C.orangeDark }}
                                                        >
                                                            Click here to re-send verification email
                                                        </Link>
                                                    </p>
                                                    {status === "verification-link-sent" && (
                                                        <div className="mt-2 flex items-center gap-1.5 text-xs font-bold"
                                                            style={{ color: C.greenDark }}>
                                                            <CheckCircle className="h-4 w-4" />
                                                            A fresh verification link has been dispatched to your email.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form Actions */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-5"
                                        style={{ borderColor: C.border }}>
                                        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: C.textSecondary }}>
                                            <Shield className="h-4 w-4" style={{ color: C.green }} />
                                            Data protected by institutional access control policy
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                            style={{ backgroundColor: C.orange }}
                                            data-test="update-profile-button"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Saving…
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Save Profile Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>

                {/* Organization & System Info Overview */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                        className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                    >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.navyLight }}>
                            <Briefcase className="h-5 w-5" style={{ color: C.navy }} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Assigned Role</p>
                            <p className="text-sm font-bold truncate" style={{ color: C.textPrimary }}>
                                {auth.roles && auth.roles.length > 0 ? auth.roles.join(", ") : (auth.canManageTeams ? "Super Administrator" : "Staff Member")}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                    >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.greenLight }}>
                            <CheckCircle className="h-5 w-5" style={{ color: C.greenDark }} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Account Status</p>
                            <p className="text-sm font-bold truncate" style={{ color: C.greenDark }}>
                                {auth.user.email_verified_at ? "Active & Verified" : "Pending Verification"}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                    >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.orangeLight }}>
                            <Shield className="h-5 w-5" style={{ color: C.orangeDark }} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Two-Factor Security</p>
                            <p className="text-sm font-bold truncate" style={{ color: auth.user.two_factor_enabled ? C.greenDark : C.warn }}>
                                {auth.user.two_factor_enabled ? "Enabled (Secured)" : "Not Configured"}
                            </p>
                        </div>
                    </div>

                    <div
                        className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}
                    >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: C.navyLight }}>
                            <Sparkles className="h-5 w-5" style={{ color: C.navy }} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>Member Since</p>
                            <p className="text-sm font-bold truncate" style={{ color: C.textPrimary }}>
                                {auth.user.created_at ? new Date(auth.user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Active Staff"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: "Profile settings",
            href: edit(),
        },
    ],
};
