// const API_URL = 'http://localhost:12000/api'; 
// const GYM_ID = '1'; // Salle : Climb Up Lyon Confluence

// async function simulate() {
//   console.log('🚀 Simulation de 6 utilisateurs pour la salle 1...');
  
//   // Utilisation de simu_ pour différencier les tests
//   const users = ['simu_user_1', 'simu_user_2', 'simu_user_3', 'simu_user_4', 'simu_user_5', 'simu_user_6'];
  
//   for (const userId of users) {
//     try {
//       const response = await fetch(`${API_URL}/gyms/${GYM_ID}/slots`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           userId: userId,
//           arrivalTime: '18:00',
//           duration: 120 // 2 heures
//         })
//       });
      
//       if (response.ok) {
//         console.log(`✅ Utilisateur envoyé : ${userId}`);
//       } else {
//         const errorData = await response.json();
//         console.log(`❌ Erreur pour ${userId}: ${errorData.error || response.statusText}`);
//       }
//     } catch (error) {
//       console.error(`❌ Erreur réseau pour ${userId}:`, error.message);
//     }
//   }
  
//   console.log('\n✨ Simulation terminée !');
//   console.log('Allez sur la fiche "Climb Up Lyon Confluence" dans l\'app.');
//   console.log('Renseignez un créneau incluant 18:00 (ex: 17:30 - 2h).');
//   console.log('La prévision devrait afficher "Peu fréquenté" (Level 2) car il y a 6 personnes au total.');
// }

// simulate();
