import React from 'react';

interface SeedLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export const SeedLogo: React.FC<SeedLogoProps> = ({
  className = '',
  size = 32,
  showWordmark = true,
  wordmarkClassName = 'text-xl font-bold tracking-tight text-[#14281D]',
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* 
        Aesthetic Minimalist Seed Mark:
        Two balanced, organic geometric arcs forming a seed in germination.
        The left wing represents the nurturing seed shell (Forest Green #14281D).
        The right slender crescent represents the rising new sprout (#84CC16).
      */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
        aria-label="Seed Logo"
      >
        {/* Primary organic seed vessel (Forest Green) */}
        <path
          d="M16 4C16 4 9 12.8 9 19.4C9 23.6 12.1 27 16 27C17.2 27 18.3 26.7 19.3 26.1C18.2 24.2 17.6 21.9 17.6 19.5C17.6 14.2 20.3 9.4 24.5 6.8C22.2 4.9 19.2 4 16 4Z"
          fill="#14281D"
        />
        {/* Minimalist emergent sprout leaf (Lime / Growth accent) */}
        <path
          d="M20.2 10.5C18.2 13 17 16.2 17 19.7C17 22.3 17.8 24.7 19.2 26.6C21.4 25.2 23 22.7 23 19.7C23 15.6 21.8 12.3 20.2 10.5Z"
          fill="#84CC16"
        />
        {/* Elegant geometric center nucleus */}
        <circle cx="16" cy="19.5" r="1.5" fill="#F7F6F2" />
      </svg>

      {showWordmark && (
        <span
          className={wordmarkClassName}
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
        >
          Seed
        </span>
      )}
    </div>
  );
};
