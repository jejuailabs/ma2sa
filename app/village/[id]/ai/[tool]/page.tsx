import { notFound } from 'next/navigation';

import { AiToolClient } from '@/components/ai/ai-tool-client';
import { isAiToolSlug } from '@/lib/ai/tools';

export default async function AiToolPage({ params }: { params: Promise<{ id: string; tool: string }> }) {
  const { id, tool } = await params;
  if (!isAiToolSlug(tool)) notFound();
  return <AiToolClient villageId={id} tool={tool} />;
}
