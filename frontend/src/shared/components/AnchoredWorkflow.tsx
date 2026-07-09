import { Text, UnstyledButton } from '@mantine/core';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type AnchoredWorkflowStep = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  state?: 'done' | 'active' | 'future' | 'attention';
};

export function useAnchoredWorkflowSections(sectionIds: string[]) {
  const sectionKey = sectionIds.join('|');
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? '');
  const programmaticScrollRef = useRef<number | null>(null);

  useEffect(() => {
    const ids = sectionKey.split('|').filter(Boolean);
    if (ids.length === 0) return undefined;

    const updateActiveSection = () => {
      if (programmaticScrollRef.current !== null) return;

      const viewportOffset = Math.max(96, Math.round(window.innerHeight * 0.18));
      const candidates = ids
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          return { id, top: element.getBoundingClientRect().top };
        })
        .filter((item): item is { id: string; top: number } => Boolean(item));

      if (candidates.length === 0) return;

      const activeCandidate =
        candidates
          .filter((candidate) => candidate.top <= viewportOffset)
          .sort((left, right) => right.top - left.top)[0] ?? candidates.sort((left, right) => Math.abs(left.top) - Math.abs(right.top))[0];

      setActiveSectionId((current) => (current === activeCandidate.id ? current : activeCandidate.id));
    };

    let frame = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (programmaticScrollRef.current !== null) {
        window.clearTimeout(programmaticScrollRef.current);
      }
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [sectionKey]);

  const scrollToSection = useCallback((id: string) => {
    setActiveSectionId(id);
    const target = document.getElementById(id);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - 12;

    if (programmaticScrollRef.current !== null) {
      window.clearTimeout(programmaticScrollRef.current);
    }
    programmaticScrollRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = null;
    }, prefersReducedMotion ? 0 : 850);

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, []);

  return { activeSectionId, scrollToSection };
}

export function AnchoredWorkflowRail({
  activeStepId,
  className,
  steps,
  title,
  onStepSelect,
}: {
  activeStepId: string;
  className?: string;
  steps: AnchoredWorkflowStep[];
  title?: string;
  onStepSelect: (id: string) => void;
}) {
  return (
    <nav aria-label={title} className={['anchored-workflow', className].filter(Boolean).join(' ')}>
      {title ? (
        <Text className="anchored-workflow-title" size="xs" fw={800} tt="uppercase">
          {title}
        </Text>
      ) : null}
      <div className="anchored-workflow-list">
        {steps.map((step, index) => {
          const isActive = activeStepId === step.id;
          const state = isActive ? 'active' : step.state ?? 'future';

          return (
            <UnstyledButton
              aria-current={isActive ? 'step' : undefined}
              className="anchored-workflow-step"
              data-state={state}
              key={step.id}
              onClick={() => onStepSelect(step.id)}
              type="button"
            >
              <span className="anchored-workflow-step-index" aria-hidden="true">
                {step.icon ?? index + 1}
              </span>
              <span className="anchored-workflow-step-copy">
                <span className="anchored-workflow-step-label">{step.label}</span>
                {step.description ? <span className="anchored-workflow-step-description">{step.description}</span> : null}
              </span>
            </UnstyledButton>
          );
        })}
      </div>
    </nav>
  );
}
