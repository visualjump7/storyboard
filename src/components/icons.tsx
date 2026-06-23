/**
 * Inline SVG icons matching the design. Stroked icons use `currentColor`
 * so color comes from the surrounding text color.
 */
type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function Stroke({
  size = 16,
  className,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function GridIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function Plus({ size = 14, className }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  );
}

export function ScriptLines({ size = 14, className }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={2}>
      <path d="M4 4h16M4 9h16M4 14h10M4 19h7" />
    </Stroke>
  );
}

export function ChevronLeft({ size = 16, className }: IconProps) {
  return (
    <Stroke size={size} className={className}>
      <path d="M15 18l-6-6 6-6" />
    </Stroke>
  );
}

export function ChevronRight({ size = 16, className }: IconProps) {
  return (
    <Stroke size={size} className={className}>
      <path d="M9 18l6-6-6-6" />
    </Stroke>
  );
}

export function Close({ size = 16, className }: IconProps) {
  return (
    <Stroke size={size} className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Stroke>
  );
}

export function ChevronDown({ size = 16, className }: IconProps) {
  return (
    <Stroke size={size} className={className}>
      <path d="M6 9l6 6 6-6" />
    </Stroke>
  );
}

export function Pencil({ size = 13, className }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={1.8}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Stroke>
  );
}

export function ImagePlaceholder({ size = 26, className }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={1.6}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </Stroke>
  );
}

export function Upload({ size = 34, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={strokeWidth}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </Stroke>
  );
}

export function Download({ size = 13, className, strokeWidth = 1.8 }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={strokeWidth}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Stroke>
  );
}

export function Trash({ size = 13, className }: IconProps) {
  return (
    <Stroke size={size} className={className}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </Stroke>
  );
}

export function SignOut({ size = 15, className }: IconProps) {
  return (
    <Stroke size={size} className={className} strokeWidth={2}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Stroke>
  );
}

export function Spinner({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
