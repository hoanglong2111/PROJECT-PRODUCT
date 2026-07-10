import { Group, Paper } from '@mantine/core';
import type { PaperProps } from '@mantine/core';
import type { ReactNode } from 'react';

type DetailHeroProps = {
  children?: ReactNode;
  identity?: ReactNode;
  facts?: ReactNode;
  actions?: ReactNode;
  className?: string;
  withPaper?: boolean;
  collapseLayout?: boolean;
  paperProps?: PaperProps & {
    component?: 'div' | 'section';
    'aria-labelledby'?: string;
  };
};

export function DetailHero({
  actions,
  children,
  className,
  collapseLayout = false,
  facts,
  identity,
  paperProps,
  withPaper = true,
}: DetailHeroProps) {
  const heroClassName = ['feature-detail-hero', className, collapseLayout ? 'feature-hero-layout' : null]
    .filter(Boolean)
    .join(' ');
  const content = children ?? (collapseLayout ? (
    <>
      {identity}
      {facts}
      {actions ? <Group gap="xs" className="feature-hero-actions">{actions}</Group> : null}
    </>
  ) : (
    <div className="feature-hero-layout">
      {identity}
      {facts}
      {actions ? <Group gap="xs" className="feature-hero-actions">{actions}</Group> : null}
    </div>
  ));

  if (!withPaper) return <div className={heroClassName}>{content}</div>;

  return (
    <Paper
      {...paperProps}
      className={[heroClassName, paperProps?.className].filter(Boolean).join(' ')}
    >
      {content}
    </Paper>
  );
}
