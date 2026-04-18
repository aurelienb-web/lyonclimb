const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const supabase = require('./supabase'); // Import the supabase client

const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 12000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Clean up old data (crowd updates > 24h & past planned visits)
async function cleanUpOldData() {
  console.log('🧹 Exécution du nettoyage des données...');
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
  const todayStr = now.toISOString().split('T')[0];

  try {
    const { error: err1 } = await supabase.from('crowdUpdates').delete().lt('timestamp', twentyFourHoursAgo);
    if (!err1) console.log(`✅ Mises à jour d'affluence obsolètes nettoyées.`);

    const { error: err2 } = await supabase.from('plannedVisits').delete().lt('visitDate', todayStr);
    if (!err2) console.log(`✅ Créneaux planifiés obsolètes nettoyés.`);
  } catch (err) {
    console.error('Erreur lors du nettoyage:', err);
  }
}

// GET all gyms
app.get('/api/gyms', async (req, res) => {
  const { data: gyms, error } = await supabase.from('gyms').select('*');
  if (error) return res.status(500).json({ error: error.message });

  // Recalculate averages for all gyms based on last 30 minutes (latest vote per user)
  const recentThreshold = new Date(Date.now() - (30 * 60 * 1000)).toISOString();
  const { data: recentUpdates } = await supabase.from('crowdUpdates').select('*').gte('timestamp', recentThreshold);

  const updatedGyms = gyms.map(gym => {
    const gymUpdates = (recentUpdates || []).filter(u => u.gymId === gym.id);

    if (gymUpdates.length > 0) {
      // Group by user and take latest vote
      const latestVotesPerUser = {};
      gymUpdates.forEach(u => {
        const timestamp = new Date(u.timestamp).getTime();
        if (!latestVotesPerUser[u.userId] || timestamp > latestVotesPerUser[u.userId].timestamp) {
          latestVotesPerUser[u.userId] = { level: u.crowdLevel, timestamp };
        }
      });

      const votes = Object.values(latestVotesPerUser);
      const sum = votes.reduce((acc, v) => acc + Number(v.level), 0);
      return { ...gym, crowdLevel: Math.round(sum / votes.length) };
    }
    return gym;
  });

  res.json(updatedGyms);
});

// GET single gym
app.get('/api/gyms/:id', async (req, res) => {
  const { userId } = req.query;
  const { data: gym, error } = await supabase.from('gyms').select('*').eq('id', req.params.id).single();

  if (error || !gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  // Recalculate average crowd level (last 30 minutes)
  const recentThreshold = new Date(Date.now() - (30 * 60 * 1000)).toISOString();
  const { data: recentUpdates } = await supabase.from('crowdUpdates')
    .select('*')
    .eq('gymId', req.params.id)
    .gte('timestamp', recentThreshold);

  let crowdLevel = gym.crowdLevel;
  let crowdUpdatesCount = 0;

  if (recentUpdates && recentUpdates.length > 0) {
    const latestVotesPerUser = {};
    recentUpdates.forEach(u => {
      const timestamp = new Date(u.timestamp).getTime();
      if (!latestVotesPerUser[u.userId] || timestamp > latestVotesPerUser[u.userId].timestamp) {
        latestVotesPerUser[u.userId] = { level: u.crowdLevel, timestamp };
      }
    });

    const votes = Object.values(latestVotesPerUser);
    const sum = votes.reduce((acc, v) => acc + Number(v.level), 0);
    crowdLevel = Math.round(sum / votes.length);
    crowdUpdatesCount = votes.length;
  }

  // Get user's last contribution
  let userLastContribution = null;
  if (userId) {
    const { data: userUpdates } = await supabase.from('crowdUpdates')
      .select('crowdLevel')
      .eq('gymId', req.params.id)
      .eq('userId', userId)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (userUpdates && userUpdates.length > 0) {
      userLastContribution = userUpdates[0].crowdLevel;
    }
  }

  res.json({
    ...gym,
    crowdLevel,
    crowdUpdatesCount,
    userLastContribution
  });
});

// Register or retrieve a device-based user (no email required)
app.post('/api/auth/device', async (req, res) => {
  const { deviceId, deviceName } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId requis' });
  }

  let { data: user } = await supabase.from('users').select('*').eq('deviceId', deviceId).single();

  if (!user) {
    const newUser = {
      id: deviceId, // For compatibility with existing IDs logic
      deviceId,
      name: deviceName || 'Appareil'
    };
    const { data: insertedUser, error } = await supabase.from('users').insert([newUser]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    user = insertedUser;
  }

  res.json({ user, message: 'Appareil enregistré' });
});

// Subscribe to a gym
app.post('/api/subscriptions', async (req, res) => {
  const { userId, gymId } = req.body;
  if (!userId || !gymId) {
    return res.status(400).json({ error: 'userId et gymId requis' });
  }

  const { data: existingSub } = await supabase.from('subscriptions')
    .select('id')
    .eq('userId', userId)
    .eq('gymId', gymId)
    .single();

  if (existingSub) {
    return res.status(400).json({ error: 'Déjà abonné à cette salle' });
  }

  const subscription = {
    id: uuidv4(),
    userId,
    gymId
  };

  const { data, error } = await supabase.from('subscriptions').insert([subscription]).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ subscription: data, message: 'Abonnement créé' });
});

