import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);