import { lazy, type ComponentType, type ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';

import type { Capability } from '@shared/auth/capabilities';
import { FdsAdminRoute, FdsDemoRoute } from '@shared/auth/FdsAdminRoute';
import { RequireAuth } from '@shared/auth/RequireAuth';
import { RequireCapability } from '@shared/auth/RequireCapability';
import { AppShellLayout } from '@shared/components/AppShellLayout';

import { routeCapabilities } from './routeRoles';

type RouteConfig = {
  element: ReactElement;
  index?: boolean;
  path?: string;
};

const Dashboard = lazyFeature(() => import('@features/dashboard/page'), 'Dashboard');
const DeliveryOrders = lazyFeature(() => import('@features/delivery-orders/page'), 'DeliveryOrders');
const DomesticTransportOrders = lazyFeature(
  () => import('@features/domestic-transport-orders/page'),
  'DomesticTransportOrders',
);
const Shipments = lazyFeature(() => import('@features/shipments/page'), 'Shipments');
const MasterData = lazyFeature(() => import('@features/master-data/page'), 'MasterData');
const Login = lazyFeature(() => import('@features/login/page'), 'Login');
const NotFound = lazyFeature(() => import('@features/not-found/page'), 'NotFound');
const Profile = lazyFeature(() => import('@features/profile/page'), 'Profile');
const PurchaseOrders = lazyFeature(() => import('@features/purchase-orders/page'), 'PurchaseOrders');
const Quotations = lazyFeature(() => import('@features/quotations/page'), 'Quotations');
const Settings = lazyFeature(() => import('@features/settings/page'), 'Settings');
const Tasks = lazyFeature(() => import('@features/tasks/page'), 'Tasks');
const Unauthorized = lazyFeature(() => import('@features/unauthorized/page'), 'Unauthorized');

const publicRoutes: RouteConfig[] = [
  { path: '/login', element: <Login /> },
  { path: '/unauthorized', element: <Unauthorized /> },
  { path: '/fds-admin', element: <FdsAdminRoute /> },
  { path: '/fds-demo', element: <FdsDemoRoute /> },
];

const workspaceRoutes: RouteConfig[] = [
  { index: true, element: withCapability(<Dashboard />, routeCapabilities.dashboard) },
  { path: 'quotations', element: withCapability(<Quotations />, routeCapabilities.quotations) },
  { path: 'purchase-orders', element: withCapability(<PurchaseOrders />, routeCapabilities.purchaseOrders) },
  { path: 'delivery-orders', element: withCapability(<DeliveryOrders />, routeCapabilities.deliveryOrders) },
  { path: 'shipments', element: withCapability(<Shipments />, routeCapabilities.shipments) },
  {
    path: 'domestic-transport-orders',
    element: withCapability(<DomesticTransportOrders />, routeCapabilities.domesticTransportOrders),
  },
  { path: 'master-data', element: withCapability(<MasterData />, routeCapabilities.masterData) },
  { path: 'tasks', element: withCapability(<Tasks />, routeCapabilities.tasks) },
  { path: 'profile', element: <Profile /> },
  { path: 'settings', element: withCapability(<Settings />, routeCapabilities.settings) },
  { path: '*', element: <NotFound /> },
];

export function AppRoutes() {
  return (
    <Routes>
      {publicRoutes.map((route) => renderRoute(route))}

      <Route
        element={
          <RequireAuth>
            <AppShellLayout />
          </RequireAuth>
        }
      >
        {workspaceRoutes.map((route) => renderRoute(route))}
      </Route>
    </Routes>
  );
}

function lazyFeature<TModule extends Record<TKey, ComponentType>, TKey extends keyof TModule & string>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

function renderRoute(route: RouteConfig) {
  if (route.index) {
    return <Route key="index" index element={route.element} />;
  }

  return <Route key={route.path} path={route.path} element={route.element} />;
}

function withCapability(element: ReactElement, capability: Capability) {
  return <RequireCapability capability={capability}>{element}</RequireCapability>;
}