// Unsubscribe from a gym
app.delete('/api/subscriptions/:userId/:gymId', async (req, res) => {
  const { userId, gymId } = req.params;
  const { error } = await supabase.from('subscriptions').delete().eq('userId', userId).eq('gymId', gymId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Désabonnement effectué' });
});

// Get user subscriptions
app.get('/api/subscriptions/:userId', async (req, res) => {
  const { data: subscriptions } = await supabase.from('subscriptions').select('gymId').eq('userId', req.params.userId);
  if (!subscriptions || subscriptions.length === 0) return res.json([]);
  
  const gymIds = subscriptions.map(s => s.gymId);
  const { data: subscribedGyms } = await supabase.from('gyms').select('*').in('id', gymIds);
  
  res.json(subscribedGyms || []);
});

// Update crowd level
app.post('/api/gyms/:id/crowd', async (req, res) => {
  const { userId, crowdLevel } = req.body;
  if (!userId || crowdLevel === undefined) {
    return res.status(400).json({ error: 'userId et crowdLevel requis' });
  }

  const numericCrowdLevel = Number(crowdLevel);
  if (isNaN(numericCrowdLevel) || numericCrowdLevel < 1 || numericCrowdLevel > 5) {
    return res.status(400).json({ error: 'Niveau d\'affluence entre 1 et 5' });
  }

  const { data: gym, error } = await supabase.from('gyms').select('*').eq('id', req.params.id).single();
  if (error || !gym) return res.status(404).json({ error: 'Salle non trouvée' });

  // Log the update
  const update = {
    id: uuidv4(),
    gymId: req.params.id,
    userId,
    crowdLevel: numericCrowdLevel
  };
  await supabase.from('crowdUpdates').insert([update]);

  // Recalculate average crowd level
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - (30 * 60 * 1000)).toISOString();

  const { data: recentUpdates } = await supabase.from('crowdUpdates')
    .select('*')
    .eq('gymId', req.params.id)
    .gte('timestamp', recentThreshold);

  let crowdUpdatesCount = 0;
  let newCrowdLevel = gym.crowdLevel;

  if (recentUpdates && recentUpdates.length > 0) {
    const latestVotesPerUser = {};
    recentUpdates.forEach(u => {
      const ts = new Date(u.timestamp).getTime();
      if (!latestVotesPerUser[u.userId] || ts > latestVotesPerUser[u.userId].timestamp) {
        latestVotesPerUser[u.userId] = { level: u.crowdLevel, timestamp: ts };
      }
    });

    const votes = Object.values(latestVotesPerUser);
    const sum = votes.reduce((acc, v) => acc + Number(v.level), 0);
    newCrowdLevel = Math.round(sum / votes.length);
    crowdUpdatesCount = votes.length;
    
    // Update gym record in DB optionally to cache it
    await supabase.from('gyms').update({ crowdLevel: newCrowdLevel }).eq('id', req.params.id);
  } else {
    newCrowdLevel = crowdLevel;
  }

  // Emit real-time update
  io.emit('gym_crowd_updated', {
    gymId: req.params.id,
    crowdLevel: newCrowdLevel,
    crowdUpdatesCount
  });

  res.json({ gym: { ...gym, crowdLevel: newCrowdLevel, crowdUpdatesCount }, message: 'Affluence mise à jour' });
});

