/**
 * High-fidelity brand icons and logos for the 10 data connectors.
 */
export function ConnectorIcon({ id, className = 'w-6 h-6' }) {
  switch (id) {
    case 'oracle':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Oracle Logo">
          <rect width="48" height="48" rx="10" fill="#EA1B25" />
          <path
            d="M24 16C18.477 16 14 19.582 14 24C14 28.418 18.477 32 24 32C29.523 32 34 28.418 34 24C34 19.582 29.523 16 24 16ZM24 28.5C20.686 28.5 18 26.485 18 24C18 21.515 20.686 19.5 24 19.5C27.314 19.5 30 21.515 30 24C30 26.485 27.314 28.5 24 28.5Z"
            fill="white"
          />
        </svg>
      );

    case 'mysql':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="MySQL Logo">
          <rect width="48" height="48" rx="10" fill="#00618A" />
          <path
            d="M34 24C34 17.5 29.5 13 23 13C16.5 13 13 17 13 22C13 27 16 30 21 31C24 31.6 27 30 29 28.5L31 31.5C28 33.5 24 34.5 20 34C13 33 10 27.5 10 21C10 14.5 15 10 23 10C31.5 10 37 16 37 24C37 27 35.5 31 33 33.5L30.5 31C32.5 29 34 26.5 34 24Z"
            fill="#E48E00"
          />
          <path
            d="M20 22C20 20.9 20.9 20 22 20C23.1 20 24 20.9 24 22C24 23.1 23.1 24 22 24C20.9 24 20 23.1 20 22Z"
            fill="white"
          />
        </svg>
      );

    case 'sap':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="SAP Logo">
          <rect width="48" height="48" rx="10" fill="#008FD3" />
          <path
            d="M13 28L18 15H21L26 28H23.5L22.2 24.5H16.8L15.5 28H13ZM17.6 22.3H21.4L19.5 17.2L17.6 22.3ZM27 15H31.5C33.5 15 35 16.3 35 18.5C35 20.7 33.5 22 31.5 22H29.5V28H27V15ZM29.5 20H31.3C32.3 20 32.8 19.5 32.8 18.5C32.8 17.5 32.3 17 31.3 17H29.5V20Z"
            fill="white"
          />
        </svg>
      );

    case 'sap-hana':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="SAP HANA Logo">
          <rect width="48" height="48" rx="10" fill="#182A4A" />
          <circle cx="24" cy="24" r="14" stroke="#EAA700" strokeWidth="2.5" strokeDasharray="4 2" />
          <path
            d="M19 19L24 15L29 19L24 23L19 19Z"
            fill="#008FD3"
          />
          <path
            d="M19 25L24 29L29 25L24 21L19 25Z"
            fill="#EAA700"
          />
          <path
            d="M19 30L24 34L29 30L24 26L19 30Z"
            fill="#008FD3"
          />
        </svg>
      );

    case 'excel':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Excel Logo">
          <rect width="48" height="48" rx="10" fill="#107C41" />
          <rect x="20" y="14" width="16" height="20" rx="2" fill="white" fillOpacity="0.9" />
          <path d="M24 18H32M24 22H32M24 26H32M24 30H32" stroke="#107C41" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="12" y="16" width="16" height="16" rx="3" fill="#0B5A2F" />
          <path
            d="M16.5 20L20 24L16.5 28H18.5L21 25.1L23.5 28H25.5L22 24L25.5 20H23.5L21 22.9L18.5 20H16.5Z"
            fill="white"
          />
        </svg>
      );

    case 'snowflake':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Snowflake Logo">
          <rect width="48" height="48" rx="10" fill="#29B5E8" />
          <path
            d="M24 10V38M10 24H38M14 14L34 34M14 34L34 14M24 10L21 14M24 10L27 14M24 38L21 34M24 38L27 34M10 24L14 21M10 24L14 27M38 24L34 21M38 24L34 27"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'api':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="REST API Logo">
          <rect width="48" height="48" rx="10" fill="#493287" />
          <path
            d="M17 19L12 24L17 29M31 19L36 24L31 29M27 15L21 33"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'siemens-opcenter':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Siemens Opcenter Logo">
          <rect width="48" height="48" rx="10" fill="#00646E" />
          <path
            d="M14 28V24C14 20.686 16.686 18 20 18H28C31.314 18 34 20.686 34 24V28"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="24" cy="26" r="5" fill="#00A3A6" />
          <path d="M16 32H32M24 12V18" stroke="#00A3A6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'ms-teams':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Microsoft Teams Logo">
          <rect width="48" height="48" rx="10" fill="#505AC9" />
          <circle cx="31" cy="19" r="4" fill="#7B83EB" />
          <path d="M26 27C26 24.5 28 23 31 23C34 23 36 24.5 36 27V31H26V27Z" fill="#7B83EB" />
          <circle cx="21" cy="18" r="5" fill="white" />
          <path d="M14 28C14 25 17 23 21 23C25 23 28 25 28 28V33H14V28Z" fill="white" />
        </svg>
      );

    case 'ms-powerbi':
      return (
        <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Power BI Logo">
          <rect width="48" height="48" rx="10" fill="#F2C811" />
          <rect x="14" y="26" width="5" height="10" rx="1.5" fill="#242424" />
          <rect x="21.5" y="20" width="5" height="16" rx="1.5" fill="#242424" />
          <rect x="29" y="14" width="5" height="22" rx="1.5" fill="#242424" />
        </svg>
      );

    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
          {id?.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}

