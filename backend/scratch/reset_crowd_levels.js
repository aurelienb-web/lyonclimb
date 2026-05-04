const supabase = require('../supabase');

async function reset() {
  console.log('🔄 Réinitialisation des niveaux d\'affluence...');
  const { error } = await supabase
    .from('gyms')
    .update({ crowdLevel: 0 })
    .neq('id', '');

  if (error) {
    console.error('❌ Erreur:', error.message);
  } else {
    console.log('✅ Tous les niveaux d\'affluence ont été réinitialisés à 0.');
  }
  process.exit(0);
}

reset();
