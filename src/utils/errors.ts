export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
};
