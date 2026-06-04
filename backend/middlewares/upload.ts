import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest, MultipartUpload } from '../domain/types';
import { ApiError } from '../utils/errors';

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

async function readMultipartUpload(request: AuthenticatedRequest): Promise<MultipartUpload> {
  const contentType = request.headers['content-type'] ?? '';
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);

  if (!boundaryMatch) {
    throw new ApiError(400, 'Content-Type multipart/form-data là bắt buộc.');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, 'File upload vượt quá giới hạn 5MB.');
    }
    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks);
  const boundary = `--${boundaryMatch[1]}`;
  const parts = body.toString('binary').split(boundary).slice(1, -1);
  let documentType = '';
  let hblNumber: string | null = null;
  let file: MultipartUpload['file'] | null = null;

  for (const rawPart of parts) {
    const part = rawPart.replace(/^\r\n/, '').replace(/\r\n$/, '');
    const separatorIndex = part.indexOf('\r\n\r\n');
    if (separatorIndex === -1) continue;

    const rawHeaders = part.slice(0, separatorIndex);
    const rawContent = part.slice(separatorIndex + 4);
    const nameMatch = /name="([^"]+)"/i.exec(rawHeaders);
    const name = nameMatch?.[1];

    if (!name) continue;

    if (name === 'documentType') {
      documentType = Buffer.from(rawContent, 'binary').toString('utf8').trim();
      continue;
    }

    if (name === 'hblNumber') {
      const cleaned = Buffer.from(rawContent, 'binary').toString('utf8').trim();
      hblNumber = cleaned.length > 0 ? cleaned : null;
      continue;
    }

    if (name === 'file') {
      const fileName = /filename="([^"]+)"/i.exec(rawHeaders)?.[1] ?? 'attachment';
      const mimeType = /content-type:\s*([^\r\n]+)/i.exec(rawHeaders)?.[1]?.trim() ?? 'application/octet-stream';
      file = {
        buffer: Buffer.from(rawContent, 'binary'),
        fileName,
        mimeType,
      };
    }
  }

  if (!documentType || !file) {
    throw new ApiError(400, 'documentType và file là bắt buộc.');
  }

  return { documentType, file, hblNumber };
}

export async function parseMultipartUpload(
  request: AuthenticatedRequest,
  _response: Response,
  next: NextFunction,
) {
  try {
    request.multipartUpload = await readMultipartUpload(request);
    next();
  } catch (error) {
    next(error);
  }
}
