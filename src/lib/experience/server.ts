import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError } from '@/lib/experience/ai/errors';

const cookieName='ma2sa_experience';
const ttl=6*60*60;
const reservations=new WeakSet<Request>();
export const wasReserved=(request:Request)=>reservations.has(request);
function configured(){
  if(process.env.EXPERIENCE_ENABLED!=='1')throw new ApiError(503,'EXPERIENCE_DISABLED','AI 체험을 준비 중이에요. 화면을 둘러보거나 답변을 먼저 작성할 수 있습니다.');
  if(!process.env.EXPERIENCE_SESSION_SECRET||process.env.EXPERIENCE_SESSION_SECRET.length<32||!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)throw new ApiError(503,'EXPERIENCE_NOT_CONFIGURED','AI 체험 연결을 준비 중이에요. 작성한 답변은 이 기기에 남아 있습니다.');
  const end=process.env.EXPERIENCE_ENDS_AT;
  if(end&&(!Number.isFinite(Date.parse(end))||Date.now()>=Date.parse(end)))throw new ApiError(403,'EXPERIENCE_ENDED','이번 AI 체험 기간이 끝났어요. 작성한 내용을 확인하고 내려받을 수 있습니다.');
}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');let valid=false;try{const parsed=new URL(origin||'');valid=['http:','https:'].includes(parsed.protocol)&&parsed.host===request.headers.get('host');}catch{}if(!valid)throw new ApiError(403,'INVALID_ORIGIN','이 페이지에서 다시 시도해 주세요.');}
const digest=(value:string)=>createHmac('sha256',process.env.EXPERIENCE_SESSION_SECRET!).update(value).digest('hex');
function sessionId(request:Request){const cookie=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);if(!cookie)return null;const[id,expiry,signature]=cookie.split('.');if(!/^[a-f0-9]{48}$/.test(id||'')||!/^\d{13}$/.test(expiry||'')||!/^[a-f0-9]{64}$/.test(signature||''))return null;if(Number(expiry)<=Date.now())return null;const expected=digest(`${id}.${expiry}`);if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return null;return id;}
async function redis(command:(string|number)[]){try{const response=await fetch(process.env.UPSTASH_REDIS_REST_URL!,{method:'POST',headers:{authorization:`Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,'content-type':'application/json'},body:JSON.stringify(command),cache:'no-store',signal:AbortSignal.timeout(8000)});const payload=await response.json() as {result?:unknown;error?:string};if(!response.ok||payload.error)throw new Error('Limit service unavailable');return payload.result;}catch{throw new ApiError(503,'EXPERIENCE_LIMIT_UNAVAILABLE','체험 연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.');}}
export async function createSession(request:Request){sameOrigin(request);configured();const existing=sessionId(request);if(existing&&await redis(['EXISTS',`experience:session:${existing}`]))return {cookie:null};
  const ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';const day=new Date().toISOString().slice(0,10);const ipKey=`experience:issued:${day}:${digest(ip)}`;const sessionDay=`experience:sessions:${day}`;
  const allowed=await redis(['EVAL',"local a=tonumber(redis.call('GET',KEYS[1]) or '0'); local b=tonumber(redis.call('GET',KEYS[2]) or '0'); if a>=120 or b>=600 then return 0 end; redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],86400); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],86400); return 1",2,ipKey,sessionDay]);if(allowed!==1)throw new ApiError(429,'EXPERIENCE_BUSY','지금은 체험 접속이 많아요. 잠시 후 다시 접속해 주세요.');
  const id=randomBytes(24).toString('hex');const expiry=String(Date.now()+ttl*1000);await redis(['SET',`experience:session:${id}`,'1','EX',ttl]);return {cookie:`${cookieName}=${id}.${expiry}.${digest(`${id}.${expiry}`)}; HttpOnly; SameSite=Strict; Path=/api/experience; Max-Age=${ttl}${new URL(request.headers.get('origin')!).protocol==='https:'?'; Secure':''}`};
}
export async function requireSession(request:Request){sameOrigin(request);configured();const id=sessionId(request);if(!id||!await redis(['EXISTS',`experience:session:${id}`]))throw new ApiError(401,'EXPERIENCE_SESSION_REQUIRED','체험 시간이 지나 다시 연결이 필요해요. AI 만들기 버튼을 다시 눌러 주세요.');return id;}
export async function reserveUse(request:Request,tool:string){const id=await requireSession(request);if(!(process.env.ANTHROPIC_API_KEY||process.env.CLAUDE_API_KEY)||(['transcribe','narration'].includes(tool)&&!process.env.OPENAI_API_KEY))throw new ApiError(503,'AI_NOT_CONFIGURED','이 AI 기능의 연결을 준비 중이에요. 입력한 내용은 그대로 남아 있습니다.');const max=tool==='business-plan'?2:1;const day=new Date().toISOString().slice(0,10);const cap=Math.min(2000,Math.max(1,Number(process.env.EXPERIENCE_DAILY_LIMIT)||300));const key=`experience:use:${id}:${tool}`;const allowed=await redis(['EVAL',"local used=tonumber(redis.call('GET',KEYS[1]) or '0'); local total=tonumber(redis.call('GET',KEYS[2]) or '0'); if used>=tonumber(ARGV[1]) then return -1 end; if total>=tonumber(ARGV[2]) then return -2 end; redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],21600); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],86400); return 1",2,key,`experience:calls:${day}`,max,cap]);if(allowed===-1)throw new ApiError(429,'EXPERIENCE_USED',tool==='business-plan'?'이 기기의 계획서 AI 정리 체험을 모두 사용했어요. 결과는 직접 고치고 내려받을 수 있습니다.':'이 기능의 1회 체험을 사용했어요. 다른 기능도 둘러보세요.');if(allowed!==1)throw new ApiError(429,'EXPERIENCE_DAILY_LIMIT','오늘의 AI 체험이 마감됐어요. 작성한 답변은 그대로 남아 있습니다.');reservations.add(request);return {id,key};}
export async function refundUse(request:Request,tool:string){const id=sessionId(request);if(id)await redis(['EVAL',"local n=tonumber(redis.call('GET',KEYS[1]) or '0'); if n>0 then return redis.call('DECR',KEYS[1]) end; return 0",1,`experience:use:${id}:${tool}`]);}

export async function reserveLiveUse(request: Request, kind: 'session' | 'turn' | 'plan') {
  const id = await requireSession(request);
  const limits = { session: 3, turn: 80, plan: 2 };
  const day = new Date().toISOString().slice(0, 10);
  const allowed = await redis(['EVAL', "local n=tonumber(redis.call('GET',KEYS[1]) or '0'); local total=tonumber(redis.call('GET',KEYS[2]) or '0'); if n>=tonumber(ARGV[1]) or total>=tonumber(ARGV[2]) then return 0 end; redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],21600); redis.call('INCR',KEYS[2]); redis.call('EXPIRE',KEYS[2],86400); return 1", 2, `experience:live:${id}:${kind}`, `experience:live:${day}:${kind}`, limits[kind], kind === 'turn' ? 2000 : 300]);
  if (allowed !== 1) throw new ApiError(429, 'LIVE_LIMIT', '이번 음성 인터뷰의 이용량을 모두 사용했어요. 작성한 답변은 확인하고 수정할 수 있어요.');
}
