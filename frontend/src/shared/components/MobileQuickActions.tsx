import { ActionIcon, Popover, UnstyledButton } from '@mantine/core';
import { IconAdjustmentsHorizontal, IconMoon, IconSun, IconSunMoon, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

import { useI18n } from '@shared/i18n';
import { GbFlag, VnFlag } from './FlagIcon';
import { NotificationBell } from './NotificationBell';

export function MobileQuickActions({
  appearanceMode,
  language,
  resolvedColorScheme,
  setAppearanceMode,
  setLanguage,
  setMobileQuickActionsVisible,
}: {
  appearanceMode: 'light' | 'dark' | 'auto';
  language: 'vi' | 'en';
  resolvedColorScheme: 'light' | 'dark';
  setAppearanceMode: (mode: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: 'vi' | 'en') => void;
  setMobileQuickActionsVisible: (visible: boolean) => void;
}) {
  const { t } = useI18n();
  const [opened, setOpened] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOverDelete, setDragOverDelete] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const longPressTimeoutRef = useRef<number | null>(null);
  const justDraggedRef = useRef(false);
  const quickButtonRef = useRef<HTMLButtonElement | null>(null);

  const toggleTheme = () => {
    if (appearanceMode === 'auto') {
      setAppearanceMode('light');
      return;
    }

    setAppearanceMode(resolvedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (!opened) {
      return undefined;
    }

    const closeOnScrollIntent = () => setOpened(false);
    const scrollTargets: EventTarget[] = [window, document];

    scrollTargets.forEach((target) => {
      target.addEventListener('wheel', closeOnScrollIntent, { capture: true, passive: true });
      target.addEventListener('scroll', closeOnScrollIntent, { capture: true, passive: true });
      target.addEventListener('touchmove', closeOnScrollIntent, { capture: true, passive: true });
    });

    return () => {
      scrollTargets.forEach((target) => {
        target.removeEventListener('wheel', closeOnScrollIntent, { capture: true });
        target.removeEventListener('scroll', closeOnScrollIntent, { capture: true });
        target.removeEventListener('touchmove', closeOnScrollIntent, { capture: true });
      });
    };
  }, [opened]);

  const startDrag = ({
    clientX,
    clientY,
    pointerId,
    target,
  }: {
    clientX: number;
    clientY: number;
    pointerId: number;
    target: HTMLButtonElement;
  }) => {
    const rect = target.getBoundingClientRect();
    dragOffsetRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setPosition({ x: rect.left, y: rect.top });
    setOpened(false);
    setDragOverDelete(false);
    setDragging(true);
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail in older embedded webviews; dragging still works.
    }
  };

  const isOverDeleteTarget = (clientX: number, clientY: number) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight - 108;

    return Math.hypot(clientX - centerX, clientY - centerY) <= 92;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    clearLongPressTimer();
    const dragStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      target: event.currentTarget,
    };
    longPressTimeoutRef.current = window.setTimeout(() => startDrag(dragStart), 320);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging) {
      return;
    }

    const size = quickButtonRef.current?.offsetWidth ?? 56;
    const nextX = Math.min(window.innerWidth - size - 8, Math.max(8, event.clientX - dragOffsetRef.current.x));
    const nextY = Math.min(window.innerHeight - size - 8, Math.max(8, event.clientY - dragOffsetRef.current.y));
    setPosition({ x: nextX, y: nextY });
    setDragOverDelete(isOverDeleteTarget(event.clientX, event.clientY));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearLongPressTimer();

    if (!dragging) {
      return;
    }

    const droppedOnDelete = isOverDeleteTarget(event.clientX, event.clientY);

    setDragging(false);
    setDragOverDelete(false);
    justDraggedRef.current = true;
    window.setTimeout(() => {
      justDraggedRef.current = false;
    }, 0);

    if (droppedOnDelete) {
      setMobileQuickActionsVisible(false);
      setPosition(null);
      return;
    }

    setPosition((current) => current);
  };

  const quickActionStyle: CSSProperties | undefined = position
    ? {
      bottom: 'auto',
      left: position.x,
      right: 'auto',
      top: position.y,
    }
    : undefined;

  return (
    <>
      <Popover
        opened={opened && !dragging}
        onChange={setOpened}
        position="top-end"
        shadow="lg"
        transitionProps={{ transition: 'pop-bottom-right', duration: 150 }}
        withinPortal
      >
        <Popover.Target>
          <ActionIcon
            ref={quickButtonRef}
            aria-label={t('shell.mobileQuickActions')}
            className="mobile-quick-actions-button"
            data-dragging={dragging ? 'true' : undefined}
            onClick={() => {
              if (!justDraggedRef.current) {
                setOpened((current) => !current);
              }
            }}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerLeave={clearLongPressTimer}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            size="xl"
            style={quickActionStyle}
            variant="filled"
          >
            <IconAdjustmentsHorizontal size={19} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown className="mobile-quick-actions-popover" p="xs">
          <div className="mobile-quick-actions-grid">
            <UnstyledButton
              className="mobile-quick-action"
              onClick={toggleTheme}
            >
              <span className="mobile-quick-action-icon" aria-hidden="true">
                {appearanceMode === 'auto'
                  ? <IconSunMoon size={17} />
                  : resolvedColorScheme === 'dark'
                    ? <IconSun size={17} />
                    : <IconMoon size={17} />}
              </span>
              <span className="mobile-quick-action-label">
                {appearanceMode === 'auto' ? t('shell.appearanceAutoShort') : t('shell.themeShort')}
              </span>
            </UnstyledButton>
            <UnstyledButton
              className="mobile-quick-action"
              onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            >
              <span className="mobile-quick-action-icon" aria-hidden="true">
                {language === 'vi' ? <VnFlag size={17} /> : <GbFlag size={17} />}
              </span>
              <span className="mobile-quick-action-label">{t('shell.languageShort')}</span>
            </UnstyledButton>
            <div className="mobile-quick-action mobile-quick-action--bell">
              <NotificationBell />
              <span className="mobile-quick-action-label">{t('shell.notificationsShort')}</span>
            </div>
          </div>
        </Popover.Dropdown>
      </Popover>

      <div
        className="mobile-quick-delete-zone"
        data-over={dragOverDelete ? 'true' : undefined}
        data-visible={dragging ? 'true' : undefined}
        aria-hidden="true"
      >
        <IconX size={22} stroke={2.2} />
      </div>
    </>
  );
}
