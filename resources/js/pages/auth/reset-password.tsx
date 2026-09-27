import { Form, Head } from "@inertiajs/react";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { update } from "@/routes/password";
import {
    KeyRound,
    Lock,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";
import TextLink from "@/components/text-link";
import { login } from "@/routes";

type Props = {
    token: string;
    email: string;
    passwordRules: string;
};

export default function ResetPassword({ token, email, passwordRules }: Props) {
    return (
        <div className="space-y-6">
            <Head title="Create New Password" />

            {/* Page Header */}
            <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 mb-3 border border-orange-200">
                    <KeyRound className="h-5 w-5 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Set new password
                </h1>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    Choose a strong, secure password to protect your account.
                </p>
            </div>

            <Form
                {...update.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={["password", "password_confirmation"]}
                className="space-y-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-4">
                            {/* Email (read-only verification) */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                                >
                                    Account Email
                                </Label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        value={email}
                                        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-700 cursor-not-allowed select-none"
                                        readOnly
                                        disabled
                                    />
                                </div>
                                <InputError
                                    message={errors.email}
                                    className="mt-1"
                                />
                            </div>

                            {/* New Password */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                                >
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        autoComplete="new-password"
                                        className="h-11 w-full rounded-xl border-slate-200 pl-10 pr-10 text-sm bg-white transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-0"
                                        autoFocus
                                        placeholder="Enter your new password"
                                        passwordrules={passwordRules}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                                >
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        className="h-11 w-full rounded-xl border-slate-200 pl-10 pr-10 text-sm bg-white transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-0"
                                        placeholder="Confirm your new password"
                                        passwordrules={passwordRules}
                                    />
                                </div>
                                <InputError
                                    message={errors.password_confirmation}
                                    className="mt-1"
                                />
                            </div>

                            {/* Password Requirements Guidance Box */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <div className="flex items-start gap-2 text-xs text-slate-600">
                                    <ShieldCheck className="h-4 w-4 flex-shrink-0 text-green-600 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-slate-800">
                                            Password Security Requirements:
                                        </span>
                                        <p className="mt-0.5 text-xs text-slate-600">
                                            {passwordRules ||
                                                "Minimum 8 characters, with at least one uppercase letter, one lowercase letter, and one number."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-lg disabled:opacity-50"
                                disabled={processing}
                                data-test="reset-password-button"
                            >
                                {processing ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Updating Password...
                                    </>
                                ) : (
                                    <>
                                        <KeyRound className="mr-2 h-4 w-4 text-orange-200" />
                                        Reset Password & Sign In
                                        <ArrowRight size={16} className="ml-auto opacity-70" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {/* Back to Login */}
            <div className="pt-2 text-center text-xs text-slate-500">
                Remembered your password?{" "}
                <TextLink
                    href={login()}
                    className="inline-flex items-center font-bold text-orange-600 transition-colors hover:text-orange-700 hover:underline"
                >
                    <ArrowLeft size={13} className="mr-1 inline" />
                    Back to Sign In
                </TextLink>
            </div>
        </div>
    );
}

ResetPassword.layout = {
    title: "Reset Password",
    description: "Please enter your new password below",
};
