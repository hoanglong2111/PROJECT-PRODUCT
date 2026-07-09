import { Paper, Table, Text, Title } from '@mantine/core';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../model/quotationRequestModel';
import { RfqCardFact } from './RfqResponsiveData';

export function ContainersPanel({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const containers = request.containers ?? [];
  if (containers.length === 0) return null;

  const totalQty = containers.reduce((sum, container) => sum + Number(container.qty ?? 0), 0);
  const containerViews = containers.map((container) => ({
    id: container.id,
    type: container.container_type ?? '-',
    quantity: container.qty ?? '-',
    lines: (container.lines ?? []).map((line) => ({
      id: line.id,
      item: line.item?.item_code ?? line.item_id ?? t('quotationRequests.itemNotLinked'),
      quantity: line.qty ?? '-',
      unit: line.unit ?? '-',
      unitPrice: line.unit_price ?? '-',
      grossWeight: line.gross_weight_kg ?? '-',
    })),
  }));

  return (
    <Paper
      component="section"
      withBorder
      p={0}
      className="dl-data-panel rfq-request-data-panel"
      aria-labelledby="rfq-containers-title"
    >
      <div className="rfq-panel-head">
        <div>
          <Title order={3} id="rfq-containers-title">{t('quotationRequests.section.containers')}</Title>
          <Text size="xs" c="dimmed" className="tabular-nums">
            {t('quotationRequests.containersSummary', { count: containers.length, qty: totalQty })}
          </Text>
        </div>
      </div>
      <Table.ScrollContainer className="rfq-table-scroll-container rfq-responsive-table" minWidth={760}>
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
            {containerViews.map((container) => {
              const lines = container.lines;
              if (lines.length === 0) {
                return (
                  <Table.Tr key={container.id}>
                    <Table.Td>{container.type}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{container.quantity}</Table.Td>
                    <Table.Td colSpan={5}><Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text></Table.Td>
                  </Table.Tr>
                );
              }
              return lines.map((line, lineIndex) => (
                <Table.Tr key={line.id}>
                  {lineIndex === 0 ? (
                    <Table.Td rowSpan={lines.length}>{container.type}</Table.Td>
                  ) : null}
                  {lineIndex === 0 ? (
                    <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{container.quantity}</Table.Td>
                  ) : null}
                  <Table.Td>{line.item}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.quantity}</Table.Td>
                  <Table.Td>{line.unit}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.unitPrice}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.grossWeight}</Table.Td>
                </Table.Tr>
              ));
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <div className="rfq-responsive-cards">
        {containerViews.map((container) => (
          <article className="rfq-data-card" key={container.id}>
            <div className="rfq-data-card-head">
              <div>
                <Text size="xs" c="dimmed" fw={600}>{t('quotationRequests.field.containerType')}</Text>
                <Text fw={700}>{container.type}</Text>
              </div>
              <Text size="sm" fw={700} className="tabular-nums">
                {container.quantity} ×
              </Text>
            </div>
            <div className="rfq-data-card-lines">
              {container.lines.length === 0 ? (
                <Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text>
              ) : (
                container.lines.map((line) => (
                  <div className="rfq-data-card-line rfq-data-card-line--container" key={line.id}>
                    <RfqCardFact
                      label={t('quotationRequests.field.containerItems')}
                      value={<Text size="sm" fw={700}>{line.item}</Text>}
                      wide
                    />
                    <RfqCardFact
                      label={t('quotations.quantity')}
                      value={<Text size="sm" className="tabular-nums">{line.quantity} {line.unit}</Text>}
                    />
                    <RfqCardFact
                      label={t('quotationRequests.field.lineWeight')}
                      value={<Text size="sm" className="tabular-nums">{line.grossWeight} kg</Text>}
                    />
                    <RfqCardFact
                      label={t('quotations.unitPrice')}
                      value={<Text size="sm" className="tabular-nums">{line.unitPrice}</Text>}
                    />
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </Paper>
  );
}
