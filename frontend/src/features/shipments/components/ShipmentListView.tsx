import { ActionIcon, Anchor, Badge, Button, Checkbox, Group, Paper, ScrollArea, SegmentedControl, Select, Stack, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCalendarStats, IconExternalLink, IconSearch, IconTruck, IconX } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentModeV1 } from '@shared/api/shipments';
import { DateField } from '@shared/components/DateField';
import { CopyValue } from '@shared/components/CopyValue';
import { EmptyState } from '@shared/components/EmptyState';
import { EntityLink } from '@entities/logistics';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { StatusBadge } from '@shared/components/StatusBadge';
import { useI18n } from '@shared/i18n';

import { channelColor, shipmentModeOptions, type ShipmentChannelFilter } from '../model/shipmentModel';
import { useShipmentsUiStore } from '../model/shipmentsUiStore';
import { CreateDtoFromShipmentPanel } from './CreateDtoFromShipmentPanel';

const CHANNEL_LABEL_KEY: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN: 'shipments.channelGreen',
  YELLOW: 'shipments.channelYellow',
  RED: 'shipments.channelRed',
};

const CHANNEL_HINT_KEY: Record<'GREEN' | 'YELLOW' | 'RED', string> = {
  GREEN: 'shipments.channelGreenHint',
  YELLOW: 'shipments.channelYellowHint',
  RED: 'shipments.channelRedHint',
};

