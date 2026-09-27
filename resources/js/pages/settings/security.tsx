import { Form, Head } from "@inertiajs/react";
import { useRef } from "react";
import SecurityController from "@/actions/App/Http/Controllers/Settings/SecurityController";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { edit } from "@/routes/security";
import type { Props as ManagePasskeysProps } from "@/components/manage-passkeys";
import ManagePasskeys from "@/components/manage-passkeys";
import type { Props as ManageTwoFactorProps } from "@/components/manage-two-factor";
import ManageTwoFactor from "@/components/manage-two-factor";
import {
    Shield,
    KeyRound,
    Lock,
    CheckCircle,
    Save,
    Fingerprint,
    Smartphone,
    Info,
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

type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Security & Authentication" />

            <div className="space-y-6">
                {/* Security Metrics Overview */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: C.navyLight }}>
                            <Lock className="h-5 w-5" style={{ color: C.navy }} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                Password Status
                            </p>
                            <p className="text-sm font-bold" style={{ color: C.textPrimary }}>
                                Active & Protected
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: props.twoFactorEnabled ? C.greenLight : C.warnLight }}>
                            <Smartphone className="h-5 w-5" style={{ color: props.twoFactorEnabled ? C.greenDark : C.warn }} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                Two-Factor Auth
                            </p>
                            <p className="text-sm font-bold"
                                style={{ color: props.twoFactorEnabled ? C.greenDark : C.warn }}>
                                {props.twoFactorEnabled ? "2FA Enabled" : "Not Configured"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 rounded-2xl p-4 shadow-sm"
                        style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ backgroundColor: C.orangeLight }}>
                            <Fingerprint className="h-5 w-5" style={{ color: C.orangeDark }} />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textSecondary }}>
                                Hardware Passkeys
                            </p>
                            <p className="text-sm font-bold" style={{ color: C.orangeDark }}>
                                {props.passkeys?.length || 0} Registered
                            </p>
                        </div>
                    </div>
                </div>

                {/* Update Password Card */}
                <div className="overflow-hidden rounded-2xl shadow-sm"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between border-b px-6 py-4"
                        style={{ backgroundColor: C.bg, borderColor: C.border }}>
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundColor: C.navy }}>
                                <Lock className="h-4 w-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                    Update Password
                                </h2>
                                <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    Protect your account with a secure, confidential passphrase
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <Form
                            {...SecurityController.update.form()}
                            options={{
                                preserveScroll: true,
                            }}
                            resetOnError={[
                                "password",
                                "password_confirmation",
                                "current_password",
                            ]}
                            resetOnSuccess
                            onError={(errors) => {
                                if (errors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (errors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="space-y-5"
                        >
                            {({ errors, processing }) => (
                                <>
                                    {/* Current Password */}
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="current_password"
                                            className="text-xs font-bold uppercase tracking-wider"
                                            style={{ color: C.textPrimary }}
                                        >
                                            Current Password <span style={{ color: C.danger }}>*</span>
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: C.textSecondary }} />
                                            <PasswordInput
                                                id="current_password"
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all focus:outline-none"
                                                style={{
                                                    borderColor: errors.current_password ? C.danger : C.border,
                                                    backgroundColor: C.white,
                                                    color: C.textPrimary,
                                                }}
                                                autoComplete="current-password"
                                                placeholder="Enter current password"
                                            />
                                        </div>
                                        <InputError
                                            className="mt-1 text-xs"
                                            message={errors.current_password}
                                        />
                                    </div>

                                    {/* New Password & Confirm Password in 2-cols */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password"
                                                className="text-xs font-bold uppercase tracking-wider"
                                                style={{ color: C.textPrimary }}
                                            >
                                                New Password <span style={{ color: C.danger }}>*</span>
                                            </Label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: C.textSecondary }} />
                                                <PasswordInput
                                                    id="password"
                                                    ref={passwordInput}
                                                    name="password"
                                                    className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all focus:outline-none"
                                                    style={{
                                                        borderColor: errors.password ? C.danger : C.border,
                                                        backgroundColor: C.white,
                                                        color: C.textPrimary,
                                                    }}
                                                    autoComplete="new-password"
                                                    placeholder="Enter new password"
                                                    passwordrules={props.passwordRules}
                                                />
                                            </div>
                                            <InputError className="mt-1 text-xs" message={errors.password} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="password_confirmation"
                                                className="text-xs font-bold uppercase tracking-wider"
                                                style={{ color: C.textPrimary }}
                                            >
                                                Confirm New Password <span style={{ color: C.danger }}>*</span>
                                            </Label>
                                            <div className="relative">
                                                <CheckCircle className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: C.textSecondary }} />
                                                <PasswordInput
                                                    id="password_confirmation"
                                                    name="password_confirmation"
                                                    className="h-11 w-full rounded-xl border pl-10 pr-4 text-sm transition-all focus:outline-none"
                                                    style={{
                                                        borderColor: errors.password_confirmation ? C.danger : C.border,
                                                        backgroundColor: C.white,
                                                        color: C.textPrimary,
                                                    }}
                                                    autoComplete="new-password"
                                                    placeholder="Confirm new password"
                                                    passwordrules={props.passwordRules}
                                                />
                                            </div>
                                            <InputError
                                                className="mt-1 text-xs"
                                                message={errors.password_confirmation}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Guidance */}
                                    {props.passwordRules && (
                                        <div className="flex items-start gap-2.5 rounded-xl p-3.5"
                                            style={{ backgroundColor: C.navyLight, border: `1px solid ${C.navy}22` }}>
                                            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: C.navy }} />
                                            <p className="text-xs leading-relaxed" style={{ color: C.navy }}>
                                                <strong>Password Policy:</strong> {props.passwordRules}
                                            </p>
                                        </div>
                                    )}

                                    {/* Submit Action */}
                                    <div className="flex items-center justify-end border-t pt-5"
                                        style={{ borderColor: C.border }}>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                                            style={{ backgroundColor: C.orange }}
                                            data-test="update-password-button"
                                        >
                                            {processing ? (
                                                <>
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Updating…
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Update Password
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>

                {/* Two-Factor Authentication Card */}
                <div className="overflow-hidden rounded-2xl shadow-sm"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between border-b px-6 py-4"
                        style={{ backgroundColor: C.bg, borderColor: C.border }}>
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundColor: C.greenDark }}>
                                <Smartphone className="h-4 w-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                    Two-Factor Authentication (2FA)
                                </h2>
                                <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    Secure your corporate logins using time-based one-time authentication codes
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <ManageTwoFactor
                            canManageTwoFactor={props.canManageTwoFactor}
                            requiresConfirmation={props.requiresConfirmation}
                            twoFactorEnabled={props.twoFactorEnabled}
                        />
                    </div>
                </div>

                {/* Passkeys Card */}
                <div className="overflow-hidden rounded-2xl shadow-sm"
                    style={{ backgroundColor: C.white, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center justify-between border-b px-6 py-4"
                        style={{ backgroundColor: C.bg, borderColor: C.border }}>
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
                                style={{ backgroundColor: C.orange }}>
                                <Fingerprint className="h-4 w-4" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold" style={{ color: C.textPrimary }}>
                                    FIDO2 & Hardware Passkeys
                                </h2>
                                <p className="text-xs font-medium" style={{ color: C.textSecondary }}>
                                    Sign in instantly using Touch ID, Face ID, Windows Hello, or hardware security keys
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <ManagePasskeys
                            canManagePasskeys={props.canManagePasskeys}
                            passkeys={props.passkeys}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: "Security settings",
            href: edit(),
        },
    ],
};
