import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconCheck, IconExternalLink, IconFileUpload, IconPlus, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@shared/api/http';
import {
  confirmDocumentCrossCheck,
  confirmFinalBl,
  createAdvanceSettlement,
  createCharge,
  createContainer,
  createDocumentReview,
  createHouseBill,
  deleteCharge,
  issueFinanceNote,
  sendFinanceNoteToAccounting,
  syncDriveDossier,
  updateAdvanceSettlementStatus,
  updateCharge,
  updateCustoms,
  updateShippingInstruction,
  uploadDeliveryOrderAttachment,
  type AdvanceSettlementStatus,
  type CustomsChannel,
  type CustomsLaneStatus,
  type CustomsStatus,
  type DeliveryOrder,
  type EfmsControl,
  type FinanceChargeType,
  type LogisticsAttachment,
  type MblType,
  type TaskRole,
} from '@shared/api/logistics';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import {
  advanceRoleOptions,
  chargeTypeOptions,
  customsChannelOptions,
  customsLaneStatusOptions,
  customsStatusOptions,
  documentTypeOptions,
  mblTypeOptions,
} from '../constants';
import {
  cleanString,
  formatBytes,
  formatDateTime,
  formatMoney,
  formatOptionalNumber,
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
  toNumberInputValue,
} from '../formatters';
import { Info } from './Info';

export function OverviewPanel({
  attachments,
  control,
  deliveryOrder,
}: {
  attachments: LogisticsAttachment[];
  control: EfmsControl;
  deliveryOrder: DeliveryOrder | null;
}) {
  const { statusLabel, t } = useI18n();
  const transport = control.transport;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <Info label={t('efms.mblNumber')} value={transport?.mblNumber ?? '-'} />
        <Info label={t('efms.mblType')} value={transport?.mblType ? statusLabel(transport.mblType) : '-'} />
        <Info label={t('efms.manifestNumber')} value={transport?.manifestNumber ?? '-'} />
        <Info label={t('efms.vesselCode')} value={transport?.vesselCode ?? '-'} />
        <Info label={t('efms.actualDeparture')} value={transport?.actualDepartureAt ? formatDateTime(transport.actualDepartureAt) : '-'} />
        <Info label={t('efms.actualArrival')} value={transport?.actualArrivalAt ? formatDateTime(transport.actualArrivalAt) : '-'} />
        <Info label={t('efms.grossWeight')} value={formatOptionalNumber(transport?.grossWeight)} />
        <Info label={t('efms.cbm')} value={formatOptionalNumber(transport?.cbm)} />
        <Info label={t('common.documents')} value={attachments.length} />
        <Info
          label={t('efms.driveDossier')}
          value={control.latestDriveDossier ? <StatusBadge status={control.latestDriveDossier.status} /> : '-'}
        />
      </SimpleGrid>

      {deliveryOrder ? (
        <Paper withBorder p="md">
          <Group justify="space-between" align="flex-start" gap="md">
            <div>
              <Text fw={700}>{deliveryOrder.product_details.item_name_requested}</Text>
              <Text size="sm" c="dimmed">
                {deliveryOrder.sap_integration.supplier_name ?? t('efms.supplierPending')}
              </Text>
            </div>
            <StatusBadge status={deliveryOrder.order_info.status} />
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
            <Info label={t('efms.doNumber')} value={deliveryOrder.order_info.order_number} />
            <Info label={t('quotations.requestCode')} value={deliveryOrder.order_info.request_code} />
            <Info label={t('common.status')} value={statusLabel(deliveryOrder.order_info.status)} />
          </SimpleGrid>
        </Paper>
      ) : null}
    </Stack>
  );
}
