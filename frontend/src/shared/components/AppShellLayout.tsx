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
import { useDisclosure } from '@mantine/hooks';
import {
  IconChecklist,
  IconChevronDown,
  IconExchange,
  IconFileText,
  IconFileInvoice,
  IconGitBranch,
  IconLayoutDashboard,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconShip,
  IconShoppingCart,
  IconTruck,
  IconTruckDelivery,
  IconUserCircle,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { Link, NavLink as RouterNavLink, Outlet, useLocation } from 'react-router-dom';

import { type AppRole } from '@shared/auth/types';
import { useAuth } from '@shared/auth/useAuth';
import { useI18n } from '@shared/i18n';
import { queryKeys } from '@shared/api/queryKeys';
import { queryClient } from '@shared/queryClient';
import { GlobalSearch } from './GlobalSearch';
import { RouteErrorBoundary } from './PageFeedback';

const navigation: Array<{
  icon: ComponentType<{ size?: number | string; stroke?: number | string }>;
  labelKey:
    | 'shell.dashboard'
    | 'shell.deliveryOrders'
    | 'shell.domesticTransportOrders'
    | 'shell.purchaseOrders'
    | 'shell.shipments'
    | 'shell.masterData'
    | 'shell.tasks';
  path: string;
  roles?: AppRole[];
}> = [
  { labelKey: 'shell.dashboard', path: '/', icon: IconLayoutDashboard },
  {
    labelKey: 'shell.purchaseOrders',
    path: '/purchase-orders',
    icon: IconShoppingCart,
    roles: ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'],
  },
  {
    labelKey: 'shell.deliveryOrders',
    path: '/delivery-orders',
    icon: IconTruckDelivery,
    roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'],
  },
  {
    labelKey: 'shell.shipments',
    path: '/shipments',
    icon: IconShip,
    roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'],
  },
  {
    labelKey: 'shell.domesticTransportOrders',
    path: '/domestic-transport-orders',
    icon: IconTruck,
    roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'],
  },
  {
    labelKey: 'shell.masterData',
    path: '/master-data',
    icon: IconFileText,
    roles: ['ADMIN', 'PIC_MANAGER'],
  },
  {
    labelKey: 'shell.tasks',
    path: '/tasks',
    icon: IconChecklist,
    roles: ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'],
  },
];

export function AppShellLayout() {
  const [mobileOpened, mobileHandlers] = useDisclosure(false);
  const [desktopOpened, desktopHandlers] = useDisclosure(true);
  const location = useLocation();
  const { hasAnyRole, logout, user } = useAuth();
  const { roleLabel, t } = useI18n();

  const links = navigation
    .filter((item) => !item.roles || hasAnyRole(item.roles))
    .map((item) => {
      const Icon = item.icon;
      const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

      return (
        <NavLink
          key={item.path}
          component={RouterNavLink}
          to={item.path}
          label={t(item.labelKey)}
          active={active}
          leftSection={<Icon size={18} stroke={1.8} />}
          onClick={mobileHandlers.close}
        />
      );
    });

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 272, breakpoint: 'sm', collapsed: { mobile: !mobileOpened, desktop: !desktopOpened } }}
      padding="lg"
    >
      <a href="#main-content" className="skip-link">
        {t('shell.skipToContent')}
      </a>
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={mobileHandlers.toggle} hiddenFrom="sm" size="sm" />
            <Burger opened={desktopOpened} onClick={desktopHandlers.toggle} visibleFrom="sm" size="sm" />
            <UnstyledButton component={Link} to="/" className="brand-mark">
              <span className="brand-logo-frame">
                <img src="/brand/kbi-logo.png" alt="KBI" className="brand-logo" />
              </span>
              <span>
                <Text size="sm" fw={700} className="brand-title">
                  KBI
                </Text>
              </span>
            </UnstyledButton>
          </Group>

          <GlobalSearch />

          <Group gap="xs" wrap="nowrap">
            <Tooltip label={t('shell.refresh')}>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={t('shell.refresh')}
                onClick={() =>
                  void Promise.all([
                    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.deliveryOrders }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.domesticTransportOrders }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.shipments }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.masterData }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.globalSearch }),
                    queryClient.invalidateQueries({ queryKey: queryKeys.users }),
                  ])
                }
              >
                <IconRefresh size={18} />
              </ActionIcon>
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
                  <Menu.Item component={Link} to="/settings" leftSection={<IconSettings size={16} />}>
                    {t('shell.settings')}
                  </Menu.Item>
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
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">{links}</AppShell.Navbar>

      <AppShell.Main id="main-content" tabIndex={-1} style={{ outline: 'none' }}>
        <RouteErrorBoundary>
          <Outlet />
        </RouteErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
}
