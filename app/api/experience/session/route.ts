import { createSession } from '@/lib/experience/server';
import { jsonError } from '@/lib/ai/errors';
export const runtime='nodejs';
export async function POST(request:Request){try{const{cookie}=await createSession(request);return Response.json({success:true},{headers:{'cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})}});}catch(error){return jsonError(error);}}
