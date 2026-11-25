import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { backend, useQuery } from './db';
import type { AcademySettings } from './types';
import { DEFAULT_SETTINGS } from './settingsDefaults';

export { DEFAULT_SETTINGS };

export const digits = (n: string | null | undefined) => (n ?? '').replace(/\D/g, '');
/** wa.me needs the country code; a bare 10-digit Indian number gets 91 prepended. */
export const waNumber = (n: string | null | undefined) => { const d = digits(n); return d.length === 10 ? '91' + d : d; };
export const waLink = (n: string | null | undefined, message?: string | null) =>
  waNumber(n) ? `https://wa.me/${waNumber(n)}${message ? `?text=${encodeURIComponent(message)}` : ''}` : null;
export const telLink = (n: string | null | undefined) => (digits(n) ? `tel:+${waNumber(n)}` : null);

/** What visitors see: academy-specific details win, clinic details fill any gap. */
export interface PublicContact {
  phone: string | null; whatsapp: string | null; email: string | null; address: string | null; mapsUrl: string | null; hours: string | null;
  whatsappUrl: string | null; telUrl: string | null; usingClinicPhone: boolean; usingClinicAddress: boolean;
}
export function publicContact(s: AcademySettings): PublicContact {
  const phone = s.academy_phone || s.clinic_phone;
  const whatsapp = s.academy_whatsapp || s.academy_phone || s.clinic_whatsapp || s.clinic_phone;
  const address = s.academy_address || s.clinic_address;
  return {
    phone, whatsapp, email: s.academy_email || s.clinic_email, address, mapsUrl: s.academy_maps_url || (s.academy_address ? null : s.clinic_maps_url),
    hours: s.academy_hours || s.clinic_hours, whatsappUrl: waLink(whatsapp, s.whatsapp_message), telUrl: telLink(phone),
    usingClinicPhone: !s.academy_phone, usingClinicAddress: !s.academy_address,
  };
}
export const courseWhatsApp = (s: AcademySettings, courseTitle: string) =>
  waLink(publicContact(s).whatsapp, `Hi VTIARA Training Academy! I would like to know more about the ${courseTitle} course.`);

interface Ctx { settings: AcademySettings; contact: PublicContact; reload: () => void }
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, contact: publicContact(DEFAULT_SETTINGS), reload: () => undefined });
export const useSettings = () => useContext(SettingsCtx);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, reload } = useQuery(() => backend.select<AcademySettings>('academy_settings', { limit: 1 }), []);
  const value = useMemo<Ctx>(() => {
    const settings = { ...DEFAULT_SETTINGS, ...(data?.[0] ?? {}) } as AcademySettings;
    return { settings, contact: publicContact(settings), reload };
  }, [data, reload]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
