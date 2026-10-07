import { AudioLines, BookOpenText, CalendarDays, FileArchive, FileText, Home, Mic, ReceiptText, ScanText, Users, Volume2, WalletCards, type LucideIcon } from 'lucide-react';
const icons: Record<string, LucideIcon> = { audio: AudioLines, news: BookOpenText, calendar: CalendarDays, folder: FileArchive, file: FileText, home: Home, mic: Mic, receipt: ReceiptText, scan: ScanText, users: Users, speaker: Volume2, wallet: WalletCards };
export function ExperienceIcon({ name, className }: { name: string; className?: string }) {
  if (name === 'conversation') {
    return <svg aria-hidden="true" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8a5 5 0 0 1 5 5v6a5 5 0 0 1-5 5H9l-6 3V8a5 5 0 0 1 5-5Z" />
      <path d="M7.5 10v3m3-5v7m3-8v9m3-6v3" />
    </svg>;
  }
  const Icon = icons[name] || FileText;
  return <Icon aria-hidden="true" className={className} strokeWidth={1.8} />;
}
