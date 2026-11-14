import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react';

export function Skeleton({ className = '', ...props }: ComponentPropsWithoutRef<'span'>): ReactElement {
  return <span {...props} aria-hidden="true" className={`skeleton block rounded-md ${className}`} />;
}

interface SkeletonRegionProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function SkeletonRegion({ children, label = 'Cargando contenido…', className = '' }: SkeletonRegionProps): ReactElement {
  return <div role="status" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">{children}</div>
  </div>;
}

/** Keeps the real line box, including multiline labels, while masking a value. */
export function SkeletonValue({ loading, children }: { loading: boolean; children: ReactNode }): ReactElement {
  return loading
    ? <span className="relative inline-block" aria-busy="true"><span className="invisible" aria-hidden="true">{children}</span><Skeleton className="absolute inset-0 min-w-8" /><span role="status" className="sr-only">Cargando…</span></span>
    : <>{children}</>;
}

interface SkeletonRowsProps {
  labels: readonly string[];
  rows?: number;
  cellClassName?: string;
  label?: string;
  contentClassName?: string;
}

/** Lives inside the real table so headers and responsive column labels stay in place. */
export function SkeletonRows({ labels, rows = 4, cellClassName = 'py-3.5 px-4', contentClassName = 'h-4 my-1', label = 'Cargando registros…' }: SkeletonRowsProps): ReactElement {
  return <>{Array.from({ length: rows }, (_, row) => <tr key={row} aria-busy="true">
    {labels.map((column, index) => <td key={column} data-label={column} className={cellClassName}>
      {row === 0 && index === 0 && <span role="status" className="sr-only">{label}</span>}
      <Skeleton className={`${index === 0 ? 'w-24' : 'w-3/4'} max-w-full ${contentClassName}`} />
    </td>)}
  </tr>)}</>;
}
