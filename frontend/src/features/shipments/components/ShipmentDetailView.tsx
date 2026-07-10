import { Group, Stack, Tabs, Text, Title } from '@mantine/core';
import {
  IconAnchor,
  IconBox,
  IconCalendar,
  IconChecklist,
  IconFileCheck,
  IconFileInvoice,
  IconHourglassHigh,
  IconShield,
  IconShip,
  IconTruck,
} from '@tabler/icons-react';

import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentCostPayload, ShipmentDocumentPayload, ShipmentMilestoneCodeV1 } from '@shared/api/shipments';
import { EntityLink } from '@entities/logistics';
import { CopyValue } from '@shared/components/CopyValue';
import { DetailHero } from '@shared/components/DetailHero';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { ShipmentCarrierDoPanel } from './ShipmentCarrierDoPanel';
import { ShipmentContainersPanel } from './ShipmentContainersPanel';
import { ShipmentCostsPanel } from './ShipmentCostsPanel';
import { ShipmentCustomsPanel } from './ShipmentCustomsPanel';
import { ShipmentDocumentsPanel } from './ShipmentDocumentsPanel';
import { ShipmentDtosPanel } from './ShipmentDtosPanel';
import { ShipmentMilestonesPanel } from './ShipmentMilestonesPanel';
import { ShipmentTasksPanel } from './ShipmentTasksPanel';
import { ShipmentOverviewCard } from './ShipmentOverviewCard';

export function ShipmentDetailView({
  isCostSaving,
  isDocumentSaving,
  isMilestoneSaving,
  onCreateCost,
  onCreateDocument,
  onDeleteCost,
  onMarkMilestone,
  onUpdateCost,
  onUpdateDocument,
  onBack,
  shipment,
}: {
  isCostSaving: boolean;
  isDocumentSaving: boolean;
  isMilestoneSaving: boolean;
  onCreateCost: (payload: ShipmentCostPayload) => void;
  onCreateDocument: (payload: ShipmentDocumentPayload) => void;
  onDeleteCost: (costId: string) => void;
  onMarkMilestone: (milestoneCode: ShipmentMilestoneCodeV1, payload: { actualAt: string; notes?: string | null }) => void;
  onUpdateCost: (costId: string, payload: Partial<ShipmentCostPayload>) => void;
  onUpdateDocument: (documentId: string, payload: Partial<ShipmentDocumentPayload>) => void;
  onBack: () => void;
  shipment: ShipmentRecord;
}) {
  const { t } = useI18n();
  return (
    <Stack gap="lg">
      {/* Identity card */}
      <FeatureHeaderShell backLabel={t('common.backToList')} onBack={onBack}>
        <DetailHero
          className="workbench-section shipment-detail-identity"
          collapseLayout
          paperProps={{ withBorder: true, p: 'md' }}
        >
          <Group gap="sm" align="flex-start" wrap="nowrap" className="feature-detail-heading feature-hero-identity">
            <div className="feature-hero-icon" aria-hidden="true"><IconShip size={19} /></div>
            <div className="feature-detail-copy">
              <Group gap="xs" mb={4} wrap="wrap">
                <Title order={3}>
                  <CopyValue value={shipment.shipment_number}>{shipment.shipment_number}</CopyValue>
                </Title>
                <StatusBadge status={shipment.status} />
              </Group>
              <Text c="dimmed" size="sm">
                {shipment.carrier_name} · {shipment.vessel_voyage}
              </Text>
            </div>
          </Group>
          <dl className="feature-hero-facts">
            <div className="feature-hero-fact">
              <dt>{t('shipments.carrier')}</dt>
              <dd>{shipment.carrier_name || '-'}</dd>
            </div>
            <div className="feature-hero-fact">
              <dt>{t('shipments.vesselVoyage')}</dt>
              <dd>{shipment.vessel_voyage || '-'}</dd>
            </div>
          </dl>
          <Group gap="xs" className="feature-hero-actions">
            <EntityLink type="do" id={shipment.do_number} />
            <EntityLink type="po" id={shipment.po_number} />
          </Group>
        </DetailHero>
      </FeatureHeaderShell>

      <Tabs
        defaultValue="overview"
        className="shipment-detail-tabs"
        classNames={{
          list: 'shipment-detail-tabs-list',
          tab: 'shipment-detail-tabs-tab',
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconAnchor size={14} />}>
            {t('shipments.overview')}
          </Tabs.Tab>
          <Tabs.Tab value="milestones" leftSection={<IconCalendar size={14} />}>
            {t('shipments.milestones')}
          </Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFileCheck size={14} />}>
            {t('shipments.documents')}
          </Tabs.Tab>
          <Tabs.Tab value="containers" leftSection={<IconBox size={14} />}>
            {t('shipments.containers')}
          </Tabs.Tab>
          <Tabs.Tab value="customs" leftSection={<IconShield size={14} />}>
            {t('shipments.customs')}
          </Tabs.Tab>
          <Tabs.Tab value="costs" leftSection={<IconHourglassHigh size={14} />}>
            {t('shipments.costs')}
          </Tabs.Tab>
          <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>
            {t('shipments.tasks')}
          </Tabs.Tab>
          <Tabs.Tab value="carrier-do" leftSection={<IconFileInvoice size={14} />}>
            {t('shipments.carrierDo')}
          </Tabs.Tab>
          <Tabs.Tab value="fds-do" leftSection={<IconFileInvoice size={14} />}>
            {t('shipments.fdsDo')}
          </Tabs.Tab>
          <Tabs.Tab value="dtos" leftSection={<IconTruck size={14} />}>
            DTOs
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="sm">
          <ShipmentOverviewCard shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="milestones" pt="sm">
          <ShipmentMilestonesPanel
            shipment={shipment}
            isSaving={isMilestoneSaving}
            onMarkDone={onMarkMilestone}
          />
        </Tabs.Panel>

        <Tabs.Panel value="documents" pt="sm">
          <ShipmentDocumentsPanel
            shipment={shipment}
            isSaving={isDocumentSaving}
            onCreateDocument={onCreateDocument}
            onUpdateDocument={onUpdateDocument}
          />
        </Tabs.Panel>

        <Tabs.Panel value="containers" pt="sm">
          <ShipmentContainersPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="customs" pt="sm">
          <ShipmentCustomsPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="costs" pt="sm">
          <ShipmentCostsPanel
            shipment={shipment}
            isSaving={isCostSaving}
            onCreateCost={onCreateCost}
            onUpdateCost={onUpdateCost}
            onDeleteCost={onDeleteCost}
          />
        </Tabs.Panel>

        <Tabs.Panel value="tasks" pt="sm">
          <ShipmentTasksPanel tasks={shipment.po_tasks} />
        </Tabs.Panel>

        <Tabs.Panel value="carrier-do" pt="sm">
          <ShipmentCarrierDoPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="fds-do" pt="sm">
          <ShipmentCarrierDoPanel shipment={shipment} />
        </Tabs.Panel>

        <Tabs.Panel value="dtos" pt="sm">
          <ShipmentDtosPanel shipment={shipment} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
