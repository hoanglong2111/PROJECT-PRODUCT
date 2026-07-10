import {
  ActionIcon,
  AppShell,
  Group,
  NavLink,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconDots,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMoon,
  IconSettings,
  IconSun,
  IconSunMoon,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';

import { useI18n } from '@shared/i18n';
import { workspaceModules } from '@shared/navigation/workspaceModules';
import { useWorkspacePreferences } from '@shared/preferences/WorkspacePreferencesContext';
import { GbFlag, VnFlag } from './FlagIcon';
import { GlobalSearch } from './GlobalSearch';
import { MobileQuickActions } from './MobileQuickActions';
import { NotificationBell } from './NotificationBell';
import { RouteErrorBoundary } from './PageFeedback';
import { ScrollNavButton } from './ScrollNavButton';
import { SidebarUserFooter } from './SidebarUserFooter';

export function AppShellLayout() {
  const isDesktop = useMediaQuery('(min-width: 48em)', false);
  const location = useLocation();
  const { t } = useI18n();
  const {
    appearanceMode,
    language,
    mobileQuickActionsVisible,
    resolvedColorScheme,
    setAppearanceMode,
    setLanguage,
    setMobileQuickActionsVisible,
    sidebarCollapsed,
    toggleSidebar,
  } = useWorkspacePreferences();
  const railMode = isDesktop && sidebarCollapsed;
  const sidebarToggleLabel = sidebarCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar');

  // RBAC removed on `cong`: app is fully open after login, so no capability filtering.
  const allowedModules = workspaceModules;
  const canViewSettings = true;
  const mobilePrimaryLimit = canViewSettings || allowedModules.length > 5 ? 4 : 5;
  const mobilePrimaryModules = allowedModules.slice(0, mobilePrimaryLimit);
  const mobileOverflowModules = allowedModules.slice(mobilePrimaryLimit);
  const hasMobileMore = canViewSettings || mobileOverflowModules.length > 0;
  const mobileOverflowActive = mobileOverflowModules.some((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );
  const mobileMoreActive = mobileOverflowActive || (canViewSettings && location.pathname.startsWith('/settings'));
  const [mobileMoreOpened, setMobileMoreOpened] = useState(false);
  const getMobileModuleLabel = (path: string) => {
    if (path === '/') return t('shell.mobileShort.dashboard');
    if (path === '/quotation-requests') return t('shell.mobileShort.rfq');
    if (path === '/quotations') return t('shell.mobileShort.quotations');
    if (path === '/purchase-orders') return t('shell.mobileShort.purchaseOrders');
    if (path === '/delivery-orders') return t('shell.mobileShort.deliveryOrders');
    if (path === '/shipments') return t('shell.mobileShort.shipments');
    if (path === '/domestic-transport-orders') return t('shell.mobileShort.domesticTransportOrders');
    if (path === '/master-data') return t('shell.mobileShort.masterData');
    if (path === '/tasks') return t('shell.mobileShort.tasks');
    if (path === '/settings') return t('shell.mobileShort.settings');
    return t('shell.more');
  };

  useEffect(() => {
    if (!mobileMoreOpened) {
      return undefined;
    }

    document.documentElement.classList.add('mobile-more-open');
    document.body.classList.add('mobile-more-open');

    return () => {
      document.documentElement.classList.remove('mobile-more-open');
      document.body.classList.remove('mobile-more-open');
    };
  }, [mobileMoreOpened]);

  const links = allowedModules.map((item) => {
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
      />
    );
  });

  return (
    <AppShell
      header={{ height: { base: 120, sm: 64 } }}
      navbar={{
        width: { base: 272, sm: sidebarCollapsed ? 72 : 272 },
        breakpoint: 'sm',
        collapsed: { mobile: true, desktop: false },
      }}
      padding="lg"
    >
      <a href="#main-content" className="skip-link">
        {t('shell.skipToContent')}
      </a>
      <AppShell.Header>
        <div className="app-shell-header-frame">
          <div className="brand-zone" data-rail={railMode ? 'true' : undefined}>
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
            <div className="header-search-track">
              <GlobalSearch />
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

      <nav className="mobile-bottom-nav" aria-label={t('shell.mobileBottomNavigation')}>
        <div className="mobile-bottom-nav-track">
          {mobilePrimaryModules.map((item) => {
            const Icon = item.icon;
            const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            const label = t(item.labelKey);
            const mobileLabel = getMobileModuleLabel(item.path);

            return (
              <UnstyledButton
                aria-label={label}
                className="mobile-bottom-nav-item"
                component={RouterNavLink}
                data-active={active ? 'true' : undefined}
                key={item.path}
                to={item.path}
              >
                <Icon size={18} stroke={1.75} />
                <span>{mobileLabel}</span>
              </UnstyledButton>
            );
          })}
          {hasMobileMore ? (
            <>
              <UnstyledButton
                aria-expanded={mobileMoreOpened}
                aria-haspopup="dialog"
                aria-label={t('shell.more')}
                className="mobile-bottom-nav-item mobile-bottom-nav-more"
                data-active={mobileMoreActive ? 'true' : undefined}
                onClick={() => setMobileMoreOpened((current) => !current)}
              >
                <IconDots size={18} stroke={1.75} />
                <span>{t('shell.more')}</span>
              </UnstyledButton>
              {mobileMoreOpened ? (
                <>
                  <div className="mobile-bottom-more-backdrop" aria-hidden="true" />
                  <div className="mobile-bottom-more-panel" role="dialog" aria-modal="true" aria-label={t('shell.more')}>
                    <div className="mobile-bottom-more-header">
                      <Text fw={800} size="sm">{t('shell.more')}</Text>
                      <ActionIcon
                        aria-label={t('common.close')}
                        className="mobile-bottom-more-close"
                        onClick={() => setMobileMoreOpened(false)}
                        size="md"
                        variant="subtle"
                      >
                        <IconX size={16} stroke={2.1} />
                      </ActionIcon>
                    </div>
                    <div className="mobile-bottom-more-grid">
                      {mobileOverflowModules.map((item) => {
                        const Icon = item.icon;
                        const label = t(item.labelKey);
                        const mobileLabel = getMobileModuleLabel(item.path);
                        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

                        return (
                          <UnstyledButton
                            aria-label={label}
                            className="mobile-bottom-more-item"
                            component={RouterNavLink}
                            data-active={active ? 'true' : undefined}
                            key={item.path}
                            onClick={() => setMobileMoreOpened(false)}
                            to={item.path}
                          >
                            <Icon size={18} stroke={1.75} />
                            <span>{mobileLabel}</span>
                          </UnstyledButton>
                        );
                      })}
                      {canViewSettings ? (
                        <UnstyledButton
                          aria-label={t('shell.settings')}
                          className="mobile-bottom-more-item"
                          component={RouterNavLink}
                          data-active={location.pathname.startsWith('/settings') ? 'true' : undefined}
                          onClick={() => setMobileMoreOpened(false)}
                          to="/settings"
                        >
                          <IconSettings size={18} stroke={1.75} />
                          <span>{getMobileModuleLabel('/settings')}</span>
                        </UnstyledButton>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </nav>

      {mobileQuickActionsVisible ? (
        <MobileQuickActions
          appearanceMode={appearanceMode}
          language={language}
          resolvedColorScheme={resolvedColorScheme}
          setAppearanceMode={setAppearanceMode}
          setLanguage={setLanguage}
          setMobileQuickActionsVisible={setMobileQuickActionsVisible}
        />
      ) : null}
    </AppShell>
  );
}
