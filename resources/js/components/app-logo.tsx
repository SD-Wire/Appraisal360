import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white p-0.5 shadow-xs border border-gray-200">
                <AppLogoIcon className="size-7" />
            </div>
            <div className="ml-1.5 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-gray-900 dark:text-white">
                    {name || 'Appraise360'}
                </span>
                <span className="truncate text-[10px] font-medium text-gray-400">
                    Performance System
                </span>
            </div>
        </>
    );
}
