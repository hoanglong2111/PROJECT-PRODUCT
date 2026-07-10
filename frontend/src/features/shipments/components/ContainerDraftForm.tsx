import {
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconInfoCircle, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  containerTypeSelectOptions,
  fetchContainerTypes,
  findContainerType,
} from '@shared/api/containerTypes';
import type { ShipmentRecord } from '@shared/api/logistics';
import { createShipmentContainer } from '@shared/api/shipmentContainers';
import { queryKeys } from '@shared/api/queryKeys';
import { useI18n } from '@shared/i18n';

function formatSpecValue(value: number | null | undefined, suffix: string) {
  return value === null || value === undefined ? '-' : `${value.toLocaleString()} ${suffix}`;
}

export function SectionHeading({ icon, title, caption }: { icon: ReactNode; title: string; caption?: string }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <ThemeIcon variant="light" size="md" radius="md">
        {icon}
      </ThemeIcon>
      <div>
        <Text fw={700} size="sm">{title}</Text>
        {caption ? <Text size="xs" c="dimmed">{caption}</Text> : null}
      </div>
    </Group>
  );
}

type ContainerDraftFormProps = {
  isConsolidation: boolean;
  onContainerCreated: (containerId: string) => void;
  podMismatch: boolean;
  shipments: ShipmentRecord[];
};

