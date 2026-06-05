import { pool } from '../config/database';
import { rbacService } from '../services/rbac.service';

export async function seedGd1Rbac() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert module_routes
    const routes = [
      { module: 'purchase_requests', path: '*', method: '*' },
      { module: 'purchase_orders', path: '*', method: '*' },
      { module: 'shipments', path: '*', method: '*' },
      { module: 'domestic_transport_orders', path: '*', method: '*' },
      { module: 'issue_logs', path: '*', method: '*' },
    ];

    const routeIds: Record<string, string> = {};

    for (const r of routes) {
      const res = await client.query<{ id: string }>(
        `INSERT INTO module_routes (module_name, route_path, method, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (route_path, method) DO UPDATE SET module_name = EXCLUDED.module_name
         RETURNING id`,
        [r.module, r.path, r.method, `Catch-all route for ${r.module}`]
      );
      routeIds[r.module] = res.rows[0].id;
    }

    // Insert role_module_permissions for ADMIN and other roles
    const roles = ['ADMIN', 'PIC_MANAGER', 'PORT_OFFICER', 'CUSTOMS_OFFICER', 'FINANCE_OFFICER', 'WAREHOUSE_STAFF'];
    
    for (const role of roles) {
      for (const module of Object.keys(routeIds)) {
        // Just as a basic seed, give ADMIN access to everything, and others specific access
        let canAccess = false;
        if (role === 'ADMIN') {
          canAccess = true;
        } else if (role === 'PIC_MANAGER' && ['purchase_requests', 'purchase_orders', 'shipments', 'domestic_transport_orders', 'issue_logs'].includes(module)) {
          canAccess = true;
        } else if (role === 'PORT_OFFICER' && ['shipments', 'issue_logs'].includes(module)) {
          canAccess = true;
        } else if (role === 'CUSTOMS_OFFICER' && ['shipments', 'issue_logs'].includes(module)) {
          canAccess = true;
        } else if (role === 'FINANCE_OFFICER' && ['purchase_orders', 'shipments'].includes(module)) {
          canAccess = true;
        } else if (role === 'WAREHOUSE_STAFF' && ['shipments', 'domestic_transport_orders'].includes(module)) {
          canAccess = true;
        }

        await client.query(
          `INSERT INTO role_module_permissions (role_name, module_route_id, can_access)
           VALUES ($1, $2, $3)
           ON CONFLICT (role_name, module_route_id) DO UPDATE SET can_access = EXCLUDED.can_access`,
          [role, routeIds[module], canAccess]
        );
      }
    }

    await client.query('COMMIT');
    console.log('GD1 RBAC seeded successfully');
    rbacService.invalidateCache();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding GD1 RBAC', error);
    throw error;
  } finally {
    client.release();
  }
}
