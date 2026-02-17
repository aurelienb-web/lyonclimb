# 🧗 Salles d'Escalade Lyon

Application mobile et web pour référencer les salles d'escalade de Lyon et ses environs.

## Fonctionnalités

- **Liste des salles** : Consultez toutes les salles d'escalade de Lyon avec leurs informations détaillées
- **Fiche technique** : Tarifs, horaires, adresse, équipements pour chaque salle
- **Système d'abonnement** : Suivez vos salles préférées pour recevoir des notifications
- **Affluence en temps réel** : Consultez et partagez le niveau d'affluence (5 niveaux)
- **Changements de secteur** : Signalez et recevez des notifications lors de modifications de secteur
- **Authentification par email** : Connexion simple pour contribuer et suivre des salles

## Architecture

```
project/
├── backend/                 # API Express.js
│   ├── server.js           # Serveur principal
│   ├── data.json           # Base de données JSON
│   └── public/             # Version web de l'app
│       └── index.html
├── climbing-lyon/          # Application React Native (Expo)
│   ├── App.js
│   └── src/
│       ├── components/     # Composants réutilisables
│       ├── screens/        # Écrans de l'application
│       ├── services/       # Services API
│       └── context/        # Contexte React (Auth)
```

## Installation

### Backend

```bash
cd backend
npm install
npm start
```

Le serveur démarre sur http://localhost:12000

### Application Mobile (Expo)

```bash
cd climbing-lyon
npm install
npx expo start
```

## Utilisation

### Version Web
Accédez directement à l'application web via : https://work-1-qvlwqbjsnisnedpv.prod-runtime.all-hands.dev

### Application Mobile
1. Installez Expo Go sur votre téléphone
2. Lancez `npx expo start` dans le dossier `climbing-lyon`
3. Scannez le QR code avec Expo Go

## API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/gyms` | Liste toutes les salles |
| GET | `/api/gyms/:id` | Détails d'une salle |
| POST | `/api/auth/login` | Connexion utilisateur |
| POST | `/api/subscriptions` | S'abonner à une salle |
| DELETE | `/api/subscriptions/:userId/:gymId` | Se désabonner |
| GET | `/api/subscriptions/:userId` | Salles suivies |
| POST | `/api/gyms/:id/crowd` | Mettre à jour l'affluence |
| POST | `/api/gyms/:id/sector-change` | Signaler un changement de secteur |
| GET | `/api/notifications/:userId` | Notifications utilisateur |
| PUT | `/api/notifications/:id/read` | Marquer une notification lue |

## Salles référencées

1. **Climb Up Lyon Confluence** - 112 Cours Charlemagne, 69002 Lyon
2. **Altissimo Villeurbanne** - 165 Rue Léon Blum, 69100 Villeurbanne
3. **Mroc Laennec** - 36 Rue Laennec, 69008 Lyon
4. **Mroc Monplaisir** - 60 Rue Professeur Florence, 69003 Lyon
5. **Azium Escalade** - 71 Rue Francis de Pressensé, 69100 Villeurbanne
6. **Mur de Lyon** - 13 Rue Gorge de Loup, 69009 Lyon

## Technologies

- **Frontend Mobile** : React Native avec Expo
- **Frontend Web** : HTML/CSS/JavaScript vanilla
- **Backend** : Node.js avec Express
- **Base de données** : JSON (fichier)
- **Navigation** : React Navigation

## Niveaux d'affluence

| Niveau | Label | Couleur |
|--------|-------|---------|
| 1 | 🟢 Très calme | Vert foncé |
| 2 | 🟢 Peu fréquenté | Vert clair |
| 3 | 🟡 Modéré | Orange |
| 4 | 🟠 Fréquenté | Orange foncé |
| 5 | 🔴 Très fréquenté | Rouge |

## Licence

MIT
