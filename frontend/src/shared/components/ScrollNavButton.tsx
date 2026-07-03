import { ActionIcon, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { useI18n } from '@shared/i18n';

const NEAR_BOTTOM_THRESHOLD = 120;
const MIN_SCROLLABLE_HEIGHT = 400;

export function ScrollNavButton() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [atBottom, setAtBottom] = useState(false);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;

      if (scrollable < MIN_SCROLLABLE_HEIGHT) {
        setVisible(false);
        return;
      }

      setVisible(true);
      setAtBottom(scrollable - window.scrollY <= NEAR_BOTTOM_THRESHOLD);
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  if (!visible) {
    return null;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = atBottom ? t('shell.scrollToTop') : t('shell.scrollToBottom');

  const handleClick = () => {
    const doc = document.documentElement;
    window.scrollTo({
      top: atBottom ? 0 : doc.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="app-scroll-nav">
      <Tooltip label={label} position="left" withArrow>
        <ActionIcon
          className="app-scroll-nav-button"
          variant="default"
          size="lg"
          radius="xl"
          aria-label={label}
          onClick={handleClick}
        >
          {atBottom ? <IconArrowUp size={18} /> : <IconArrowDown size={18} />}
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
