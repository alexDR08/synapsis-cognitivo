const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  width: 24,
  height: 24,
}

export function TargetIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" />
    </svg>
  )
}

export function ChevronIcon() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CheckCircleIcon() {
  return (
    <svg {...base} width={20} height={20}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16 9.8" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg {...base} width={20} height={20}>
      <path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10" />
      <path d="M15 8.5 19 12l-4 3.5M19 12H9.5" />
    </svg>
  )
}
