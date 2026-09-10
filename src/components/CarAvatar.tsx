import React from 'react';
import { CAR_COLORS } from '../data/texts';
import type { CarColorId } from '../types/game';

interface CarAvatarProps {
  colorId: CarColorId;
  size?: 'sm' | 'md' | 'lg';
  isMoving?: boolean;
  className?: string;
}

export const CarAvatar: React.FC<CarAvatarProps> = ({
  colorId,
  size = 'md',
  isMoving = false,
  className = ''
}) => {
  const colorScheme = CAR_COLORS.find(c => c.id === colorId) || CAR_COLORS[0];

  const dimensions = {
    sm: { width: 44, height: 24 },
    md: { width: 64, height: 32 },
    lg: { width: 90, height: 44 }
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Exhaust Nitro Flame Animation if moving */}
      {isMoving && (
        <div 
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-4 h-2 rounded-full animate-pulse blur-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorScheme.primary})`,
            boxShadow: `0 0 10px ${colorScheme.glow}`
          }}
        />
      )}

      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 120 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-md transition-all duration-300 transform hover:scale-105"
        style={{
          filter: `drop-shadow(0 0 8px ${colorScheme.glow})`
        }}
      >
        {/* Car Body Base Gradient */}
        <defs>
          <linearGradient id={`car-grad-${colorId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorScheme.primary} />
            <stop offset="100%" stopColor={colorScheme.secondary} />
          </linearGradient>

          <linearGradient id="glass-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Rear Wing / Spoiler */}
        <path d="M4 18 H20 V24 H4 Z" fill={colorScheme.secondary} />
        <path d="M8 24 L12 36 H18 L14 24 Z" fill="#0F172A" />

        {/* Main Aerodynamic Car Chassis */}
        <path
          d="M16 36 C18 24, 35 16, 55 16 H75 C92 16, 106 28, 114 36 C118 40, 118 44, 114 46 L104 48 C98 50, 25 50, 16 46 Z"
          fill={`url(#car-grad-${colorId})`}
        />

        {/* Cabin Cockpit & Windshield */}
        <path
          d="M42 20 C48 14, 70 14, 76 20 L84 32 H34 Z"
          fill="url(#glass-grad)"
          stroke={colorScheme.primary}
          strokeWidth="1.5"
        />

        {/* Side Racing Stripes */}
        <path d="M30 36 H90 L85 40 H25 Z" fill="#FFFFFF" fillOpacity="0.25" />

        {/* Front Headlights Glowing */}
        <circle cx="112" cy="40" r="3" fill="#FFFFFF" />
        <circle cx="112" cy="40" r="5" fill={colorScheme.primary} fillOpacity="0.6" />

        {/* Front & Rear Wheels */}
        <g id="wheels">
          {/* Rear Wheel */}
          <circle cx="34" cy="48" r="10" fill="#0F172A" stroke="#334155" strokeWidth="2" />
          <circle cx="34" cy="48" r="5" fill="#64748B" />
          <circle cx="34" cy="48" r="2" fill={colorScheme.primary} />

          {/* Front Wheel */}
          <circle cx="92" cy="48" r="10" fill="#0F172A" stroke="#334155" strokeWidth="2" />
          <circle cx="92" cy="48" r="5" fill="#64748B" />
          <circle cx="92" cy="48" r="2" fill={colorScheme.primary} />
        </g>
      </svg>
    </div>
  );
};
