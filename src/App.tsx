import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import type { AppRole } from './auth/types';
import { AppShellLayout } from './components/AppShellLayout';
import { Dashboard } from './routes/Dashboard';
import { DeliveryOrders } from './routes/DeliveryOrders';
import { Efms } from './routes/Efms';
import { ExchangeRates } from './routes/ExchangeRates';
import { Login } from './routes/Login';
import { NotFound } from './routes/NotFound';
import { Profile } from './routes/Profile';
import { PurchaseOrders } from './routes/PurchaseOrders';
import { PurchaseRequests } from './routes/PurchaseRequests';
import { Quotations } from './routes/Quotations';
import { Settings } from './routes/Settings';
import { Tasks } from './routes/Tasks';
import { Unauthorized } from './routes/Unauthorized';
import { Workflow } from './routes/Workflow';

const purchaseRequestRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];
const purchaseOrderRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'FINANCE_OFFICER'];
const quotationRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF'];
const deliveryOrderRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'];
const efmsRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'SALE_STAFF', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];
const taskRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];

export default function App() {
  return (
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
  );
}
