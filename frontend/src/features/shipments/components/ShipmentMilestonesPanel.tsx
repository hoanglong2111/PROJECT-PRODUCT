import { Badge, Button, Group, Paper, Progress, Stack, Text, TextInput, ThemeIcon, Tooltip } from '@mantine/core';
import { IconCircleCheckFilled, IconCircleDot, IconClockHour4, IconRoute } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { DateTimeField } from '@shared/components/DateField';
import { DateTimeText } from '@shared/components/DateTimeText';
import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentMilestoneCodeV1 } from '@shared/api/shipments';
import { useI18n } from '@shared/i18n';

const MILESTONE_SEQUENCE: ShipmentMilestoneCodeV1[] = [
  'BOOKING_CONFIRMED',
  'CARGO_READY',
  'PICKED_UP',
  'BL_ISSUED',
  'GATE_IN_POL',
  'ATD',
  'CUSTOMS_DRAFT',
  'ARRIVAL_NOTICE',
  'CUSTOMS_CLEARED',
  'DELIVERED',
];

const MILESTONE_LABEL_KEYS: Record<ShipmentMilestoneCodeV1, string> = {
  BOOKING_CONFIRMED: 'shipments.milestone.BOOKING_CONFIRMED',
  CARGO_READY: 'shipments.milestone.CARGO_READY',
  PICKED_UP: 'shipments.milestone.PICKED_UP',
  BL_ISSUED: 'shipments.milestone.BL_ISSUED',
  GATE_IN_POL: 'shipments.milestone.GATE_IN_POL',
  ATD: 'shipments.milestone.ATD',
  CUSTOMS_DRAFT: 'shipments.milestone.CUSTOMS_DRAFT',
  ARRIVAL_NOTICE: 'shipments.milestone.ARRIVAL_NOTICE',
  CUSTOMS_CLEARED: 'shipments.milestone.CUSTOMS_CLEARED',
  DELIVERED: 'shipments.milestone.DELIVERED',
};

const MILESTONE_AUTOMATION: Record<ShipmentMilestoneCodeV1, { auto: boolean; triggerKey?: string }> = {
  BOOKING_CONFIRMED: { auto: true, triggerKey: 'shipments.milestoneTrigger.createShipment' },
  CARGO_READY: { auto: false },
  PICKED_UP: { auto: false },
  BL_ISSUED: { auto: true, triggerKey: 'shipments.milestoneTrigger.uploadBl' },
  GATE_IN_POL: { auto: false },
  ATD: { auto: false },
  CUSTOMS_DRAFT: { auto: true, triggerKey: 'shipments.milestoneTrigger.createCustomsDeclaration' },
  ARRIVAL_NOTICE: { auto: true, triggerKey: 'shipments.milestoneTrigger.uploadArrivalNotice' },
  CUSTOMS_CLEARED: { auto: true, triggerKey: 'shipments.milestoneTrigger.clearCustomsDeclaration' },
  DELIVERED: { auto: true, triggerKey: 'shipments.milestoneTrigger.dtoPodReceived' },
};

const MILESTONE_PHASES: Array<{ titleKey: string; codes: ShipmentMilestoneCodeV1[] }> = [
  { titleKey: 'shipments.milestonePhaseBooking', codes: ['BOOKING_CONFIRMED', 'CARGO_READY'] },
  { titleKey: 'shipments.milestonePhaseOrigin', codes: ['PICKED_UP', 'BL_ISSUED'] },
  { titleKey: 'shipments.milestonePhaseDeparture', codes: ['GATE_IN_POL', 'ATD'] },
  { titleKey: 'shipments.milestonePhaseImportPrep', codes: ['CUSTOMS_DRAFT', 'ARRIVAL_NOTICE'] },
  { titleKey: 'shipments.milestonePhaseClearance', codes: ['CUSTOMS_CLEARED', 'DELIVERED'] },
];

const formatMilestoneDate = (value: string | null) => {
  if (!value) return '-';
  return value.slice(0, 10);
};

const getStatusColor = (status: MilestoneState) => {
  if (status === 'completed') return 'teal';
  if (status === 'current') return 'blue';
  return 'gray';
};

