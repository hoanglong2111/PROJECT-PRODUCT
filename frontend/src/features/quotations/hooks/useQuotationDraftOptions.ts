import { useRef, useState } from 'react';

import type { QuotationChargeGroup, QuotationV1 } from '@shared/api/quotations';

import {
  addDraftChargeLine,
  removeDraftChargeLineAt,
  emptyDraftGroups,
  seedDraftGroupsForOption,
  updateDraftChargeLineAt,
  type QuotationDraftChargeLineState,
} from '../model/quotationDraftLines';
import type { DraftQuotationOption } from '../model/quotationOptionDraft';

/**
 * Owns the quotation form's draft-option state machine: the option list, the
 * per-group charge-line mutators, collapse state, and scroll-into-view refs.
 * Pure relocation of the mutators that previously lived inline in QuotationForm.
 */
export function useQuotationDraftOptions(
  sourceQuotation: QuotationV1 | undefined,
  resolveDefaultUom: (chargeCode: string | null | undefined) => string | null | undefined,
) {
  const [draftOptions, setDraftOptions] = useState<DraftQuotationOption[]>(
    (sourceQuotation?.options ?? []).map((option) => ({
      id: option.id,
      option_no: option.option_no,
      carrier_code: option.carrier_code,
      carrier_name: option.carrier_name,
      mode: option.mode ?? sourceQuotation?.mode ?? null,
      vessel_or_flight: option.vessel_or_flight,
      voyage_flight_no: option.voyage_flight_no,
      etd: option.etd,
      eta: option.eta,
      transit_time_days: option.transit_time_days,
      risk_warning: option.risk_warning,
      headline_amount: Number(option.headline_amount ?? 0),
      is_recommended: option.is_recommended,
      is_selected: option.is_selected,
      groupLines: seedDraftGroupsForOption(sourceQuotation, option.option_no),
    })),
  );
  const [collapsedOptionIds, setCollapsedOptionIds] = useState<Set<string>>(new Set());
  const optionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function updateOption(id: string, patch: Partial<DraftQuotationOption>) {
    setDraftOptions((current) => current.map((option) => (option.id === id ? { ...option, ...patch } : option)));
  }

  function setRecommendedOption(id: string) {
    setDraftOptions((current) => current.map((option) => ({ ...option, is_recommended: option.id === id })));
  }

  function addOptionLine(id: string, group: QuotationChargeGroup) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? { ...option, groupLines: addDraftChargeLine(option.groupLines, group) }
          : option
      )),
    );
  }

  function updateOptionLine(
    id: string,
    group: QuotationChargeGroup,
    rowIndex: number,
    patch: Partial<QuotationDraftChargeLineState>,
  ) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? {
            ...option,
            groupLines: updateDraftChargeLineAt(
              option.groupLines,
              group,
              rowIndex,
              patch,
              resolveDefaultUom,
            ),
          }
          : option
      )),
    );
  }

  function removeOptionLine(id: string, group: QuotationChargeGroup, rowIndex: number) {
    setDraftOptions((current) =>
      current.map((option) => (
        option.id === id
          ? { ...option, groupLines: removeDraftChargeLineAt(option.groupLines, group, rowIndex) }
          : option
      )),
    );
  }

  function toggleOptionCollapsed(id: string) {
    setCollapsedOptionIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function scrollOptionIntoView(id: string) {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const target = optionRefs.current[id];
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportPadding = 24;
        const isOutOfView = rect.top < viewportPadding || rect.bottom > viewportHeight - viewportPadding;
        if (isOutOfView) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }, 180);
  }

  function addDraftOption(mode: string | null) {
    const nextId = `draft-option-${Date.now()}`;
    setCollapsedOptionIds(new Set(draftOptions.map((option) => option.id)));
    setDraftOptions((current) => [
      ...current,
      {
        id: nextId,
        option_no: current.length + 1,
        carrier_code: null,
        carrier_name: null,
        mode,
        vessel_or_flight: null,
        voyage_flight_no: null,
        etd: null,
        eta: null,
        transit_time_days: null,
        risk_warning: null,
        headline_amount: null,
        is_recommended: current.length === 0,
        is_selected: false,
        groupLines: emptyDraftGroups(),
      },
    ]);
    scrollOptionIntoView(nextId);
  }

  function removeDraftOption(optionId: string) {
    setCollapsedOptionIds((current) => {
      const next = new Set(current);
      next.delete(optionId);
      return next;
    });
    setDraftOptions((current) => {
      const remaining = current
        .filter((item) => item.id !== optionId)
        .map((item, index) => ({ ...item, option_no: index + 1 }));
      if (remaining.length > 0 && !remaining.some((option) => option.is_recommended)) {
        return remaining.map((option, index) => ({ ...option, is_recommended: index === 0 }));
      }
      return remaining;
    });
  }

  return {
    addDraftOption,
    addOptionLine,
    collapsedOptionIds,
    draftOptions,
    optionRefs,
    removeDraftOption,
    removeOptionLine,
    setRecommendedOption,
    toggleOptionCollapsed,
    updateOption,
    updateOptionLine,
  };
}
