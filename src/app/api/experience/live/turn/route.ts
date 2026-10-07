import { ApiError, jsonError } from '@/lib/experience/ai/errors';
import { authorizeLive, interviewTurn, readBody } from '@/lib/experience/live-server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) { try { await authorizeLive(request, 'turn'); const body = await readBody(request); if (body.consent !== true) throw new ApiError(400, 'CONSENT_REQUIRED', 'AI 인터뷰 이용 동의가 필요해요.'); return Response.json(await interviewTurn(body), { headers: { 'cache-control': 'no-store' } }); } catch (error) { return jsonError(error); } }
