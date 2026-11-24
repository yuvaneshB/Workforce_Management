import React from 'react';

/**
 * High-fidelity 3D-style illustrated SVG icons for the System Architecture Pipeline.
 * Layered isometric geometry, linear/radial gradients, rim highlights, and soft drop shadows.
 */

// ==========================================
// STAGE 1: SOURCE SYSTEM ICONS (Rose / Red)
// ==========================================

export function Erp3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="erpTopGrad" x1="12" y1="6" x2="36" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="0.6" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="erpSideGrad1" x1="8" y1="12" x2="40" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E11D48" />
          <stop offset="0.5" stopColor="#BE123C" />
          <stop offset="1" stopColor="#881337" />
        </linearGradient>
        <linearGradient id="erpSideGrad2" x1="8" y1="22" x2="40" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BE123C" />
          <stop offset="0.5" stopColor="#9F1239" />
          <stop offset="1" stopColor="#4C0519" />
        </linearGradient>
        <linearGradient id="erpSideGrad3" x1="8" y1="32" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9F1239" />
          <stop offset="0.5" stopColor="#881337" />
          <stop offset="1" stopColor="#30040F" />
        </linearGradient>
        <filter id="erpShadow" x="4" y="6" width="40" height="40" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#881337" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#erpShadow)">
        {/* Tier 3 (Bottom) */}
        <path d="M8 32C8 28.5 15.2 26 24 26C32.8 26 40 28.5 40 32V38C40 41.5 32.8 44 24 44C15.2 44 8 41.5 8 38V32Z" fill="url(#erpSideGrad3)" />
        <ellipse cx="24" cy="32" rx="16" ry="5.5" fill="#BE123C" fillOpacity="0.7" />

        {/* Tier 2 (Middle) */}
        <path d="M8 21C8 17.5 15.2 15 24 15C32.8 15 40 17.5 40 21V27C40 30.5 32.8 33 24 33C15.2 33 8 30.5 8 27V21Z" fill="url(#erpSideGrad2)" />
        <ellipse cx="24" cy="21" rx="16" ry="5.5" fill="#E11D48" fillOpacity="0.65" />

        {/* Tier 1 (Top) */}
        <path d="M8 10C8 6.5 15.2 4 24 4C32.8 4 40 6.5 40 10V16C40 19.5 32.8 22 24 22C15.2 22 8 19.5 8 16V10Z" fill="url(#erpSideGrad1)" />
        <ellipse cx="24" cy="10" rx="16" ry="5.5" fill="url(#erpTopGrad)" stroke="#FFE4E6" strokeWidth="0.8" />

        {/* Database indicator highlights */}
        <circle cx="34" cy="11" r="1.5" fill="#A7F3D0" />
        <circle cx="34" cy="22" r="1.5" fill="#A7F3D0" />
        <circle cx="34" cy="33" r="1.5" fill="#FDE047" />
        {/* Front reflective beam */}
        <path d="M14 10V38" stroke="white" strokeWidth="1" strokeOpacity="0.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Mes3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="mesBaseGrad" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BE123C" />
          <stop offset="0.6" stopColor="#881337" />
          <stop offset="1" stopColor="#4C0519" />
        </linearGradient>
        <linearGradient id="mesFaceGrad" x1="10" y1="12" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#9F1239" />
        </linearGradient>
        <filter id="mesShadow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#881337" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#mesShadow)">
        {/* 3D Server chassis */}
        <rect x="7" y="8" width="34" height="32" rx="6" fill="url(#mesBaseGrad)" stroke="#FDA4AF" strokeWidth="0.8" />
        {/* Front Bay 1 */}
        <rect x="11" y="12" width="26" height="6.5" rx="2.5" fill="url(#mesFaceGrad)" />
        <circle cx="15" cy="15.25" r="1.25" fill="#34D399" />
        <rect x="19" y="14.25" width="14" height="2" rx="1" fill="#FFE4E6" fillOpacity="0.7" />

        {/* Front Bay 2 */}
        <rect x="11" y="21" width="26" height="6.5" rx="2.5" fill="url(#mesFaceGrad)" />
        <circle cx="15" cy="24.25" r="1.25" fill="#38BDF8" />
        <rect x="19" y="23.25" width="14" height="2" rx="1" fill="#FFE4E6" fillOpacity="0.7" />

        {/* Front Bay 3 */}
        <rect x="11" y="30" width="26" height="6.5" rx="2.5" fill="url(#mesFaceGrad)" />
        <circle cx="15" cy="33.25" r="1.25" fill="#FBBF24" />
        {/* Activity pulse line */}
        <path d="M19 33.25H23L25 31L27 35.5L29 33.25H33" stroke="#FDE047" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function Skills3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="shieldGrad" x1="12" y1="4" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="0.4" stopColor="#E11D48" />
          <stop offset="1" stopColor="#881337" />
        </linearGradient>
        <linearGradient id="goldStar" x1="18" y1="14" x2="30" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="badgeShadow" x="6" y="4" width="36" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#881337" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#badgeShadow)">
        {/* Ribbon Tail Left */}
        <path d="M14 30L9 42L17 38L21 42L19 30" fill="#9F1239" />
        {/* Ribbon Tail Right */}
        <path d="M34 30L39 42L31 38L27 42L29 30" fill="#881337" />
        {/* 3D Shield */}
        <path
          d="M24 6L38 11V22C38 31.5 24 38 24 38C24 38 10 31.5 10 22V11L24 6Z"
          fill="url(#shieldGrad)"
          stroke="#FFE4E6"
          strokeWidth="1"
        />
        {/* Inner rim highlight */}
        <path
          d="M24 9.5L34.5 13.5V22C34.5 29.5 24 34.5 24 34.5C24 34.5 13.5 29.5 13.5 22V13.5L24 9.5Z"
          stroke="white"
          strokeOpacity="0.45"
          strokeWidth="0.8"
        />
        {/* 3D Gold Star */}
        <path
          d="M24 14L26.5 19.5L32.5 20.2L28 24.3L29.3 30.2L24 27.2L18.7 30.2L20 24.3L15.5 20.2L21.5 19.5L24 14Z"
          fill="url(#goldStar)"
          stroke="#FEF08A"
          strokeWidth="0.5"
        />
      </g>
    </svg>
  );
}

