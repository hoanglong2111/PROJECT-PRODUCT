import { Text } from '@mantine/core';

import type { PurchaseOrderV1 } from '@shared/api/purchaseOrders';

import { dateOnly } from '../model/purchaseOrderModel';

type Stop = {
  key: string;
  title: string;
  planLabel: string;
  planValue: string;
  actLabel: string;
  actValue: string;
};

export function LogisticsRouteCell({ order }: { order: PurchaseOrderV1 }) {
  const lt = order.logistics_timeline;
  const stops: Stop[] = [
    {
      key: 'pol',
      title: 'POL',
      planLabel: 'ETD',
      planValue: dateOnly(lt?.loading_port?.etd ?? order.expected_etd),
      actLabel: 'ATD',
      actValue: dateOnly(lt?.loading_port?.atd ?? order.actual_etd),
    },
    {
      key: 'pod',
      title: 'POD',
      planLabel: 'ETA',
      planValue: dateOnly(lt?.unloading_port?.eta ?? order.expected_eta),
      actLabel: 'ATA',
      actValue: dateOnly(lt?.unloading_port?.ata ?? order.actual_eta),
    },
    {
      key: 'wh',
      title: 'Kho',
      planLabel: 'ETA',
      planValue: dateOnly(lt?.warehouse?.eta ?? order.expected_warehouse_eta),
      actLabel: 'ATA',
      actValue: dateOnly(lt?.warehouse?.ata ?? order.actual_warehouse_ata),
    },
  ];

  return (
    <div className="po-logistics-route">
      {stops.map((stop) => {
        const done = Boolean(stop.actValue);
        return (
          <div className={`po-logistics-node${done ? ' is-actual' : ''}`} key={stop.key}>
            <div className="po-logistics-stop">
              <span className="po-logistics-dot" aria-hidden="true" />
              <Text size="xs" fw={700} component="span">
                {stop.title}
              </Text>
            </div>
            <Text size="xs" className="tabular-nums po-logistics-date">
              {stop.planLabel} {stop.planValue || '-'}
            </Text>
            <Text size="xs" c="dimmed" className="tabular-nums po-logistics-date">
              {stop.actLabel} {stop.actValue || '—'}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
