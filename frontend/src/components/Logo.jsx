// src/components/Logo.jsx
// Custom vector SVG reproducing the PowerMeter logo (dial gauge + gradient lightning bolt)

export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        {/* Lightning bolt gradient: Electric Blue (top) to Neon Green (bottom) */}
        <linearGradient id="boltGradient" x1="50" y1="5" x2="35" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="70%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#84CC16" />
        </linearGradient>
      </defs>

      {/* ── Top Half Arc (Electric Blue) ── */}
      <path
        d="M 12 50 A 38 38 0 0 1 88 50"
        stroke="#0099FF"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Top Arc Ticks ── */}
      {/* 135 deg */}
      <line x1="26" y1="26" x2="31" y2="31" stroke="#0099FF" strokeWidth="4" strokeLinecap="round" />
      {/* 157.5 deg */}
      <line x1="18" y1="37" x2="24" y2="39.5" stroke="#0099FF" strokeWidth="3" strokeLinecap="round" />
      {/* 112.5 deg */}
      <line x1="37" y1="18" x2="39.5" y2="24" stroke="#0099FF" strokeWidth="3" strokeLinecap="round" />
      {/* 90 deg (Center top tick) */}
      <line x1="50" y1="14" x2="50" y2="21" stroke="#0099FF" strokeWidth="4" strokeLinecap="round" />
      {/* 67.5 deg */}
      <line x1="63" y1="18" x2="60.5" y2="24" stroke="#0099FF" strokeWidth="3" strokeLinecap="round" />
      {/* 45 deg */}
      <line x1="74" y1="26" x2="69" y2="31" stroke="#0099FF" strokeWidth="4" strokeLinecap="round" />
      {/* 22.5 deg */}
      <line x1="82" y1="37" x2="76" y2="39.5" stroke="#0099FF" strokeWidth="3" strokeLinecap="round" />

      {/* Left/Right Horizontal Gap End Ticks */}
      <line x1="12" y1="50" x2="19" y2="50" stroke="#0099FF" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="88" y1="50" x2="81" y2="50" stroke="#0099FF" strokeWidth="4.5" strokeLinecap="round" />

      {/* ── Bottom Half Arc (Neon Green) ── */}
      <path
        d="M 12 56 A 38 38 0 0 0 88 56"
        stroke="#84CC16"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Central Lightning Bolt ── */}
      <polygon
        points="68,8 36,46 51,46 31,95 64,52 49,52"
        fill="url(#boltGradient)"
      />
    </svg>
  );
}
