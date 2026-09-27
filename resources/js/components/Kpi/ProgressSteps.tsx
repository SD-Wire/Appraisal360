// resources/js/components/Kpi/ProgressSteps.tsx
// Visual 3-stage progress readout corresponding to Supervisor & HR approval workflow.
const STEPS = ["submitted", "supervisor_approved", "hr_approved"] as const;

const RETURN_STAGE: Record<string, number> = {
    supervisor_returned: 0,
    hr_returned: 1,
};

export default function ProgressSteps({ status }: { status: string }) {
    const returned = status in RETURN_STAGE;
    const activeIndex = returned
        ? RETURN_STAGE[status]
        : STEPS.indexOf(status as (typeof STEPS)[number]);

    const heights = [10, 16, 22];

    const getStageLabel = () => {
        if (status === "draft") return "Stage 0 of 3: Draft (Not submitted)";
        if (status === "submitted") return "Stage 1 of 3: Supervisor Review";
        if (status === "supervisor_approved") return "Stage 2 of 3: HRBP Review";
        if (status === "hr_approved") return "Stage 3 of 3: Final Approved";
        if (status === "supervisor_returned") return "Returned at Stage 1 (Supervisor)";
        if (status === "hr_returned") return "Returned at Stage 2 (HRBP)";
        return `Status: ${status}`;
    };

    return (
        <div
            className="flex items-end gap-1.5"
            aria-label={`Workflow stage: ${status}`}
            title={getStageLabel()}
        >
            {heights.map((h, i) => {
                let bgClass = "bg-slate-200";

                if (returned && i === activeIndex) {
                    bgClass = "bg-red-500 animate-pulse";
                } else if (!returned && i <= activeIndex && activeIndex >= 0) {
                    bgClass = i === 2 ? "bg-green-600" : "bg-orange-500";
                }

                return (
                    <span
                        key={i}
                        style={{ height: h }}
                        className={`w-2.5 rounded-xs transition-all ${bgClass}`}
                    />
                );
            })}
        </div>
    );
}
