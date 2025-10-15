import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../lib/info';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);