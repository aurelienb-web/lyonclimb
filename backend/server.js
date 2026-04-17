const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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

const DATA_FILE = path.join(__dirname, 'data.json');

// Helper functions to read/write data
function readData() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Clean up old data (crowd updates > 24h)
function cleanUpOldData() {
  console.log('🧹 Exécution du nettoyage des données...');
  const data = readData();
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  let changes = false;

  // 2. Clean crowd updates (> 24h)
  const initialCrowdCount = data.crowdUpdates.length;
  data.crowdUpdates = data.crowdUpdates.filter(u => new Date(u.timestamp) > twentyFourHoursAgo);
  if (data.crowdUpdates.length !== initialCrowdCount) {
    console.log(`✅ Supprimé ${initialCrowdCount - data.crowdUpdates.length} mises à jour d'affluence obsolètes.`);
    changes = true;
  }

  // 3. Clean planned visits (remove if visitDate is before today)
  if (!data.plannedVisits) data.plannedVisits = [];
  const initialSlotCount = data.plannedVisits.length;
  const todayStr = now.toISOString().split('T')[0];
  
  data.plannedVisits = data.plannedVisits.filter(v => {
    // If no visitDate, fallback to createdAt (existing data)
    const vDate = v.visitDate || v.createdAt.split('T')[0];
    return vDate >= todayStr;
  });
  if (data.plannedVisits.length !== initialSlotCount) {
    console.log(`✅ Supprimé ${initialSlotCount - data.plannedVisits.length} créneaux planifiés obsolètes.`);
    changes = true;
  }

  if (changes) {
    writeData(data);
    console.log('💾 Données nettoyées et sauvegardées.');
  } else {
    console.log('✨ Aucune donnée obsolète à nettoyer.');
  }
}


