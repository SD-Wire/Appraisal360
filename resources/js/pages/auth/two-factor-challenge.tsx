import { Form, Head, setLayoutProps } from "@inertiajs/react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { useMemo, useState } from "react";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { OTP_MAX_LENGTH } from "@/hooks/use-two-factor-auth";
import { store } from "@/routes/two-factor/login";
import {
    BarChart3,
    Shield,
    KeyRound,
    Smartphone,
    ArrowLeft,
    CheckCircle,
} from "lucide-react";
import TextLink from "@/components/text-link";
import { login } from "@/routes";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";

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
    success: "#2D7D46",
    danger: "#C0392B",
};

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>("");

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
        icon: React.ReactNode;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: "Recovery Code",
                description:
                    "Please confirm access to your account by entering one of your emergency recovery codes.",
                toggleText: "Use authentication code instead",
                icon: <KeyRound className="h-8 w-8 text-[#E8A83C]" />,
            };
        }

        return {
            title: "Authentication Code",
            description:
                "Enter the authentication code provided by your authenticator application.",
            toggleText: "Use a recovery code instead",
            icon: <Smartphone className="h-8 w-8 text-[#E8A83C]" />,
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode("");
    };

    return (
        <div className="space-y-6">
            <Head title="Two-Factor Authentication" />

            {/* Page Header */}
            <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#003366]/10 text-[#003366] mb-3">
                    <Shield className="h-5 w-5 text-[#C9922E]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
                    {authConfigContent.title}
                </h1>
                <p className="mt-1 text-sm text-[#5A5A5A] leading-relaxed">
                    {authConfigContent.description}
                </p>
            </div>

            <div className="space-y-6">
                <Form
                    {...store.form()}
                    className="space-y-4"
                    resetOnError
                    resetOnSuccess={!showRecoveryInput}
                >
                    {({ errors, processing, clearErrors }) => (
                        <>
                            {showRecoveryInput ? (
                                // Recovery Code Input
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="recovery_code"
                                        className="text-sm font-medium text-[#1A1A1A]"
                                    >
                                        Recovery Code
                                    </Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-[#5A5A5A]" />
                                        <Input
                                            id="recovery_code"
                                            name="recovery_code"
                                            type="text"
                                            placeholder="Enter recovery code"
                                            autoFocus={showRecoveryInput}
                                            required
                                            className="h-11 w-full rounded-lg border-[#E0DDD6] pl-10 pr-4 text-sm transition-colors focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20 focus:ring-offset-0"
                                        />
                                    </div>
                                    <InputError
                                        message={errors.recovery_code}
                                    />
                                </div>
                            ) : (
                                // OTP Input
                                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                                    <div className="flex w-full items-center justify-center">
                                        <InputOTP
                                            name="code"
                                            maxLength={OTP_MAX_LENGTH}
                                            value={code}
                                            onChange={(value) => setCode(value)}
                                            disabled={processing}
                                            pattern={REGEXP_ONLY_DIGITS}
                                            autoFocus
                                        >
                                            <InputOTPGroup>
                                                {Array.from(
                                                    { length: OTP_MAX_LENGTH },
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            className="h-12 w-12 rounded-lg border-[#E0DDD6] text-lg font-semibold transition-colors data-[active=true]:border-[#003366] data-[active=true]:ring-2 data-[active=true]:ring-[#003366]/20"
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                    <InputError message={errors.code} />
                                    <p className="text-xs text-[#5A5A5A]">
                                        Enter the 6-digit code from your
                                        authenticator app
                                    </p>
                                </div>
                            )}

                            {/* Continue Button */}
                            <Button
                                type="submit"
                                className="h-11 w-full rounded-lg bg-[#003366] text-sm font-medium text-white transition-all hover:bg-[#003366]/90 hover:shadow-lg disabled:opacity-50"
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="mr-2 h-4 w-4" />
                                        Verify & Continue
                                    </>
                                )}
                            </Button>

                            {/* Toggle Recovery/Auth Code */}
                            <div className="text-center text-sm text-[#5A5A5A]">
                                <span>or </span>
                                <button
                                    type="button"
                                    className="font-semibold text-[#E8A83C] transition-colors hover:text-[#C9922E]"
                                    onClick={() =>
                                        toggleRecoveryMode(clearErrors)
                                    }
                                >
                                    {authConfigContent.toggleText}
                                </button>
                            </div>

                            {/* Back to Login */}
                            <div className="text-center text-sm text-[#5A5A5A]">
                                <TextLink
                                    href={login()}
                                    className="font-semibold text-[#E8A83C] transition-colors hover:text-[#C9922E]"
                                >
                                    <ArrowLeft
                                        size={14}
                                        className="mr-1 inline"
                                    />
                                    Back to log in
                                </TextLink>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </div>
    );
}
