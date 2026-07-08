import { Group, Paper, Text } from '@mantine/core';

import type { TFn } from '../model/quotationRequestModel';
import type { RfqFormApi } from '../hooks/useQuotationRequestForm';
import { ContainerListEditor } from './ContainerListEditor';
import { PackageListEditor } from './PackageListEditor';

export function RfqCargoEditorPanel({ form, t }: { form: RfqFormApi; t: TFn }) {
  const {
    fclMode, masterData,
    containers, activeContainerId, setActiveContainerId, updateContainer, addContainer, removeContainer,
    packages, activePackageId, setActivePackageId, updatePackage, addPackage, removePackage,
  } = form;

  return (
    <Paper withBorder p="sm" className="purchase-order-form-section purchase-order-lines-panel">
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <Text fw={700}>
            {fclMode ? t('quotationRequests.section.containerLines') : t('quotationRequests.section.packages')}
          </Text>
          <Text size="sm" c="dimmed">
            {fclMode ? t('quotationRequests.section.containerLinesHint') : t('quotationRequests.section.packagesHint')}
          </Text>
        </div>
      </Group>
      {fclMode ? (
        <ContainerListEditor
          containers={containers}
          activeId={activeContainerId}
          onActiveChange={setActiveContainerId}
          containerTypeOptions={masterData.containerTypeOptions}
          items={masterData.items}
          itemOptions={masterData.itemOptions}
          unitOptions={masterData.uomOptions}
          onChange={updateContainer}
          onAdd={addContainer}
          onRemove={removeContainer}
        />
      ) : (
        <PackageListEditor
          packages={packages}
          activeId={activePackageId}
          onActiveChange={setActivePackageId}
          items={masterData.items}
          itemOptions={masterData.itemOptions}
          unitOptions={masterData.uomOptions}
          onChange={updatePackage}
          onAdd={addPackage}
          onRemove={removePackage}
        />
      )}
    </Paper>
  );
}
