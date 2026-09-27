import { Form, Head } from "@inertiajs/react";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import TeamInvitationAlert from "@/components/team-invitation-alert";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { store } from "@/routes/login";
import { request } from "@/routes/password";
import PasskeyVerify from "@/components/passkey-verify";
import type { TeamInvitationContext } from "@/types";
import { LogIn, ArrowRight, Mail, Lock } from "lucide-react";

type Props = {
    status?: string;
    canResetPassword: boolean;
    teamInvitation?: TeamInvitationContext | null;
};

export default function Login({
    status,
    canResetPassword,
    teamInvitation,
}: Props) {
    return (
        <div className="space-y-6">
            <Head title="Sign In" />

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Welcome back
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Enter your work credentials to access your 360° appraisals & KPI scorecard
                </p>
            </div>

            {teamInvitation && (
                <TeamInvitationAlert
                    invitation={teamInvitation}
                    action="Log in"
                />
            )}

            {status && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                    {status}
                </div>
            )}

            <PasskeyVerify />

            <Form
                {...store.form()}
                resetOnSuccess={["password"]}
                className="space-y-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-bold uppercase tracking-wider text-slate-700"
                                >
                                    Work Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="colleague@progressivecr.com"
                                        className="h-11 rounded-xl border-slate-200 pl-10 pr-4 text-sm bg-white transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-0"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-bold uppercase tracking-wider text-slate-700"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700 hover:underline"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        className="h-11 rounded-xl border-slate-200 pl-10 pr-10 text-sm bg-white transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-0"
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember me */}
                            <div className="flex items-center space-x-2.5 pt-1">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="h-4 w-4 rounded border-slate-300 data-[state=checked]:border-orange-600 data-[state=checked]:bg-orange-600 data-[state=checked]:text-white transition-colors"
                                />
                                <Label
                                    htmlFor="remember"
                                    className="text-xs font-medium text-slate-600 cursor-pointer select-none"
                                >
                                    Keep me signed in on this device
                                </Label>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-lg disabled:opacity-50"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={16} className="mr-2 text-orange-200" />
                                        Sign In to Appraise360
                                        <ArrowRight size={16} className="ml-auto opacity-70" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

Login.layout = {
    title: "Sign In",
    description: "Enter your work credentials to access your account",
};
