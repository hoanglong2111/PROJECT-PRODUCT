import { ActionIcon, Avatar, Group, Menu, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconLogout, IconSettings, IconUserCircle } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function SidebarUserFooter({ railMode }: { railMode: boolean }) {
  const { can, logout, user } = useAuth();
  const { roleLabel, t } = useI18n();

  if (!user) {
    return null;
  }

  const avatarMenu = (
    <Menu
      shadow="md"
      width={railMode ? 200 : 220}
      position={railMode ? 'right-end' : 'top-start'}
      offset={8}
      trigger={railMode ? 'click-hover' : 'click'}
      openDelay={railMode ? 80 : undefined}
      closeDelay={railMode ? 280 : undefined}
      withinPortal
    >
      <Menu.Target>
        <UnstyledButton className="profile-trigger" aria-label={t('shell.account')}>
          <Avatar src={user.avatarUrl} radius="xl" size={railMode ? 34 : 36}>
            {getInitials(user.fullName)}
          </Avatar>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown className="profile-menu-dropdown">
        <Menu.Label>{t('shell.account')}</Menu.Label>
        <Menu.Item
          className="profile-menu-item"
          component={Link}
          to="/profile"
          leftSection={<IconUserCircle size={16} />}
        >
          {t('shell.profile')}
        </Menu.Item>
        {can('settings.view') ? (
          <Menu.Item
            className="profile-menu-item"
            component={Link}
            to="/settings"
            leftSection={<IconSettings size={16} />}
          >
            {t('shell.settings')}
          </Menu.Item>
        ) : null}
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <div className="sidebar-user-footer" data-rail={railMode ? 'true' : undefined}>
      <Group gap="sm" wrap="nowrap" className="sidebar-user-footer-info">
        {avatarMenu}
        {railMode ? null : (
          <div className="profile-meta">
            <Text size="sm" fw={600} lineClamp={1}>
              {user.fullName}
            </Text>
            <Text size="xs" c="dimmed" lineClamp={1}>
              {roleLabel(user.role)}
            </Text>
          </div>
        )}
      </Group>
      <Tooltip
        label={t('shell.logout')}
        position={railMode ? 'right' : 'top'}
        withArrow
        openDelay={200}
      >
        <ActionIcon
          className="sidebar-user-footer-logout"
          color="red"
          variant="light"
          size={railMode ? 34 : 36}
          radius="xl"
          aria-label={t('shell.logout')}
          onClick={logout}
        >
          <IconLogout size={18} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
