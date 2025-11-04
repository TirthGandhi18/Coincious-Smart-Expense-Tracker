import { User as SupabaseUser } from '@supabase/supabase-js';

type UserMetadata = {
  full_name?: string;
  avatar_url?: string;
  [key: string]: any;
};

declare module '@supabase/supabase-js' {
  interface User extends SupabaseUser {
    user_metadata?: UserMetadata;
  }
}

export type { UserMetadata };
