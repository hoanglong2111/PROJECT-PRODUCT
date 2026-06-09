import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IconAnchor,
  IconCalendar,
  IconCheck,
  IconClock,
  IconExternalLink,
  IconFileCheck,
  IconHourglassHigh,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShield,
  IconX,
  IconChecklist,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { EntityLink } from '@shared/components/EntityLink';
import { FilterToolbar } from '@shared/components/FilterToolbar';
import { FlowTagBadge } from '@shared/components/FlowTagBadge';
import { ListPagination, useListPagination } from '@shared/components/ListPagination';
import { PageError, PageLoading } from '@shared/components/PageFeedback';
import { StatusBadge } from '@shared/components/StatusBadge';
import { EmptyState } from '@shared/components/EmptyState';
import {
  fetchShipments,
  createShipment,
  updateShipment,
  type ShipmentRecord,
  type ShipmentMilestone,
  type ShipmentDocument,
  type ShipmentPoTask,
} from '@shared/api/logistics';
import { useEntityParam } from '@shared/hooks/useEntityParam';
import { useI18n } from '@shared/i18n';

type ShipmentTab = 'all' | 'in_transit' | 'customs' | 'delivered';
type ShipmentWorkbench = 'list' | 'create' | 'detail';

const shipmentStatusTabs: Record<ShipmentTab, ShipmentRecord['status'] | 'all'> = {
  all: 'all',
  in_transit: 'IN_TRANSIT',
  customs: 'CUSTOMS_PROCESSING',
  delivered: 'DELIVERED',
};

function Metric({
  color = 'blue',
  icon,
  label,
  value,
}: {
  color?: string;
  icon?: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Paper withBorder p="md" className="metric-card">
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text className="metric-label" size="xs" fw={700} lts="0.05em" tt="uppercase" mb={4}>
            {label}
          </Text>
          <Title order={1} fw={800} c={color} style={{ lineHeight: 1.1 }}>
            {value}
          </Title>
        </div>
        {icon && <span className={`metric-icon metric-icon-${color}`}>{icon}</span>}
      </Group>
    </Paper>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="sm">
      <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Paper>
  );
}

