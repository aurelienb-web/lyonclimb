import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGyms } from '../services/api';
import { subscribeToCrowdUpdates } from '../services/socketService';

const { width, height } = Dimensions.get('window');

const FRANCE_REGION = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

const MapScreen = ({ navigation }) => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const mapRef = useRef(null);
  const cardAnim = useRef(new Animated.Value(200)).current;

  const loadGyms = async () => {
    try {
      const data = await getGyms();
      console.log('Données reçues (MapScreen):', data);
      const filtered = data.filter(g => g.latitude && g.longitude);
      console.log('Salles après filtrage:', filtered.length);
      setGyms(filtered);
    } catch (err) {
      console.error('Erreur chargement salles pour la carte:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGyms();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCrowdUpdates((data) => {
      setGyms((currentGyms) =>
        currentGyms.map(g => g.id === data.gymId ? { ...g, crowdLevel: data.crowdLevel } : g)
      );
      // Update selected gym if it's the one that got updated
      if (selectedGym && selectedGym.id === data.gymId) {
        setSelectedGym(prev => ({ ...prev, crowdLevel: data.crowdLevel }));
      }
    });
    return () => unsubscribe();
  }, [selectedGym]);

  const getCrowdColor = (level) => {
    if (level === 0) return '#6b7475';
    if (level === 1) return '#27ae60';
    if (level === 2) return '#2ecc71';
    if (level === 3) return '#f39c12';
    if (level === 4) return '#e67e22';
    return '#e74c3c';
  };

  const getCrowdLabel = (level) => {
    if (level <= 2) return 'Peu fréquenté';
    if (level <= 4) return 'Modéré';
    return 'Très fréquenté';
  };

  const handleMarkerPress = (gym) => {
    setSelectedGym(gym);
    // Animate card entry
    Animated.spring(cardAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();

    // Center map on gym
    mapRef.current?.animateToRegion({
      latitude: parseFloat(gym.latitude) - 0.01, // Offset slightly to show card
      longitude: parseFloat(gym.longitude),
      latitudeDelta: 0.04,
      longitudeDelta: 0.02,
    }, 500);
  };

  const closeCard = () => {
    Animated.timing(cardAnim, {
      toValue: 200,
      duration: 250,
      useNativeDriver: true
    }).start(() => setSelectedGym(null));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f6dd1e" />
        <Text style={styles.loadingText}>Initialisation de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={FRANCE_REGION}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={() => { if (selectedGym) closeCard(); }}
      >
        {gyms.map((gym) => (
          <Marker
            key={gym.id}
            coordinate={{
              latitude: parseFloat(gym.latitude),
              longitude: parseFloat(gym.longitude),
            }}
            onPress={() => handleMarkerPress(gym)}
            tracksViewChanges={true}
          >
            <View style={[styles.markerContainer, { backgroundColor: getCrowdColor(gym.crowdLevel) }]}>
              <View style={styles.markerDot} />
              <View style={[styles.markerArrow, { borderTopColor: getCrowdColor(gym.crowdLevel) }]} />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.overlayHeader} pointerEvents="none">
        <View style={styles.searchBarPlaceholder}>
          <Text style={styles.searchBarText}>Salles d'escalade à Lyon</Text>
        </View>
      </SafeAreaView>

      {selectedGym && (
        <Animated.View style={[styles.cardContainer, { transform: [{ translateY: cardAnim }] }]}>
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
                <TouchableOpacity onPress={closeCard} style={styles.closeButton}>
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
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  searchBarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  searchBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  markerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    bottom: -9,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    height: 120,
  },
  cardImage: {
    width: 100,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: 'bold',
  },
  crowdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
  },
  crowdBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  cardAddress: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  cardLink: {
    fontSize: 12,
    color: '#f6dd1e',
    fontWeight: '900',
  },
});

export default MapScreen;