export function ContainerDraftForm({ isConsolidation, onContainerCreated, podMismatch, shipments }: ContainerDraftFormProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [newContainerNo, setNewContainerNo] = useState('');
  const [newContainerType, setNewContainerType] = useState<string | null>('40HC');
  const [newSeal, setNewSeal] = useState('');
  const [newGross, setNewGross] = useState<number | string>('');
  const [newCbm, setNewCbm] = useState<number | string>('');
  const [grossEdited, setGrossEdited] = useState(false);
  const [cbmEdited, setCbmEdited] = useState(false);
  const [addTargetShipmentId, setAddTargetShipmentId] = useState<string | null>(shipments[0]?.id ?? null);

  const shipmentTargetOptions = shipments.map((shipment) => ({
    label: shipment.shipment_number,
    value: shipment.id,
  }));
  // Which shipment a newly-added container attaches to. For a single shipment it is implicit;
  // when consolidating, the user picks via the target Select (defaults to the primary shipment).
  const addTargetId = isConsolidation
    ? addTargetShipmentId ?? shipments[0]?.id ?? null
    : shipments[0]?.id ?? null;

  const containerTypesQuery = useQuery({
    queryKey: queryKeys.containerTypes({ page: 1, limit: 100, is_active: true }),
    queryFn: () => fetchContainerTypes({ page: 1, limit: 100, is_active: true }),
  });
  const containerTypes = containerTypesQuery.data?.data ?? [];
  const containerTypeOptions = useMemo(() => containerTypeSelectOptions(containerTypes), [containerTypes]);
  const selectedContainerType = findContainerType(containerTypes, newContainerType);

  useEffect(() => {
    if (containerTypeOptions.length === 0) return;
    if (newContainerType && containerTypeOptions.some((option) => option.value === newContainerType)) return;
    setNewContainerType(containerTypeOptions.some((option) => option.value === '40HC') ? '40HC' : containerTypeOptions[0].value);
  }, [containerTypeOptions, newContainerType]);

  const addContainerMutation = useMutation({
    mutationFn: () => {
      if (!addTargetId) throw new Error(t('shipments.noShipmentSelected'));
      return createShipmentContainer(addTargetId, {
        container_no: newContainerNo.trim(),
        container_type: newContainerType,
        seal_no: newSeal || null,
        gross_weight_kg: newGross === '' ? null : Number(newGross),
        volume_cbm: newCbm === '' ? null : Number(newCbm),
        status: 'PLANNED',
      });
    },
    onSuccess: (created) => {
      if (addTargetId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentContainers(addTargetId) });
      }
      // Auto-select the container the user just added — that is why they added it.
      if (created?.id) onContainerCreated(created.id);
      setNewContainerNo('');
      setNewSeal('');
      setNewGross('');
      setNewCbm('');
      setGrossEdited(false);
      setCbmEdited(false);
    },
  });

  const handleAddContainer = () => {
    if (!newContainerNo.trim()) return;
    addContainerMutation.mutate();
  };

  const handleContainerTypeChange = (value: string | null) => {
    setNewContainerType(value);
    const selected = findContainerType(containerTypes, value);
    if (!selected) return;
    if (!grossEdited && selected.gross_kg !== null) setNewGross(selected.gross_kg);
    if (!cbmEdited && selected.capacity_cbm !== null) setNewCbm(selected.capacity_cbm);
  };

  return (
    <Paper withBorder p="md" mt="sm" radius="md" className="shipment-dto-container-composer">
      <Stack gap="sm">
        <SectionHeading
          icon={<IconPlus size={16} />}
          title={t('shipments.addContainer')}
          caption={t('shipments.dtoAddContainerHint')}
        />
        <div className="shipment-dto-container-form">
          {isConsolidation && (
            <Select
              className="shipment-dto-field-target"
              label={t('shipments.dtoAddContainerTarget')}
              data={shipmentTargetOptions}
              value={addTargetShipmentId}
              onChange={setAddTargetShipmentId}
              allowDeselect={false}
            />
          )}
          <TextInput
            className="shipment-dto-field-container-no"
            label={t('shipments.containerNumber')}
            placeholder={t('shipments.containerNumberPlaceholder')}
            value={newContainerNo}
            onChange={(event) => setNewContainerNo(event.currentTarget.value)}
          />
          <Select
            className="shipment-dto-field-type"
            label={
              <Group gap={4} wrap="nowrap">
                <span>{t('shipments.containerType')}</span>
                {selectedContainerType ? (
                  <Tooltip
                    multiline
                    w={220}
                    withArrow
                    label={
                      <Stack gap={2}>
                        <Text size="xs">Tare: {formatSpecValue(selectedContainerType.tare_kg, 'kg')}</Text>
                        <Text size="xs">Max gross: {formatSpecValue(selectedContainerType.gross_kg, 'kg')}</Text>
                        <Text size="xs">Capacity: {formatSpecValue(selectedContainerType.capacity_cbm, 'CBM')}</Text>
                      </Stack>
                    }
                  >
                    <IconInfoCircle size={14} style={{ cursor: 'help' }} />
                  </Tooltip>
                ) : null}
              </Group>
            }
            data={containerTypeOptions}
            value={newContainerType}
            onChange={handleContainerTypeChange}
            allowDeselect={false}
            searchable
            nothingFoundMessage={containerTypesQuery.isLoading ? t('masterData.loadingReferenceData') : t('masterData.noContainerTypes')}
          />
          <TextInput
            className="shipment-dto-field-seal"
            label={t('shipments.sealNumber')}
            placeholder={t('shipments.sealNumberPlaceholder')}
            value={newSeal}
            onChange={(event) => setNewSeal(event.currentTarget.value)}
          />
          <NumberInput
            className="shipment-dto-field-gross"
            label={t('shipments.grossWeightKg')}
            placeholder="0"
            value={newGross}
            onChange={(value) => {
              setGrossEdited(true);
              setNewGross(value);
            }}
            min={0}
          />
          <NumberInput
            className="shipment-dto-field-cbm"
            label={t('shipments.volumeCbm')}
            placeholder="0"
            value={newCbm}
            onChange={(value) => {
              setCbmEdited(true);
              setNewCbm(value);
            }}
            min={0}
          />
          <Button
            className="shipment-dto-container-add"
            variant="light"
            leftSection={<IconPlus size={16} />}
            loading={addContainerMutation.isPending}
            disabled={!newContainerNo.trim() || podMismatch}
            onClick={handleAddContainer}
          >
            {t('shipments.addContainer')}
          </Button>
        </div>
        {addContainerMutation.isError && (
          <Text size="xs" c="red">
            {addContainerMutation.error instanceof Error
              ? addContainerMutation.error.message
              : t('shipments.dtosPanel.operationFailed')}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
