import { notFound } from 'next/navigation';
import { ExperienceTool } from '@/components/experience/tool-client';
import { experienceTools } from '@/lib/experience/catalog';
export function generateStaticParams(){return experienceTools.filter(item=>item.slug!=='business-plan').map(item=>({tool:item.slug}));}
export default async function ToolPage({params}:{params:Promise<{tool:string}>}){const{tool}=await params;if(!experienceTools.some(item=>item.slug===tool&&item.slug!=='business-plan'))notFound();return <ExperienceTool tool={tool}/>;}
