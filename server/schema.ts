import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';

import { deliveryOrders, logisticsTasks, purchaseOrders, purchaseRequests } from './seeds/logisticsSeed';
import { pool } from './db';
import type { AppUserRow } from './types';
import { writeNormalizedSnapshot } from './services/normalizedStore';

const seedUsers: Array<Omit<AppUserRow, 'password_hash'> & { password: string }> = [
  {
    id: 'usr-admin-001',
    email: 'admin@kbfe.local',
    password: 'admin123',
    full_name: 'System Administrator',
    role: 'ADMIN',
    position: 'Admin',
    department: 'IT Operations',
    avatar_url: null,
  },
  {
    id: 'usr-manager-001',
    email: 'manager@kbfe.local',
    password: 'manager123',
    full_name: 'Tran Thi Binh',
    role: 'PIC_MANAGER',
    position: 'PIC Manager',
    department: 'Purchasing',
    avatar_url: null,
  },
  {
    id: 'usr-sale-001',
    email: 'sale@kbfe.local',
    password: 'sale123',
    full_name: 'Vu Thu Ha',
    role: 'SALE_STAFF',
    position: 'Sale Staff',
    department: 'Sales Operations',
    avatar_url: null,
  },
  {
    id: 'usr-port-001',
    email: 'port@kbfe.local',
    password: 'port123',
    full_name: 'Pham Quoc Huy',
    role: 'PORT_OFFICER',
    position: 'Port Officer',
    department: 'Port Operations',
    avatar_url: null,
  },
  {
    id: 'usr-customs-001',
    email: 'customs@kbfe.local',
    password: 'customs123',
    full_name: 'Le Minh Chau',
    role: 'CUSTOMS_OFFICER',
    position: 'Customs Officer',
    department: 'Import Customs',
    avatar_url: null,
  },
  {
    id: 'usr-finance-001',
    email: 'finance@kbfe.local',
    password: 'finance123',
    full_name: 'Do Thi Ngoc',
    role: 'FINANCE_OFFICER',
    position: 'Finance Officer',
    department: 'Finance',
    avatar_url: null,
  },
  {
    id: 'usr-warehouse-001',
    email: 'warehouse@kbfe.local',
    password: 'warehouse123',
    full_name: 'Hoang Minh Quan',
    role: 'WAREHOUSE_STAFF',
    position: 'Warehouse Staff',
    department: 'Warehouse',
    avatar_url: null,
  },
];

export async function ensureSchemaAndSeed() {
  const migrationSql = await readFile(new URL('./migrations/001_normalized_logistics_schema.sql', import.meta.url), 'utf8');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(migrationSql);

  const usersCount = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM app_users');
  if (Number(usersCount.rows[0]?.count ?? 0) === 0) {
    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await pool.query(
        `
          INSERT INTO app_users (id, email, password_hash, full_name, role, position, department, avatar_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [user.id, user.email, passwordHash, user.full_name, user.role, user.position, user.department, user.avatar_url],
      );
    }
  }

  const normalizedCount = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM purchase_requests');
  if (Number(normalizedCount.rows[0]?.count ?? 0) === 0) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await writeNormalizedSnapshot('purchase_requests', purchaseRequests, client);
      await writeNormalizedSnapshot('purchase_orders', purchaseOrders, client);
      await writeNormalizedSnapshot('delivery_orders', deliveryOrders, client);
      await writeNormalizedSnapshot('tasks', logisticsTasks, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
