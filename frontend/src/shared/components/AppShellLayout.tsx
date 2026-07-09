import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMoon,
  IconSun,
  IconSunMoon,
} from '@tabler/icons-react';
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { workspaceModules } from '@shared/navigation/workspaceModules';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import { GbFlag, VnFlag } from './FlagIcon';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { RouteErrorBoundary } from './PageFeedback';
import { ScrollNavButton } from './ScrollNavButton';
import { SidebarUserFooter } from './SidebarUserFooter';

export function AppShellLayout() {
  const [mobileOpened, mobileHandlers] = useDisclosure(false);
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const location = useLocation();
  const { t } = useI18n();
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
            <div className="header-search-track" data-rail={railMode ? 'true' : undefined}>
              <div className="header-search-spacer" aria-hidden="true" />
              <GlobalSearch />
              <div className="header-search-spacer" aria-hidden="true" />
            </div>

            <Group className="header-actions" gap="xs" wrap="nowrap">
              <Tooltip label={appearanceMode === 'auto' ? t('shell.appearanceAuto') : t('shell.toggleColorScheme')}>
                <ActionIcon
                  className="theme-toggle-action"
                  variant="subtle"
                  size="lg"
                  data-theme-state={appearanceMode === 'auto' ? 'auto' : resolvedColorScheme}
                  aria-label={appearanceMode === 'auto' ? t('shell.appearanceAuto') : t('shell.toggleColorScheme')}
                  onClick={() =>
                    appearanceMode === 'auto'
                      ? setAppearanceMode('light')
                      : setAppearanceMode(resolvedColorScheme === 'dark' ? 'light' : 'dark')
                  }
                >
                  <span className="theme-toggle-icon theme-toggle-icon-auto" aria-hidden="true">
                    <IconSunMoon size={18} />
                  </span>
                  <span className="theme-toggle-icon theme-toggle-icon-light" aria-hidden="true">
                    <IconMoon size={18} />
                  </span>
                  <span className="theme-toggle-icon theme-toggle-icon-dark" aria-hidden="true">
                    <IconSun size={18} />
                  </span>
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
              <NotificationBell />
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
        <SidebarUserFooter railMode={railMode} />
      </AppShell.Navbar>

      <AppShell.Main id="main-content" tabIndex={-1} className="app-main" style={{ outline: 'none' }}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
        <ScrollNavButton />
      </AppShell.Main>
    </AppShell>
  );
}
