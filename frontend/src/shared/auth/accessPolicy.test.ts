import { describe, expect, it } from 'vitest';

import {
  ROLE_CAPABILITIES,
  canUserAccessCapability,
  capabilitiesForRole,
  capabilitiesForUser,
} from './accessPolicy';
import type { AuthUser } from './types';

const baseUser = {
  avatarUrl: null,
  defaultWarehouseCode: null,
  department: 'Ops',
  email: 'user@kbfe.local',
  fullName: 'KBFE User',
  id: 'user-1',
  operationFocus: null,
  phoneNumber: null,
  position: 'Operator',
  preferredModulePath: '/',
  profileNote: null,
  role: 'SALE_STAFF',
  workLocation: null,
  workShift: null,
} satisfies AuthUser;

describe('accessPolicy', () => {
  it('maps roles to capabilities for view and manage access', () => {
    expect(capabilitiesForRole('ADMIN')).toContain('settings.manageUsers');
    expect(capabilitiesForRole('PIC_MANAGER')).toContain('purchaseOrders.manage');
    expect(capabilitiesForRole('SALE_STAFF')).toContain('purchaseOrders.view');
    expect(capabilitiesForRole('SALE_STAFF')).not.toContain('purchaseOrders.manage');
    expect(capabilitiesForRole('FINANCE_OFFICER')).toContain('shipments.view');
    expect(capabilitiesForRole('FINANCE_OFFICER')).not.toContain('deliveryOrders.view');
  });

  it('uses API permissions before local role policy when present', () => {
    const user = {
      ...baseUser,
      permissions: ['masterData.view', 'masterData.manage'],
    } satisfies AuthUser;

    expect(capabilitiesForUser(user)).toEqual(['masterData.view', 'masterData.manage']);
    expect(canUserAccessCapability(user, 'masterData.manage')).toBe(true);
    expect(canUserAccessCapability(user, 'purchaseOrders.view')).toBe(false);
  });

  it('applies demo hidden overlay even for admin capabilities', () => {
    const admin = { ...baseUser, role: 'ADMIN' } satisfies AuthUser;
    const demoEnv = {
      VITE_DEMO_MODE: 'true',
      VITE_DEMO_HIDDEN: 'masterData,purchaseOrders.manage',
    };

    expect(canUserAccessCapability(admin, 'masterData.view', demoEnv)).toBe(false);
    expect(canUserAccessCapability(admin, 'masterData.manage', demoEnv)).toBe(false);
    expect(canUserAccessCapability(admin, 'purchaseOrders.manage', demoEnv)).toBe(false);
    expect(canUserAccessCapability(admin, 'purchaseOrders.view', demoEnv)).toBe(true);
  });

  it('keeps every role policy unique enough to catch accidental empty grants', () => {
    for (const [role, capabilities] of Object.entries(ROLE_CAPABILITIES)) {
      expect(capabilities.length, role).toBeGreaterThan(0);
      expect(new Set(capabilities).size, role).toBe(capabilities.length);
    }
  });
});
