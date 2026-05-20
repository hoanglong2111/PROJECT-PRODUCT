import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import type { AppRole } from './auth/types';
import { AppShellLayout } from './components/AppShellLayout';
import { PageLoading } from './components/PageFeedback';

const Dashboard = lazy(() => import('./routes/Dashboard').then((module) => ({ default: module.Dashboard })));
const DeliveryOrders = lazy(() => import('./routes/DeliveryOrders').then((module) => ({ default: module.DeliveryOrders })));
const Efms = lazy(() => import('./routes/Efms').then((module) => ({ default: module.Efms })));
const ExchangeRates = lazy(() => import('./routes/ExchangeRates').then((module) => ({ default: module.ExchangeRates })));
const Login = lazy(() => import('./routes/Login').then((module) => ({ default: module.Login })));
const NotFound = lazy(() => import('./routes/NotFound').then((module) => ({ default: module.NotFound })));
const Profile = lazy(() => import('./routes/Profile').then((module) => ({ default: module.Profile })));
const PurchaseOrders = lazy(() => import('./routes/PurchaseOrders').then((module) => ({ default: module.PurchaseOrders })));
const PurchaseRequests = lazy(() => import('./routes/PurchaseRequests').then((module) => ({ default: module.PurchaseRequests })));
const Quotations = lazy(() => import('./routes/Quotations').then((module) => ({ default: module.Quotations })));
const Settings = lazy(() => import('./routes/Settings').then((module) => ({ default: module.Settings })));
const Tasks = lazy(() => import('./routes/Tasks').then((module) => ({ default: module.Tasks })));
const Unauthorized = lazy(() => import('./routes/Unauthorized').then((module) => ({ default: module.Unauthorized })));
const Workflow = lazy(() => import('./routes/Workflow').then((module) => ({ default: module.Workflow })));

const purchaseRequestRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];
const purchaseOrderRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'];
const quotationRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];
const deliveryOrderRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'];
const efmsRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];
const taskRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          element={
            <RequireAuth>
              <AppShellLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="workflow" element={<Workflow />} />
          <Route path="exchange-rates" element={<ExchangeRates />} />
          <Route
            path="purchase-requests"
            element={
              <RequireRole allowedRoles={purchaseRequestRoles}>
                <PurchaseRequests />
              </RequireRole>
            }
          />
          <Route
            path="quotations"
            element={
              <RequireRole allowedRoles={quotationRoles}>
                <Quotations />
              </RequireRole>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <RequireRole allowedRoles={purchaseOrderRoles}>
                <PurchaseOrders />
              </RequireRole>
            }
          />
          <Route
            path="delivery-orders"
            element={
              <RequireRole allowedRoles={deliveryOrderRoles}>
                <DeliveryOrders />
              </RequireRole>
            }
          />
          <Route
            path="efms"
            element={
              <RequireRole allowedRoles={efmsRoles}>
                <Efms />
              </RequireRole>
            }
          />
          <Route
            path="efms/:orderNumber"
            element={
              <RequireRole allowedRoles={efmsRoles}>
                <Efms />
              </RequireRole>
            }
          />
          <Route
            path="tasks"
            element={
              <RequireRole allowedRoles={taskRoles}>
                <Tasks />
              </RequireRole>
            }
          />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return <PageLoading title="Đang tải" description="Đang chuẩn bị màn hình làm việc." />;
}
