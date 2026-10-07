export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error(error);
  return Response.json(
    {
      success: false,
      error: { code: 'AI_PROCESSING_FAILED', message: 'AI 처리 중 오류가 발생했습니다.' },
    },
    { status: 500 },
  );
}
