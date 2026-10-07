import { localPreview } from '@/lib/experience/live-server';
export const runtime = 'nodejs';
export async function GET(request: Request) { return Response.json({ voice: Boolean(process.env.OPENAI_API_KEY), text: Boolean(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY), needsSession: !localPreview(request), maxSeconds: 900 }, { headers: { 'cache-control': 'no-store' } }); }