type MilestoneState = 'completed' | 'current' | 'waiting';

export function ShipmentMilestonesPanel({
  isSaving,
  onMarkDone,
  shipment,
}: {
  isSaving: boolean;
  onMarkDone: (milestoneCode: ShipmentMilestoneCodeV1, payload: { actualAt: string; notes?: string | null }) => void;
  shipment: ShipmentRecord;
}) {
  const { t } = useI18n();
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneNote, setMilestoneNote] = useState('');

  const renderedMilestones = useMemo(() => {
    return MILESTONE_SEQUENCE.map((code) => {
      const found = shipment.milestones.find((m) => m.milestone_code === code);
      return found ?? {
        id: `m-dummy-${code}`,
        milestone_code: code,
        planned_date: null,
        actual_date: null,
        source: 'MANUAL' as const,
        note: null,
      };
    });
  }, [shipment.milestones]);

  const milestoneByCode = useMemo(() => {
    return new Map(renderedMilestones.map((milestone, index) => [milestone.milestone_code, { milestone, index }]));
  }, [renderedMilestones]);
  const milestoneColumns = useMemo(() => {
    const midpoint = Math.ceil(renderedMilestones.length / 2);
    return [renderedMilestones.slice(0, midpoint), renderedMilestones.slice(midpoint)];
  }, [renderedMilestones]);

  const completedCount = renderedMilestones.filter((milestone) => milestone.actual_date).length;
  const progressValue = Math.round((completedCount / renderedMilestones.length) * 100);
  const currentMilestone = renderedMilestones.find((milestone) => !milestone.actual_date);
  const currentMilestoneLabel = currentMilestone
    ? t(MILESTONE_LABEL_KEYS[currentMilestone.milestone_code as ShipmentMilestoneCodeV1])
    : t('shipments.allMilestonesCompleted');
  const currentPhase = currentMilestone
    ? MILESTONE_PHASES.find((phase) => phase.codes.includes(currentMilestone.milestone_code as ShipmentMilestoneCodeV1))
    : null;
  const lastCompleted = [...renderedMilestones].reverse().find((milestone) => milestone.actual_date);

  const handleUpdateMilestone = (milestoneId: string) => {
    const milestone = renderedMilestones.find((item) => item.id === milestoneId);
    if (!milestone) return;
    const actualAt = milestoneDate ? new Date(milestoneDate).toISOString() : new Date().toISOString();
    onMarkDone(milestone.milestone_code as ShipmentMilestoneCodeV1, {
      actualAt,
      notes: milestoneNote || null,
    });
    setEditingMilestoneId(null);
    setMilestoneDate('');
    setMilestoneNote('');
  };

  const openEditor = (milestoneId: string, actualDate: string | null, note: string | null) => {
    setEditingMilestoneId(milestoneId);
    setMilestoneDate(actualDate ? actualDate.slice(0, 10) : '');
    setMilestoneNote(note || '');
  };

  const getMilestoneState = (milestoneId: string, actualDate: string | null): MilestoneState => {
    if (actualDate) return 'completed';
    if (currentMilestone?.id === milestoneId) return 'current';
    return 'waiting';
  };

  return (
    <Paper withBorder p={0} className="shipment-milestones-panel">
      <div className="shipment-milestones-hero">
        <Group justify="space-between" align="flex-start" gap="md">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon size={42} radius="md" variant="light" color={progressValue === 100 ? 'teal' : 'blue'}>
              <IconRoute size={23} />
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Text fw={800} size="md" lineClamp={1}>
                {t('shipments.milestones')}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {t('shipments.milestoneNextAction', { label: currentMilestoneLabel })}
              </Text>
            </div>
          </Group>
          <Badge color={progressValue === 100 ? 'teal' : 'blue'} variant="light" size="lg">
            {t('shipments.completedOf', { completed: completedCount, total: renderedMilestones.length })}
          </Badge>
        </Group>

        <Progress value={progressValue} color={progressValue === 100 ? 'teal' : 'blue'} radius="xl" size="sm" />

        <div className="shipment-milestone-rail" aria-hidden="true">
          {renderedMilestones.map((milestone, index) => {
            const state = getMilestoneState(milestone.id, milestone.actual_date);
            return (
              <div key={milestone.id} className={`shipment-milestone-rail-step is-${state}`}>
                <span>{index + 1}</span>
              </div>
            );
          })}
        </div>
        <Group gap="md" mt="xs">
          <Group gap={4}><Badge size="xs" variant="light" color="teal">{t('shipments.auto')}</Badge><Text size="xs" c="dimmed">{t('shipments.autoMilestoneDescription')}</Text></Group>
          <Group gap={4}><Badge size="xs" variant="light" color="gray">{t('shipments.manual')}</Badge><Text size="xs" c="dimmed">{t('shipments.manualMilestoneHint')}</Text></Group>
        </Group>
      </div>

      <div className="shipment-milestone-summary">
        <div className="shipment-milestone-next-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {t('shipments.milestoneCurrentWork')}
          </Text>
          <Text fw={800} size="md" lineClamp={1}>
            {currentMilestoneLabel}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {currentPhase ? t(currentPhase.titleKey) : t('shipments.allMilestonesCompleted')}
          </Text>
        </div>

        <div className="shipment-milestone-fact-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {t('shipments.milestoneLastCompleted')}
          </Text>
          <Text fw={800} lineClamp={1}>
            {lastCompleted ? t(MILESTONE_LABEL_KEYS[lastCompleted.milestone_code as ShipmentMilestoneCodeV1]) : '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {lastCompleted ? <DateTimeText value={lastCompleted.actual_date} size="xs" c="dimmed" /> : '-'}
          </Text>
        </div>

        <div className="shipment-milestone-fact-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            {t('shipments.milestoneProgress')}
          </Text>
          <Text fw={800} className="tabular-nums">
            {progressValue}%
          </Text>
          <Text size="xs" c="dimmed">
            {t('shipments.completedOf', { completed: completedCount, total: renderedMilestones.length })}
          </Text>
        </div>

        <div className="shipment-phase-strip">
          {MILESTONE_PHASES.map((phase, phaseIndex) => {
            const phaseItems = phase.codes.map((code) => milestoneByCode.get(code)).filter(Boolean);
            const phaseDone = phaseItems.filter((item) => item?.milestone.actual_date).length;
            const phaseProgress = Math.round((phaseDone / phaseItems.length) * 100);
            const phaseActive = phaseItems.some((item) => item?.milestone.id === currentMilestone?.id);

            return (
              <div key={phase.titleKey} className={`shipment-phase-row ${phaseActive ? 'is-active' : ''}`}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="xs" c="dimmed" fw={700}>
                      {t('shipments.milestonePhase', { number: phaseIndex + 1 })}
                    </Text>
                    <Text size="sm" fw={800} lineClamp={1}>
                      {t(phase.titleKey)}
                    </Text>
                  </div>
                  <Badge size="xs" color={phaseDone === phaseItems.length ? 'teal' : phaseActive ? 'blue' : 'gray'} variant="light">
                    {phaseDone}/{phaseItems.length}
                  </Badge>
                </Group>
                <Progress
                  value={phaseProgress}
                  color={phaseDone === phaseItems.length ? 'teal' : phaseActive ? 'blue' : 'gray'}
                  radius="xl"
                  size="xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="shipment-milestone-body">
        <div className="shipment-milestone-timeline">
          {milestoneColumns.map((column, columnIndex) => {
            const columnOffset = columnIndex * Math.ceil(renderedMilestones.length / 2);

            return (
              <div key={`column-${columnIndex}`} className="shipment-milestone-column">
                {column.map((milestone, index) => {
                  const state = getMilestoneState(milestone.id, milestone.actual_date);
                  const isEditing = editingMilestoneId === milestone.id;
                  const color = getStatusColor(state);
                  const label = t(MILESTONE_LABEL_KEYS[milestone.milestone_code as ShipmentMilestoneCodeV1]);
                  const displayIndex = columnOffset + index + 1;

                  return (
                    <div key={milestone.id} className={`shipment-milestone-row is-${state} ${isEditing ? 'is-editing' : ''}`}>
                      <div className="shipment-milestone-marker">
                        <ThemeIcon size={30} radius="xl" color={color} variant={state === 'waiting' ? 'light' : 'filled'}>
                          {state === 'completed' ? (
                            <IconCircleCheckFilled size={17} />
                          ) : state === 'current' ? (
                            <IconCircleDot size={17} />
                          ) : (
                            <IconClockHour4 size={16} />
                          )}
                        </ThemeIcon>
                      </div>

                      <div className="shipment-milestone-content">
                        <div className="shipment-milestone-card-head">
                          <div className="shipment-milestone-copy">
                            <Group gap={6} wrap="wrap">
                              <Text fw={800} size="sm" lineClamp={1} c={state === 'current' ? 'blue' : undefined}>
                                {displayIndex}. {label}
                              </Text>
                              {state === 'current' ? (
                                <Badge size="xs" color="blue" variant="filled">
                                  {t('shipments.milestoneNow')}
                                </Badge>
                              ) : null}
                            </Group>
                            <Group gap={6} wrap="nowrap">
                              <Text size="xs" c={state === 'completed' ? 'teal' : 'dimmed'} lineClamp={1}>
                                {state === 'completed' ? (
                                  <>
                                    {t('shipments.milestoneDone', { date: '' }).trim()}{' '}
                                    <DateTimeText value={milestone.actual_date} size="xs" c="teal" />
                                  </>
                                ) : (
                                  t('shipments.milestonePlanned', { date: formatMilestoneDate(milestone.planned_date) })
                                )}
                              </Text>
                              {state === 'completed' ? (
                                <Badge size="xs" variant="light" color={milestone.source && milestone.source !== 'MANUAL' ? 'teal' : 'gray'}>
                                  {milestone.source && milestone.source !== 'MANUAL' ? t('shipments.auto') : t('shipments.manual')}
                                </Badge>
                              ) : MILESTONE_AUTOMATION[milestone.milestone_code as ShipmentMilestoneCodeV1].auto ? (
                                <Tooltip
                                  withArrow
                                  label={t('shipments.autoMilestoneHint', {
                                    trigger: t(MILESTONE_AUTOMATION[milestone.milestone_code as ShipmentMilestoneCodeV1].triggerKey ?? ''),
                                  })}
                                >
                                  <Badge size="xs" variant="outline" color="gray">{t('shipments.auto')}</Badge>
                                </Tooltip>
                              ) : null}
                            </Group>
                          </div>
                          <div className="shipment-milestone-action">
                            <Button
                              size="compact-xs"
                              variant={state === 'current' ? 'filled' : 'light'}
                              color={state === 'completed' ? 'teal' : 'blue'}
                              loading={isSaving && isEditing}
                              onClick={() => openEditor(milestone.id, milestone.actual_date, milestone.note)}
                            >
                              {state === 'completed' ? t('shipments.milestoneUpdate') : state === 'current' ? t('shipments.markDone') : t('shipments.milestoneSetDate')}
                            </Button>
                          </div>
                        </div>

                        {milestone.note ? (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {milestone.note}
                          </Text>
                        ) : null}

                        {isEditing ? (
                          <Stack gap="xs" className="shipment-milestone-editor">
                            <DateTimeField
                              label={t('shipments.actualDate')}
                              value={milestoneDate}
                              onChange={(value) => setMilestoneDate(value ?? '')}
                              size="xs"
                            />
                            <TextInput
                              label={t('shipments.note')}
                              value={milestoneNote}
                              onChange={(event) => setMilestoneNote(event.currentTarget.value)}
                              size="xs"
                            />
                            <Group justify="flex-end" gap="xs">
                              <Button size="xs" variant="subtle" onClick={() => setEditingMilestoneId(null)}>
                                {t('common.cancel')}
                              </Button>
                              <Button size="xs" color="blue" onClick={() => handleUpdateMilestone(milestone.id)}>
                                {t('common.save')}
                              </Button>
                            </Group>
                          </Stack>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </Paper>
  );
}
