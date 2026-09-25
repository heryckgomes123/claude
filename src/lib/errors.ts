/** Erros de domínio com mensagem segura para exibir à usuária. */
export class AppError extends Error {
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  constructor(message: string, code = "APP_ERROR", fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sua sessão expirou. Entre novamente.") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Registro não encontrado.") {
    super(message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, "VALIDATION", fieldErrors);
  }
}

/** Códigos de erro do PostgreSQL que viram mensagens amigáveis. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (typeof current === "object" && current && "code" in current && typeof current.code === "string") {
      if (/^[0-9A-Z]{5}$/.test(current.code)) return current.code;
    }
    current = typeof current === "object" && current && "cause" in current ? current.cause : undefined;
  }
  return undefined;
}
