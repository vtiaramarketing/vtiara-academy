import type { RoleKey } from './types';

export interface Query {
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  order?: [string, boolean?]; // [column, ascending=true]
  limit?: number;
}

export interface AuthUser { id: string; email: string | null }
export interface SignUpInput {
  email: string; password: string;
  meta: {
    full_name: string; mobile: string; city: string; preferred_language: string; learner_code: string;
    job_role: string; branch_id: string; nursing_reg_no?: string; consent_privacy: boolean; consent_comms: boolean;
  };
}

/** One interface: Supabase (production), a browser-local demo (only when VITE_DEMO_MODE=true), or an unavailable stub. */
export interface Backend {
  mode: 'supabase' | 'demo' | 'unavailable';
  auth: {
    getUser(): Promise<AuthUser | null>;
    signIn(email: string, password: string): Promise<AuthUser>;
    signUp(input: SignUpInput): Promise<{ user: AuthUser | null; needsConfirmation: boolean }>;
    signOut(): Promise<void>;
    sendPasswordReset(email: string): Promise<void>;
    updatePassword(password: string): Promise<void>;
    sendOtp(mobile: string): Promise<void>;
    verifyOtp(mobile: string, token: string): Promise<AuthUser>;
    onChange(cb: () => void): () => void;
  };
  select<T = Record<string, any>>(table: string, q?: Query): Promise<T[]>;
  insert<T = Record<string, any>>(table: string, row: Record<string, unknown> | Record<string, unknown>[]): Promise<T[]>;
  update<T = Record<string, any>>(table: string, match: Record<string, unknown>, patch: Record<string, unknown>): Promise<T[]>;
  remove(table: string, match: Record<string, unknown>): Promise<void>;
  rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T>;
  storage: {
    upload(bucket: string, path: string, file: File): Promise<string>;
    signedUrl(bucket: string, path: string): Promise<string | null>;
  };
  /** Privileged user management (Supabase: Edge Function `manage-user`). */
  manageUser(action: 'create' | 'reset_access' | 'set_active', payload: Record<string, unknown>): Promise<{ ok: true; id?: string }>;
}

export type { RoleKey };