export function NeonDb3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="neonCubeTop" x1="12" y1="6" x2="36" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id="neonCubeLeft" x1="8" y1="18" x2="24" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#BE123C" />
          <stop offset="1" stopColor="#4C0519" />
        </linearGradient>
        <linearGradient id="neonCubeRight" x1="24" y1="18" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9F1239" />
          <stop offset="1" stopColor="#30040F" />
        </linearGradient>
        <filter id="neonShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#06B6D4" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#neonShadow)">
        {/* Isometric Cube Top Face */}
        <polygon points="24,6 39,15 24,24 9,15" fill="url(#neonCubeTop)" stroke="#FFE4E6" strokeWidth="0.8" />
        {/* Isometric Cube Left Face */}
        <polygon points="9,15 24,24 24,40 9,31" fill="url(#neonCubeLeft)" />
        {/* Isometric Cube Right Face */}
        <polygon points="24,24 39,15 39,31 24,40" fill="url(#neonCubeRight)" />

        {/* Glowing Neon Cyan Grid Accent */}
        <path d="M9 15L24 24L39 15" stroke="#22D3EE" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M24 24V40" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 20L14 34" stroke="#06B6D4" strokeWidth="0.9" strokeDasharray="2 2" />
        <path d="M34 20L34 34" stroke="#06B6D4" strokeWidth="0.9" strokeDasharray="2 2" />
        {/* Center Neon Pulse Dot */}
        <circle cx="24" cy="24" r="2.2" fill="#67E8F9" />
      </g>
    </svg>
  );
}

// ==========================================
// STAGE 2: API GATEWAY ICONS (Azure / Blue)
// ==========================================

export function FastApi3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="apiHexGrad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.4" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="16" y1="8" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <filter id="apiShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1D4ED8" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#apiShadow)">
        {/* 3D Hexagonal Gateway Portal */}
        <polygon
          points="24,5 39,14 39,32 24,41 9,32 9,14"
          fill="url(#apiHexGrad)"
          stroke="#BFDBFE"
          strokeWidth="1.2"
        />
        {/* Inner Bevel */}
        <polygon
          points="24,9 35,16 35,30 24,37 13,30 13,16"
          fill="#1D4ED8"
          stroke="#93C5FD"
          strokeWidth="0.7"
          strokeOpacity="0.6"
        />
        {/* 3D Dynamic Lightning Bolt */}
        <path
          d="M27 8L15 24H25L21 40L33 22H23L27 8Z"
          fill="url(#boltGrad)"
          stroke="#FEF08A"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

