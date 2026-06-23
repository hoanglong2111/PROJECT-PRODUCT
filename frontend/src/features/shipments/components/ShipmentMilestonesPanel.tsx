import { Badge, Button, Group, Paper, Progress, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconCircleCheckFilled, IconCircleDot, IconClockHour4, IconRoute } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import type { ShipmentRecord } from '@shared/api/logistics';
import type { ShipmentMilestoneCodeV1 } from '@shared/api/shipments';

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

const MILESTONE_LABELS: Record<ShipmentMilestoneCodeV1, string> = {
  BOOKING_CONFIRMED: 'Booking Confirmed',
  CARGO_READY: 'Cargo Ready',
  PICKED_UP: 'Picked up',
  BL_ISSUED: 'B/L Issued',
  GATE_IN_POL: 'Gate in POL',
  ATD: 'ATD',
  CUSTOMS_DRAFT: 'Customs Draft',
  ARRIVAL_NOTICE: 'Arrival Notice',
  CUSTOMS_CLEARED: 'Customs Cleared',
  DELIVERED: 'Delivered',
};

const MILESTONE_PHASES: Array<{ title: string; codes: ShipmentMilestoneCodeV1[] }> = [
  { title: 'Booking', codes: ['BOOKING_CONFIRMED', 'CARGO_READY'] },
  { title: 'Origin', codes: ['PICKED_UP', 'BL_ISSUED'] },
  { title: 'Departure', codes: ['GATE_IN_POL', 'ATD'] },
  { title: 'Import prep', codes: ['CUSTOMS_DRAFT', 'ARRIVAL_NOTICE'] },
  { title: 'Clearance', codes: ['CUSTOMS_CLEARED', 'DELIVERED'] },
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
  t,
}: {
  isSaving: boolean;
  onMarkDone: (milestoneCode: ShipmentMilestoneCodeV1, payload: { actualAt: string; notes?: string | null }) => void;
  shipment: ShipmentRecord;
  t: (key: string) => string;
}) {
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
    ? MILESTONE_LABELS[currentMilestone.milestone_code as ShipmentMilestoneCodeV1]
    : 'All milestones completed';
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
                Shipment milestones
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                Next action: {currentMilestoneLabel}
              </Text>
            </div>
          </Group>
          <Badge color={progressValue === 100 ? 'teal' : 'blue'} variant="light" size="lg">
            {completedCount}/{renderedMilestones.length} done
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
      </div>

      <div className="shipment-milestone-summary">
        <div className="shipment-milestone-next-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            Current work
          </Text>
          <Text fw={800} size="md" lineClamp={1}>
            {currentMilestoneLabel}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {currentPhase ? currentPhase.title : 'Shipment completed'}
          </Text>
        </div>

        <div className="shipment-milestone-fact-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            Last completed
          </Text>
          <Text fw={800} lineClamp={1}>
            {lastCompleted ? MILESTONE_LABELS[lastCompleted.milestone_code as ShipmentMilestoneCodeV1] : '-'}
          </Text>
          <Text size="xs" c="dimmed">
            {lastCompleted ? formatMilestoneDate(lastCompleted.actual_date) : '-'}
          </Text>
        </div>

        <div className="shipment-milestone-fact-card">
          <Text className="metric-label" size="xs" tt="uppercase" fw={700}>
            Progress
          </Text>
          <Text fw={800} className="tabular-nums">
            {progressValue}%
          </Text>
          <Text size="xs" c="dimmed">
            {completedCount} of {renderedMilestones.length}
          </Text>
        </div>

        <div className="shipment-phase-strip">
          {MILESTONE_PHASES.map((phase, phaseIndex) => {
            const phaseItems = phase.codes.map((code) => milestoneByCode.get(code)).filter(Boolean);
            const phaseDone = phaseItems.filter((item) => item?.milestone.actual_date).length;
            const phaseProgress = Math.round((phaseDone / phaseItems.length) * 100);
            const phaseActive = phaseItems.some((item) => item?.milestone.id === currentMilestone?.id);

            return (
              <div key={phase.title} className={`shipment-phase-row ${phaseActive ? 'is-active' : ''}`}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Text size="xs" c="dimmed" fw={700}>
                      Phase {phaseIndex + 1}
                    </Text>
                    <Text size="sm" fw={800} lineClamp={1}>
                      {phase.title}
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
                  const label = MILESTONE_LABELS[milestone.milestone_code as ShipmentMilestoneCodeV1];
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
                                  Now
                                </Badge>
                              ) : null}
                            </Group>
                            <Text size="xs" c={state === 'completed' ? 'teal' : 'dimmed'} lineClamp={1}>
                              {state === 'completed'
                                ? `Done ${formatMilestoneDate(milestone.actual_date)} - ${milestone.source}`
                                : `Planned ${formatMilestoneDate(milestone.planned_date)}`}
                            </Text>
                          </div>
                          <div className="shipment-milestone-action">
                            <Button
                              size="compact-xs"
                              variant={state === 'current' ? 'filled' : 'light'}
                              color={state === 'completed' ? 'teal' : 'blue'}
                              loading={isSaving && isEditing}
                              onClick={() => openEditor(milestone.id, milestone.actual_date, milestone.note)}
                            >
                              {state === 'completed' ? 'Update' : state === 'current' ? 'Done' : 'Set date'}
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
                            <TextInput
                              label={t('shipments.actualDate')}
                              type="date"
                              value={milestoneDate}
                              onChange={(event) => setMilestoneDate(event.currentTarget.value)}
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
