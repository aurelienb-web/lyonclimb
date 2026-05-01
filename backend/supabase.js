require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ ERREUR: Les variables d'environnement Supabase ne sont pas définies !");
  process.exit(1);
}

// On utilise la Service Key pour contourner les règles de sécurité RLS (Row Level Security) 
// vu que le backend fait office d'administrateur sécurisé.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
