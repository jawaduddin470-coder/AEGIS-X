import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', animate = false }) => {
  const dimensions = {
    sm: { width: 32, height: 32, textClass: 'text-lg' },
    md: { width: 48, height: 48, textClass: 'text-2xl' },
    lg: { width: 96, height: 96, textClass: 'text-4xl' },
    xl: { width: 144, height: 144, textClass: 'text-5xl' },
  }[size];

  return (
    <div className="flex flex-col items-center justify-center">
      <div 
        style={{ width: dimensions.width, height: dimensions.height }}
        className={`relative ${animate ? 'animate-logo-glow' : ''}`}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* 1. Concentric Pulse Signal Rings (Only visible or animated based on props) */}
          <circle 
            cx="50" 
            cy="52" 
            r="44" 
            stroke="#5DADE2" 
            strokeWidth="0.5" 
            strokeDasharray="4, 4" 
            opacity="0.4"
            className={animate ? 'animate-ping origin-center' : ''}
            style={{ animationDuration: '3s' }}
          />
          <circle 
            cx="50" 
            cy="52" 
            r="38" 
            stroke="#5DADE2" 
            strokeWidth="0.75" 
            opacity="0.6"
            className={animate ? 'animate-pulse' : ''}
          />
          
          {/* 2. Outer Protective Shield */}
          <path 
            d="M50 8C65 8 82 12 82 32C82 56 66 74 50 88C34 74 18 56 18 32C18 12 35 8 50 8Z" 
            fill="#1E3A5F" 
            fillOpacity="0.08"
            stroke="#1E3A5F" 
            strokeWidth="3.5" 
            strokeLinejoin="round"
          />
          
          {/* 3. Sky Line (Inside the Shield) */}
          {/* Background buildings */}
          <path 
            d="M32 68V48H40V56H46V44H54V52H60V40H68V68" 
            fill="#CBD5E1" 
            opacity="0.5"
          />
          {/* Foreground buildings */}
          <path 
            d="M26 68V54H34V60H42V50H50V58H58V46H66V62H74V68H26Z" 
            fill="#1E3A5F"
          />
          
          {/* 4. Location Pin Overlay */}
          <path 
            d="M50 28C42.8 28 37 33.8 37 41C37 49 50 63 50 63C50 63 63 49 63 41C63 33.8 57.2 28 50 28ZM50 46C47.2 46 45 43.8 45 41C45 38.2 47.2 36 50 36C52.8 36 55 38.2 55 41C55 43.8 52.8 46 50 46Z" 
            fill="#E63946" 
            className="filter drop-shadow-md"
          />
          
          {/* 5. Core Pulse Indicator (Pin Center Light) */}
          <circle 
            cx="50" 
            cy="41" 
            r="2.5" 
            fill="#FFFFFF"
            className="animate-ping"
            style={{ animationDuration: '1.5s' }}
          />
        </svg>
      </div>
    </div>
  );
};

export default Logo;
