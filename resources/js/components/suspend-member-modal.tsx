import { useState } from "react";
import { router } from "@inertiajs/react";
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
} from "@/components/ui/dialog";
import {
    suspend as suspendMember,
    reactivate as reactivateMember,
} from "@/routes/teams/members";
import type { Team, TeamMember } from "@/types";

type Props = {
    team: Team;
    member: TeamMember | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function SuspendMemberModal({
    team,
    member,
    open,
    onOpenChange,
}: Props) {
    const [processing, setProcessing] = useState(false);

    if (!member) return null;

    const isSuspending = !member.suspended;
    const action = isSuspending ? suspendMember : reactivateMember;

    const handleConfirm = () => {
        router.post(
            action([team.slug, member.id]),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isSuspending ? "Suspend" : "Reactivate"} {member.name}?
                    </DialogTitle>
                    <DialogDescription>
                        {isSuspending
                            ? `${member.name} will immediately lose access to ${team.name}. They can be reactivated at any time.`
                            : `${member.name} will regain access to ${team.name} immediately.`}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>

                    <Button
                        data-test="suspend-member-confirm"
                        variant={isSuspending ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={processing}
                        className={
                            isSuspending
                                ? "bg-[#C0392B] hover:bg-[#C0392B]/90"
                                : "bg-[#2D7D46] hover:bg-[#2D7D46]/90"
                        }
                    >
                        {processing && <Spinner className="mr-2 h-4 w-4" />}
                        {processing
                            ? (isSuspending ? "Suspending..." : "Reactivating...")
                            : (isSuspending ? "Suspend" : "Reactivate")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
