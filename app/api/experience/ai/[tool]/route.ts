import { POST as announcement } from '@/app/api/ai/announcement/route';
import { POST as receipt } from '@/app/api/ai/receipt/route';
import { POST as format } from '@/app/api/ai/format/route';
import { POST as transcribe } from '@/app/api/ai/transcribe/route';
import { POST as narration } from '@/app/api/ai/narration/route';
import { ApiError,jsonError } from '@/lib/ai/errors';
import { sameOrigin,wasReserved,refundUse } from '@/lib/experience/server';
export const runtime='nodejs';export const maxDuration=300;
const handlers:Record<string,(request:Request)=>Promise<Response>>={announcement,receipt,format,transcribe,narration};
export async function POST(request:Request,{params}:{params:Promise<{tool:string}>}){try{sameOrigin(request);const{tool}=await params;const handler=handlers[tool];if(!handler)throw new ApiError(404,'UNKNOWN_TOOL','체험 기능을 찾지 못했어요.');if(Number(request.headers.get('content-length')||0)>4.2*1024*1024)throw new ApiError(413,'FILE_TOO_LARGE','체험 파일은 전체 4MB 이하로 선택해 주세요.');const headers=new Headers(request.headers);headers.delete('content-length');let body:BodyInit;
  if(tool==='format'||tool==='narration'){const data=await request.json();if(typeof data.text!=='string'||data.text.length>(tool==='narration'?3500:6000))throw new ApiError(400,'INVALID_INPUT','입력 내용을 확인해 주세요.');headers.set('content-type','application/json');body=JSON.stringify({...data,villageId:'__experience__'});}else{const form=await request.formData();const files=form.getAll(tool==='receipt'?'files':'file');if(!files.length||files.length>(tool==='receipt'?3:1)||files.some(file=>!(file instanceof File))||files.reduce((sum,file)=>sum+(file instanceof File?file.size:0),0)>4*1024*1024)throw new ApiError(400,'INVALID_FILE','파일 개수와 용량을 확인해 주세요. 전체 4MB 이하입니다.');form.set('villageId','__experience__');headers.delete('content-type');body=form;}
  const forwarded=new Request(request.url,{method:'POST',headers,body});const response=await handler(forwarded);if(!response.ok&&wasReserved(forwarded))await refundUse(forwarded,tool).catch(()=>{});response.headers.set('cache-control','no-store');return response;
}catch(error){return jsonError(error);}}
