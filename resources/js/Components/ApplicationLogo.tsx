import { SVGAttributes } from 'react';

export default function ApplicationLogo(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M10.5 22v-9.5L6.5 7V3h11v4l-4 5.5V22h-3ZM12 12.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM8.625 7h6.75L16.25 5h-8.5l.875 2Z" />
        </svg>
    );
}
