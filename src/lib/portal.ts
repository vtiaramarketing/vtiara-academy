import { useLocation } from 'react-router-dom';
/** Shared staff pages (batches, practicals) link within whichever workspace the person is in. */
export const usePortalBase = () => (useLocation().pathname.startsWith('/tutor') ? '/tutor' : '/admin');
