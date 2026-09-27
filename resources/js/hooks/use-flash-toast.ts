import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { showToast } from '@/lib/swal';
import type { FlashToast } from '@/types/ui';

type FlashProps = {
    success?: string | null;
    error?: string | null;
    toast?: FlashToast | null;
    [key: string]: unknown;
};

function showFlash(flash: FlashProps | undefined | null, lastKey: React.MutableRefObject<string | null>) {
    if (!flash) return;

    if (flash.toast && (flash.toast as FlashToast).type && (flash.toast as FlashToast).message) {
        const data = flash.toast as FlashToast;
        const key = `toast-${data.type}-${data.message}`;
        if (lastKey.current !== key) {
            lastKey.current = key;
            const iconMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
                success: 'success',
                error: 'error',
                warning: 'warning',
                info: 'info',
            };
            showToast(data.message, iconMap[data.type] ?? 'info');
        }
        return;
    }

    if (flash.success) {
        const key = `success-${flash.success}`;
        if (lastKey.current !== key) {
            lastKey.current = key;
            showToast(flash.success, 'success');
        }
    } else if (flash.error) {
        const key = `error-${flash.error}`;
        if (lastKey.current !== key) {
            lastKey.current = key;
            showToast(flash.error, 'error');
        }
    }
}

export function useFlashToast(): void {
    const lastFlashRef = useRef<string | null>(null);

    useEffect(() => {
        // Fire on initial page load
        const initialFlash = ((router as any).page?.props as { flash?: FlashProps })?.flash;
        showFlash(initialFlash, lastFlashRef);

        // Fire after every Inertia navigation (visit finish)
        const unsubFinish = router.on('finish', () => {
            const flash = ((router as any).page?.props as { flash?: FlashProps })?.flash;
            showFlash(flash, lastFlashRef);

            // Also surface validation errors
            const errors = ((router as any).page?.props as { errors?: Record<string, string> })?.errors;
            if (errors) {
                const keys = Object.keys(errors);
                if (keys.length > 0) {
                    const firstError = errors[keys[0]];
                    if (firstError) {
                        const key = `error-prop-${firstError}`;
                        if (lastFlashRef.current !== key) {
                            lastFlashRef.current = key;
                            showToast(firstError, 'error');
                        }
                    }
                }
            }
        });

        return () => {
            unsubFinish();
        };
    }, []);
}

