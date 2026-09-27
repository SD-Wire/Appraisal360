const C = {
    orange: "#EA580C",
    orangeLight: "#FED7AA",
    navy: "#1E3A5F",
    border: "#E5E7EB",
    textSecondary: "#6B7280",
    white: "#FFFFFF",
};

const LABELS: Record<number, string> = {
    1: "1 — Unsatisfactory",
    2: "2 — Below expectations",
    3: "3 — Meets expectations",
    4: "4 — Exceeds expectations",
    5: "5 — Outstanding",
};

export default function RatingScale({
    value,
    onChange,
    disabled,
}: {
    value: number | null;
    onChange?: (n: number) => void;
    disabled?: boolean;
}) {
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                    const selected = value === n;
                    return (
                        <button
                            key={n}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange?.(n)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: selected ? C.orange : C.white,
                                color: selected ? C.white : C.navy,
                                border: `1px solid ${selected ? C.orange : C.border}`,
                            }}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>
            {value != null && (
                <p className="mt-1.5 text-xs" style={{ color: C.textSecondary }}>
                    {LABELS[value]}
                </p>
            )}
        </div>
    );
}
