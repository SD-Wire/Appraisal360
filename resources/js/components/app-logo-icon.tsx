import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({
    className = 'size-8',
    alt = 'Appraise360 Logo',
    ...props
}: ImgHTMLAttributes<HTMLImageElement> & { [key: string]: any }) {
    return (
        <img
            src="/images/logo.png"
            alt={alt}
            className={`object-contain ${className}`}
            {...props}
        />
    );
}
