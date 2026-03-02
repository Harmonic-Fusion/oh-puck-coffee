import type { SVGProps } from "react";

export function BeanIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      width={24}
      height={24}
      {...props}
    >
      <ellipse
        cx="12"
        cy="12"
        rx="5.5"
        ry="8.5"
        transform="rotate(-30 12 12)"
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 6.8 C10.8 8.5, 10.8 10, 12 12 C13.2 14, 13.2 15.5, 14.5 17.2"
      />
    </svg>
  );
}
