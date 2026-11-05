import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-stone-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-stone-400 pointer-events-none shrink-0">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full text-xs rounded-lg border bg-[#F7F6F2] transition-colors focus:bg-white focus:outline-none focus:ring-1 ${
              icon ? 'pl-9' : 'pl-3'
            } pr-3 py-2 text-[#14281D] placeholder:text-stone-400 ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                : 'border-[#E5E3DC] focus:border-[#14281D] focus:ring-[#14281D]'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
        {!error && helperText && <p className="text-[11px] text-stone-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