// GET all gyms
app.get('/api/gyms', (req, res) => {
  const data = readData();

  // Recalculate averages for all gyms based on last 30 minutes (latest vote per user)
  const recentThreshold = new Date().getTime() - (30 * 60 * 1000);

  const updatedGyms = data.gyms.map(gym => {
    const recentUpdates = data.crowdUpdates.filter(u =>
      u.gymId === gym.id &&
      new Date(u.timestamp).getTime() > recentThreshold
    );

    if (recentUpdates.length > 0) {
      // Group by user and take latest vote
      const latestVotesPerUser = {};
      recentUpdates.forEach(u => {
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
app.get('/api/gyms/:id', (req, res) => {
  const { userId } = req.query;
  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);

  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  // Recalculate average crowd level (last 30 minutes, latest vote per user)
  const recentThreshold = new Date().getTime() - (30 * 60 * 1000);

  const recentUpdates = data.crowdUpdates.filter(u =>
    u.gymId === req.params.id &&
    new Date(u.timestamp).getTime() > recentThreshold
  );

  let crowdLevel = gym.crowdLevel;
  if (recentUpdates.length > 0) {
    // Group by user and take latest vote
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
  }

  // Get user's last contribution (ever, or could be last 24h)
  let userLastContribution = null;
  if (userId) {
    const userUpdates = data.crowdUpdates
      .filter(u => u.gymId === req.params.id && u.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (userUpdates.length > 0) {
      userLastContribution = userUpdates[0].crowdLevel;
    }
  }

  res.json({
    ...gym,
    crowdLevel,
    userLastContribution
  });
});

// Register or retrieve a device-based user (no email required)
app.post('/api/auth/device', (req, res) => {
  const { deviceId, deviceName } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId requis' });
  }

  const data = readData();
  let user = data.users.find(u => u.deviceId === deviceId);

  if (!user) {
    user = {
      id: deviceId,
      deviceId,
      name: deviceName || 'Appareil',
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    writeData(data);
  }

  res.json({ user, message: 'Appareil enregistré' });
});

// Subscribe to a gym
app.post('/api/subscriptions', (req, res) => {
  const { userId, gymId } = req.body;
  if (!userId || !gymId) {
    return res.status(400).json({ error: 'userId et gymId requis' });
  }

  const data = readData();

  // Check if subscription already exists
  const existingSub = data.subscriptions.find(
    s => s.userId === userId && s.gymId === gymId
  );

  if (existingSub) {
    return res.status(400).json({ error: 'Déjà abonné à cette salle' });
  }

  const subscription = {
    id: uuidv4(),
    userId,
    gymId,
    createdAt: new Date().toISOString()
  };

  data.subscriptions.push(subscription);
  writeData(data);


  res.json({ subscription, message: 'Abonnement créé' });
});

// Unsubscribe from a gym
app.delete('/api/subscriptions/:userId/:gymId', (req, res) => {
  const { userId, gymId } = req.params;
  const data = readData();

  const index = data.subscriptions.findIndex(
    s => s.userId === userId && s.gymId === gymId
  );

  if (index === -1) {
    return res.status(404).json({ error: 'Abonnement non trouvé' });
  }

  data.subscriptions.splice(index, 1);
  writeData(data);

  res.json({ message: 'Désabonnement effectué' });
});

// Get user subscriptions
app.get('/api/subscriptions/:userId', (req, res) => {
  const data = readData();
  const subscriptions = data.subscriptions.filter(s => s.userId === req.params.userId);
  const gymIds = subscriptions.map(s => s.gymId);
  const subscribedGyms = data.gyms.filter(g => gymIds.includes(g.id));
  res.json(subscribedGyms);
});

// Update crowd level
app.post('/api/gyms/:id/crowd', (req, res) => {
  const { userId, crowdLevel } = req.body;
  if (!userId || crowdLevel === undefined) {
    return res.status(400).json({ error: 'userId et crowdLevel requis' });
  }

  const numericCrowdLevel = Number(crowdLevel);
  if (isNaN(numericCrowdLevel) || numericCrowdLevel < 1 || numericCrowdLevel > 5) {
    return res.status(400).json({ error: 'Niveau d\'affluence entre 1 et 5' });
  }

  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);

  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  // Log the update
  const update = {
    id: uuidv4(),
    gymId: req.params.id,
    userId,
    crowdLevel: numericCrowdLevel,
    timestamp: new Date().toISOString()
  };
  data.crowdUpdates.push(update);

  // Recalculate average crowd level (last 30 minutes, latest vote per user)
  const now = new Date().getTime();
  const recentThreshold = now - (30 * 60 * 1000);

  const recentUpdates = data.crowdUpdates.filter(u =>
    u.gymId === req.params.id &&
    new Date(u.timestamp).getTime() > recentThreshold
  );

  console.log(`[Gym ${req.params.id}] Calculating average from ${recentUpdates.length} recent updates`);

  if (recentUpdates.length > 0) {
    // Group by user and take latest vote
    const latestVotesPerUser = {};
    recentUpdates.forEach(u => {
      const ts = new Date(u.timestamp).getTime();
      if (!latestVotesPerUser[u.userId] || ts > latestVotesPerUser[u.userId].timestamp) {
        latestVotesPerUser[u.userId] = { level: u.crowdLevel, timestamp: ts };
      }
    });

    const votes = Object.values(latestVotesPerUser);
    const sum = votes.reduce((acc, v) => acc + Number(v.level), 0);
    gym.crowdLevel = Math.round(sum / votes.length);
    console.log(`[Gym ${req.params.id}] New average: ${gym.crowdLevel} (from ${votes.length} users)`);
  } else {
    gym.crowdLevel = crowdLevel;
  }

  writeData(data);

  // Emit real-time update
  io.emit('gym_crowd_updated', {
    gymId: req.params.id,
    crowdLevel: gym.crowdLevel
  });

  res.json({ gym, message: 'Affluence mise à jour' });
});



// Register a planned visit slot
app.post('/api/gyms/:id/slots', (req, res) => {
  const { userId, arrivalTime, duration, visitDate } = req.body;
  if (!userId || !arrivalTime || !duration) {
    return res.status(400).json({ error: 'userId, arrivalTime et duration requis' });
  }

  const data = readData();
  if (!data.plannedVisits) data.plannedVisits = [];

  const targetDate = visitDate || new Date().toISOString().split('T')[0];

  // Remove previous slot for this user/gym/date if exists (latest intention only)
  data.plannedVisits = data.plannedVisits.filter(v => !(v.userId === userId && v.gymId === req.params.id && v.visitDate === targetDate));

  const visit = {
    id: uuidv4(),
    gymId: req.params.id,
    userId,
    arrivalTime,
    duration,
    visitDate: targetDate,
    createdAt: new Date().toISOString()
  };

  data.plannedVisits.push(visit);
  writeData(data);

  res.json({ visit, message: 'Visite planifiée enregistrée' });
});

// GET crowd history for a gym (last 7 days) — used for crowd forecast
app.get('/api/gyms/:id/crowd-history', (req, res) => {
  const { date } = req.query;
  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);

  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const targetDateStr = date || new Date().toISOString().split('T')[0];

  const updates = data.crowdUpdates.filter(u =>
    u.gymId === req.params.id &&
    new Date(u.timestamp) > sevenDaysAgo
  );

  const filteredSlots = (data.plannedVisits || []).filter(v => 
    v.gymId === req.params.id &&
    (v.visitDate === targetDateStr || (!v.visitDate && v.createdAt.split('T')[0] === targetDateStr))
  );

  res.json({
    updates,
    plannedVisits: filteredSlots
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve API documentation at /api-docs
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
        .put { background: #f39c12; }
        .delete { background: #e74c3c; }
        code { background: #ecf0f1; padding: 2px 6px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>🧗 API Salles d'Escalade Lyon</h1>
      <p>Backend pour l'application de référencement des salles d'escalade de Lyon</p>
      <p><a href="/">← Retour à l'application</a></p>
      
      <h2>Endpoints disponibles</h2>
      
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/gyms</code> - Liste toutes les salles d'escalade
      </div>
      
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/gyms/:id</code> - Détails d'une salle
      </div>
      
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/auth/login</code> - Connexion utilisateur (email)
      </div>
      
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/subscriptions</code> - S'abonner à une salle
      </div>
      
      <div class="endpoint">
        <span class="method delete">DELETE</span>
        <code>/api/subscriptions/:userId/:gymId</code> - Se désabonner
      </div>
      
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/gyms/:id/crowd</code> - Mettre à jour l'affluence
      </div>
      
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
  console.log(`🔌 WebSockets activés`);
});
