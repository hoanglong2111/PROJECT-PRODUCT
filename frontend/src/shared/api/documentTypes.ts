import { apiClient } from './axiosConfig';
import type { ListParams, PaginatedResponse } from './taskTemplates';

/**
 * Document-type master catalog — the admin-configurable required-document set that
 * drives the DO "documents complete" gate. `code` matches the DO document_type string
 * (e.g. Invoice, Packing List, B/L, CO). Mirrors the Task Template is_required pattern.
 */
export type DocumentType = {
  id: string;
  code: string;
  label_en: string;
  label_vi: string;
  is_required: boolean;
  sort_order: number;
  is_active?: boolean;
  create_at?: string;
  update_at?: string;
  delete_at?: string | null;
  is_delete?: boolean;
};

export type DocumentTypePayload = {
  code?: string;
  label_en?: string;
  label_vi?: string;
  is_required?: boolean;
  sort_order?: number;
  is_active?: boolean;
};

type ApiMessageResponse<T> = { data: T; message?: string };

export function normalizeDocumentType(documentType: DocumentType): DocumentType {
  return {
    ...documentType,
    is_required: documentType.is_required === true,
    sort_order: Number(documentType.sort_order ?? 0),
    is_active: documentType.is_active !== false,
  };
}

export async function fetchDocumentTypes(params: ListParams = {}) {
  const response = await apiClient.get<PaginatedResponse<DocumentType>>('/document-types', { params });
  return {
    ...response.data,
    data: [...response.data.data]
      .map(normalizeDocumentType)
      .sort((left, right) => left.sort_order - right.sort_order),
  };
}

export async function updateDocumentType(id: string, payload: DocumentTypePayload) {
  const response = await apiClient.patch<ApiMessageResponse<DocumentType>>(`/document-types/${id}`, payload);
  return normalizeDocumentType(response.data.data);
}

export async function createDocumentType(payload: DocumentTypePayload) {
  const response = await apiClient.post<ApiMessageResponse<DocumentType>>('/document-types', payload);
  return normalizeDocumentType(response.data.data);
}

export async function deleteDocumentType(id: string) {
  const response = await apiClient.delete<ApiMessageResponse<DocumentType>>(`/document-types/${id}`);
  return response.data.data;
}
