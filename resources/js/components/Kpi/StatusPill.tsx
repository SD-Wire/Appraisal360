import {
    CheckCircle2,
    Clock,
    FileEdit,
    AlertCircle,
    RotateCcw,
} from "lucide-react";

interface StatusMeta {
    label: string;
    className: string;
    icon: React.ElementType;
}

const STATUS_MAP: Record<string, StatusMeta> = {
    draft: {
        label: "Draft",
        className: "border-slate-200 text-slate-700 bg-slate-100",
        icon: FileEdit,
    },
    submitted: {
        label: "Awaiting Supervisor",
        className: "border-orange-200 text-orange-800 bg-orange-50",
        icon: Clock,
    },
    supervisor_returned: {
        label: "Returned by Supervisor",
        className: "border-red-200 text-red-700 bg-red-50",
        icon: RotateCcw,
    },
    supervisor_approved: {
        label: "Awaiting HRBP",
        className: "border-orange-200 text-orange-800 bg-orange-50",
        icon: Clock,
    },
    hr_returned: {
        label: "Returned by HR",
        className: "border-red-200 text-red-700 bg-red-50",
        icon: RotateCcw,
    },
    hr_approved: {
        label: "Approved",
        className: "border-green-200 text-green-800 bg-green-50",
        icon: CheckCircle2,
    },
};

export default function StatusPill({ status }: { status: string }) {
    const meta = STATUS_MAP[status] ?? {
        label: status.replace(/_/g, " "),
        className: "border-slate-200 text-slate-700 bg-slate-50",
        icon: AlertCircle,
    };

    const Icon = meta.icon;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${meta.className}`}
        >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{meta.label}</span>
        </span>
    );
}
