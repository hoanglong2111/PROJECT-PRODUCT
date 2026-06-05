import { pool } from '../config/database';

export interface RoutePermission {
  module_name: string;
  route_path: string;
  method: string;
  can_access: boolean;
}

class RbacService {
  private cache: Map<string, RoutePermission[]> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  public async getPermissionsForRole(roleName: string): Promise<RoutePermission[]> {
    if (this.isCacheValid() && this.cache.has(roleName)) {
      return this.cache.get(roleName)!;
    }
    
    await this.refreshCache();
    return this.cache.get(roleName) || [];
  }

  public async refreshCache(): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT rmp.role_name, mr.module_name, mr.route_path, mr.method, rmp.can_access
        FROM role_module_permissions rmp
        JOIN module_routes mr ON rmp.module_route_id = mr.id
      `);

      const newCache = new Map<string, RoutePermission[]>();
      for (const row of result.rows as { role_name: string; module_name: string; route_path: string; method: string; can_access: boolean }[]) {
        if (!newCache.has(row.role_name)) {
          newCache.set(row.role_name, []);
        }
        newCache.get(row.role_name)!.push({
          module_name: row.module_name,
          route_path: row.route_path,
          method: row.method,
          can_access: row.can_access,
        });
      }

      this.cache = newCache;
      this.cacheTimestamp = Date.now();
    } finally {
      client.release();
    }
  }

  public invalidateCache(): void {
    this.cacheTimestamp = 0;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }
}

export const rbacService = new RbacService();
