export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code = 'BAD_REQUEST') => new ApiError(400, code, msg);
export const unauthorized = (msg = 'Sessão expirada. Entre novamente na Toca.') => new ApiError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'Você não tem permissão para isso.') => new ApiError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Não encontrado.') => new ApiError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string, code = 'CONFLICT') => new ApiError(409, code, msg);
