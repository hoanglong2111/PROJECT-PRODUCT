import type { AppRole, AuthUser } from '@shared/auth/types';

export const mockUsers: Record<string, AuthUser> = {
  'usr-admin-001': {
    id: 'usr-admin-001',
    email: 'admin@kbfe.local',
    fullName: 'System Administrator',
    role: 'ADMIN',
    position: 'Admin',
    department: 'IT Operations',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-manager-001': {
    id: 'usr-manager-001',
    email: 'manager@kbfe.local',
    fullName: 'Tran Thi Binh',
    role: 'PIC_MANAGER',
    position: 'PIC Manager',
    department: 'Purchasing',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-sale-001': {
    id: 'usr-sale-001',
    email: 'sale@kbfe.local',
    fullName: 'Vu Thu Ha',
    role: 'SALE_STAFF',
    position: 'Sale Staff',
    department: 'Sales Operations',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-port-001': {
    id: 'usr-port-001',
    email: 'port@kbfe.local',
    fullName: 'Pham Quoc Huy',
    role: 'PORT_OFFICER',
    position: 'Port Officer',
    department: 'Port Operations',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-customs-001': {
    id: 'usr-customs-001',
    email: 'customs@kbfe.local',
    fullName: 'Le Minh Chau',
    role: 'CUSTOMS_OFFICER',
    position: 'Customs Officer',
    department: 'Import Customs',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-finance-001': {
    id: 'usr-finance-001',
    email: 'finance@kbfe.local',
    fullName: 'Do Thi Ngoc',
    role: 'FINANCE_OFFICER',
    position: 'Finance Officer',
    department: 'Finance',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
  'usr-warehouse-001': {
    id: 'usr-warehouse-001',
    email: 'warehouse@kbfe.local',
    fullName: 'Hoang Minh Quan',
    role: 'WAREHOUSE_STAFF',
    position: 'Warehouse Staff',
    department: 'Warehouse',
    avatarUrl: null,
    defaultWarehouseCode: null,
    operationFocus: null,
    phoneNumber: null,
    preferredModulePath: null,
    profileNote: null,
    workLocation: null,
    workShift: null,
  },
};

// HMAC-SHA256 Signer in pure browser JS
async function signHmacSha256(keyString: string, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return crypto.subtle.sign('HMAC', key, messageData);
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function objectToBase64Url(obj: unknown): string {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function generateMockJwt(userId: string, email: string, role: AppRole): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    email: email,
    role: role,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
  };

  const encodedHeader = objectToBase64Url(header);
  const encodedPayload = objectToBase64Url(payload);
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signatureBuffer = await signHmacSha256('kbfe-dev-secret', signatureInput);
  const encodedSignature = arrayBufferToBase64Url(signatureBuffer);

  return `${signatureInput}.${encodedSignature}`;
}

export function parseJwtPayload(token: string): { sub: string; email: string; role: AppRole } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(payloadBase64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
