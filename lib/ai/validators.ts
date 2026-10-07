import { ApiError } from '@/lib/ai/errors';

export function requireText(value: unknown, field: string, maxLength = 20000) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'INVALID_INPUT', `${field}을(를) 입력해 주세요.`);
  }
  if (value.length > maxLength) {
    throw new ApiError(413, 'FILE_TOO_LARGE', `${field}은(는) ${maxLength.toLocaleString()}자까지 입력할 수 있습니다.`);
  }
  return value.trim();
}

export function requireFile(value: FormDataEntryValue | null, field: string, maxBytes: number) {
  if (!(value instanceof File) || value.size === 0) {
    throw new ApiError(400, 'INVALID_INPUT', `${field} 파일을 선택해 주세요.`);
  }
  if (value.size > maxBytes) {
    throw new ApiError(413, 'FILE_TOO_LARGE', `${field} 파일 용량이 제한을 초과했습니다.`);
  }
  return value;
}
