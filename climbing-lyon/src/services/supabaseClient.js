import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fpebpkscmwyznwynfksn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwZWJwa3NjbXd5em53eW5ma3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTA1MDMsImV4cCI6MjA5MjA4NjUwM30.I-6p6mSiDDAPK37UNg6amHYLQE5Pn6baZaHGEJvIsQw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