// Register a planned visit slot
app.post('/api/gyms/:id/slots', async (req, res) => {
  const { userId, arrivalTime, duration, visitDate } = req.body;
  if (!userId || !arrivalTime || !duration) {
    return res.status(400).json({ error: 'userId, arrivalTime et duration requis' });
  }

  const targetDate = visitDate || new Date().toISOString().split('T')[0];

  // Remove previous slot for this user/gym/date if exists (latest intention only)
  await supabase.from('plannedVisits')
    .delete()
    .eq('userId', userId)
    .eq('gymId', req.params.id)
    .eq('visitDate', targetDate);

  const visit = {
    id: uuidv4(),
    gymId: req.params.id,
    userId,
    arrivalTime,
    duration,
    visitDate: targetDate
  };

  const { data, error } = await supabase.from('plannedVisits').insert([visit]).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ visit: data, message: 'Visite planifiée enregistrée' });
});

// GET crowd history for a gym (last 7 days) — used for crowd forecast
app.get('/api/gyms/:id/crowd-history', async (req, res) => {
  const { date } = req.query;
  const targetDateStr = date || new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: updates } = await supabase.from('crowdUpdates')
    .select('*')
    .eq('gymId', req.params.id)
    .gte('timestamp', sevenDaysAgo);

  const { data: plannedVisits } = await supabase.from('plannedVisits')
    .select('*')
    .eq('gymId', req.params.id)
    .eq('visitDate', targetDateStr);

  res.json({
    updates: updates || [],
    plannedVisits: plannedVisits || []
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), database: 'Supabase' });
});

// Serve API documentation at /api-docs (kept from previous code)
app.get('/api-docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Salles d'Escalade Lyon</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        h1 { color: #e74c3c; }
        .endpoint { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; margin-right: 10px; }
        .get { background: #27ae60; }
        .post { background: #3498db; }
        .delete { background: #e74c3c; }
        code { background: #ecf0f1; padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🧗 API Salles d'Escalade Lyon</h1>
      <p>Backend pour l'application de référencement des salles d'escalade de Lyon (Supabase Edition)</p>
      
      <h2>Endpoints disponibles</h2>
      <div class="endpoint"><span class="method get">GET</span><code>/api/gyms</code> - Liste toutes les salles d'escalade</div>
      <div class="endpoint"><span class="method get">GET</span><code>/api/gyms/:id</code> - Détails d'une salle</div>
      <div class="endpoint"><span class="method post">POST</span><code>/api/auth/device</code> - Connexion appareil</div>
      <div class="endpoint"><span class="method post">POST</span><code>/api/subscriptions</code> - S'abonner à une salle</div>
      <div class="endpoint"><span class="method delete">DELETE</span><code>/api/subscriptions/:userId/:gymId</code> - Se désabonner</div>
      <div class="endpoint"><span class="method post">POST</span><code>/api/gyms/:id/crowd</code> - Mettre à jour l'affluence</div>
    </body>
    </html>
  `);
});

// Initial layout and scheduling of cleanup
cleanUpOldData();
setInterval(cleanUpOldData, 60 * 60 * 1000); // Every hour

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🧗 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 API disponible sur http://localhost:${PORT}/api`);
  console.log(`🔌 WebSockets activés (Supabase Mode)`);
});