export function ShipmentListView({
  carrierOptions,
  filteredShipments,
  isFetching,
  onSelectShipment,
  tabCounts,
}: {
  carrierOptions: Array<{ label: string; value: string }>;
  filteredShipments: ShipmentRecord[];
  isFetching: boolean;
  onSelectShipment: (shipment: ShipmentRecord) => void;
  tabCounts: { all: number; in_transit: number; customs: number; delivered: number };
}) {
  const { t } = useI18n();
  const translatedShipmentModeOptions = shipmentModeOptions.map((option) => ({
    label: t(option.labelKey),
    value: option.value,
  }));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dtoModalOpen, setDtoModalOpen] = useState(false);
  const activeTab = useShipmentsUiStore((s) => s.activeTab);
  const search = useShipmentsUiStore((s) => s.search);
  const modeFilter = useShipmentsUiStore((s) => s.modeFilter);
  const carrierFilter = useShipmentsUiStore((s) => s.carrierFilter);
  const channelFilter = useShipmentsUiStore((s) => s.channelFilter);
  const etdFrom = useShipmentsUiStore((s) => s.etdFrom);
  const etdTo = useShipmentsUiStore((s) => s.etdTo);
  const onTabChange = useShipmentsUiStore((s) => s.setActiveTab);
  const onSearchChange = useShipmentsUiStore((s) => s.setSearch);
  const onModeFilterChange = useShipmentsUiStore((s) => s.setModeFilter);
  const onCarrierFilterChange = useShipmentsUiStore((s) => s.setCarrierFilter);
  const onChannelFilterChange = useShipmentsUiStore((s) => s.setChannelFilter);
  const onEtdFromChange = useShipmentsUiStore((s) => s.setEtdFrom);
  const onEtdToChange = useShipmentsUiStore((s) => s.setEtdTo);
  const onClearFilters = useShipmentsUiStore((s) => s.clearFilters);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleShipments,
  } = useListPagination(filteredShipments, [activeTab, search, modeFilter, carrierFilter, channelFilter, etdFrom, etdTo]);

  const isDtoEligible = (shipment: ShipmentRecord) => shipment.status === 'CUSTOMS_CLEARED';
  const eligibleVisible = visibleShipments.filter(isDtoEligible);
  const allEligibleSelected =
    eligibleVisible.length > 0 && eligibleVisible.every((shipment) => selectedIds.includes(shipment.id));
  const someEligibleSelected = eligibleVisible.some((shipment) => selectedIds.includes(shipment.id));
  const selectedShipments = useMemo(
    () => filteredShipments.filter((shipment) => selectedIds.includes(shipment.id)),
    [filteredShipments, selectedIds],
  );
  const hasActiveFilters =
    search.trim() !== '' ||
    modeFilter !== 'all' ||
    Boolean(carrierFilter) ||
    channelFilter !== 'all' ||
    etdFrom !== '' ||
    etdTo !== '';

  const toggleRow = (id: string) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const toggleAllVisible = () =>
    setSelectedIds((current) => {
      if (allEligibleSelected) {
        const visibleIds = new Set(eligibleVisible.map((shipment) => shipment.id));
        return current.filter((id) => !visibleIds.has(id));
      }
      return Array.from(new Set([...current, ...eligibleVisible.map((shipment) => shipment.id)]));
    });

  if (dtoModalOpen) {
    return (
      <Stack gap="lg">
        <CreateDtoFromShipmentPanel
          opened
          shipments={selectedShipments}
          onClose={() => setDtoModalOpen(false)}
          onCreated={() => setSelectedIds([])}
        />
      </Stack>
    );
  }

  return (
    <>
      <div className="shipment-filter-toolbar">
        <FilterToolbar
          activeTab={activeTab}
          isFetching={isFetching}
          onTabChange={onTabChange}
          shown={filteredShipments.length}
          tabs={[
            { label: t('common.all'), value: 'all', count: tabCounts.all },
            { label: t('shipments.inTransit'), value: 'in_transit', count: tabCounts.in_transit },
            { label: t('shipments.customsProcessing'), value: 'customs', count: tabCounts.customs },
            { label: t('shipments.delivered'), value: 'delivered', count: tabCounts.delivered },
          ]}
        >
          <Stack className="shipment-filter-shell" gap="sm">
            <div className="shipment-filter-primary dl-filter-row">
              <TextInput
                label={t('common.search')}
                placeholder={t('shipments.searchPlaceholder')}
                leftSection={<IconSearch size={16} />}
                className="kbfe-search-input"
                value={search}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
              />
              <Select
                label={<HeaderLabel label={t('shipments.shipmentMode')} hint={t('glossary.shippingMode')} />}
                value={modeFilter}
                onChange={(value) => onModeFilterChange((value ?? 'all') as ShipmentModeV1 | 'all')}
                data={[{ label: t('shipments.allModes'), value: 'all' }, ...translatedShipmentModeOptions]}
              />
              <Select
                label={<HeaderLabel label={t('shipments.carrier')} hint={t('glossary.carrier')} />}
                placeholder={t('shipments.allCarriers')}
                value={carrierFilter}
                onChange={onCarrierFilterChange}
                data={carrierOptions}
                searchable
                clearable
                nothingFoundMessage={t('shipments.allCarriers')}
              />
              <Button
                className="shipment-filter-clear"
                variant={hasActiveFilters ? 'light' : 'subtle'}
                leftSection={<IconX size={16} />}
                onClick={onClearFilters}
                disabled={!hasActiveFilters}
              >
                {t('common.clear')}
              </Button>
            </div>

            <div className="shipment-filter-advanced dl-filter-advanced">
              <div className="shipment-filter-secondary">
                <Stack gap={6} className="shipment-filter-channel">
                  <Group justify="space-between" gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500}>
                      <HeaderLabel label={t('shipments.channel')} hint={t('glossary.customsChannel')} />
                    </Text>
                  </Group>
                  <SegmentedControl
                    fullWidth
                    value={channelFilter}
                    onChange={(value) => onChannelFilterChange(value as ShipmentChannelFilter)}
                    data={[
                      {
                        label: (
                          <Group component="span" gap={6} justify="center" wrap="nowrap">
                            <span className="shipment-filter-channel-dot shipment-filter-channel-dot-all" />
                            {t('common.all')}
                          </Group>
                        ),
                        value: 'all',
                      },
                      {
                        label: (
                          <Group component="span" gap={6} justify="center" wrap="nowrap">
                            <span className="shipment-filter-channel-dot shipment-filter-channel-dot-green" />
                            {t('shipments.channelGreen')}
                          </Group>
                        ),
                        value: 'GREEN',
                      },
                      {
                        label: (
                          <Group component="span" gap={6} justify="center" wrap="nowrap">
                            <span className="shipment-filter-channel-dot shipment-filter-channel-dot-yellow" />
                            {t('shipments.channelYellow')}
                          </Group>
                        ),
                        value: 'YELLOW',
                      },
                      {
                        label: (
                          <Group component="span" gap={6} justify="center" wrap="nowrap">
                            <span className="shipment-filter-channel-dot shipment-filter-channel-dot-red" />
                            {t('shipments.channelRed')}
                          </Group>
                        ),
                        value: 'RED',
                      },
                    ]}
                  />
                </Stack>
                <div className="shipment-filter-dates dl-filter-dates">
                  <DateField
                    label={<HeaderLabel label={t('shipments.etdFrom')} hint={t('glossary.etd')} />}
                    leftSection={<IconCalendarStats size={16} />}
                    value={etdFrom}
                    onChange={(value) => onEtdFromChange(value ?? '')}
                  />
                  <DateField
                    label={<HeaderLabel label={t('shipments.etdTo')} hint={t('glossary.etd')} />}
                    leftSection={<IconCalendarStats size={16} />}
                    value={etdTo}
                    onChange={(value) => onEtdToChange(value ?? '')}
                  />
                </div>
              </div>
            </div>
          </Stack>
        </FilterToolbar>
      </div>

      {selectedIds.length > 0 ? (
        <Paper withBorder p="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {t('shipments.selectedCount').replace('{count}', String(selectedIds.length))}
            </Text>
            <Group gap="xs">
              <Button variant="subtle" size="xs" onClick={() => setSelectedIds([])}>
                {t('common.clear')}
              </Button>
              <Button
                size="xs"
                color="teal"
                leftSection={<IconTruck size={16} />}
                onClick={() => setDtoModalOpen(true)}
              >
                {selectedIds.length > 1
                  ? t('shipments.consolidateDto').replace('{count}', String(selectedIds.length))
                  : t('shipments.createDto')}
              </Button>
            </Group>
          </Group>
        </Paper>
      ) : null}

      <Paper withBorder p={0} className="dl-data-panel">
        {filteredShipments.length === 0 ? (
          <EmptyState title={t('shipments.emptyTitle')} description={t('shipments.emptyDescription')} />
        ) : (
          <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
            <Table miw={1280} verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={40}>
                    <Tooltip label={t('shipments.selectClearedHint')}>
                      <Checkbox
                        aria-label={t('common.selectAll')}
                        checked={allEligibleSelected}
                        indeterminate={someEligibleSelected && !allEligibleSelected}
                        disabled={eligibleVisible.length === 0}
                        onChange={toggleAllVisible}
                      />
                    </Tooltip>
                  </Table.Th>
                  <Table.Th>{t('shipments.shipmentNumber')}</Table.Th>
                  <Table.Th>{t('shipments.links')}</Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.carrier')} hint={t('glossary.carrier')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.vessel')} hint={t('glossary.vessel')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.port')} hint={t('glossary.port')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('common.route')} hint={t('glossary.route')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.etd')} hint={t('glossary.etd')} />
                  </Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.eta')} hint={t('glossary.eta')} />
                  </Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>
                    <HeaderLabel label={t('shipments.channel')} hint={t('glossary.customsChannel')} />
                  </Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleShipments.map((shp) => (
                  <Table.Tr
                    key={shp.id}
                    onClick={() => onSelectShipment(shp)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td onClick={(event) => event.stopPropagation()}>
                      <Tooltip
                        label={isDtoEligible(shp) ? t('shipments.createDto') : t('shipments.createDtoDisabledHint')}
                        disabled={isDtoEligible(shp)}
                      >
                        <Checkbox
                          aria-label={t('shipments.createDto')}
                          checked={selectedIds.includes(shp.id)}
                          disabled={!isDtoEligible(shp)}
                          onChange={() => toggleRow(shp.id)}
                        />
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <CopyValue value={shp.shipment_number} hoverReveal>
                        <Text component="span" fw={700} className="dl-code-text">{shp.shipment_number}</Text>
                      </CopyValue>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2} align="flex-start">
                        <EntityLink type="do" id={shp.do_number} compact />
                        {shp.po_number ? (
                          <Tooltip label={t('entityLink.openPo')}>
                            <Anchor
                              component={Link}
                              to={`/purchase-orders?po=${shp.po_number}`}
                              size="xs"
                              c="dimmed"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {shp.po_number}
                            </Anchor>
                          </Tooltip>
                        ) : null}
                      </Stack>
                    </Table.Td>
                    <Table.Td>{shp.carrier_name}</Table.Td>
                    <Table.Td>{shp.vessel_voyage}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{shp.dest_port || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>{shp.origin_port}</Text>
                      <Text size="xs" c="dimmed">{shp.dest_port}</Text>
                    </Table.Td>
                    <Table.Td>{shp.etd}</Table.Td>
                    <Table.Td>{shp.eta}</Table.Td>
                    <Table.Td>
                      <StatusBadge status={shp.status} />
                    </Table.Td>
                    <Table.Td>
                      {shp.customs.lane_status ? (
                        <Tooltip label={t(CHANNEL_HINT_KEY[shp.customs.stream])}>
                          <Badge color={channelColor(shp.customs.stream)} variant="filled">
                            {t(CHANNEL_LABEL_KEY[shp.customs.stream])}
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Tooltip label={t('shipments.channelUnassigned')}>
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        </Tooltip>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={t('common.view')}>
                        <ActionIcon
                          variant="subtle"
                          aria-label={t('common.view')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectShipment(shp);
                          }}
                        >
                          <IconExternalLink size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
        <ListPagination
          page={page}
          pageCount={pageCount}
          pageEnd={pageEnd}
          pageStart={pageStart}
          setPage={setPage}
          total={filteredShipments.length}
        />
      </Paper>

    </>
  );
}
