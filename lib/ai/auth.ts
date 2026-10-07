import { ApiError } from '@/lib/ai/errors';
import { reserveUse } from '@/lib/experience/server';

interface AuthorizedUser {
  uid: string;
  role: 'leader' | 'secretary';
  villageId: string;
}

function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
  }
  return header.slice(7);
}

export async function authorizeVillageAdmin(request: Request, villageId: string): Promise<AuthorizedUser> {
  const experienceTool = new URL(request.url).pathname.match(/^\/api\/experience\/ai\/(announcement|receipt|format|transcribe|narration)$/)?.[1];
  if (villageId === '__experience__' && experienceTool) {
    const session = await reserveUse(request, experienceTool);
    return { uid: session.id, role: 'secretary', villageId: '__experience__' };
  }
  if (!villageId) throw new ApiError(400, 'VILLAGE_NOT_FOUND', '마을 정보가 없습니다.');

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    throw new ApiError(500, 'SERVER_NOT_CONFIGURED', 'Firebase 서버 설정이 필요합니다.');
  }

  const token = bearerToken(request);
  const identityResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
      cache: 'no-store',
    },
  );
  const identity = (await identityResponse.json()) as { users?: Array<{ localId?: string }> };
  const uid = identity.users?.[0]?.localId;
  if (!identityResponse.ok || !uid) {
    throw new ApiError(401, 'AUTH_REQUIRED', '로그인이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const memberUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/villages/${encodeURIComponent(villageId)}/members/${encodeURIComponent(uid)}`;
  const memberResponse = await fetch(memberUrl, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!memberResponse.ok) {
    throw new ApiError(403, 'PERMISSION_DENIED', '이장 또는 사무장만 AI 기능을 사용할 수 있습니다.');
  }

  const member = (await memberResponse.json()) as {
    fields?: { role?: { stringValue?: string }; status?: { stringValue?: string } };
  };
  const role = member.fields?.role?.stringValue;
  const status = member.fields?.status?.stringValue;
  if ((role !== 'leader' && role !== 'secretary') || (status && status !== 'active')) {
    throw new ApiError(403, 'PERMISSION_DENIED', '이장 또는 사무장만 AI 기능을 사용할 수 있습니다.');
  }

  return { uid, role, villageId };
}
