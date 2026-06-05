import type { Response } from 'express';
import type { AuthenticatedRequest } from '../domain/types';
import { gd1DtoService } from '../services/gd1-dtos.service';

const decodeParam = (value: unknown) => decodeURIComponent(String(value ?? ''));

export async function getDTOs(_request: AuthenticatedRequest, response: Response) {
  const data = await gd1DtoService.listDTOs();
  response.json({ data, errors: [] });
}

export async function postDTO(request: AuthenticatedRequest, response: Response) {
  const data = await gd1DtoService.createDTO(request.body, request.auth?.sub);
  response.status(201).json({ data, errors: [] });
}

export async function getDTO(request: AuthenticatedRequest, response: Response) {
  const data = await gd1DtoService.getDTO(decodeParam(request.params.dtoId));
  response.json({ data, errors: [] });
}

export async function postDTOQuote(request: AuthenticatedRequest, response: Response) {
  const { transporterId, amount, note } = request.body;
  const data = await gd1DtoService.submitQuote(
    decodeParam(request.params.dtoId),
    transporterId,
    amount,
    note
  );
  response.status(201).json({ data, errors: [] });
}

export async function postDTOSelectQuote(request: AuthenticatedRequest, response: Response) {
  const data = await gd1DtoService.selectQuote(
    decodeParam(request.params.dtoId),
    decodeParam(request.params.quoteId)
  );
  response.json({ data, errors: [] });
}
