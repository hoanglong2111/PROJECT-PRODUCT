import type { ReactNode } from 'react';

import { BackActionButton } from './BackActionButton';

type FeatureHeaderShellProps = {
  backLabel: string;
  children: ReactNode;
  className?: string;
  onBack: () => void;
};

export function FeatureHeaderShell({
  backLabel,
  children,
  className,
  onBack,
}: FeatureHeaderShellProps) {
  const classes = ['feature-header-shell', className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <nav className="feature-header-sidecar" aria-label={backLabel}>
        <BackActionButton label={backLabel} onClick={onBack} />
      </nav>
      <div className="feature-header-content">{children}</div>
    </header>
  );
}
