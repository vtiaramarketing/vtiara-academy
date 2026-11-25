import type { Backend } from './backend';

/**
 * Used when the app is built without Supabase configuration and demo mode was not explicitly enabled.
 * Nothing works, nothing is stored, and no demo accounts exist: the UI shows a configuration screen instead.
 */
export function createUnavailableBackend(): Backend {
  const off = (): never => { throw new Error('The academy service is not configured.'); };
  return {
    mode: 'unavailable',
    auth: {
      getUser: async () => null,
      signIn: async () => off(), signUp: async () => off(), signOut: async () => undefined,
      sendPasswordReset: async () => off(), updatePassword: async () => off(), sendOtp: async () => off(), verifyOtp: async () => off(),
      onChange: () => () => undefined,
    },
    select: async () => off(), insert: async () => off(), update: async () => off(), remove: async () => off(), rpc: async () => off(),
    storage: { upload: async () => off(), signedUrl: async () => null },
    manageUser: async () => off(),
  };
}
