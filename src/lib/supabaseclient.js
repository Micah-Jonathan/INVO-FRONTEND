// src/lib/supabaseClient.js
//
// This sets up the Supabase connection for the FRONTEND.
// It uses the public anon key only — never the service_role key.
// This is mainly used to manage the logged-in user's session.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);