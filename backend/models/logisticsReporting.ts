import type {
  BusinessFlowTag,
  DeliveryOrder,
  LogisticsTask,
  PurchaseOrder,
  PurchaseRequest,
} from '../domain/logistics';
import type { AppRole } from '../domain/auth';
import type { AppUserRow, DashboardStats, GlobalSearchKind, GlobalSearchResult } from '../domain/types';

export function buildGlobalSearchResults({
  currentUserId,
  currentUserRole,
  deliveryOrders,
  purchaseOrders,
  purchaseRequests,
  query,
  tasks,
  users,
}: {
  currentUserId?: string;
  currentUserRole?: AppRole;
  deliveryOrders: DeliveryOrder[];
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
  query: string;
  tasks: LogisticsTask[];
  users: AppUserRow[];
}): GlobalSearchResult[] {
  const normalizedQuery = normalizeSearch(query);
  const results: Array<GlobalSearchResult & { score: number; sequence: number }> = [];

  const addResult = ({
    kind,
    result,
    values,
    weight = 0,
  }: {
    kind: GlobalSearchKind;
    result: GlobalSearchResult;
    values: Array<string | null | undefined>;
    weight?: number;
  }) => {
    if (!canSearchKind(kind, currentUserRole)) {
      return;
    }

    const score = scoreSearch(normalizedQuery, values);
    if (score === 0) {
      return;
    }

    results.push({ ...result, score: score + weight, sequence: results.length });
  };

  for (const request of purchaseRequests) {
    const values = [
      request.requested_order_id,
      request.item_code,
      request.item_name,
      request.production_contract_number,
      request.requester.name,
      request.purchasing_manager.name,
      request.status,
      ...(request.flow_tags ?? []),
      ...request.line_items.flatMap((line) => [line.item_code, line.item_name]),
    ];

    addResult({
      kind: 'purchase_request',
      values,
      weight: 8,
      result: {
        href: `/purchase-requests?pr=${encodeURIComponent(request.requested_order_id)}`,
        id: request.id,
        kind: 'purchase_request',
        meta: request.priority,
        status: request.status,
        subtitle: `${request.item_code} - ${request.item_name}`,
        title: request.requested_order_id,
      },
    });
  }

  for (const order of purchaseOrders) {
    const values = [
      order.po_number,
      order.supplier_code,
      order.supplier_name,
      order.status,
      order.sap_sync_status,
      ...order.source_pr_codes,
      ...order.linked_do_numbers,
      ...(order.flow_tags ?? []),
      ...order.line_items.flatMap((line) => [line.item_code, line.item_name, line.source_pr_code]),
    ];

    addResult({
      kind: 'purchase_order',
      values,
      weight: 7,
      result: {
        href: `/purchase-orders?po=${encodeURIComponent(order.po_number)}`,
        id: order.id,
        kind: 'purchase_order',
        meta: order.supplier_code,
        status: order.status,
        subtitle: `${order.supplier_name} - ${order.currency} ${order.total_amount.toLocaleString('en-US')}`,
        title: order.po_number,
      },
    });
  }

  for (const order of deliveryOrders) {
    const values = [
      order.order_info.order_number,
      order.order_info.request_code,
      order.order_info.tracking_number,
      order.order_info.status,
      order.sap_integration.po_number,
      order.sap_integration.supplier_code,
      order.sap_integration.supplier_name,
      order.product_details.item_name_requested,
      ...(order.flow_tags ?? []),
      ...order.source_lines.flatMap((line) => [line.po_number, line.request_code, line.item_code, line.item_name]),
    ];

    addResult({
      kind: 'delivery_order',
      values,
      weight: 6,
      result: {
        href: `/delivery-orders?do=${encodeURIComponent(order.order_info.order_number)}`,
        id: order.id,
        kind: 'delivery_order',
        meta: order.warehouse_tracking.warehouse_code,
        status: order.order_info.status,
        subtitle: `${order.order_info.request_code} - ETA ${order.logistics_shipping.eta_planned ?? 'N/A'}`,
        title: order.order_info.order_number,
      },
    });
  }

  for (const task of tasks) {
    const values = [
      task.task_id,
      task.task_name,
      task.do_number,
      task.request_code,
      task.po_number,
      task.role,
      task.assignee.name,
      task.status,
      task.blocked_reason,
    ];

    addResult({
      kind: 'task',
      values,
      weight: 5,
      result: {
        href: `/tasks?task=${encodeURIComponent(task.task_id)}`,
        id: task.task_id,
        kind: 'task',
        meta: task.role,
        status: task.status,
        subtitle: `${task.assignee.name} - ${task.do_number}`,
        title: task.task_name,
      },
    });
  }

  for (const user of users) {
    const values = [user.full_name, user.email, user.role, user.position, user.department];
    const href = currentUserRole === 'ADMIN' && user.id !== currentUserId
      ? `/settings?section=accounts&account=${encodeURIComponent(user.id)}`
      : '/profile';

    addResult({
      kind: 'account',
      values,
      weight: 4,
      result: {
        href,
        id: user.id,
        kind: 'account',
        meta: user.department,
        status: user.role,
        subtitle: `${user.email} - ${user.department}`,
        title: user.full_name,
      },
    });
  }

  return results
    .sort((left, right) => right.score - left.score || left.sequence - right.sequence)
    .slice(0, 12)
    .map((result) => ({
      href: result.href,
      id: result.id,
      kind: result.kind,
      meta: result.meta,
      status: result.status,
      subtitle: result.subtitle,
      title: result.title,
    }));
}

