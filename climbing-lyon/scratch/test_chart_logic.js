/**
 * Script de test pour valider la logique du graphique d'affluence
 * sans avoir à lancer l'application complète.
 */

// Simulation de parseTime (identique à utils/timeUtils.js)
const parseTime = (str) => {
  if (!str) return null;
  const clean = str.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})\s*[h:]\s*(\d{1,2})?/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2] || "0", 10);
    return h * 60 + m;
  }
  return null;
};

const testCases = [
  { label: "Format standard", hours: "08:00-22:00" },
  { label: "Format français", hours: "08h30-23h00" },
  { label: "Format avec espaces", hours: " 09 : 00 - 21 : 30 " },
  { label: "Fermeture après minuit", hours: "12:00-01:00" },
  { label: "Format 'à'", hours: "10:00 à 20:00" }
];

console.log("🧪 Test de la robustesse du graphique...\n");

testCases.forEach(tc => {
  console.log(`🔹 Cas : ${tc.label} (${tc.hours})`);
  
  // Simulation de la logique dans CrowdChart.js
  const parts = tc.hours.split(/[-–—à]| au /i).map(s => s.trim());
  
  if (parts.length < 2) {
    console.log("  ❌ Erreur : Impossible de séparer début/fin");
    return;
  }

  const openMins = parseTime(parts[0]);
  const closeMins = parseTime(parts[1]);

  if (openMins === null || closeMins === null) {
    console.log(`  ❌ Erreur : parseTime a échoué (Open: ${openMins}, Close: ${closeMins})`);
    return;
  }

  let effectiveCloseMins = closeMins;
  if (closeMins <= openMins) {
    effectiveCloseMins += 24 * 60;
  }

  const duration = effectiveCloseMins - openMins;
  const slotCount = Math.floor(duration / 30);

  console.log(`  ✅ OK : Ouverture ${openMins}min, Fermeture effective ${effectiveCloseMins}min`);
  console.log(`  📊 Nombre de créneaux générés : ${slotCount}`);
  console.log("-----------------------------------------");
});

console.log("\n🚀 Conclusion : Si tous les tests sont 'OK', le graphique s'affichera correctement dans l'app.");
