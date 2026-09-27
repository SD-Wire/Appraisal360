import { Form, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { store as storeTeam } from '@/routes/teams';
import { store as storeDepartment } from '@/routes/teams/departments';
import type { RegionItem } from '@/types';
import { Building2, GitBranch, Layers, Plus, Info } from 'lucide-react';

// ── Brand colours ──────────────────────────────────────────────────────────
const C = {
    navy: '#003366',
    navyLight: '#EFF6FF',
    goldDark: '#C9922E',
    bg: '#F8F6F1',
    white: '#FFFFFF',
    border: '#E0DDD6',
    text: '#1A1A1A',
    textLight: '#5A5A5A',
    danger: '#C0392B',
};

type CreationType = 'branch' | 'department';

type HqTeamRef = {
    slug: string;
    name: string;
};

type TeamCreationContext = {
    regions?: RegionItem[];
    hqTeam?: HqTeamRef | null;
};

type Props = PropsWithChildren<{
    regions?: RegionItem[];
    hqTeam?: HqTeamRef | null;
}>;

const TYPE_OPTIONS: { value: CreationType; label: string; description: string; icon: typeof GitBranch }[] = [
    {
        value: 'branch',
        label: 'Branch',
        description: 'A regional branch with a Branch Manager and staff',
        icon: GitBranch,
    },
    {
        value: 'department',
        label: 'HQ Department',
        description: 'A department within Head Office (CEO, HODs, Staff)',
        icon: Layers,
    },
];

export default function CreateTeamModal({ children, regions: regionsProp, hqTeam: hqTeamProp }: Props) {
    const page = usePage<{ teamCreationContext?: TeamCreationContext }>();
    const regions = regionsProp ?? page.props.teamCreationContext?.regions ?? [];
    const hqTeam = hqTeamProp ?? page.props.teamCreationContext?.hqTeam ?? null;

    const [open, setOpen] = useState(false);
    const [creationType, setCreationType] = useState<CreationType>('branch');
    const [branchName, setBranchName] = useState('');
    const [regionId, setRegionId] = useState('');
    const [deptName, setDeptName] = useState('');

    const resetState = () => {
        setCreationType('branch');
        setBranchName('');
        setRegionId('');
        setDeptName('');
    };

    const handleOpen = (nextOpen: boolean) => {
        if (!nextOpen) resetState();
        setOpen(nextOpen);
    };

    const isBranch = creationType === 'branch';
    const isDepartment = creationType === 'department';

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border-0 p-0 shadow-2xl" style={{ backgroundColor: C.white }}>
                {isBranch ? (
                    <Form
                        key={String(open) + 'branch'}
                        {...storeTeam.form()}
                        className="flex flex-col"
                        onSuccess={() => handleOpen(false)}
                    >
                        {({ errors, processing }) => (
                            <>
                                <DialogHeader className="border-b px-6 py-5" style={{ borderColor: C.border }}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                            style={{ backgroundColor: C.navy }}
                                        >
                                            <GitBranch className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-base font-bold" style={{ color: C.text }}>
                                                Add Branch or Department
                                            </DialogTitle>
                                            <DialogDescription className="text-xs" style={{ color: C.textLight }}>
                                                Create a new branch or add a department to HQ.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-5 overflow-y-auto px-6 py-5" style={{ maxHeight: '60vh' }}>
                                    <CreationTypeSelector
                                        creationType={creationType}
                                        hqTeam={hqTeam}
                                        onSelect={setCreationType}
                                    />

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="name" className="text-sm font-semibold" style={{ color: C.text }}>
                                            Branch Name <span style={{ color: C.danger }}>*</span>
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            data-test="create-team-name"
                                            value={branchName}
                                            onChange={(e) => setBranchName(e.target.value)}
                                            placeholder="e.g. Nakuru East Branch"
                                            required
                                            className="h-10 rounded-xl border px-4 text-sm"
                                            style={{ borderColor: errors.name ? C.danger : C.border }}
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="region_id" className="text-sm font-semibold" style={{ color: C.text }}>
                                            Region <span style={{ color: C.danger }}>*</span>
                                        </Label>
                                        {regions.length === 0 ? (
                                            <p className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: C.border, color: C.textLight }}>
                                                No regions found. Create regions first before adding branches.
                                            </p>
                                        ) : (
                                            <SearchableSelect
                                                name="region_id"
                                                options={regions.map((r) => ({
                                                    value: String(r.id),
                                                    label: r.name,
                                                    sublabel: r.code,
                                                }))}
                                                value={regionId}
                                                onChange={(val) => setRegionId(String(val))}
                                                placeholder="Select a region…"
                                                searchPlaceholder="Search regions..."
                                                required
                                            />
                                        )}
                                        <InputError message={errors.region_id} />
                                    </div>

                                    <AdminNote />
                                </div>

                                <DialogFooter className="border-t px-6 py-4 gap-2" style={{ borderColor: C.border }}>
                                    <DialogClose asChild>
                                        <Button variant="secondary" className="h-10 rounded-xl text-sm">
                                            Cancel
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        data-test="create-team-submit"
                                        disabled={processing || regions.length === 0 || !branchName.trim() || !regionId}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: C.navy }}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Creating…
                                            </>
                                        ) : (
                                            <>
                                                <GitBranch className="h-4 w-4" />
                                                Create Branch
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                ) : (
                    <Form
                        key={String(open) + 'department'}
                        {...storeDepartment.form(hqTeam!.slug)}
                        className="flex flex-col"
                        onSuccess={() => handleOpen(false)}
                    >
                        {({ errors, processing }) => (
                            <>
                                <DialogHeader className="border-b px-6 py-5" style={{ borderColor: C.border }}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                                            style={{ backgroundColor: C.navy }}
                                        >
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-base font-bold" style={{ color: C.text }}>
                                                Add Branch or Department
                                            </DialogTitle>
                                            <DialogDescription className="text-xs" style={{ color: C.textLight }}>
                                                Create a new branch or add a department to HQ.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="space-y-5 overflow-y-auto px-6 py-5" style={{ maxHeight: '60vh' }}>
                                    <CreationTypeSelector
                                        creationType={creationType}
                                        hqTeam={hqTeam}
                                        onSelect={setCreationType}
                                    />

                                    <div className="rounded-xl px-3 py-2.5 text-xs" style={{ backgroundColor: C.navyLight, border: `1px solid ${C.navy}30` }}>
                                        <p style={{ color: C.navy }}>
                                            Department will be added to <span className="font-bold">{hqTeam?.name}</span>.
                                        </p>
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="dept-name" className="text-sm font-semibold" style={{ color: C.text }}>
                                            Department Name <span style={{ color: C.danger }}>*</span>
                                        </Label>
                                        <Input
                                            id="dept-name"
                                            name="name"
                                            data-test="create-department-name"
                                            value={deptName}
                                            onChange={(e) => setDeptName(e.target.value)}
                                            placeholder="e.g. Credit Operations"
                                            required
                                            className="h-10 rounded-xl border px-4 text-sm"
                                            style={{ borderColor: errors.name ? C.danger : C.border }}
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label htmlFor="dept-code" className="text-sm font-semibold" style={{ color: C.text }}>
                                            Department Code
                                        </Label>
                                        <Input
                                            id="dept-code"
                                            name="code"
                                            placeholder="e.g. CRO (optional — auto-generated if blank)"
                                            className="h-10 rounded-xl border px-4 text-sm uppercase"
                                            style={{ borderColor: errors.code ? C.danger : C.border }}
                                        />
                                        <InputError message={errors.code} />
                                    </div>

                                    <AdminNote />
                                </div>

                                <DialogFooter className="border-t px-6 py-4 gap-2" style={{ borderColor: C.border }}>
                                    <DialogClose asChild>
                                        <Button variant="secondary" className="h-10 rounded-xl text-sm">
                                            Cancel
                                        </Button>
                                    </DialogClose>

                                    <Button
                                        type="submit"
                                        data-test="create-department-submit"
                                        disabled={processing || !hqTeam || !deptName.trim()}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: C.navy }}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Adding…
                                            </>
                                        ) : (
                                            <>
                                                <Layers className="h-4 w-4" />
                                                Add Department
                                            </>
                                        )}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function CreationTypeSelector({
    creationType,
    hqTeam,
    onSelect,
}: {
    creationType: CreationType;
    hqTeam: HqTeamRef | null;
    onSelect: (type: CreationType) => void;
}) {
    return (
        <div className="grid gap-2">
            <Label className="text-sm font-semibold" style={{ color: C.text }}>
                What are you adding? <span style={{ color: C.danger }}>*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                    const disabled = value === 'department' && !hqTeam;
                    const active = creationType === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && onSelect(value)}
                            className="relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center text-xs transition-all disabled:cursor-not-allowed disabled:opacity-40"
                            style={{
                                borderColor: active ? C.navy : C.border,
                                backgroundColor: active ? C.navyLight : C.white,
                                color: active ? C.navy : C.textLight,
                            }}
                            title={disabled ? 'HQ must exist before adding departments' : description}
                        >
                            <Icon className="h-5 w-5" style={{ color: active ? C.navy : C.textLight }} />
                            <span className="font-bold">{label}</span>
                            {active && (
                                <span
                                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-white shadow"
                                    style={{ backgroundColor: C.navy, fontSize: 9 }}
                                >
                                    ✓
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            <p className="text-[11px]" style={{ color: C.textLight }}>
                {TYPE_OPTIONS.find((o) => o.value === creationType)?.description}
            </p>
        </div>
    );
}

function AdminNote() {
    return (
        <div className="flex gap-2 rounded-xl px-3 py-2.5 text-xs" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: C.goldDark }} />
            <p style={{ color: C.textLight }}>
                <span className="font-semibold" style={{ color: C.text }}>Admin note:</span>{' '}
                Creating a branch will <em>not</em> automatically enrol you as a branch member —
                Super Admins manage teams without being appraised as staff.
            </p>
        </div>
    );
}
