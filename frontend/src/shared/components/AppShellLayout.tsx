import {
  ActionIcon,
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconChevronDown,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
  IconSunMoon,
  IconUserCircle,
} from '@tabler/icons-react';
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';
import { workspaceModules } from '@shared/navigation/workspaceModules';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import { GbFlag, VnFlag } from './FlagIcon';
import { GlobalSearch } from './GlobalSearch';
import { RouteErrorBoundary } from './PageFeedback';

export function AppShellLayout() {
  const [mobileOpened, mobileHandlers] = useDisclosure(false);
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const location = useLocation();
  const { can, logout, user } = useAuth();
  const { roleLabel, t } = useI18n();
  const {
    appearanceMode,
    language,
    resolvedColorScheme,
    setAppearanceMode,
    setLanguage,
    sidebarCollapsed,
    toggleSidebar,
  } = useWorkspacePreferences();
  const railMode = isDesktop && sidebarCollapsed;
  const sidebarToggleLabel = sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar');

  const links = workspaceModules
    .filter((item) => can(item.capability))
    .map((item) => {
      const Icon = item.icon;
      const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
      const label = t(item.labelKey);

      if (railMode) {
        return (
          <Tooltip key={item.path} label={label} position="right" withArrow>
            <NavLink
              component={RouterNavLink}
              to={item.path}
              active={active}
              aria-label={label}
              leftSection={<Icon size={20} stroke={1.8} />}
              onClick={mobileHandlers.close}
            />
          </Tooltip>
        );
      }

      return (
        <NavLink
          key={item.path}
          component={RouterNavLink}
          to={item.path}
          label={label}
          active={active}
          leftSection={<Icon size={18} stroke={1.8} />}
          onClick={mobileHandlers.close}
        />
      );
    });

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: { base: 272, sm: sidebarCollapsed ? 72 : 272 },
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      padding="lg"
    >
      <a href="#main-content" className="skip-link">
        {t('shell.skipToContent')}
      </a>
      <AppShell.Header>
        <div className="app-shell-header-frame">
          <div className="brand-zone" data-rail={railMode ? 'true' : undefined}>
            <Burger opened={mobileOpened} onClick={mobileHandlers.toggle} hiddenFrom="sm" size="sm" />
            <UnstyledButton component={Link} to="/" className="brand-mark" aria-label="Fado Solution">
              <span className="brand-logo-frame">
                <img src="/brand/fds_logo.png" alt="FDS" className="brand-logo" />
              </span>
              <span className="brand-wordmark">
                <Text className="brand-wordmark-line" fw={700} span>
                  Fado
                </Text>
                <Text className="brand-wordmark-line brand-wordmark-sub" span>
                  Solution
                </Text>
              </span>
            </UnstyledButton>
            {sidebarCollapsed ? null : (
              <Tooltip label={sidebarToggleLabel} position="bottom" withArrow>
                <ActionIcon
                  className="brand-collapse-toggle"
                  visibleFrom="sm"
                  variant="subtle"
                  size="lg"
                  aria-label={sidebarToggleLabel}
                  onClick={toggleSidebar}
                >
                  <IconLayoutSidebarLeftCollapse size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </div>

          <div className="header-body">
            <GlobalSearch />

            <Group className="header-actions" gap="xs" wrap="nowrap">
              <Tooltip label={appearanceMode === 'auto' ? t('shell.appearanceAuto') : t('shell.toggleColorScheme')}>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  aria-label={appearanceMode === 'auto' ? t('shell.appearanceAuto') : t('shell.toggleColorScheme')}
                  onClick={() =>
                    appearanceMode === 'auto'
                      ? setAppearanceMode('light')
                      : setAppearanceMode(resolvedColorScheme === 'dark' ? 'light' : 'dark')
                  }
                >
                  {appearanceMode === 'auto' ? (
                    <IconSunMoon size={18} />
                  ) : resolvedColorScheme === 'dark' ? (
                    <IconSun size={18} />
                  ) : (
                    <IconMoon size={18} />
                  )}
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('shell.toggleLanguage')}>
                <UnstyledButton
                  className="language-toggle"
                  aria-label={t('shell.toggleLanguage')}
                  onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
                >
                  <Group gap={6} wrap="nowrap">
                    {language === 'vi' ? <VnFlag size={16} /> : <GbFlag size={16} />}
                    <Text size="sm" fw={700} span>
                      {language === 'vi' ? 'VN' : 'EN'}
                    </Text>
                  </Group>
                </UnstyledButton>
              </Tooltip>
              {user ? (
                <Menu shadow="md" width={280} position="bottom-end">
                  <Menu.Target>
                    <UnstyledButton className="profile-trigger">
                      <Group gap="xs" wrap="nowrap">
                        <Avatar src={user.avatarUrl} radius="xl" size={30}>
                          {user.fullName
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join('')
                            .toUpperCase()}
                        </Avatar>
                        <div className="profile-meta">
                          <Text size="sm" fw={600} lineClamp={1}>
                            {user.fullName}
                          </Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {roleLabel(user.role)}
                          </Text>
                        </div>
                        <IconChevronDown size={16} />
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>{t('shell.account')}</Menu.Label>
                    {can('settings.view') ? (
                      <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={16} />}>
                        {t('shell.settings')}
                      </Menu.Item>
                    ) : null}
                    <Menu.Item component={Link} to="/profile" leftSection={<IconUserCircle size={16} />}>
                      {t('shell.profile')}
                    </Menu.Item>
                    <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={logout}>
                      {t('shell.logout')}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : null}
            </Group>
          </div>
        </div>
      </AppShell.Header>

      <AppShell.Navbar p="md" data-rail={railMode ? 'true' : undefined}>
        {sidebarCollapsed ? (
          <div className="app-shell-navbar-top">
            <Tooltip label={sidebarToggleLabel} position="right" withArrow>
              <ActionIcon
                visibleFrom="sm"
                variant="subtle"
                size="lg"
                aria-label={sidebarToggleLabel}
                onClick={toggleSidebar}
              >
                <IconLayoutSidebarLeftExpand size={18} />
              </ActionIcon>
            </Tooltip>
          </div>
        ) : null}
        <nav className="app-shell-nav" aria-label="Primary navigation">
          {links}
        </nav>
      </AppShell.Navbar>

      <AppShell.Main id="main-content" tabIndex={-1} className="app-main" style={{ outline: 'none' }}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
}