export function SqlAlchemy3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="layerGrad1" x1="10" y1="8" x2="38" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="layerGrad2" x1="10" y1="18" x2="38" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="layerGrad3" x1="10" y1="28" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <filter id="sqlShadow" x="4" y="6" width="40" height="38" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#1D4ED8" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#sqlShadow)">
        {/* Bottom Layer */}
        <polygon points="24,28 40,34 24,40 8,34" fill="url(#layerGrad3)" stroke="#1E3A8A" strokeWidth="0.8" />
        {/* Middle Layer */}
        <polygon points="24,18 40,24 24,30 8,24" fill="url(#layerGrad2)" stroke="#1D4ED8" strokeWidth="0.8" />
        {/* Top Layer */}
        <polygon points="24,8 40,14 24,20 8,14" fill="url(#layerGrad1)" stroke="#DBEAFE" strokeWidth="1" />
        {/* Connector Column Beams */}
        <line x1="12" y1="16" x2="12" y2="33" stroke="#60A5FA" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="36" y1="16" x2="36" y2="33" stroke="#60A5FA" strokeWidth="1.2" strokeOpacity="0.7" />
        <line x1="24" y1="20" x2="24" y2="38" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Sse3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="towerGrad" x1="18" y1="16" x2="30" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="0.6" stopColor="#2563EB" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
        <filter id="sseShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#2563EB" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#sseShadow)">
        {/* Broadcast Tower Structure */}
        <path d="M21 42L24 16L27 42" stroke="url(#towerGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="36" x2="30" y2="36" stroke="#93C5FD" strokeWidth="1.8" />
        <line x1="20" y1="28" x2="28" y2="28" stroke="#93C5FD" strokeWidth="1.8" />

        {/* 3D Pulse Node Orb */}
        <circle cx="24" cy="14" r="4.5" fill="#3B82F6" stroke="#DBEAFE" strokeWidth="1.2" />
        <circle cx="24" cy="14" r="2" fill="#FFFFFF" />

        {/* Concentric Signal Wave Arcs */}
        <path d="M16 11C18.2 8.5 21 7 24 7C27 7 29.8 8.5 32 11" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 7C14.5 3.8 19 2 24 2C29 2 33.5 3.8 37 7" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2" />
        <path d="M7 23C7 19.5 8.2 16.2 10.5 13.5" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M41 23C41 19.5 39.8 16.2 37.5 13.5" stroke="#38BDF8" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ==========================================
// STAGE 3: MULTI-AGENT CORE (Purple)
// ==========================================

export function Orchestrator3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="orchCoreGrad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="0.4" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4C1D95" />
        </linearGradient>
        <filter id="orchShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#orchShadow)">
        {/* Connecting Data Neural Filaments */}
        <line x1="24" y1="24" x2="10" y2="12" stroke="#E9D5FF" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="24" y1="24" x2="38" y2="12" stroke="#E9D5FF" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="24" y1="24" x2="24" y2="42" stroke="#E9D5FF" strokeWidth="1.2" strokeDasharray="2 2" />

        {/* Central 3D Orchestrator Brain Polyhedron */}
        <polygon points="24,6 38,15 38,33 24,42 10,33 10,15" fill="url(#orchCoreGrad)" stroke="#F3E8FF" strokeWidth="1.2" />
        {/* Core faceted highlights */}
        <polygon points="24,12 33,18 33,30 24,36 15,30 15,18" fill="#6D28D9" stroke="#E9D5FF" strokeWidth="0.8" />
        <polygon points="24,18 29,21 29,27 24,30 19,27 19,21" fill="#C084FC" />

        {/* 3 Surrounding Satellite Processing Nodes */}
        <circle cx="10" cy="12" r="3.2" fill="#A855F7" stroke="#FFFFFF" strokeWidth="1" />
        <circle cx="38" cy="12" r="3.2" fill="#A855F7" stroke="#FFFFFF" strokeWidth="1" />
        <circle cx="24" cy="42" r="3.2" fill="#EC4899" stroke="#FFFFFF" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function SpecialistAgents3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="agentNode1" x1="16" y1="12" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C084FC" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <filter id="agentsShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#6D28D9" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#agentsShadow)">
        {/* Cluster Interconnect Web */}
        <polygon points="24,10 37,17 37,31 24,38 11,31 11,17" stroke="#DDD6FE" strokeWidth="1" strokeOpacity="0.6" fill="none" />
        <line x1="24" y1="24" x2="24" y2="10" stroke="#DDD6FE" strokeWidth="1" />
        <line x1="24" y1="24" x2="37" y2="17" stroke="#DDD6FE" strokeWidth="1" />
        <line x1="24" y1="24" x2="37" y2="31" stroke="#DDD6FE" strokeWidth="1" />
        <line x1="24" y1="24" x2="24" y2="38" stroke="#DDD6FE" strokeWidth="1" />
        <line x1="24" y1="24" x2="11" y2="31" stroke="#DDD6FE" strokeWidth="1" />
        <line x1="24" y1="24" x2="11" y2="17" stroke="#DDD6FE" strokeWidth="1" />

        {/* 6 Peripheral Agent Spheres */}
        <circle cx="24" cy="10" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="37" cy="17" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="37" cy="31" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="24" cy="38" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="11" cy="31" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cx="11" cy="17" r="3.5" fill="#8B5CF6" stroke="#FFFFFF" strokeWidth="0.8" />

        {/* Central Master Coordinator Node (The 7th) */}
        <circle cx="24" cy="24" r="5.5" fill="url(#agentNode1)" stroke="#F3E8FF" strokeWidth="1.2" />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export function DomoAi3DIcon({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="chatBubbleGrad" x1="8" y1="6" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D8B4FE" />
          <stop offset="0.5" stopColor="#9333EA" />
          <stop offset="1" stopColor="#581C87" />
        </linearGradient>
        <linearGradient id="sparkleGrad" x1="26" y1="8" x2="38" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="domoShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#7E22CE" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#domoShadow)">
        {/* 3D Chat Speech Bubble */}
        <path
          d="M8 12C8 7.58 11.58 4 16 4H32C36.42 4 40 7.58 40 12V24C40 28.42 36.42 32 32 32H20L11 39V32H16C16 32 8 32 8 24V12Z"
          fill="url(#chatBubbleGrad)"
          stroke="#F3E8FF"
          strokeWidth="1"
        />
        {/* Chat message lines */}
        <rect x="14" y="12" width="16" height="2.5" rx="1.25" fill="#F5D0FE" />
        <rect x="14" y="18" width="10" height="2.5" rx="1.25" fill="#F5D0FE" />

        {/* 3D AI Magic Sparkle 1 */}
        <path
          d="M34 6C34 9 37 11 39 11C37 11 34 13 34 16C34 13 31 11 29 11C31 11 34 9 34 6Z"
          fill="url(#sparkleGrad)"
          stroke="#FEF08A"
          strokeWidth="0.5"
        />
        {/* 3D AI Magic Sparkle 2 */}
        <path
          d="M38 18C38 19.5 39.5 20.5 40.5 20.5C39.5 20.5 38 21.5 38 23C38 21.5 36.5 20.5 35.5 20.5C36.5 20.5 38 19.5 38 18Z"
          fill="#FDE047"
        />
      </g>
    </svg>
  );
}

