import { Alert, Button, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconClipboardList, IconDeviceFloppy, IconFileInvoice, IconPackage, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { AnchoredWorkflowRail, useAnchoredWorkflowSections, type AnchoredWorkflowStep } from '@shared/components/AnchoredWorkflow';
import { DateField } from '@shared/components/DateField';
import { FeatureHeaderShell } from '@shared/components/FeatureHeaderShell';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { FormSection } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import { rfqModeOptions } from '../model/quotationRequestModel';
import { useQuotationRequestForm } from '../hooks/useQuotationRequestForm';
import { RfqCargoEditorPanel } from './RfqCargoEditorPanel';

type Props = {
  onCancel: () => void;
  onCreated: (request: QuotationRequestV1) => void;
  source?: QuotationRequestV1;
};

export function QuotationRequestForm({ onCancel, onCreated, source }: Props) {
  const { t } = useI18n();
  const form = useQuotationRequestForm({ source, onCreated });
  const {
    airMode, fclMode, lclMode, masterData,
    canSubmit, createMutation, submit,
    customerRef, setCustomerRef,
    customerPoRef, setCustomerPoRef,
    customerContractRef, setCustomerContractRef,
    supplierId, onSupplierChange,
    incoterm, setIncoterm,
    mode, setMode,
    currency, setCurrency,
    originPort, setOriginPort,
    destinationPort, setDestinationPort,
    readyDate, setReadyDate,
    note, setNote,
    selectedSupplier,
    totalWeight, totalCbm, dimWeight, chargeableWeight, chargeableRevenueTon,
  } = form;
  const workflowSteps = useMemo<AnchoredWorkflowStep[]>(() => [
    {
      id: 'rfq-form-intake',
      label: t('quotationRequests.section.intake'),
      icon: <IconClipboardList size={14} />,
    },
    {
      id: 'rfq-form-cargo',
      label: fclMode ? t('quotationRequests.section.containerLines') : t('quotationRequests.section.packages'),
      icon: <IconPackage size={14} />,
    },
  ], [fclMode, t]);
  const workflowSectionIds = useMemo(() => workflowSteps.map((step) => step.id), [workflowSteps]);
  const { activeSectionId, scrollToSection } = useAnchoredWorkflowSections(workflowSectionIds);

  return (
    <form
      className="quote-workflow quote-workflow--rfq"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Stack gap="sm">
        <FeatureHeaderShell backLabel={t('common.back')} onBack={onCancel}>
          <Paper withBorder p="sm" className="feature-form-hero feature-hero-layout">
            <Group gap="sm" align="flex-start" wrap="nowrap" className="feature-detail-heading feature-hero-identity">
              <div className="feature-hero-icon" aria-hidden="true"><IconFileInvoice size={19} /></div>
              <div className="feature-detail-copy">
                <Text fw={700} size="lg">
                  {t('quotationRequests.formTitle')}
                </Text>
                <Text c="dimmed" size="sm">
                  {t('quotationRequests.formSubtitle')}
                </Text>
                {source ? (
                  <Text c="dimmed" size="xs" mt={2}>
                    {t('quotationRequests.copiedFrom', { rfqNo: source.rfq_no })}
                  </Text>
                ) : null}
              </div>
            </Group>

            <dl className="feature-hero-facts">
              <div className="feature-hero-fact">
                <dt>{t('quotationRequests.field.supplier')}</dt>
                <dd>{selectedSupplier?.supplier_name ?? '-'}</dd>
              </div>
              <div className="feature-hero-fact">
                <dt>{t('quotationRequests.field.mode')} / {t('quotationRequests.field.incoterm')}</dt>
                <dd>{[mode, incoterm].filter(Boolean).join(' / ') || '-'}</dd>
              </div>
              <div className="feature-hero-fact">
                <dt>{t('quotationRequests.field.route')}</dt>
                <dd>{[originPort, destinationPort].filter(Boolean).join(' → ') || '-'}</dd>
              </div>
            </dl>

          </Paper>
        </FeatureHeaderShell>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>
            {(createMutation.error as Error).message}
          </Alert>
        ) : null}

        <div className="quote-workflow-layout">
          <aside className="quote-workflow-side">
            <AnchoredWorkflowRail
              activeStepId={activeSectionId}
              steps={workflowSteps}
              title={t('quotationRequests.workflowTitle')}
              onStepSelect={scrollToSection}
            />
            <Paper withBorder p="sm" className="quote-workflow-action-card">
              <Group gap="xs" grow>
                <Button type="button" variant="default" leftSection={<IconX size={16} />} onClick={onCancel}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  loading={createMutation.isPending || masterData.isLoading}
                  disabled={!canSubmit}
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  {t('common.save')}
                </Button>
              </Group>
            </Paper>
          </aside>

          <div className="quote-workflow-main">
            <div id="rfq-form-intake" className="quote-workflow-card-grid quote-workflow-card-grid--rfq-intake quote-workflow-section">
              <section id="rfq-form-identification" className="quote-workflow-section">
                <FormSection
                  title={t('quotationRequests.section.identification')}
                  description={t('quotationRequests.section.identificationHint')}
                >
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                    <TextInput
                      className="quote-workflow-field-span"
                      label={t('quotationRequests.field.customerRef')}
                      value={customerRef}
                      onChange={(event) => setCustomerRef(event.currentTarget.value)}
                      required
                    />
                    <TextInput
                      label={t('quotationRequests.field.customerPoRef')}
                      value={customerPoRef}
                      onChange={(event) => setCustomerPoRef(event.currentTarget.value)}
                    />
                    <TextInput
                      label={t('quotationRequests.field.customerContractRef')}
                      value={customerContractRef}
                      onChange={(event) => setCustomerContractRef(event.currentTarget.value)}
                    />
                  </SimpleGrid>
                </FormSection>
              </section>

              <section id="rfq-form-commercial" className="quote-workflow-section">
                <FormSection
                  title={t('quotationRequests.section.commercial')}
                  description={t('quotationRequests.section.commercialHint')}
                >
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                    <Select
                      className="quote-workflow-field-span"
                      label={t('quotationRequests.field.supplier')}
                      data={masterData.supplierOptions}
                      value={supplierId}
                      searchable
                      required
                      onChange={onSupplierChange}
                    />
                    <Select
                      label={t('quotationRequests.field.incoterm')}
                      data={masterData.incotermOptions}
                      value={incoterm}
                      onChange={setIncoterm}
                      searchable
                      required
                    />
                    <Select label={t('quotationRequests.field.mode')} data={rfqModeOptions} value={mode} onChange={setMode} required />
                    <Select
                      label={t('quotations.currency')}
                      data={masterData.currencyOptions}
                      value={currency}
                      onChange={setCurrency}
                      searchable
                      required
                    />
                  </SimpleGrid>
                </FormSection>
              </section>

              <section id="rfq-form-logistics" className="quote-workflow-section">
                <FormSection
                  title={t('quotationRequests.section.logistics')}
                  description={t('quotationRequests.section.logisticsHint')}
                >
                  <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                    <TextInput
                      label={<HeaderLabel label={t('quotations.originPort')} hint={t('quotations.originPortHint')} />}
                      description={`${t('purchaseOrders.originCountry')}: ${selectedSupplier?.country ?? '-'}`}
                      value={originPort}
                      onChange={(event) => setOriginPort(event.currentTarget.value)}
                    />
                    <TextInput
                      label={<HeaderLabel label={t('quotations.destinationPort')} hint={t('quotations.destinationPortHint')} />}
                      description={`${t('purchaseOrders.destinationCountry')}: VN`}
                      value={destinationPort}
                      onChange={(event) => setDestinationPort(event.currentTarget.value)}
                    />
                    <DateField
                      label={
                        <HeaderLabel
                          label={t('quotationRequests.field.readyDate')}
                          hint={t('quotationRequests.field.readyDateHint')}
                        />
                      }
                      value={readyDate}
                      onChange={setReadyDate}
                    />
                    <NumberInput
                      label={
                        <HeaderLabel
                          label={t('quotationRequests.field.weightDerived')}
                          hint={t('quotationRequests.field.weightDerivedHint')}
                        />
                      }
                      value={Number(totalWeight.toFixed(3))}
                      min={0}
                      thousandSeparator=","
                      decimalScale={3}
                      readOnly
                    />
                    {!fclMode ? (
                      <NumberInput
                        label={
                          <HeaderLabel
                            label={t('quotationRequests.field.volumeDerived')}
                            hint={t('quotationRequests.field.volumeDerivedHint')}
                          />
                        }
                        value={Number(totalCbm.toFixed(4))}
                        min={0}
                        decimalScale={4}
                        readOnly
                      />
                    ) : null}
                    {airMode ? (
                      <>
                        <NumberInput
                          label={
                            <HeaderLabel
                              label={t('quotationRequests.field.dimWeight')}
                              hint={t('quotationRequests.field.dimWeightHint')}
                            />
                          }
                          value={Number(dimWeight.toFixed(3))}
                          min={0}
                          thousandSeparator=","
                          decimalScale={3}
                          readOnly
                          styles={{ input: { fontWeight: 700 } }}
                        />
                        <NumberInput
                          label={
                            <HeaderLabel
                              label={t('quotationRequests.field.chargeableWeight')}
                              hint={t('quotationRequests.field.chargeableWeightHint')}
                            />
                          }
                          value={Number(chargeableWeight.toFixed(3))}
                          min={0}
                          thousandSeparator=","
                          decimalScale={3}
                          readOnly
                          styles={{ input: { fontWeight: 700 } }}
                        />
                      </>
                    ) : null}
                    {lclMode ? (
                      <NumberInput
                        label={
                          <HeaderLabel
                            label={t('quotationRequests.field.chargeableRevenueTon')}
                            hint={t('quotationRequests.field.chargeableRevenueTonHint')}
                          />
                        }
                        value={Number(chargeableRevenueTon.toFixed(3))}
                        min={0}
                        thousandSeparator=","
                        decimalScale={3}
                        readOnly
                        styles={{ input: { fontWeight: 700 } }}
                      />
                    ) : null}
                  </SimpleGrid>
                  <Textarea
                    label={t('quotationRequests.field.note')}
                    value={note}
                    onChange={(event) => setNote(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    mt="sm"
                  />
                </FormSection>
              </section>
            </div>

            <section id="rfq-form-cargo" className="quote-workflow-section">
              <RfqCargoEditorPanel form={form} t={t} />
            </section>
          </div>
        </div>
      </Stack>
    </form>
  );
}
