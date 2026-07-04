import { ActionIcon, Button, Group, Indicator, Popover, ScrollArea, Text, Tooltip } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useState } from 'react';

import { useI18n } from '@shared/i18n';

interface NotificationItem {
  id: string;
  titleKey: string;
  messageKey: string;
  unread: boolean;
  timeKey: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    titleKey: 'notifications.mock.poApprovedTitle',
    messageKey: 'notifications.mock.poApprovedMessage',
    unread: true,
    timeKey: 'notifications.mock.poApprovedTime',
  },
  {
    id: '2',
    titleKey: 'notifications.mock.shipmentDelayedTitle',
    messageKey: 'notifications.mock.shipmentDelayedMessage',
    unread: true,
    timeKey: 'notifications.mock.shipmentDelayedTime',
  },
  {
    id: '3',
    titleKey: 'notifications.mock.taskDueTitle',
    messageKey: 'notifications.mock.taskDueMessage',
    unread: false,
    timeKey: 'notifications.mock.taskDueTime',
  },
];

export function NotificationBell() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((item) => item.unread).length;
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const label = `${t('shell.notifications')}: ${unreadLabel}`;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: false } : item))
    );
  };

  return (
    <Popover width={320} position="bottom-end" withinPortal shadow="md">
      <Popover.Target>
        <div>
          <Tooltip label={label} withArrow>
            <ActionIcon
              variant="subtle"
              size="lg"
              className="notification-bell-trigger"
              aria-label={label}
            >
              <Indicator
                disabled={unreadCount === 0}
                color="red"
                label={unreadLabel}
                size={16}
                offset={3}
                className="notification-bell-indicator"
              >
                <IconBell size={18} />
              </Indicator>
            </ActionIcon>
          </Tooltip>
        </div>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="xs" style={{ borderBottom: '1px solid var(--kbfe-border-primary)' }}>
          <Text fw={700} size="sm">{t('notifications.title')}</Text>
          {unreadCount > 0 ? (
            <Button
              variant="subtle"
              size="xs"
              onClick={markAllRead}
              p={0}
              h="auto"
              styles={{
                root: {
                  height: 'auto',
                  minHeight: 0,
                  fontSize: 'var(--mantine-font-size-xs)',
                },
              }}
            >
              {t('notifications.markAllRead')}
            </Button>
          ) : null}
        </Group>
        {notifications.length === 0 ? (
          <Text p="md" size="sm" c="dimmed" ta="center">{t('notifications.empty')}</Text>
        ) : (
          <ScrollArea.Autosize mah={300}>
            {notifications.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`notification-bell-item${item.unread ? ' is-unread' : ''}`}
                onClick={() => markAsRead(item.id)}
              >
                <div style={{ flex: 1 }}>
                  <Text size="xs" fw={600}>{t(item.titleKey)}</Text>
                  <Text size="xs" c="dimmed" lineClamp={2} style={{ marginBlock: 2 }}>{t(item.messageKey)}</Text>
                  <Text style={{ fontSize: '10px' }} c="dimmed">{t(item.timeKey)}</Text>
                </div>
                {item.unread ? <span className="notification-bell-dot" aria-hidden="true" /> : null}
              </button>
            ))}
          </ScrollArea.Autosize>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
