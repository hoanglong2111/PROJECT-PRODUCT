import 'dotenv/config';

import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';

import { APP_ROLES } from '../src/auth/types';
import type { DeliveryOrder, LogisticsTask, PurchaseOrder, PurchaseRequest } from '../src/models/logistics';
import { authenticateRequest, authorizeRole, toAuthUser } from './auth';
import { API_PREFIX, CORS_ORIGIN, JWT_SECRET, PORT, readAllRoles, roleGroups } from './constants';
import { pool } from './db';
import { ApiError } from './errors';
import { ensureSchemaAndSeed } from './schema';
import {
  buildDashboardStats,
  buildGlobalSearchResults,
  classifyDeliveryOrders,
  classifyPurchaseOrders,
  createDeliveryOrder,
  createPurchaseOrder,
  createPurchaseRequest,
  fetchExchangeRates,
  normalizeCurrencyCode,
  normalizeDeliveryOrder,
  normalizePurchaseOrder,
  normalizePurchaseRequest,
  readSnapshot,
  updateDeliveryOrder,
  updatePurchaseRequest,
  updateTask,
} from './services/logistics';
import type {
  AppUserRow,
  AuthenticatedRequest,
  CreateDeliveryOrderBody,
  CreatePurchaseOrderBody,
  CreatePurchaseRequestBody,
  CreateUserBody,
  TokenPayload,
  UpdateDeliveryOrderBody,
  UpdatePurchaseRequestBody,
  UpdateTaskBody,
} from './types';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get(`${API_PREFIX}/health`, (_request, response) => {
  response.json({
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    errors: [],
  });
});

app.post(`${API_PREFIX}/auth/login`, async (request, response) => {
  const email = String(request.body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(request.body?.password ?? '');

  if (!email || !password) {
    response.status(400).json({ data: null, errors: [{ message: 'Email và mật khẩu là bắt buộc.' }] });
    return;
  }

  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 LIMIT 1', [email]);
  const user = result.rows[0];

  if (!user) {
    response.status(401).json({ data: null, errors: [{ message: 'Email hoặc mật khẩu không đúng.' }] });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    response.status(401).json({ data: null, errors: [{ message: 'Email hoặc mật khẩu không đúng.' }] });
    return;
  }

  const tokenPayload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

  response.json({
    data: {
      token,
      user: toAuthUser(user),
    },
    errors: [],
  });
});

app.get(`${API_PREFIX}/auth/me`, authenticateRequest, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.sub;
  const result = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1 LIMIT 1', [userId]);
  const user = result.rows[0];

  if (!user) {
    response.status(404).json({ data: null, errors: [{ message: 'Không tìm thấy tài khoản.' }] });
    return;
  }

  response.json({ data: toAuthUser(user), errors: [] });
});

app.patch(`${API_PREFIX}/profile`, authenticateRequest, async (request: AuthenticatedRequest, response) => {
  const userId = request.auth?.sub;
  const fullName = String(request.body?.fullName ?? '').trim();
  const department = String(request.body?.department ?? '').trim();
  const avatarUrlRaw = String(request.body?.avatarUrl ?? '').trim();
  const avatarUrl = avatarUrlRaw.length > 0 ? avatarUrlRaw : null;

  if (!fullName || !department) {
    response.status(400).json({ data: null, errors: [{ message: 'fullName và department là bắt buộc.' }] });
    return;
  }

  const result = await pool.query<AppUserRow>(
    `
      UPDATE app_users
      SET full_name = $1, department = $2, avatar_url = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `,
    [fullName, department, avatarUrl, userId],
  );
  const updated = result.rows[0];

  if (!updated) {
    response.status(404).json({ data: null, errors: [{ message: 'Không tìm thấy tài khoản để cập nhật.' }] });
    return;
  }

  response.json({ data: toAuthUser(updated), errors: [] });
});

app.get(`${API_PREFIX}/users`, authenticateRequest, authorizeRole(['ADMIN']), async (_request, response) => {
  const result = await pool.query<AppUserRow>(
    `
      SELECT *
      FROM app_users
      ORDER BY full_name ASC
    `,
  );

  response.json({ data: result.rows.map(toAuthUser), errors: [] });
});

