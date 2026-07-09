import { Paper, Table, Text, Title } from '@mantine/core';

import type { QuotationRequestPackageV1, QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../model/quotationRequestModel';
import { RfqCardFact } from './RfqResponsiveData';

function packageDimensions(pkg: QuotationRequestPackageV1): string {
  return `${pkg.length_cm ?? '-'} x ${pkg.width_cm ?? '-'} x ${pkg.height_cm ?? '-'}`;
}

export function PackagesPanel({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const packages = request.packages ?? [];
  if (packages.length === 0) return null;

  const totalCbm = packages.reduce((sum, pkg) => sum + Number(pkg.cbm ?? 0), 0);
  const packageViews = packages.map((pkg) => ({
    id: pkg.id,
    number: pkg.package_no,
    type: pkg.package_type ?? '-',
    dimensions: packageDimensions(pkg),
    quantity: pkg.qty ?? '-',
    grossWeight: pkg.gross_weight_per_package_kg ?? '-',
    cbm: pkg.cbm ?? '-',
    lines: (pkg.lines ?? []).map((line) => ({
      id: line.id,
      item: line.item?.item_code ?? line.item_id ?? t('quotationRequests.itemNotLinked'),
      quantity: line.qty ?? '-',
      unit: line.unit ?? '-',
      unitPrice: line.unit_price ?? '-',
    })),
  }));

  return (
    <Paper
      component="section"
      withBorder
      p={0}
      className="dl-data-panel rfq-request-data-panel"
      aria-labelledby="rfq-packages-title"
    >
      <div className="rfq-panel-head">
        <div>
          <Title order={3} id="rfq-packages-title">{t('quotationRequests.section.packages')}</Title>
          <Text size="xs" c="dimmed" className="tabular-nums">
            {t('quotationRequests.packagesSummary', { count: packages.length, cbm: totalCbm.toFixed(2) })}
          </Text>
        </div>
      </div>
      <Table.ScrollContainer className="rfq-table-scroll-container rfq-responsive-table" minWidth={760}>
        <Table highlightOnHover verticalSpacing="sm" className="rfq-detail-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>#</Table.Th>
              <Table.Th>{t('quotationRequests.field.packageType')}</Table.Th>
              <Table.Th>D x R x C (cm)</Table.Th>
              <Table.Th ta="right">{t('quotationRequests.field.packageQty')}</Table.Th>
              <Table.Th ta="right">{t('quotationRequests.field.grossPerPackage')}</Table.Th>
              <Table.Th ta="right">{t('quotationRequests.field.packageCbm')}</Table.Th>
              <Table.Th>{t('quotationRequests.field.packageItem')}</Table.Th>
              <Table.Th ta="right">{t('quotations.quantity')}</Table.Th>
              <Table.Th>{t('forms.unit')}</Table.Th>
              <Table.Th ta="right">{t('quotations.unitPrice')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {packageViews.map((pkg) => {
              const lines = pkg.lines;
              if (lines.length === 0) {
                return (
                  <Table.Tr key={pkg.id}>
                    <Table.Td>{pkg.number}</Table.Td>
                    <Table.Td>{pkg.type}</Table.Td>
                    <Table.Td>{pkg.dimensions}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.quantity}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.grossWeight}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.cbm ?? '-'}</Table.Td>
                    <Table.Td colSpan={4}><Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text></Table.Td>
                  </Table.Tr>
                );
              }
              return lines.map((line, lineIndex) => (
                <Table.Tr key={line.id}>
                  {lineIndex === 0 ? (
                    <>
                      <Table.Td rowSpan={lines.length}>{pkg.number}</Table.Td>
                      <Table.Td rowSpan={lines.length}>{pkg.type}</Table.Td>
                      <Table.Td rowSpan={lines.length}>{pkg.dimensions}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.quantity}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.grossWeight}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.cbm ?? '-'}</Table.Td>
                    </>
                  ) : null}
                  <Table.Td>{line.item}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.quantity}</Table.Td>
                  <Table.Td>{line.unit}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.unitPrice}</Table.Td>
                </Table.Tr>
              ));
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <div className="rfq-responsive-cards">
        {packageViews.map((pkg) => (
          <article className="rfq-data-card" key={pkg.id}>
            <div className="rfq-data-card-head">
              <div>
                <Text size="xs" c="dimmed" fw={600}>#{pkg.number}</Text>
                <Text fw={700}>{pkg.type}</Text>
              </div>
              <Text size="sm" fw={700} className="tabular-nums">{pkg.cbm} cbm</Text>
            </div>
            <div className="rfq-data-card-facts">
              <RfqCardFact label="D x R x C (cm)" value={<Text size="sm" className="tabular-nums">{pkg.dimensions}</Text>} wide />
              <RfqCardFact label={t('quotationRequests.field.packageQty')} value={<Text size="sm" className="tabular-nums">{pkg.quantity}</Text>} />
              <RfqCardFact label={t('quotationRequests.field.grossPerPackage')} value={<Text size="sm" className="tabular-nums">{pkg.grossWeight}</Text>} />
            </div>
            <div className="rfq-data-card-lines">
              {pkg.lines.length === 0 ? (
                <Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text>
              ) : (
                pkg.lines.map((line) => (
                  <div className="rfq-data-card-line" key={line.id}>
                    <div>
                      <Text size="sm" fw={700}>{line.item}</Text>
                      <Text size="xs" c="dimmed">
                        <span className="tabular-nums">{line.quantity}</span> {line.unit}
                      </Text>
                    </div>
                    <Text size="sm" className="tabular-nums">{line.unitPrice}</Text>
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
