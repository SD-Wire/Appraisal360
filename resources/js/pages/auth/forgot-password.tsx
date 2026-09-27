import { Form, Head } from "@inertiajs/react";
import {
    KeyRound,
    ArrowLeft,
    Mail,
    Send,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import InputError from "@/components/input-error";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { login } from "@/routes";
import { email } from "@/routes/password";

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <div className="space-y-6">
            <Head title="Forgot Password" />

            {/* Page Header */}
            <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 mb-3 border border-orange-200">
                    <KeyRound className="h-5 w-5 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Forgot your password?
                </h1>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                    Enter your work email address below and we'll send you a secure link to reset your account password.
                </p>
            </div>

            {status && (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
                    <span>{status}</span>
                </div>
            )}

            <Form {...email.form()} className="space-y-5">
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="email"
                                className="text-xs font-bold uppercase tracking-wider text-slate-700"
                            >
                                Registered Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    placeholder="colleague@progressivecr.com"
                                    className="h-11 rounded-xl border-slate-200 pl-10 pr-4 text-sm bg-white transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-0"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 text-sm font-semibold text-white shadow-md shadow-orange-600/20 transition-all hover:from-orange-700 hover:to-orange-800 hover:shadow-lg disabled:opacity-50"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Sending Link...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4 text-orange-200" />
                                    Send Password Reset Link
                                    <ArrowRight size={16} className="ml-auto opacity-70" />
                                </>
                            )}
                        </Button>
                    </>
                )}
            </Form>

            {/* Back to Login Link */}
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

ForgotPassword.layout = {
    title: "Forgot Password",
    description: "Enter your email to receive a password reset link",
};