// ==========================================
// STAGE 4: GOVERNANCE (Emerald / Green)
// ==========================================

export function HumanApproval3DIcon({ className = 'w-10 h-10' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="shieldEmerald" x1="12" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="0.4" stopColor="#059669" />
          <stop offset="1" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="checkGlow" x1="16" y1="18" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#A7F3D0" />
        </linearGradient>
        <filter id="humanShadow" x="4" y="3" width="40" height="43" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3" floodColor="#047857" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#humanShadow)">
        {/* 3D Heavy Emerald Shield */}
        <path
          d="M24 5L39 10.5V23.5C39 33.5 24 41 24 41C24 41 9 33.5 9 23.5V10.5L24 5Z"
          fill="url(#shieldEmerald)"
          stroke="#D1FAE5"
          strokeWidth="1.2"
        />
        {/* Inner Bevel Rim */}
        <path
          d="M24 8.5L35.5 13V23C35.5 31.5 24 37.5 24 37.5C24 37.5 12.5 31.5 12.5 23V13L24 8.5Z"
          stroke="#6EE7B7"
          strokeWidth="0.8"
          strokeOpacity="0.7"
        />
        {/* Human Silhouette Head */}
        <circle cx="24" cy="17" r="4.2" fill="#ECFDF5" />
        {/* Human Silhouette Shoulders */}
        <path d="M16 28C16 24.5 19.5 23 24 23C28.5 23 32 24.5 32 28" stroke="#ECFDF5" strokeWidth="2.2" strokeLinecap="round" />

        {/* Embossed 3D Verification Checkmark Badge */}
        <circle cx="31" cy="30" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.2" />
        <path d="M28 30L30 32L34 27.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// ==========================================
// STAGE 5: CLOSED-LOOP (Amber / Orange)
// ==========================================

export function ShortageMitigation3DIcon({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="amberClockGrad" x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="0.4" stopColor="#D97706" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <filter id="shortageShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#B45309" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#shortageShadow)">
        {/* Circular Clock Dial */}
        <circle cx="24" cy="24" r="17" fill="url(#amberClockGrad)" stroke="#FEF3C7" strokeWidth="1.2" />
        <circle cx="24" cy="24" r="14" fill="#B45309" stroke="#FDE68A" strokeWidth="0.8" strokeOpacity="0.6" />

        {/* Clock Hands */}
        <line x1="24" y1="24" x2="24" y2="15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="24" x2="31" y2="24" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />

        {/* Auto-Dispatch Dynamic Rotation Arrow */}
        <path
          d="M34 11C37 14 39 18 39 23"
          stroke="#FEF08A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <polygon points="40,11 41,16 36,15" fill="#FEF08A" />

        {/* Worker Dispatch Mini Badge */}
        <circle cx="34" cy="33" r="5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1" />
        <circle cx="34" cy="31.5" r="1.5" fill="#FFFFFF" />
        <path d="M31 36C31 34 32.5 33.5 34 33.5C35.5 33.5 37 34 37 36" stroke="#FFFFFF" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

export function CostContainment3DIcon({ className = 'w-9 h-9' }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="costVaultGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCD34D" />
          <stop offset="0.5" stopColor="#D97706" />
          <stop offset="1" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="downArrowGrad" x1="20" y1="12" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <filter id="costShadow" x="4" y="4" width="40" height="42" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#B45309" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#costShadow)">
        {/* Isometric 3D Platform Base */}
        <polygon points="24,6 40,15 24,24 8,15" fill="#FDE68A" stroke="#FEF3C7" strokeWidth="1" />
        <polygon points="8,15 24,24 24,37 8,28" fill="#D97706" />
        <polygon points="24,24 40,15 40,28 24,37" fill="#92400E" />

        {/* 3D Downward Cost Containment Arrow */}
        <path
          d="M16 14L28 23V17L34 27L22 28L25 24L16 17L16 14Z"
          fill="url(#downArrowGrad)"
          stroke="#D1FAE5"
          strokeWidth="0.8"
        />

        {/* Gold Coin Stack on Platform */}
        <ellipse cx="16" cy="34" rx="4.5" ry="2" fill="#FDE047" stroke="#B45309" strokeWidth="0.6" />
        <ellipse cx="16" cy="31" rx="4.5" ry="2" fill="#FBBF24" stroke="#B45309" strokeWidth="0.6" />
        <ellipse cx="16" cy="28" rx="4.5" ry="2" fill="#FDE047" stroke="#FEF3C7" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

// ==========================================
// 5 DISTINCT 3D STAGE HEADER ICONS
// ==========================================

export function Stage1HeaderIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="hdr1Grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <path d="M3 21V7L10 11V7L17 11V3L21 5V21H3Z" fill="url(#hdr1Grad)" stroke="#FFE4E6" strokeWidth="0.8" />
      <circle cx="7" cy="17" r="1.2" fill="#FFE4E6" />
      <circle cx="13" cy="17" r="1.2" fill="#FFE4E6" />
      <circle cx="19" cy="17" r="1.2" fill="#FFE4E6" />
    </svg>
  );
}

export function Stage2HeaderIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="hdr2Grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="url(#hdr2Grad)" stroke="#DBEAFE" strokeWidth="0.8" />
      <path d="M13 5L8 13H13L11 19L17 11H12L13 5Z" fill="#FDE047" />
    </svg>
  );
}

export function Stage3HeaderIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="hdr3Grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DDD6FE" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="6" fill="url(#hdr3Grad)" stroke="#F3E8FF" strokeWidth="1" />
      <circle cx="12" cy="4" r="2" fill="#C084FC" />
      <circle cx="20" cy="12" r="2" fill="#C084FC" />
      <circle cx="12" cy="20" r="2" fill="#C084FC" />
      <circle cx="4" cy="12" r="2" fill="#C084FC" />
      <line x1="12" y1="6" x2="12" y2="8" stroke="#E9D5FF" strokeWidth="1" />
      <line x1="16" y1="12" x2="18" y2="12" stroke="#E9D5FF" strokeWidth="1" />
      <line x1="12" y1="16" x2="12" y2="18" stroke="#E9D5FF" strokeWidth="1" />
      <line x1="6" y1="12" x2="8" y2="12" stroke="#E9D5FF" strokeWidth="1" />
    </svg>
  );
}

export function Stage4HeaderIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="hdr4Grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6EE7B7" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path d="M12 2L20 5.5V12C20 17 12 21 12 21C12 21 4 17 4 12V5.5L12 2Z" fill="url(#hdr4Grad)" stroke="#D1FAE5" strokeWidth="0.8" />
      <path d="M9 11.5L11 13.5L15 9.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stage5HeaderIcon({ className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="hdr5Grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="8" fill="url(#hdr5Grad)" stroke="#FEF3C7" strokeWidth="0.8" />
      <path d="M12 7V12L15 15" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 7C18.5 8.5 19.5 10.5 19.5 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

