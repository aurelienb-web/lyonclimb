import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Platform } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getGyms } from '../services/api';
import { subscribeToCrowdUpdates } from '../services/socketService';

// Correction pour les icônes Leaflet par défaut
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LYON_CENTER = [45.7578, 4.832];

// Composant pour forcer le rafraîchissement de la taille de la carte
const MapController = ({ gyms, onMapClick }) => {
  const map = useMap();
  
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);

  useMapEvents({
    click: () => onMapClick(),
  });

  return null;
};

const MapScreen = ({ navigation }) => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);

  useEffect(() => {
    // Charger le CSS de Leaflet dynamiquement (et le garder)
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
      document.head.appendChild(link);
    }
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      const data = await getGyms();
      console.log('Données reçues (Web Map):', data);
      const filtered = data.filter(g => g.latitude && g.longitude);
      console.log('Salles après filtrage (Web):', filtered.length);
      setGyms(filtered);
    } catch (err) {
      console.error('Erreur chargement salles (Web Map):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToCrowdUpdates((data) => {
      setGyms((currentGyms) =>
        currentGyms.map(g => g.id === data.gymId ? { ...g, crowdLevel: data.crowdLevel } : g)
      );
      if (selectedGym && selectedGym.id === data.gymId) {
        setSelectedGym(prev => ({ ...prev, crowdLevel: data.crowdLevel }));
      }
    });
    return () => unsubscribe();
  }, [selectedGym]);

  const getCrowdColor = (level) => {
    if (level <= 2) return '#2ecc71';
    if (level <= 4) return '#f1c40f';
    return '#e74c3c';
  };

  const getCrowdLabel = (level) => {
    if (level <= 2) return 'Peu fréquenté';
    if (level <= 4) return 'Modéré';
    return 'Très fréquenté';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f6dd1e" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapContainer 
        center={LYON_CENTER} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapController onMapClick={() => setSelectedGym(null)} />
        {gyms.map((gym) => {
          const color = getCrowdColor(gym.crowdLevel);
          const customIcon = L.divIcon({
            className: 'custom-pin',
            html: `
              <div style="
                background-color: ${color};
                width: 32px;
                height: 32px;
                border-radius: 16px 16px 16px 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              ">
                <div style="transform: rotate(45deg); font-size: 16px;">🧗</div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          });

          return (
            <Marker 
              key={gym.id} 
              position={[parseFloat(gym.latitude), parseFloat(gym.longitude)]}
              icon={customIcon}
              eventHandlers={{
                click: () => setSelectedGym(gym),
              }}
            />
          );
        })}
      </MapContainer>

      {selectedGym && (
        <View style={styles.cardContainer}>
          <TouchableOpacity 
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => navigation.navigate('Salles', { 
              screen: 'GymDetail', 
              params: { gymId: selectedGym.id, gymName: selectedGym.name } 
            })}
          >
            <Image source={{ uri: selectedGym.image }} style={styles.cardImage} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{selectedGym.name}</Text>
                <TouchableOpacity onPress={() => setSelectedGym(null)} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.crowdBadge, { backgroundColor: getCrowdColor(selectedGym.crowdLevel) }]}>
                <Text style={styles.crowdBadgeText}>{getCrowdLabel(selectedGym.crowdLevel)}</Text>
              </View>
              
              <Text style={styles.cardAddress} numberOfLines={1}>📍 {selectedGym.address}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.cardLink}>Voir les détails →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
  },
  cardContainer: {
    position: 'absolute',
    bottom: 30,
    zIndex: 1000,
    ...Platform.select({
      web: {
        left: '50%',
        transform: [{ translateX: '-50%' }],
        width: '90%',
        maxWidth: 400,
      },
      default: {
        left: 20,
        right: 20,
      }
    })
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    height: 120,
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
  },
  cardImage: {
    width: 120,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 15,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#95a5a6',
    fontWeight: 'bold',
  },
  crowdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  crowdBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  cardAddress: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  cardLink: {
    fontSize: 13,
    color: '#f6dd1e',
    fontWeight: '900',
  },
});

export default MapScreen;