export function Shipments() {
  const { t } = useI18n();
  const { close: closeShpParam, open: openShpParam, value: focusedShp } = useEntityParam('shp');
  const [selectedShpId, setSelectedShpId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ShipmentTab>('all');
  const [workbench, setWorkbench] = useState<ShipmentWorkbench>('list');
  const [search, setSearch] = useState('');

  // Create form states
  const [newShpNumber, setNewShpNumber] = useState('');
  const [newDoNumber, setNewDoNumber] = useState('');
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newCarrier, setNewCarrier] = useState('');
  const [newVoyage, setNewVoyage] = useState('');

  const queryClient = useQueryClient();

  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments,
  });
  const shipments = shipmentsQuery.data ?? [];
  const isFetching = shipmentsQuery.isFetching;

  useEffect(() => {
    if (!focusedShp) {
      if (workbench === 'detail') {
        setSelectedShpId(null);
        setWorkbench('list');
      }
      return;
    }

    if (shipments.length === 0) return;

    const matched = shipments.find((s) => s.shipment_number === focusedShp);
    if (matched) {
      setSelectedShpId(matched.id);
      setWorkbench('detail');
    }
  }, [focusedShp, shipments, workbench]);

  const filteredShipments = useMemo(() => {
    const query = search.toLowerCase().trim();
    return shipments.filter((shp) => {
      const statusMatches =
        activeTab === 'all' ||
        (activeTab === 'in_transit' && shp.status === 'IN_TRANSIT') ||
        (activeTab === 'customs' && shp.status === 'CUSTOMS_PROCESSING') ||
        (activeTab === 'delivered' && shp.status === 'DELIVERED');

      const matchesSearch = [
        shp.shipment_number,
        shp.do_number,
        shp.po_number,
        shp.carrier_name,
        shp.vessel_voyage,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);

      return statusMatches && matchesSearch;
    });
  }, [shipments, activeTab, search]);

  const {
    page,
    pageCount,
    pageEnd,
    pageStart,
    setPage,
    visibleItems: visibleShipments,
  } = useListPagination(filteredShipments, [activeTab, search]);

  const tabCounts = useMemo(
    () => ({
      all: shipments.length,
      in_transit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
      customs: shipments.filter((s) => s.status === 'CUSTOMS_PROCESSING').length,
      delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
    }),
    [shipments]
  );

  const selectedShipment =
    selectedShpId === null
      ? null
      : filteredShipments.find((s) => s.id === selectedShpId) ??
        shipments.find((s) => s.id === selectedShpId) ??
        null;

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: (newShipment) => {
      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setNewShpNumber('');
      setNewDoNumber('');
      setNewPoNumber('');
      setNewCarrier('');
      setNewVoyage('');
      setSelectedShpId(newShipment.id);
      setWorkbench('detail');
      openShpParam(newShipment.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
    },
  });

  const handleCreateShipment = () => {
    if (!newShpNumber || !newDoNumber || !newPoNumber) return;
    createMutation.mutate({
      shipmentNumber: newShpNumber,
      doNumber: newDoNumber,
      poNumber: newPoNumber,
      shippingMode: 'SEA',
      carrierName: newCarrier || undefined,
      vesselVoyage: newVoyage || undefined,
    });
  };

  const handleUpdateShipment = (updated: ShipmentRecord) => {
    void queryClient.invalidateQueries({ queryKey: ['shipments'] });
  };

  const closeWorkbench = () => {
    setWorkbench('list');
    setSelectedShpId(null);
    closeShpParam({ clear: ['pr', 'po', 'do', 'task'] });
  };

  const openCreate = () => {
    setSelectedShpId(null);
    setWorkbench('create');
    closeShpParam({ clear: ['pr', 'po', 'do', 'task'] });
  };

  if (shipmentsQuery.isError) {
    return (
      <PageError
        title={t('shipments.errorTitle')}
        description={t('shipments.errorDescription')}
        error={shipmentsQuery.error}
        onRetry={() => {
          void shipmentsQuery.refetch();
        }}
      />
    );
  }

  if (shipmentsQuery.isLoading) {
    return (
      <PageLoading
        title={t('shipments.title')}
        description={t('shipments.loadingDescription')}
        tableColumns={[
          t('shipments.shipmentNumber'),
          t('shipments.linkedDo'),
          t('common.carrier'),
          t('common.route'),
          t('shipments.etd'),
          t('shipments.eta'),
          t('common.status'),
        ]}
      />
    );
  }

  return (
    <Stack gap="lg">
      {workbench === 'list' ? (
        <Group justify="space-between" align="flex-start" gap="md">
          <div>
            <Title order={1}>{t('shipments.title')}</Title>
            <Text c="dimmed" mt={4}>
              {t('shipments.subtitle')}
            </Text>
          </div>
          <Group gap="xs">
            <Button onClick={openCreate} leftSection={<IconPlus size={16} />} variant="light">
              {t('shipments.create')}
            </Button>
            <Badge leftSection={<IconAnchor size={14} />} size="lg" variant="light">
              {t('shell.poDo')}
            </Badge>
          </Group>
        </Group>
      ) : (
        <Group justify="space-between" align="center" gap="md">
          <Group gap="xs" align="center">
            <Button onClick={closeWorkbench} leftSection={<IconX size={16} />} variant="subtle" size="sm">
              {t('common.backToList')}
            </Button>
            <Text c="dimmed" size="sm">·</Text>
            <Text fw={600} size="sm">
              {workbench === 'create' ? t('shipments.create') : selectedShipment?.shipment_number ?? ''}
            </Text>
          </Group>
          <Badge leftSection={<IconAnchor size={14} />} size="md" variant="light">
            {t('shell.poDo')}
          </Badge>
        </Group>
      )}

      {workbench === 'list' ? (
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          <Metric label={t('shipments.total')} value={shipments.length} color="blue" icon={<IconAnchor size={22} />} />
          <Metric label={t('shipments.inTransit')} value={tabCounts.in_transit} color="orange" icon={<IconClock size={22} />} />
          <Metric label={t('shipments.customsProcessing')} value={tabCounts.customs} color="yellow" icon={<IconShield size={22} />} />
          <Metric label={t('shipments.delivered')} value={tabCounts.delivered} color="teal" icon={<IconCheck size={22} />} />
        </SimpleGrid>
      ) : null}

      {workbench === 'create' ? (
        <Paper withBorder p="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3}>{t('shipments.create')}</Title>
                <Text size="sm" c="dimmed">
                  {t('shipments.createHint')}
                </Text>
              </div>
              <Group gap="xs">
                <Button variant="subtle" onClick={closeWorkbench} leftSection={<IconX size={16} />}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateShipment}
                  leftSection={<IconAnchor size={16} />}
                  disabled={!newShpNumber || !newDoNumber || !newPoNumber}
                  loading={createMutation.isPending}
                >
                  {t('shipments.create')}
                </Button>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 3 }}>
              <TextInput
                label={t('shipments.shipmentNumber')}
                placeholder="VD: SHP-2026-0001"
                value={newShpNumber}
                onChange={(e) => setNewShpNumber(e.currentTarget.value)}
                required
              />
              <TextInput
                label={t('shipments.linkedDo')}
                placeholder="DO-2026-XXXX"
                value={newDoNumber}
                onChange={(e) => setNewDoNumber(e.currentTarget.value)}
                required
              />
              <TextInput
                label={t('shipments.linkedPo')}
                placeholder="PO-2026-XXXX"
                value={newPoNumber}
                onChange={(e) => setNewPoNumber(e.currentTarget.value)}
                required
              />
              <TextInput
                label={t('shipments.carrier')}
                placeholder="Hapag Lloyd, Maersk..."
                value={newCarrier}
                onChange={(e) => setNewCarrier(e.currentTarget.value)}
              />
              <TextInput
                label={t('shipments.vessel')}
                placeholder="Tên tàu / chuyến bay"
                value={newVoyage}
                onChange={(e) => setNewVoyage(e.currentTarget.value)}
              />
            </SimpleGrid>
          </Stack>
        </Paper>
      ) : null}

      {workbench === 'detail' && selectedShipment ? (
        <Stack gap="lg">
          {/* Identity card */}
          <Paper withBorder p="lg" className="workbench-section">
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap="xs" mb={4} wrap="nowrap">
                  <Title order={3}>{selectedShipment.shipment_number}</Title>
                  <StatusBadge status={selectedShipment.status} />
                </Group>
                <Text c="dimmed" size="sm">
                  {selectedShipment.carrier_name} · {selectedShipment.vessel_voyage}
                </Text>
              </div>
              <Group gap="xs">
                <EntityLink type="do" id={selectedShipment.do_number} />
                <EntityLink type="po" id={selectedShipment.po_number} />
              </Group>
            </Group>
          </Paper>

          <Tabs defaultValue="overview">
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
              <Tabs.Tab value="customs" leftSection={<IconShield size={14} />}>
                {t('shipments.customs')}
              </Tabs.Tab>
              <Tabs.Tab value="costs" leftSection={<IconHourglassHigh size={14} />}>
                {t('shipments.costs')}
              </Tabs.Tab>
              <Tabs.Tab value="tasks" leftSection={<IconChecklist size={14} />}>
                {t('shipments.tasks')}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <SimpleGrid cols={{ base: 1, sm: 4 }}>
                <Info label={t('shipments.carrier')} value={selectedShipment.carrier_name} />
                <Info label={t('shipments.vessel')} value={selectedShipment.vessel_voyage} />
                <Info label="POL" value={selectedShipment.origin_port} />
                <Info label="POD" value={selectedShipment.dest_port} />
                <Info label={t('shipments.etd')} value={selectedShipment.etd} />
                <Info label={t('shipments.eta')} value={selectedShipment.eta} />
                <Info label="Customs Stream" value={selectedShipment.customs.stream} />
                <Info label="Tasks Completed" value={`${selectedShipment.po_tasks.filter((t) => t.status === 'COMPLETED').length}/${selectedShipment.po_tasks.length}`} />
              </SimpleGrid>
            </Tabs.Panel>

            <Tabs.Panel value="milestones" pt="md">
              <ShipmentMilestonesPanel shipment={selectedShipment} onUpdate={handleUpdateShipment} t={t} />
            </Tabs.Panel>

            <Tabs.Panel value="documents" pt="md">
              <ShipmentDocumentsPanel shipment={selectedShipment} onUpdate={handleUpdateShipment} t={t} />
            </Tabs.Panel>

            <Tabs.Panel value="customs" pt="md">
              <ShipmentCustomsPanel shipment={selectedShipment} onUpdate={handleUpdateShipment} />
            </Tabs.Panel>

            <Tabs.Panel value="costs" pt="md">
              <ShipmentCostsPanel shippingMode={selectedShipment.shipping_mode} />
            </Tabs.Panel>

            <Tabs.Panel value="tasks" pt="md">
              <ShipmentTasksPanel tasks={selectedShipment.po_tasks} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      ) : null}

      {workbench === 'list' ? (
        <>
          <FilterToolbar
            activeTab={activeTab}
            isFetching={isFetching}
            onTabChange={setActiveTab}
            shown={filteredShipments.length}
            tabs={[
              { label: t('common.all'), value: 'all', count: tabCounts.all },
              { label: t('shipments.inTransit'), value: 'in_transit', count: tabCounts.in_transit },
              { label: t('shipments.customsProcessing'), value: 'customs', count: tabCounts.customs },
              { label: t('shipments.delivered'), value: 'delivered', count: tabCounts.delivered },
            ]}
          >
            <TextInput
              label={t('common.search')}
              placeholder={t('shipments.searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={{ base: '100%', sm: 360 }}
            />
          </FilterToolbar>

          <Paper withBorder p={0}>
            {filteredShipments.length === 0 ? (
              <EmptyState title={t('shipments.emptyTitle')} description={t('shipments.emptyDescription')} />
            ) : (
              <ScrollArea className="data-table-scroll" type="always" offsetScrollbars scrollbarSize={8}>
                <Table miw={1180} verticalSpacing="sm" highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('shipments.shipmentNumber')}</Table.Th>
                      <Table.Th>{t('shipments.linkedDo')}</Table.Th>
                      <Table.Th>{t('common.carrier')}</Table.Th>
                      <Table.Th>{t('shipments.vessel')}</Table.Th>
                      <Table.Th>{t('common.route')}</Table.Th>
                      <Table.Th>{t('shipments.etd')}</Table.Th>
                      <Table.Th>{t('shipments.eta')}</Table.Th>
                      <Table.Th>{t('common.status')}</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {visibleShipments.map((shp) => (
                      <Table.Tr
                        key={shp.id}
                        onClick={() => {
                          setSelectedShpId(shp.id);
                          setWorkbench('detail');
                          openShpParam(shp.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          <Text fw={700}>{shp.shipment_number}</Text>
                          <FlowTagBadge tags={[]} />
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <EntityLink type="do" id={shp.do_number} compact />
                            <EntityLink type="po" id={shp.po_number} compact />
                          </Group>
                        </Table.Td>
                        <Table.Td>{shp.carrier_name}</Table.Td>
                        <Table.Td>{shp.vessel_voyage}</Table.Td>
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
                          <Tooltip label={t('shipments.inTransit')}>
                            <ActionIcon
                              variant="subtle"
                              aria-label={t('common.view')}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedShpId(shp.id);
                                setWorkbench('detail');
                                openShpParam(shp.shipment_number, { clear: ['pr', 'po', 'do', 'task'] });
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
      ) : null}
    </Stack>
  );
}

function ShipmentMilestonesPanel({
  onUpdate,
  shipment,
  t,
}: {
  onUpdate: (updated: ShipmentRecord) => void;
  shipment: ShipmentRecord;
  t: (key: string) => string;
}) {
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneSource, setMilestoneSource] = useState<'MANUAL' | 'API' | 'EMAIL'>('MANUAL');
  const [milestoneNote, setMilestoneNote] = useState('');

  const milestoneLabels: Record<string, string> = {
    BOOKING_CONFIRMED: '1. Booking Confirmed',
    CARGO_READY: '2. Cargo Ready',
    PICK_UP: '3. Pick up',
    BL_ISSUED: '4. B/L Issued',
    GATE_IN_POL: '5. Gate in POL',
    ATD: '6. ATD',
    CUSTOM_DRAFT_SUBMITTED: '7. Customs Draft Submitted',
    AN_ATA: '8. AN/ATA',
    CUSTOM_CLEARED: '9. Customs Cleared',
    EDO_DELIVERY: '10. eDO Delivery',
  };

  const renderedMilestones = useMemo(() => {
    const sequence = [
      'BOOKING_CONFIRMED',
      'CARGO_READY',
      'PICK_UP',
      'BL_ISSUED',
      'GATE_IN_POL',
      'ATD',
      'CUSTOM_DRAFT_SUBMITTED',
      'AN_ATA',
      'CUSTOM_CLEARED',
      'EDO_DELIVERY',
    ];
    return sequence.map((code) => {
      const found = shipment.milestones.find((m) => m.milestone_code === code);
      return found ?? {
        id: `m-dummy-${code}`,
        milestone_code: code as any,
        planned_date: null,
        actual_date: null,
        source: 'MANUAL' as const,
        note: null,
      };
    });
  }, [shipment.milestones]);

  const handleUpdateMilestone = (milestoneId: string) => {
    const updatedMilestones = shipment.milestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          actual_date: milestoneDate || null,
          source: milestoneSource,
          note: milestoneNote || null,
        };
      }
      return m;
    });
    onUpdate({ ...shipment, milestones: updatedMilestones });
    setEditingMilestoneId(null);
    setMilestoneDate('');
    setMilestoneNote('');
  };

  return (
    <Stack gap="md">
      <Alert color="blue" icon={<IconCalendar size={18} />}>
        Track 10 logistics milestones for international shipping.
      </Alert>
      <Paper withBorder p="md">
        <Stack gap="xs">
          {renderedMilestones.map((m, idx) => {
            const label = milestoneLabels[m.milestone_code] || m.milestone_code;
            const isCompleted = !!m.actual_date;
            const isBlocked = m.milestone_code === 'ATD' || m.milestone_code === 'CUSTOM_DRAFT_SUBMITTED';
            const isNested = m.milestone_code === 'PICK_UP' || m.milestone_code === 'GATE_IN_POL';

            return (
              <div
                key={m.id}
                style={{
                  paddingLeft: isNested ? '24px' : '0px',
                  borderLeft: isNested ? '2px dashed var(--mantine-color-blue-light)' : 'none',
                  marginLeft: isNested ? '12px' : '0px',
                  opacity: isBlocked ? 0.4 : 1,
                }}
              >
                <Paper
                  withBorder
                  p="xs"
                  mb="xs"
                  style={{
                    backgroundColor: isCompleted ? 'var(--mantine-color-teal-light)' : 'transparent',
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={isCompleted ? 700 : 400}>
                      {label}
                    </Text>
                    {!isBlocked && (
                      <Button
                        size="xs"
                        variant="light"
                        color={isCompleted ? 'teal' : 'blue'}
                        onClick={() => {
                          setEditingMilestoneId(m.id);
                          setMilestoneDate(m.actual_date || '');
                          setMilestoneSource(m.source);
                          setMilestoneNote(m.note || '');
                        }}
                      >
                        {isCompleted ? 'Update' : 'Mark done'}
                      </Button>
                    )}
                  </Group>
                  {isCompleted ? (
                    <Text size="xs" c="teal">
                      Completed: {m.actual_date} ({m.source}) · {m.note || 'No note'}
                    </Text>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Planned: {m.planned_date || '-'}
                    </Text>
                  )}
                </Paper>

                {editingMilestoneId === m.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label="Actual date"
                        type="date"
                        value={milestoneDate}
                        onChange={(e) => setMilestoneDate(e.currentTarget.value)}
                        size="xs"
                      />
                      <Select
                        label="Source"
                        value={milestoneSource}
                        onChange={(val) => setMilestoneSource((val as any) || 'MANUAL')}
                        data={['MANUAL', 'API', 'EMAIL']}
                        size="xs"
                      />
                      <TextInput
                        label="Note"
                        value={milestoneNote}
                        onChange={(e) => setMilestoneNote(e.currentTarget.value)}
size="xs"
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="subtle" onClick={() => setEditingMilestoneId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="xs" color="blue" onClick={() => handleUpdateMilestone(m.id)}>
                          {t('common.save')}
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </div>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ShipmentDocumentsPanel({
  onUpdate,
  shipment,
  t,
}: {
  onUpdate: (updated: ShipmentRecord) => void;
  shipment: ShipmentRecord;
  t: (key: string) => string;
}) {
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusColor = (status: ShipmentDocument['status']) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'WAITING_REVIEW': return 'orange';
      case 'REJECTED': return 'red';
      default: return 'gray';
    }
  };

  const handleDocumentApprove = (docId: string) => {
    const updated = shipment.documents.map((d) =>
      d.id === docId ? { ...d, status: 'APPROVED' as const } : d
    );
    onUpdate({ ...shipment, documents: updated });
  };

  const handleDocumentReject = (docId: string) => {
    if (!rejectReason) return;
    const updated = shipment.documents.map((d) =>
      d.id === docId ? { ...d, status: 'REJECTED' as const, reject_reason: rejectReason } : d
    );
    onUpdate({ ...shipment, documents: updated });
    setRejectingDocId(null);
    setRejectReason('');
  };

  const handleDocumentUpload = (docId: string, file: File | null) => {
    if (!file) return;
    const updated = shipment.documents.map((d) =>
      d.id === docId
        ? {
            ...d,
            file_name: file.name,
            status: 'WAITING_REVIEW' as const,
            uploaded_at: new Date().toISOString(),
            review_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          }
        : d
    );
    onUpdate({ ...shipment, documents: updated });
  };

  return (
    <Stack gap="md">
      <Alert color="orange" icon={<IconHourglassHigh size={18} />}>
        Draft B/L SLA: 2-hour review window for cross-check.
      </Alert>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {shipment.documents.map((doc) => {
          const isWaitingReview = doc.status === 'WAITING_REVIEW';
          const hasFile = !!doc.file_name;

          return (
            <Paper key={doc.id} withBorder p="md">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={700} size="sm">
                    {doc.document_type}
                  </Text>
                  <Badge color={getStatusColor(doc.status)}>{doc.status}</Badge>
                </Group>

                {hasFile ? (
                  <Text size="xs" c="blue" style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                    {doc.file_name}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed" fs="italic">
                    No file uploaded.
                  </Text>
                )}

                {isWaitingReview && doc.review_due_at && (
                  <Group justify="space-between">
                    <Text size="xs" fw={700}>SLA Review Timeleft:</Text>
                    <Badge color="orange" variant="filled">
                      2h SLA
                    </Badge>
                  </Group>
                )}

                {doc.reject_reason && (
                  <Text size="xs" c="red" fw={600}>
                    Rejected: {doc.reject_reason}
                  </Text>
                )}

                <Group gap="xs" justify="flex-end" mt="xs">
                  <FileInput
                    placeholder="Upload..."
                    size="xs"
                    onChange={(file) => handleDocumentUpload(doc.id, file)}
                    style={{ maxWidth: 120 }}
                  />
                  {isWaitingReview && (
                    <>
                      <Button size="xs" color="green" onClick={() => handleDocumentApprove(doc.id)}>
                        Approve
                      </Button>
                      <Button size="xs" color="red" variant="light" onClick={() => setRejectingDocId(doc.id)}>
                        Reject
                      </Button>
                    </>
                  )}
                </Group>

                {rejectingDocId === doc.id && (
                  <Paper withBorder p="xs" mt="xs">
                    <Stack gap="xs">
                      <TextInput
                        label="Reject reason"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.currentTarget.value)}
                        size="xs"
                        required
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button size="xs" variant="subtle" onClick={() => setRejectingDocId(null)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="xs" color="red" disabled={!rejectReason} onClick={() => handleDocumentReject(doc.id)}>
                          Confirm reject
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function ShipmentCustomsPanel({
  onUpdate,
  shipment,
}: {
  onUpdate: (updated: ShipmentRecord) => void;
  shipment: ShipmentRecord;
}) {
  const [customsStream, setCustomsStream] = useState(shipment.customs.stream);
  const [declarationNo, setDeclarationNo] = useState(shipment.customs.declaration_no || '');
  const [laneStatus, setLaneStatus] = useState(shipment.customs.lane_status);

  const handleSave = () => {
    onUpdate({
      ...shipment,
      customs: {
        ...shipment.customs,
        stream: customsStream,
        declaration_no: declarationNo || undefined,
        lane_status: laneStatus,
      },
    });
  };

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Text fw={700} size="sm">
          Customs Classification (GD1 Flow)
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          {(['GREEN', 'YELLOW', 'RED'] as const).map((stream) => (
            <Paper
              key={stream}
              withBorder
              p="md"
              onClick={() => setCustomsStream(stream)}
              style={{
                cursor: 'pointer',
                borderColor: customsStream === stream ? `var(--mantine-color-${stream === 'GREEN' ? 'teal' : stream === 'YELLOW' ? 'yellow' : 'red'}-filled)` : 'transparent',
                backgroundColor: customsStream === stream ? `var(--mantine-color-${stream === 'GREEN' ? 'teal' : stream === 'YELLOW' ? 'yellow' : 'red'}-light)` : 'transparent',
              }}
            >
              <Stack align="center" gap={4}>
                <Badge color={stream === 'GREEN' ? 'teal' : stream === 'YELLOW' ? 'yellow' : 'red'} size="lg">
                  {stream} stream
                </Badge>
                <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                  {stream === 'GREEN' && 'Green lane - automated customs clearance'}
                  {stream === 'YELLOW' && 'Yellow lane - document supplement required'}
                  {stream === 'RED' && 'Red lane - field inspection required'}
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
          <TextInput
            label="Declaration number"
            placeholder="Customs declaration number"
            value={declarationNo}
            onChange={(e) => setDeclarationNo(e.currentTarget.value)}
          />
          <TextInput
            label="Lane status"
            placeholder="Detailed status"
            value={laneStatus}
            onChange={(e) => setLaneStatus(e.currentTarget.value)}
          />
        </SimpleGrid>

        <Group justify="flex-end">
          <Button color="blue" onClick={handleSave}>
            Save customs
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function ShipmentCostsPanel({ shippingMode }: { shippingMode: 'SEA' | 'AIR' }) {
  const freight = shippingMode === 'SEA' ? 4200 : 8800;
  const costs = [
    { code: 'FREIGHT', label: 'Freight', amount: freight, currency: 'USD' },
    { code: 'INSURANCE', label: 'Insurance', amount: 360, currency: 'USD' },
    { code: 'CUSTOMS', label: 'Customs clearance', amount: 220, currency: 'USD' },
    { code: 'LOCAL', label: 'Local charges', amount: 680, currency: 'USD' },
    { code: 'DUTY', label: 'Import duty estimate', amount: 950, currency: 'USD' },
  ];
  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Paper withBorder p="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={700} size="sm">Landed Cost</Text>
          <Badge size="lg" color="teal">
            {total.toLocaleString()} USD
          </Badge>
        </Group>
        <ScrollArea type="always" offsetScrollbars scrollbarSize={8}>
          <Table miw={680} verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Charge</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {costs.map((cost) => (
                <Table.Tr key={cost.code}>
                  <Table.Td>{cost.code}</Table.Td>
                  <Table.Td>{cost.label}</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {cost.amount.toLocaleString()} {cost.currency}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}

function ShipmentTasksPanel({ tasks }: { tasks: ShipmentPoTask[] }) {
  return (
    <Paper withBorder p="md">
      <Stack gap="sm">
        <Text fw={700} size="sm">
          PO Stage Closure Tasks
        </Text>
        <Text size="xs" c="dimmed">
          Tasks must be completed before shipment can proceed to next stage.
        </Text>
        <Stack mt="sm" gap="xs">
          {tasks.map((task) => (
            <Paper key={task.id} withBorder p="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <Checkbox checked={task.status === 'COMPLETED'} readOnly />
                  <Text size="sm" fw={task.status === 'COMPLETED' ? 500 : 600} style={{ textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                    {task.task_name}
                  </Text>
                </Group>
                <Badge color="gray">{task.assignee_role}</Badge>
              </Group>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}