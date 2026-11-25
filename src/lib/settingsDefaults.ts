import type { AcademySettings } from './types';

/**
 * Built-in fallback used until the settings row loads (or if it cannot be read).
 * Clinic facts come from the public site https://vtiaraclinic.com; academy-specific fields stay empty until
 * the academy confirms them in Admin → Academy settings.
 */
export const DEFAULT_SETTINGS: AcademySettings = {
  id: 1,
  academy_name: 'VTIARA Training Academy',
  tagline: 'Structured online, academy and supervised training for safe, consistent VTIARA care.',
  academy_address: null, academy_maps_url: null, academy_phone: null, academy_whatsapp: null, academy_email: null, academy_hours: null,
  clinic_name: 'VTIARA Hair & Skin Clinic',
  clinic_website: 'https://vtiaraclinic.com',
  clinic_address: '1st Floor, Chinmaya Mission Hospital Road, near Indiranagar Metro Station, Hoysala Nagar, Indiranagar, Bangalore, Karnataka 560 038',
  clinic_maps_url: 'https://maps.app.goo.gl/kJQtHceQpqWjZetQ9',
  clinic_phone: '+91 63613 47722', clinic_whatsapp: '+91 63613 47722', clinic_email: 'manager@vtiaraclinic.com',
  clinic_hours: 'Monday to Sunday, 10:00 AM to 7:30 PM',
  instagram_url: 'https://www.instagram.com/vtiaraclinic', facebook_url: 'https://www.facebook.com/profile.php?id=61552901284322',
  youtube_url: 'https://www.youtube.com/@vtiarahairskinclinic850', linkedin_url: 'https://www.linkedin.com/company/vtiara-hair-skin-clinic/',
  whatsapp_message: 'Hi VTIARA Training Academy! I would like to know more about your courses.',
  needs_confirmation: ['academy_address', 'academy_phone', 'academy_whatsapp', 'academy_email', 'academy_hours', 'clinic_address', 'academy_venue'],
};
