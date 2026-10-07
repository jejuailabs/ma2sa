import { ApiError, jsonError } from '@/lib/experience/ai/errors';
import { authorizeLive, createLiveSession, readBody } from '@/lib/experience/live-server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) { try { await authorizeLive(request, 'session'); const body = await readBody(request); if (body.consent !== true || typeof body.sdp !== 'string' || !body.sdp.startsWith('v=0') || body.sdp.length > 65000) throw new ApiError(400, 'INVALID_SESSION', '음성 연결 동의와 마이크 상태를 확인해 주세요.'); return Response.json(await createLiveSession(body.sdp, body), { headers: { 'cache-control': 'no-store' } }); } catch (error) { return jsonError(error); } }
