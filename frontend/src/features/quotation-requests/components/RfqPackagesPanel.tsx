import { Paper, Table, Text, Title } from '@mantine/core';

import type { QuotationRequestPackageV1, QuotationRequestV1 } from '@shared/api/quotationRequests';

import type { TFn } from '../model/quotationRequestModel';

function packageDimensions(pkg: QuotationRequestPackageV1): string {
  return `${pkg.length_cm ?? '-'} x ${pkg.width_cm ?? '-'} x ${pkg.height_cm ?? '-'}`;
}

export function PackagesPanel({ request, t }: { request: QuotationRequestV1; t: TFn }) {
  const packages = request.packages ?? [];
  if (packages.length === 0) return null;

  const totalCbm = packages.reduce((sum, pkg) => sum + Number(pkg.cbm ?? 0), 0);

  return (
    <Paper withBorder p={0} className="dl-data-panel">
      <div className="rfq-panel-head">
        <div>
          <Title order={4}>{t('quotationRequests.section.packages')}</Title>
          <Text size="xs" c="dimmed" className="tabular-nums">
            {t('quotationRequests.packagesSummary', { count: packages.length, cbm: totalCbm.toFixed(2) })}
          </Text>
        </div>
      </div>
      <Table.ScrollContainer className="rfq-table-scroll-container" minWidth={760}>
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
            {packages.map((pkg) => {
              const lines = pkg.lines ?? [];
              if (lines.length === 0) {
                return (
                  <Table.Tr key={pkg.id}>
                    <Table.Td>{pkg.package_no}</Table.Td>
                    <Table.Td>{pkg.package_type ?? '-'}</Table.Td>
                    <Table.Td>{packageDimensions(pkg)}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.qty ?? '-'}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.gross_weight_per_package_kg ?? '-'}</Table.Td>
                    <Table.Td ta="right" className="tabular-nums">{pkg.cbm ?? '-'}</Table.Td>
                    <Table.Td colSpan={4}><Text c="dimmed" size="sm">{t('quotationRequests.itemNotLinked')}</Text></Table.Td>
                  </Table.Tr>
                );
              }
              return lines.map((line, lineIndex) => (
                <Table.Tr key={line.id}>
                  {lineIndex === 0 ? (
                    <>
                      <Table.Td rowSpan={lines.length}>{pkg.package_no}</Table.Td>
                      <Table.Td rowSpan={lines.length}>{pkg.package_type ?? '-'}</Table.Td>
                      <Table.Td rowSpan={lines.length}>{packageDimensions(pkg)}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.qty ?? '-'}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.gross_weight_per_package_kg ?? '-'}</Table.Td>
                      <Table.Td rowSpan={lines.length} ta="right" className="tabular-nums">{pkg.cbm ?? '-'}</Table.Td>
                    </>
                  ) : null}
                  <Table.Td>{line.item?.item_code ?? line.item_id ?? t('quotationRequests.itemNotLinked')}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.qty ?? '-'}</Table.Td>
                  <Table.Td>{line.unit ?? '-'}</Table.Td>
                  <Table.Td ta="right" className="tabular-nums">{line.unit_price ?? '-'}</Table.Td>
                </Table.Tr>
              ));
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
