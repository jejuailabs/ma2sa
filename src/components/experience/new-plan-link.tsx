'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { clearDraft } from './draft-store';
import { clearLiveDraft } from './live-draft-store';

export function clearPlanDrafts(){clearDraft();clearLiveDraft();}
export function NewPlanLink({mode='regular',onClick,...props}:ComponentProps<typeof Link>&{mode?:'regular'|'live'}) {
  return <Link {...props} onClick={event=>{onClick?.(event);if(event.defaultPrevented)return;if(mode==='live')clearLiveDraft();else clearDraft();}}/>;
}
