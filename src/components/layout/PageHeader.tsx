import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageHeader({
  title,
  description,
  badge,
  icon,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E3DC]">
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-stone-300">/</span>}
                <span
                  className={idx === breadcrumbs.length - 1 ? 'font-semibold text-[#14281D]' : ''}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          {icon && <div className="text-[#14281D]">{icon}</div>}
          <h1 className="text-xl font-bold tracking-tight text-[#14281D]">{title}</h1>
          {badge}
        </div>

        {description && <p className="text-xs text-stone-600 max-w-3xl">{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 self-start md:self-auto">{actions}</div>}
    </div>
  );
}
