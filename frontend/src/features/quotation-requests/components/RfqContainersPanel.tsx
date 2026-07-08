import { Paper, Table, Text, Title } from '@mantine/core';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../model/quotationRequestModel';

export function ContainersPanel({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const containers = request.containers ?? [];
  if (containers.length === 0) return null;

  const totalQty = containers.reduce((sum, container) => sum + Number(container.qty ?? 0), 0);

  return (
    <Paper withBorder p={0} className="dl-data-panel">
      <div className="rfq-panel-head">
        <div>
          <Title order={4}>{t('quotationRequests.section.containers')}</Title>
          <Text size="xs" c="dimmed" className="tabular-nums">
            {t('quotationRequests.containersSummary', { count: containers.length, qty: totalQty })}
          </Text>
        </div>
      </div>
      <Table.ScrollContainer className="rfq-table-scroll-container" minWidth={760}>
        <Table highlightOnHover verticalSpacing="sm" className="rfq-detail-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('quotationRequests.field.containerType')}</Table.Th>
              <Table.Th ta="right">{t('quotationRequests.field.containerQty')}</Table.Th>
              <Table.Th>{t('quotationRequests.field.containerItems')}</Table.Th>
              <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
              <Table.Th>{t('forms.unit')}</Table.Th>
              <Table.Th ta="right">{t('quotations.unitPrice')}</Table.Th>
              <Table.Th ta="right">{t('quotationRequests.field.lineWeight')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {containers.map((container) => {
              const lines = container.lines ?? [];
              if (lines.length === 0) {
                return (
                  <Table.Tr key={container.id}>
                    <Table.Td>{container.container_type ?? '-'}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{container.qty ?? '-'}</Table.Td>
                    <Table.Td colSpan={5}><Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text></Table.Td>
                  </Table.Tr>
                );
              }
              return lines.map((line, lineIndex) => (
                <Table.Tr key={line.id}>
                  {lineIndex === 0 ? (
                    <Table.Td rowSpan={lines.length}>{container.container_type ?? '-'}</Table.Td>
                  ) : null}
                  {lineIndex === 0 ? (
                    <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{container.qty ?? '-'}</Table.Td>
                  ) : null}
                  <Table.Td>{line.item?.item_code ?? line.item_id ?? t('quotationRequests.itemNotLinked')}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.qty ?? '-'}</Table.Td>
                  <Table.Td>{line.unit ?? '-'}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.unit_price ?? '-'}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.gross_weight_kg ?? '-'}</Table.Td>
                </Table.Tr>
              ));
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