const managerRoles: AppRole[] = ['ADMIN', 'PIC_MANAGER'];
const salesRoles: AppRole[] = [...managerRoles, 'SALE_STAFF'];
const operationsRoles: AppRole[] = [...managerRoles, 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'WAREHOUSE_STAFF'];

const searchableRolesByKind: Record<GlobalSearchKind, AppRole[] | null> = {
  account: null,
  delivery_order: operationsRoles,
  purchase_order: [...salesRoles, 'FINANCE_OFFICER'],
  purchase_request: salesRoles,
  task: [...operationsRoles, 'FINANCE_OFFICER'],
};

function canSearchKind(kind: GlobalSearchKind, role: AppRole | undefined) {
  const allowedRoles = searchableRolesByKind[kind];
  return !allowedRoles || (role ? allowedRoles.includes(role) : false);
}

function scoreSearch(normalizedQuery: string, values: Array<string | null | undefined>) {
  let bestScore = 0;

  for (const value of values) {
    const normalizedValue = normalizeSearch(value ?? '');
    if (!normalizedValue) {
      continue;
    }

    if (normalizedValue === normalizedQuery) {
      bestScore = Math.max(bestScore, 120);
    } else if (normalizedValue.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 90);
    } else if (normalizedValue.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 50);
    }
  }

  return bestScore;
}


function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function buildDashboardStats({
  purchaseRequests,
  purchaseOrders,
  deliveryOrders,
  tasks,
}: {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  deliveryOrders: DeliveryOrder[];
  tasks: LogisticsTask[];
}): DashboardStats {
  const deliveryStatusCounter = new Map<DeliveryOrder['order_info']['status'], number>();
  const taskStatusCounter = new Map<LogisticsTask['status'], number>();
  const taskRoleCounter = new Map<LogisticsTask['role'], { completed: number; total: number }>();
  const monthCounter = new Map<string, { deliveryOrders: number; completedTasks: number }>();
  const businessFlowCounter = new Map<BusinessFlowTag, number>();

  for (const order of deliveryOrders) {
    deliveryStatusCounter.set(
      order.order_info.status,
      (deliveryStatusCounter.get(order.order_info.status) ?? 0) + 1,
    );

    const month = order.logistics_shipping.eta_planned?.slice(0, 7) ?? 'No ETA';
    const monthData = monthCounter.get(month) ?? { deliveryOrders: 0, completedTasks: 0 };
    monthData.deliveryOrders += 1;
    monthCounter.set(month, monthData);

    for (const tag of order.flow_tags) {
      businessFlowCounter.set(tag, (businessFlowCounter.get(tag) ?? 0) + 1);
    }
  }

  for (const task of tasks) {
    taskStatusCounter.set(task.status, (taskStatusCounter.get(task.status) ?? 0) + 1);

    const roleData = taskRoleCounter.get(task.role) ?? { completed: 0, total: 0 };
    roleData.total += 1;
    if (task.status === 'COMPLETED') {
      roleData.completed += 1;
    }
    taskRoleCounter.set(task.role, roleData);

    if (task.completed_at) {
      const month = task.completed_at.slice(0, 7);
      const monthData = monthCounter.get(month) ?? { deliveryOrders: 0, completedTasks: 0 };
      monthData.completedTasks += 1;
      monthCounter.set(month, monthData);
    }
  }

  return {
    totals: {
      purchaseRequests: purchaseRequests.length,
      purchaseOrders: purchaseOrders.length,
      deliveryOrders: deliveryOrders.length,
      tasks: tasks.length,
      blockedTasks: tasks.filter((task) => task.status === 'BLOCKED').length,
    },
    deliveryOrderStatus: Array.from(deliveryStatusCounter.entries()).map(([status, count]) => ({ status, count })),
    taskStatus: Array.from(taskStatusCounter.entries()).map(([status, count]) => ({ status, count })),
    taskRoleProgress: Array.from(taskRoleCounter.entries()).map(([role, payload]) => ({
      role,
      total: payload.total,
      completed: payload.completed,
      completionRate: payload.total > 0 ? Math.round((payload.completed / payload.total) * 100) : 0,
    })),
    monthlyThroughput: Array.from(monthCounter.entries())
      .map(([month, payload]) => ({
        month,
        deliveryOrders: payload.deliveryOrders,
        completedTasks: payload.completedTasks,
      }))
      .sort((left, right) => left.month.localeCompare(right.month)),
    businessFlowCounts: Array.from(businessFlowCounter.entries()).map(([tag, count]) => ({ tag, count })),
  };
}
