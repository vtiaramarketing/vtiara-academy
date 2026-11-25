import { useEffect, useState } from 'react';
import { backend } from '@/lib/db';
import { cn } from '@/lib/utils';
import type { TrainerProfile } from '@/lib/types';

const initials = (name: string) => name.replace(/^Dr\.?\s*/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Uploaded photo, else the publicly published photo URL, else initials. Always has alt text. */
export default function TrainerPhoto({ t, className }: { t: Pick<TrainerProfile, 'full_name' | 'photo_url' | 'photo_path'>; className?: string }) {
  const [src, setSrc] = useState<string | null>(t.photo_url);
  useEffect(() => {
    let live = true;
    if (t.photo_path) backend.storage.signedUrl('trainer-photos', t.photo_path).then((u) => live && u && setSrc(u));
    else setSrc(t.photo_url);
    return () => { live = false; };
  }, [t.photo_path, t.photo_url]);
  if (src) return <img src={src} alt={`Portrait of ${t.full_name}`} loading="lazy" onError={() => setSrc(null)} className={cn('rounded-2xl object-cover', className)} />;
  return <span role="img" aria-label={`${t.full_name} (no photo)`} className={cn('flex items-center justify-center rounded-2xl bg-navy font-bold text-gold', className)}>{initials(t.full_name)}</span>;
}
