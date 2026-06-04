import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export type NavIconId =
  | "overview"
  | "import"
  | "transactions"
  | "goals"
  | "assets"
  | "liabilities"
  | "net-worth"
  | "settings";

export function NavIcon({
  id,
  size = 20,
  className,
}: {
  id: NavIconId;
  size?: number;
  className?: string;
}) {
  const props = { size, className };

  switch (id) {
    case "overview":
      return (
        <Icon {...props}>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </Icon>
      );
    case "import":
      return (
        <Icon {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </Icon>
      );
    case "transactions":
      return (
        <Icon {...props}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </Icon>
      );
    case "goals":
      return (
        <Icon {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </Icon>
      );
    case "assets":
      return (
        <Icon {...props}>
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
          <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </Icon>
      );
    case "liabilities":
      return (
        <Icon {...props}>
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </Icon>
      );
    case "net-worth":
      return (
        <Icon {...props}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </Icon>
      );
    case "settings":
      return (
        <Icon {...props}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </Icon>
      );
  }
}

/** App brand mark — money bag (shown outside the nav sidebar) */
export function AppLogoIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className}>
      <path d="M10.2 2.5h3.6L12 6.2 10.2 2.5z" />
      <path d="M6 7.5h12c2.2 0 4 1.8 4 4.5v7.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 2 19.5V12c0-2.7 1.8-4.5 4-4.5z" />
      <path d="M12 11.5v5" />
      <path d="M10 14h4" />
    </Icon>
  );
}

export function SearchIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function MenuIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </Icon>
  );
}

export function PanelCloseIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9-3 3 3 3" />
    </Icon>
  );
}

export function PanelOpenIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <Icon size={size} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 15-3-3 3-3" />
    </Icon>
  );
}
