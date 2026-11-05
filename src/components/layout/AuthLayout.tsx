import React from 'react';
import { SeedLogo } from '../SeedLogo.tsx';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#14281D] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Seed Watermark */}
      <div className="absolute right-[-60px] bottom-[-60px] opacity-10 pointer-events-none select-none text-[#14281D]">
        <SeedLogo size={420} showWordmark={false} />
      </div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center">
            <SeedLogo size={46} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#14281D]">{title}</h1>
            <p className="text-xs text-stone-600 mt-1">{subtitle}</p>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 sm:p-8 shadow-xs">
          {children}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-stone-500">
          Seed · Sistema de Gestión del Comité de Investigación Institucional
        </div>
      </div>
    </div>
  );
}
