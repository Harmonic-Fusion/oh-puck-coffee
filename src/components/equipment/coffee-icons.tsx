import { EquipmentType } from "@/shared/equipment/schema";

function GrinderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 3L10 7H14L17 3" />
      <rect x="8" y="7" width="8" height="7" rx="1" />
      <line x1="9" y1="10" x2="15" y2="10" />
      <path d="M16 8H20" />
      <circle cx="20" cy="8" r="1" />
      <rect x="8" y="14" width="8" height="5" rx="1" />
      <line x1="7" y1="19" x2="17" y2="19" />
    </svg>
  );
}

function  MachineIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M10 17V19H14V17" />
      <path d="M9 19H15V21H9Z" />
      <line x1="4" y1="21" x2="20" y2="21" />
      <circle cx="17" cy="7" r="1.5" />
      <circle cx="10" cy="7" r="2" />
    </svg>
  );
}

function  ToolIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 3H16V5C16 6.1 15.1 7 14 7H10C8.9 7 8 6.1 8 5V3Z" />
      <line x1="12" y1="7" x2="12" y2="12" />
      <line x1="12" y1="12" x2="8" y2="20" />
      <line x1="12" y1="12" x2="10.5" y2="21" />
      <line x1="12" y1="12" x2="13.5" y2="21" />
      <line x1="12" y1="12" x2="16" y2="20" />
    </svg>
  );
}

function  KettleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 10C6 7 8 5 12 5C16 5 18 7 18 10V18C18 19.1 17.1 20 16 20H8C6.9 20 6 19.1 6 18V10Z" />
      <path d="M6 10C6 10 4 9 4 7C4 5 5 4 6 4" />
      <path d="M18 9C19.5 9 21 10 21 12C21 14 19.5 15 18 15" />
      <line x1="8" y1="5" x2="16" y2="5" />
      <circle cx="12" cy="3.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function  ScaleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="3" />
      <rect x="4" y="7" width="16" height="12" rx="1" />
      <rect x="7" y="10" width="10" height="4" rx="0.5" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  );
}

function  PourOverIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 4H18L14 14H10L6 4Z" />
      <line x1="9" y1="6" x2="11" y2="12" />
      <line x1="15" y1="6" x2="13" y2="12" />
      <line x1="12" y1="14" x2="12" y2="16" />
      <path d="M8 16H16V21C16 21.5 15.5 22 15 22H9C8.5 22 8 21.5 8 21V16Z" />
    </svg>
  );
}

function  FrenchPressIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="10" y1="2" x2="14" y2="2" />
      <rect x="7" y="6" width="10" height="14" rx="1" />
      <path d="M17 9C19 9 20 10.5 20 12.5C20 14.5 19 16 17 16" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="6" y1="20" x2="18" y2="20" />
    </svg>
  );
}

function  MokaPotIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 13V19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19V13" />
      <path d="M9 13V9L10 6H14L15 9V13" />
      <path d="M10 6H14V5H10V6Z" />
      <circle cx="12" cy="3.5" r="0.75" fill="currentColor" />
      <path d="M17 14C19 14 20 16 20 17.5C20 19 19 20 17 20" />
      <path d="M7 13H17" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  );
}

function  ColdBrewIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 6V19C7 20.1 7.9 21 9 21H15C16.1 21 17 20.1 17 19V6" />
      <rect x="6" y="4" width="12" height="2" rx="0.5" />
      <line x1="8" y1="4" x2="16" y2="4" />
      <path d="M14 2L14 4L13 8L13 16" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </svg>
  );
}


export function EquipmentIcon({
  type,
  className,
}: {
  type: EquipmentType;
  className?: string;
}) {
  switch (type) {
    case "grinder":
      return <GrinderIcon className={className} />;
    case "machine":
      return <MachineIcon className={className} />;
    case "tool":
      return <ToolIcon className={className} />;
    case "kettle":
      return <KettleIcon className={className} />;
    case "scale":
      return <ScaleIcon className={className} />;
    case "pour_over":
      return <PourOverIcon className={className} />;
    case "french_press":
      return <FrenchPressIcon className={className} />;
    case "moka_pot":
      return <MokaPotIcon className={className} />;
    case "cold_brew":
      return <ColdBrewIcon className={className} />;
    default:
      return null;
  }
}