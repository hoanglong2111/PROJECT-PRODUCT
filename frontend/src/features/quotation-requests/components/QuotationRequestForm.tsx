import { Alert, Button, Group, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconDeviceFloppy, IconX } from '@tabler/icons-react';

import type { QuotationRequestV1 } from '@shared/api/quotationRequests';
import { DateField } from '@shared/components/DateField';
import { HeaderLabel } from '@shared/components/HeaderLabel';
import { FormSection } from '@shared/components/order-intake';
import { useI18n } from '@shared/i18n';

import { rfqModeOptions } from '../model/quotationRequestModel';
import { useQuotationRequestForm } from '../hooks/useQuotationRequestForm';
import { RfqCargoEditorPanel } from './RfqCargoEditorPanel';
import { RfqFormSummaryTiles } from './RfqFormSummaryTiles';

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

  return (
    <form
      className="purchase-order-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
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
          <Group gap="xs">
            <Button type="button" variant="subtle" leftSection={<IconX size={16} />} onClick={onCancel}>
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
        </Group>

        {createMutation.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t('quotationRequests.createError')}>
            {(createMutation.error as Error).message}
          </Alert>
        ) : null}

        <RfqFormSummaryTiles form={form} t={t} />

        <div className="purchase-order-form-core-grid">
          <FormSection
            title={t('quotationRequests.section.identification')}
            description={t('quotationRequests.section.identificationHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
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

          <FormSection
            title={t('quotationRequests.section.commercial')}
            description={t('quotationRequests.section.commercialHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
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

          <FormSection
            title={t('quotationRequests.section.logistics')}
            description={t('quotationRequests.section.logisticsHint')}
          >
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
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
        </div>

        <RfqCargoEditorPanel form={form} t={t} />
      </Stack>
    </form>
  );
}
