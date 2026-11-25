import { useEffect } from 'react';

const SITE = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const NAME = 'VTIARA Training Academy';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

/** Sets the document title, description, canonical URL and Open Graph tags for the current page. */
export function usePageMeta(title: string, description: string, opts: { noindex?: boolean } = {}) {
  useEffect(() => {
    const full = title.includes(NAME) ? title : `${title} | ${NAME}`;
    document.title = full;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', NAME);
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow');
    if (SITE) {
      const url = SITE + window.location.pathname;
      setMeta('property', 'og:url', url);
      setMeta('property', 'og:image', SITE + '/og-image.png');
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
      link.href = url;
    }
  }, [title, description, opts.noindex]);
}
