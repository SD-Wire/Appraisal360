import { router } from "@inertiajs/react";
import { useState, type PropsWithChildren } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { logout } from "@/routes";

type Props = PropsWithChildren<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}>;

export default function LogoutModal({
    children,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
}: Props) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const onOpenChange = isControlled ? setControlledOpen! : setInternalOpen;

    const handleConfirm = () => {
        router.post(
            logout(),
            {},
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    router.flushAll();
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children && <DialogTrigger asChild>{children}</DialogTrigger>}
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <LogOut className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Sign Out of Appraise360
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to end your session? You will need to sign in again to access your appraisals, reports, and team data.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-4 flex flex-row justify-end gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary" disabled={processing}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        data-test="logout-confirm-button"
                        disabled={processing}
                        onClick={handleConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {processing && <Spinner className="mr-2 h-4 w-4" />}
                        {processing ? "Signing out..." : "Log out"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
