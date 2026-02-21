const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
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

// Store push tokens for notifications
const pushTokens = new Map();

// GET all gyms
app.get('/api/gyms', (req, res) => {
  const data = readData();
  res.json(data.gyms);
});

// GET single gym
app.get('/api/gyms/:id', (req, res) => {
  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);
  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }
  res.json(gym);
});

// Register user (simple email-based auth)
app.post('/api/auth/register', (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  const data = readData();
  let user = data.users.find(u => u.email === email);
  
  if (!user) {
    user = {
      id: uuidv4(),
      email,
      name: name || email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    writeData(data);
  }

  res.json({ user, message: 'Connexion réussie' });
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  const data = readData();
  let user = data.users.find(u => u.email === email);
  
  if (!user) {
    user = {
      id: uuidv4(),
      email,
      name: email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    writeData(data);
  }

  res.json({ user, message: 'Connexion réussie' });
});

// Subscribe to a gym
app.post('/api/subscriptions', (req, res) => {
  const { userId, gymId, pushToken } = req.body;
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
    pushToken: pushToken || null,
    createdAt: new Date().toISOString()
  };

  data.subscriptions.push(subscription);
  writeData(data);

  // Store push token
  if (pushToken) {
    pushTokens.set(userId, pushToken);
  }

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

  if (crowdLevel < 1 || crowdLevel > 5) {
    return res.status(400).json({ error: 'Niveau d\'affluence entre 1 et 5' });
  }

  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);
  
  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  // Update crowd 
  gym.crowdLevel = crowdLevel;

  // Log the update
  const update = {
    id: uuidv4(),
    gymId: req.params.id,
    userId,
    crowdLevel,
    timestamp: new Date().toISOString()
  };
  data.crowdUpdates.push(update);
  writeData(data);

  res.json({ gym, message: 'Affluence mise à jour' });
});

// Report sector change
app.post('/api/gyms/:id/sector-change', (req, res) => {
  const { userId, sectorName, description } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);
  
  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  gym.sectorChangedRecently = true;
  gym.lastSectorChange = {
    sectorName: sectorName || 'Non spécifié',
    description: description || 'Un secteur a été modifié',
    reportedBy: userId,
    timestamp: new Date().toISOString()
  };

  // Create notifications for subscribers
  const subscribers = data.subscriptions.filter(s => s.gymId === req.params.id);
  
  subscribers.forEach(sub => {
    if (sub.userId !== userId) {
      const notification = {
        id: uuidv4(),
        userId: sub.userId,
        gymId: req.params.id,
        gymName: gym.name,
        type: 'sector_change',
        title: `🧗 Nouveauté chez ${gym.name}`,
        message: `Un secteur a été modifié${sectorName ? ` : ${sectorName}` : ''}.${description ? ` ${description}` : ''}`,
        read: false,
        createdAt: new Date().toISOString()
      };
      data.notifications.push(notification);
    }
  });

  writeData(data);

  res.json({ 
    gym, 
    notifiedUsers: subscribers.length - 1,
    message: 'Changement de secteur signalé et notifications envoyées' 
  });
});

// Get user notifications
app.get('/api/notifications/:userId', (req, res) => {
  const data = readData();
  const notifications = data.notifications
    .filter(n => n.userId === req.params.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notifications);
});

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
  const data = readData();
  const notification = data.notifications.find(n => n.id === req.params.id);
  
  if (!notification) {
    return res.status(404).json({ error: 'Notification non trouvée' });
  }

  notification.read = true;
  writeData(data);

  res.json({ notification, message: 'Notification marquée comme lue' });
});

// Mark all notifications as read for a user
app.put('/api/notifications/:userId/read-all', (req, res) => {
  const data = readData();
  data.notifications
    .filter(n => n.userId === req.params.userId)
    .forEach(n => n.read = true);
  writeData(data);

  res.json({ message: 'Toutes les notifications marquées comme lues' });
});

// Reset sector change flag (after viewing)
app.post('/api/gyms/:id/reset-sector-flag', (req, res) => {
  const data = readData();
  const gym = data.gyms.find(g => g.id === req.params.id);
  
  if (!gym) {
    return res.status(404).json({ error: 'Salle non trouvée' });
  }

  gym.sectorChangedRecently = false;
  writeData(data);

  res.json({ gym, message: 'Flag réinitialisé' });
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
      
      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/gyms/:id/sector-change</code> - Signaler un changement de secteur
      </div>
      
      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/notifications/:userId</code> - Notifications utilisateur
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧗 Serveur démarré sur le port ${PORT}`);
  console.log(`📍 API disponible sur http://localhost:${PORT}/api`);
});
