const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

async function migrate() {
  console.log('🚀 Début de la migration vers Supabase...');

  // Lire le fichier data.json
  const dataPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error("❌ Fichier data.json introuvable !");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(rawData);

  // 1. Migrer les Gyms
  if (data.gyms && data.gyms.length > 0) {
    console.log(`🧗 Insertion de ${data.gyms.length} salles...`);
    const { error } = await supabase.from('gyms').upsert(data.gyms);
    if (error) console.error("❌ Erreur gyms:", error.message);
    else console.log("✅ Salles insérées.");
  }

  // 2. Migrer les Users
  if (data.users && data.users.length > 0) {
    console.log(`👤 Insertion de ${data.users.length} utilisateurs...`);
    const { error } = await supabase.from('users').upsert(data.users);
    if (error) console.error("❌ Erreur users:", error.message);
    else console.log("✅ Utilisateurs insérés.");
  }

  // 3. Migrer les Subscriptions
  if (data.subscriptions && data.subscriptions.length > 0) {
    console.log(`🔔 Insertion de ${data.subscriptions.length} abonnements...`);
    const { error } = await supabase.from('subscriptions').upsert(data.subscriptions);
    if (error) console.error("❌ Erreur subscriptions:", error.message);
    else console.log("✅ Abonnements insérés.");
  }

  // 4. Migrer les CrowdUpdates
  if (data.crowdUpdates && data.crowdUpdates.length > 0) {
    console.log(`👥 Insertion de ${data.crowdUpdates.length} mises à jour d'affluence...`);
    const { error } = await supabase.from('crowdUpdates').upsert(data.crowdUpdates);
    if (error) console.error("❌ Erreur crowdUpdates:", error.message);
    else console.log("✅ Affluences insérées.");
  }

  // 5. Migrer les PlannedVisits
  if (data.plannedVisits && data.plannedVisits.length > 0) {
    console.log(`📅 Insertion de ${data.plannedVisits.length} visites planifiées...`);
    const { error } = await supabase.from('plannedVisits').upsert(data.plannedVisits);
    if (error) console.error("❌ Erreur plannedVisits:", error.message);
    else console.log("✅ Visites planifiées insérées.");
  }

  console.log('🎉 Migration terminée ! Vérifiez votre dashboard Supabase.');
  process.exit(0);
}

migrate();
