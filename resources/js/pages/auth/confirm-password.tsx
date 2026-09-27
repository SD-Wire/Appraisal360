import { Form, Head } from "@inertiajs/react";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { store } from "@/routes/password/confirm";
import {
    index as confirmOptions,
    store as confirmStore,
} from "@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController";
import PasskeyVerify from "@/components/passkey-verify";
import { Lock, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";

export default function ConfirmPassword() {
    return (
        <div className="space-y-6">
            <Head title="Confirm Password" />

            {/* Page Header */}
            <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#003366]/10 text-[#003366] mb-3">
                    <Lock className="h-5 w-5 text-[#C9922E]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
                    Confirm your identity
                </h1>
                <p className="mt-1 text-sm text-[#5A5A5A] leading-relaxed">
                    This is a secure area of the system. Please confirm your password before continuing.
                </p>
            </div>

            {/* Passkey Verification */}
            <PasskeyVerify
                routes={{
                    options: confirmOptions(),
                    submit: confirmStore(),
                }}
                label="Confirm with passkey"
                loadingLabel="Confirming..."
                separator="Or confirm with password"
            />

            {/* Password Form */}
            <Form {...store.form()} resetOnSuccess={["password"]} className="space-y-5">
                {({ processing, errors }) => (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="password"
                                className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]"
                            >
                                Password
                            </Label>
                            <div className="relative">
                                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5A5A5A] z-10" />
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    autoFocus
                                    className="h-11 w-full rounded-xl border-[#E0DDD6] pl-10 pr-10 text-sm bg-white transition-all focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                                />
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        {/* Security Notice */}
                        <div className="flex items-center gap-2 rounded-xl border border-[#E0DDD6] bg-[#F8F6F1] px-4 py-3">
                            <CheckCircle2 className="h-4 w-4 text-[#2D7D46] flex-shrink-0" />
                            <p className="text-xs text-[#5A5A5A]">
                                Your session will remain secure and active after confirmation
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full rounded-xl bg-[#003366] text-sm font-semibold text-white shadow-md shadow-[#003366]/10 transition-all hover:bg-[#002244] hover:shadow-lg disabled:opacity-50"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Confirming Identity...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4 text-[#E8A83C]" />
                                    Confirm Password
                                    <ArrowRight size={16} className="ml-auto opacity-70" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </Form>
        </div>
    );
}

ConfirmPassword.layout = {
    title: "Confirm Password",
    description: "Please confirm your password before continuing",
};
