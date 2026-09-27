import { Head, Link } from "@inertiajs/react";
import { login } from "@/routes";
import { UserX, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Register() {
    return (
        <div className="space-y-6 text-center">
            <Head title="Registration Disabled" />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <UserX className="h-7 w-7" />
            </div>

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#003366]">
                    Registration is by Invitation Only
                </h1>
                <p className="mt-2 text-sm text-[#5A5A5A] leading-relaxed">
                    Self-registration is disabled on Appraise360. All staff accounts and roles are provisioned through team invitations from branch managers, department heads, or system administrators.
                </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 text-left space-y-1.5 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="font-semibold">Have you received an invitation?</p>
                <p className="text-[11px] leading-relaxed">
                    Please click the unique link in your invitation email to sign in and join your branch or department.
                </p>
            </div>

            <div className="pt-2">
                <Button asChild className="h-11 w-full rounded-xl bg-[#003366] text-sm font-semibold text-white shadow-md hover:bg-[#002244]">
                    <Link href={login()}>
                        <LogIn className="mr-2 h-4 w-4 text-[#E8A83C]" />
                        Proceed to Staff Sign In
                        <ArrowRight className="ml-auto h-4 w-4 opacity-70" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

Register.layout = {
    title: "Registration Disabled",
    description: "Account creation is by invitation only",
};
