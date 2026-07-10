import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createShipmentCost,
  createShipmentDocument,
  deleteShipmentCost,
  markShipmentMilestoneDone,
  updateShipmentCost,
  updateShipmentDocument,
  type ShipmentCostPayload,
  type ShipmentDocumentPayload,
  type ShipmentMilestoneCodeV1,
} from '@shared/api/shipments';
import { queryKeys } from '@shared/api/queryKeys';

export function useShipmentMutations() {
  const queryClient = useQueryClient();
  const invalidateShipments = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.shipments });
  };

  const milestoneMutation = useMutation({
    mutationFn: ({
      actualAt,
      milestoneCode,
      notes,
      shipmentId,
    }: {
      actualAt: string;
      milestoneCode: ShipmentMilestoneCodeV1;
      notes?: string | null;
      shipmentId: string;
    }) => markShipmentMilestoneDone(shipmentId, milestoneCode, { actual_at: actualAt, notes }),
    onSuccess: () => {
      invalidateShipments();
      void queryClient.invalidateQueries({ queryKey: queryKeys.shipmentLists });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: Partial<ShipmentDocumentPayload> }) =>
      updateShipmentDocument(documentId, payload),
    onSuccess: invalidateShipments,
  });

  const createDocumentMutation = useMutation({
    mutationFn: ({ payload, shipmentId }: { payload: ShipmentDocumentPayload; shipmentId: string }) =>
      createShipmentDocument(shipmentId, payload),
    onSuccess: invalidateShipments,
  });

  const createCostMutation = useMutation({
    mutationFn: ({ payload, shipmentId }: { payload: ShipmentCostPayload; shipmentId: string }) =>
      createShipmentCost(shipmentId, payload),
    onSuccess: invalidateShipments,
  });

  const updateCostMutation = useMutation({
    mutationFn: ({ costId, payload }: { costId: string; payload: Partial<ShipmentCostPayload> }) =>
      updateShipmentCost(costId, payload),
    onSuccess: invalidateShipments,
  });

  const deleteCostMutation = useMutation({
    mutationFn: (costId: string) => deleteShipmentCost(costId),
    onSuccess: invalidateShipments,
  });

  return {
    createCostMutation,
    createDocumentMutation,
    deleteCostMutation,
    milestoneMutation,
    updateCostMutation,
    updateDocumentMutation,
  };
}
