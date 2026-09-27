import Swal from 'sweetalert2';

export const C = {
    orange: '#EA580C',
    orangeLight: '#FED7AA',
    orangeDark: '#C2410C',
    green: '#15803D',
    greenLight: '#DCFCE7',
    navy: '#1E3A5F',
    navyLight: '#EFF6FF',
    danger: '#DC2626',
    gray: '#6B7280',
    warn: '#D97706',
};

// Top-end Toast notification mixin
export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    },
});

export const showToast = (
    title: string,
    icon: 'success' | 'error' | 'warning' | 'info' = 'success',
) => {
    return Toast.fire({
        icon,
        title,
    });
};

export interface ConfirmActionOptions {
    title: string;
    text?: string;
    html?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    icon?: 'warning' | 'question' | 'error' | 'info';
    confirmButtonColor?: string;
    cancelButtonColor?: string;
    danger?: boolean;
}

export const confirmAction = async (opts: ConfirmActionOptions): Promise<boolean> => {
    const isDanger = opts.danger ?? false;
    const res = await Swal.fire({
        title: opts.title,
        text: opts.text,
        html: opts.html,
        icon: opts.icon ?? (isDanger ? 'warning' : 'question'),
        showCancelButton: true,
        confirmButtonText: opts.confirmButtonText ?? (isDanger ? 'Yes, proceed' : 'Confirm'),
        cancelButtonText: opts.cancelButtonText ?? 'Cancel',
        confirmButtonColor: opts.confirmButtonColor ?? (isDanger ? C.danger : C.green),
        cancelButtonColor: opts.cancelButtonColor ?? C.gray,
        reverseButtons: true,
        focusCancel: isDanger,
    });

    return res.isConfirmed;
};

export { Swal };
export default Swal;
