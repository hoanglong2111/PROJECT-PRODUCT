import type { WorkspaceLanguage } from '@shared/preferences/WorkspacePreferencesContext';

import { en as authEn, vi as authVi } from './messages/auth';
import { en as commonEn, vi as commonVi } from './messages/common';
import { en as dashboardEn, vi as dashboardVi } from './messages/dashboard';
import { en as delayEn, vi as delayVi } from './messages/delay';
import { en as deliveryOrdersEn, vi as deliveryOrdersVi } from './messages/deliveryOrders';
import { en as domesticTransportOrdersEn, vi as domesticTransportOrdersVi } from './messages/domesticTransportOrders';
import { en as quotationsEn, vi as quotationsVi } from './messages/quotations';
import { en as orderIntakeEn, vi as orderIntakeVi } from './messages/orderIntake';
import { en as quotationRequestsEn, vi as quotationRequestsVi } from './messages/quotationRequests';
import { en as opsRiskEn, vi as opsRiskVi } from './messages/opsRisk';
import { en as entityLinkEn, vi as entityLinkVi } from './messages/entityLink';
import { en as shipmentsEn, vi as shipmentsVi } from './messages/shipments';
import { en as formsEn, vi as formsVi } from './messages/forms';
import { en as loginEn, vi as loginVi } from './messages/login';
import { en as glossaryEn, vi as glossaryVi } from './messages/glossary';
import { en as masterDataEn, vi as masterDataVi } from './messages/masterData';
import { en as notFoundEn, vi as notFoundVi } from './messages/notFound';
import { en as pageFeedbackEn, vi as pageFeedbackVi } from './messages/pageFeedback';
import { en as profileEn, vi as profileVi } from './messages/profile';
import { en as purchaseOrdersEn, vi as purchaseOrdersVi } from './messages/purchaseOrders';
import { en as searchEn, vi as searchVi } from './messages/search';
import { en as settingsEn, vi as settingsVi } from './messages/settings';
import { en as shellEn, vi as shellVi } from './messages/shell';
import { en as notificationsEn, vi as notificationsVi } from './messages/notifications';
import { en as tasksEn, vi as tasksVi } from './messages/tasks';
import { en as unauthorizedEn, vi as unauthorizedVi } from './messages/unauthorized';

export const en = {
  ...authEn,
  ...commonEn,
  ...dashboardEn,
  ...delayEn,
  ...deliveryOrdersEn,
  ...domesticTransportOrdersEn,
  ...quotationsEn,
  ...orderIntakeEn,
  ...quotationRequestsEn,
  ...opsRiskEn,
  ...entityLinkEn,
  ...shipmentsEn,
  ...formsEn,
  ...loginEn,
  ...glossaryEn,
  ...masterDataEn,
  ...notFoundEn,
  ...pageFeedbackEn,
  ...profileEn,
  ...purchaseOrdersEn,
  ...searchEn,
  ...settingsEn,
  ...shellEn,
  ...notificationsEn,
  ...tasksEn,
  ...unauthorizedEn,
} as const;

export type MessageKey = keyof typeof en;

export const vi: Record<MessageKey, string> = {
  ...authVi,
  ...commonVi,
  ...dashboardVi,
  ...delayVi,
  ...deliveryOrdersVi,
  ...domesticTransportOrdersVi,
  ...quotationsVi,
  ...orderIntakeVi,
  ...quotationRequestsVi,
  ...opsRiskVi,
  ...entityLinkVi,
  ...shipmentsVi,
  ...formsVi,
  ...loginVi,
  ...glossaryVi,
  ...masterDataVi,
  ...notFoundVi,
  ...pageFeedbackVi,
  ...profileVi,
  ...purchaseOrdersVi,
  ...searchVi,
  ...settingsVi,
  ...shellVi,
  ...notificationsVi,
  ...tasksVi,
  ...unauthorizedVi,
};

export const dictionaries: Record<WorkspaceLanguage, Record<MessageKey, string>> = {
  en,
  vi,
};
