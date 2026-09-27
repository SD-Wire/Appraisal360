import { Form, Head } from "@inertiajs/react";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logout } from "@/routes";
import { send } from "@/routes/verification";
import {
    Mail,
    CheckCircle2,
    ArrowLeft,
    Send,
} from "lucide-react";

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <div className="space-y-6">
            <Head title="Verify Email" />

            {/* Page Header */}
            <div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#003366]/10 text-[#003366] mb-3">
                    <Mail className="h-5 w-5 text-[#C9922E]" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
                    Verify your email
                </h1>
                <p className="mt-1 text-sm text-[#5A5A5A] leading-relaxed">
                    Please click the verification link sent to your email to activate all Appraise360 appraisal features.
                </p>
            </div>

            {/* Success Message */}
            {status === "verification-link-sent" && (
                <div className="flex items-start gap-3 rounded-xl border border-[#2D7D46]/20 bg-[#2D7D46]/10 p-4 text-sm font-medium text-[#2D7D46]">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#2D7D46]" />
                    <span>
                        A new verification link has been sent to your email address.
                    </span>
                </div>
            )}

            <Form {...send.form()} className="space-y-5">
                {({ processing }) => (
                    <>
                        <Button
                            disabled={processing}
                            className="h-11 w-full rounded-xl bg-[#003366] text-sm font-semibold text-white shadow-md shadow-[#003366]/10 transition-all hover:bg-[#002244] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Sending Link...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4 text-[#E8A83C]" />
                                    Resend Verification Email
                                </>
                            )}
                        </Button>

                        <p className="text-center text-xs text-[#5A5A5A]">
                            Didn't receive the email? Check your spam folder or click above to request another link.
                        </p>

                        {/* Logout Link */}
                        <div className="pt-2 text-center text-xs text-[#5A5A5A]">
                            <TextLink
                                href={logout()}
                                className="inline-flex items-center font-bold text-[#003366] transition-colors hover:text-[#C9922E]"
                            >
                                <ArrowLeft size={13} className="mr-1 inline" />
                                Log out and sign in with a different account
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

VerifyEmail.layout = {
    title: "Verify Email",
    description: "Please verify your email address to continue",
};
