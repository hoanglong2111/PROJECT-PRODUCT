import { ApiError } from '../../errors';
import { MockSapClient } from './mockClient';
import type { SapClient } from './types';

export function createSapClient(): SapClient {
  const mockMode = process.env.SAP_MOCK !== 'false';

  if (mockMode) {
    return new MockSapClient();
  }

  throw new ApiError(501, 'SAP real adapter is not configured yet. Set SAP_MOCK=true or implement the real adapter.');
}
