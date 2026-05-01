const https = require('https');
const supabase = require('./supabase');

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKuol7G0lMmQoXVG7NgmWm-FtjoNoncUC_AmsycNR2nKDYufKGnVknA3uKpGqjU2hIBpyiqD-vsS7h/pub?output=csv';

function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Gérer les redirections (Google Docs le fait souvent)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCSV(res.headers.location).then(resolve).catch(reject);
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Supprimer le BOM (Byte Order Mark) si présent
        resolve(data.replace(/^\uFEFF/, ''));
      });
      res.on('error', reject);
    });
  });
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Get headers
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Regex to split by comma but ignore commas inside quotes
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

  return lines.slice(1).map(line => {
    const values = line.split(regex).map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i];
    });
    return obj;
  });
}

async function sync() {
  try {
    console.log('📥 Téléchargement des données depuis Google Sheets...');
    const csvText = await fetchCSV(CSV_URL);
    const rows = parseCSV(csvText);
    
    if (rows.length === 0) {
      console.error('❌ Aucune donnée trouvée dans le CSV.');
      process.exit(1);
    }

    console.log(`✅ ${rows.length} lignes trouvées dans le CSV.`);
    if (rows.length > 0) {
      console.log('Headers détectés:', Object.keys(rows[0]));
      console.log('Première ligne (nom):', rows[0]['Nom de la salle']);
    }

    const gyms = rows
      .filter(row => row['Nom de la salle'] && row['Nom de la salle'].trim() !== '')
      .map(row => {
        // Générer un ID à partir du nom
        const name = row['Nom de la salle'];
        const id = name
          .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      const openingHours = {
        monday: row['Lundi'],
        tuesday: row['Mardi'],
        wednesday: row['Mercredi'],
        thursday: row['Jeudi'],
        friday: row['Vendredi'],
        saturday: row['Samedi'],
        sunday: row['Dimanche']
      };

      // Stocker les noms originaux des colonnes pour la compatibilité frontend si besoin
      openingHours.Lundi = row['Lundi'];
      openingHours.Mardi = row['Mardi'];
      openingHours.Mercredi = row['Mercredi'];
      openingHours.Jeudi = row['Jeudi'];
      openingHours.Vendredi = row['Vendredi'];
      openingHours.Samedi = row['Samedi'];
      openingHours.Dimanche = row['Dimanche'];

      const pricing = {
        single: row['Entrée Unique'] || 'N/A'
      };

      return {
        id,
        name: row['Nom de la salle'],
        image: row['URL de l\'image'],
        address: row['Adresse'],
        website: row['URL site web'],
        phone: row['Numéro de téléphone'],
        openingHours,
        pricing,
        features: [], // Gardé vide comme demandé
        crowdLevel: 0
      };
    });

    console.log('🗑️ Suppression des anciennes salles...');
    // Supprimer toutes les salles (cascade supprimera les sous-tables)
    const { error: deleteError } = await supabase.from('gyms').delete().neq('id', 'void-placeholder');
    if (deleteError) {
      console.error('❌ Erreur suppression:', deleteError.message);
      throw deleteError;
    }

    console.log(`📤 Insertion de ${gyms.length} salles...`);
    // console.log('DEBUG gyms:', JSON.stringify(gyms, null, 2));
    const { error: insertError } = await supabase.from('gyms').insert(gyms);
    if (insertError) {
      console.error('❌ Erreur insertion:', insertError.message);
      throw insertError;
    }

    console.log('🎉 Synchronisation terminée avec succès !');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur critique lors de la synchronisation:', err);
    process.exit(1);
  }
}

sync();
