import React from 'react';

interface FellowshipSidebarProps {
  className?: string;
}

export const FellowshipSidebar: React.FC<FellowshipSidebarProps> = ({ className = '' }) => {
  return (
    <div
      className={`relative w-full h-full min-h-[540px] md:min-h-screen flex flex-col justify-between overflow-hidden select-none shadow-2xl ${className}`}
      style={{
        background: 'linear-gradient(180deg, #102C46 0%, #153650 42%, #0E2439 72%, #081624 100%)',
      }}
    >
      {/* Soft atmospheric ambient lighting behind upper-middle section */}
      <div
        className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(62, 107, 153, 0.22) 0%, rgba(21, 54, 80, 0) 72%)',
        }}
      />

      {/* Top Branding Section: Centered Logo, Heading, Subtitle */}
      <div className="relative z-10 flex flex-col items-center text-center pt-10 md:pt-16 px-6 md:px-12">
        {/* Official Circular FTVTI ECSF Logo (Exact Asset Uploaded by User) */}
        <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 mb-6 md:mb-8 flex items-center justify-center">
          <div className="w-full h-full rounded-full p-1 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.45)] border-2 border-white/90 flex items-center justify-center">
            <img
              src="/logo-circle.png"
              alt="FTVTI ECSF Fellowship Logo"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </div>

        {/* Main Heading: 2 lines, centered, clean white typography */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug drop-shadow-sm max-w-[340px]">
          <div>Fellowship Student & Family</div>
          <div>Management System</div>
        </h1>

        {/* Subtitle: 2 lines, small, centered, understated opacity */}
        <p className="mt-3.5 md:mt-4 text-xs sm:text-sm text-white/75 font-normal leading-relaxed text-center max-w-[300px]">
          <span>Together in faith. Supporting each other.</span>
          <br />
          <span>Building the future.</span>
        </p>
      </div>

      {/* Bottom Illustration: Subtle Layered Mountain Ridge with Muted Christian Cross on Left */}
      <div className="relative z-10 mt-auto w-full pointer-events-none">
        <svg
          viewBox="0 0 300 150"
          className="w-full h-auto block"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Back Mountain Ridge */}
          <path
            d="M0 150 L0 102 C30 92 60 76 86 64 C120 78 170 110 210 104 C250 98 280 112 300 118 L300 150 Z"
            fill="#0F2436"
            opacity="0.85"
          />

          {/* Middle Mountain Ridge (Forms the summit on the left at x=86, y=64) */}
          <path
            d="M0 150 L0 112 C25 106 55 92 86 66 C105 84 140 108 180 116 C225 124 265 118 300 128 L300 150 Z"
            fill="#0A1C2C"
          />

          {/* Soft ambient glow behind the cross */}
          <circle cx="86" cy="46" r="22" fill="#426385" opacity="0.25" />

          {/* Simple Muted Blue-Gray Christian Cross atop the Left Mountain Peak */}
          <g opacity="0.88">
            {/* Vertical Beam */}
            <rect x="84.2" y="24" width="3.6" height="42" rx="0.8" fill="#507396" />
            {/* Horizontal Beam */}
            <rect x="74" y="35" width="24" height="3.6" rx="0.8" fill="#507396" />
          </g>

          {/* Foreground Darkest Ridge (creates atmospheric depth) */}
          <path
            d="M0 150 L0 134 C40 128 75 136 110 124 C160 110 210 134 260 126 C280 123 295 128 300 132 L300 150 Z"
            fill="#06121C"
            opacity="0.95"
          />
        </svg>
      </div>
    </div>
  );
};