app.post(`${API_PREFIX}/users`, authenticateRequest, authorizeRole(['ADMIN']), async (request, response) => {
  const body = request.body as CreateUserBody;
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body.password ?? '');
  const fullName = String(body.fullName ?? '').trim();
  const role = body.role;
  const position = String(body.position ?? '').trim();
  const department = String(body.department ?? '').trim();
  const avatarUrlRaw = String(body.avatarUrl ?? '').trim();
  const avatarUrl = avatarUrlRaw.length > 0 ? avatarUrlRaw : null;

  if (!email || !password || !fullName || !role || !position || !department) {
    response.status(400).json({ data: null, errors: [{ message: 'Thiếu thông tin bắt buộc để tạo account.' }] });
    return;
  }

  if (!APP_ROLES.includes(role)) {
    response.status(400).json({ data: null, errors: [{ message: 'Role không hợp lệ.' }] });
    return;
  }

  if (password.length < 6) {
    response.status(400).json({ data: null, errors: [{ message: 'Mật khẩu tối thiểu 6 ký tự.' }] });
    return;
  }

  const existing = await pool.query<AppUserRow>('SELECT * FROM app_users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows[0]) {
    response.status(409).json({ data: null, errors: [{ message: 'Email đã tồn tại.' }] });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = `usr-${randomUUID()}`;
  const result = await pool.query<AppUserRow>(
    `
      INSERT INTO app_users (id, email, password_hash, full_name, role, position, department, avatar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [id, email, passwordHash, fullName, role, position, department, avatarUrl],
  );

  response.status(201).json({ data: toAuthUser(result.rows[0]), errors: [] });
});

app.get(`${API_PREFIX}/search`, authenticateRequest, async (request: AuthenticatedRequest, response) => {
  const query = String(request.query.q ?? '').trim();
  if (query.length < 2) {
    response.json({ data: [], errors: [] });
    return;
  }

  const [purchaseRequestsRaw, purchaseOrdersRaw, deliveryOrdersRaw, tasks, usersResult] = await Promise.all([
    readSnapshot<PurchaseRequest[]>('purchase_requests'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
    request.auth?.role === 'ADMIN'
      ? pool.query<AppUserRow>('SELECT * FROM app_users ORDER BY full_name ASC')
      : pool.query<AppUserRow>('SELECT * FROM app_users WHERE id = $1', [request.auth?.sub]),
  ]);
  const purchaseRequests = purchaseRequestsRaw.map(normalizePurchaseRequest);
  const purchaseOrders = classifyPurchaseOrders(purchaseOrdersRaw.map(normalizePurchaseOrder), deliveryOrdersRaw.map(normalizeDeliveryOrder));
  const deliveryOrders = classifyDeliveryOrders(deliveryOrdersRaw.map(normalizeDeliveryOrder), purchaseOrders);

  response.json({
    data: buildGlobalSearchResults({
      deliveryOrders,
      purchaseOrders,
      purchaseRequests,
      query,
      tasks,
      users: usersResult.rows,
    }),
    errors: [],
  });
});

app.get(`${API_PREFIX}/exchange-rates`, authenticateRequest, authorizeRole(readAllRoles), async (request, response) => {
  const baseQuery = Array.isArray(request.query.base) ? request.query.base[0] : request.query.base;
  const base = baseQuery === undefined ? 'USD' : normalizeCurrencyCode(baseQuery, 'base');
  const payload = await fetchExchangeRates(base);

  response.json({
    data: payload,
    errors: [],
  });
});

app.get(
  `${API_PREFIX}/purchase-requests`,
  authenticateRequest,
  authorizeRole(readAllRoles),
  async (_request, response) => {
    const purchaseRequests = (await readSnapshot<PurchaseRequest[]>('purchase_requests')).map(normalizePurchaseRequest);
    response.json({ data: purchaseRequests, errors: [] });
  },
);

app.post(
  `${API_PREFIX}/purchase-requests`,
  authenticateRequest,
  authorizeRole(roleGroups.purchaseRequests),
  async (request: AuthenticatedRequest, response) => {
    const purchaseRequest = await createPurchaseRequest(request.body as CreatePurchaseRequestBody, request.auth);
    response.status(201).json({ data: purchaseRequest, errors: [] });
  },
);

app.patch(
  `${API_PREFIX}/purchase-requests/:requestedOrderId`,
  authenticateRequest,
  authorizeRole(roleGroups.purchaseRequests),
  async (request, response) => {
    const purchaseRequest = await updatePurchaseRequest(
      decodeURIComponent(String(request.params.requestedOrderId ?? '')),
      request.body as UpdatePurchaseRequestBody,
    );
    response.json({ data: purchaseRequest, errors: [] });
  },
);

app.get(
  `${API_PREFIX}/purchase-orders`,
  authenticateRequest,
  authorizeRole(readAllRoles),
  async (_request, response) => {
    const [purchaseOrdersRaw, deliveryOrdersRaw] = await Promise.all([
      readSnapshot<PurchaseOrder[]>('purchase_orders'),
      readSnapshot<DeliveryOrder[]>('delivery_orders'),
    ]);
    const purchaseOrders = classifyPurchaseOrders(
      purchaseOrdersRaw.map(normalizePurchaseOrder),
      deliveryOrdersRaw.map(normalizeDeliveryOrder),
    );
    response.json({ data: purchaseOrders, errors: [] });
  },
);

app.post(
  `${API_PREFIX}/purchase-orders`,
  authenticateRequest,
  authorizeRole(roleGroups.purchaseOrders),
  async (request, response) => {
    const purchaseOrder = await createPurchaseOrder(request.body as CreatePurchaseOrderBody);
    response.status(201).json({ data: purchaseOrder, errors: [] });
  },
);

app.get(
  `${API_PREFIX}/delivery-orders`,
  authenticateRequest,
  authorizeRole(readAllRoles),
  async (_request, response) => {
    const [deliveryOrdersRaw, purchaseOrdersRaw] = await Promise.all([
      readSnapshot<DeliveryOrder[]>('delivery_orders'),
      readSnapshot<PurchaseOrder[]>('purchase_orders'),
    ]);
    const purchaseOrders = classifyPurchaseOrders(
      purchaseOrdersRaw.map(normalizePurchaseOrder),
      deliveryOrdersRaw.map(normalizeDeliveryOrder),
    );
    const deliveryOrders = classifyDeliveryOrders(deliveryOrdersRaw.map(normalizeDeliveryOrder), purchaseOrders);
    response.json({ data: deliveryOrders, errors: [] });
  },
);

app.post(
  `${API_PREFIX}/delivery-orders`,
  authenticateRequest,
  authorizeRole(roleGroups.deliveryOrders),
  async (request, response) => {
    const deliveryOrder = await createDeliveryOrder(request.body as CreateDeliveryOrderBody);
    response.status(201).json({ data: deliveryOrder, errors: [] });
  },
);

app.patch(
  `${API_PREFIX}/delivery-orders/:orderNumber`,
  authenticateRequest,
  authorizeRole(roleGroups.deliveryOrders),
  async (request, response) => {
    const deliveryOrder = await updateDeliveryOrder(
      decodeURIComponent(String(request.params.orderNumber ?? '')),
      request.body as UpdateDeliveryOrderBody,
    );
    response.json({ data: deliveryOrder, errors: [] });
  },
);

app.get(
  `${API_PREFIX}/tasks`,
  authenticateRequest,
  authorizeRole(readAllRoles),
  async (_request, response) => {
    const tasks = await readSnapshot<LogisticsTask[]>('tasks');
    response.json({ data: tasks, errors: [] });
  },
);

app.patch(`${API_PREFIX}/tasks/:taskId`, authenticateRequest, authorizeRole(roleGroups.tasks), async (request, response) => {
  const task = await updateTask(
    decodeURIComponent(String(request.params.taskId ?? '')),
    request.body as UpdateTaskBody,
  );
  response.json({ data: task, errors: [] });
});

app.get(`${API_PREFIX}/dashboard/stats`, authenticateRequest, async (_request, response) => {
  const [purchaseRequestsRaw, purchaseOrdersRaw, deliveryOrdersRaw, tasks] = await Promise.all([
    readSnapshot<PurchaseRequest[]>('purchase_requests'),
    readSnapshot<PurchaseOrder[]>('purchase_orders'),
    readSnapshot<DeliveryOrder[]>('delivery_orders'),
    readSnapshot<LogisticsTask[]>('tasks'),
  ]);
  const purchaseRequests = purchaseRequestsRaw.map(normalizePurchaseRequest);
  const deliveryOrdersBase = deliveryOrdersRaw.map(normalizeDeliveryOrder);
  const purchaseOrders = classifyPurchaseOrders(purchaseOrdersRaw.map(normalizePurchaseOrder), deliveryOrdersBase);
  const deliveryOrders = classifyDeliveryOrders(deliveryOrdersBase, purchaseOrders);

  response.json({
    data: buildDashboardStats({
      purchaseRequests,
      purchaseOrders,
      deliveryOrders,
      tasks,
    }),
    errors: [],
  });
});

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  response.status(statusCode).json({
    data: null,
    errors: [{ message: error.message }],
  });
});

start().catch((error: Error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start KBFE backend:', error.message);
  process.exit(1);
});

async function start() {
  await ensureSchemaAndSeed();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`KBFE backend is running at http://localhost:${PORT}${API_PREFIX}`);
  });
}
