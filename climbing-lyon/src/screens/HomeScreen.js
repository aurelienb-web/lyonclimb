import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import GymCard from '../components/GymCard';
import { getGyms } from '../services/api';
import { subscribeToCrowdUpdates } from '../services/socketService';

const HomeScreen = ({ navigation }) => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sliderWidth, setSliderWidth] = useState(300);

  // Computed data for filters
  const cities = React.useMemo(() => {
    const allCities = gyms.map(g => {
      // Basic heuristic to extract city from address (usually at the end or before CP)
      const parts = g.address.split(',');
      const lastPart = parts[parts.length - 1].trim();
      // Regex to extract city name (e.g. "69007 Lyon" -> "Lyon")
      const match = lastPart.match(/(?:\d{5}\s+)?(.+)/);
      return match ? match[1] : lastPart;
    });
    return [...new Set(allCities)].sort();
  }, [gyms]);

  const allFeatures = React.useMemo(() => {
    const features = gyms.flatMap(g => g.features || []);
    return [...new Set(features)].sort();
  }, [gyms]);

  const filteredGyms = React.useMemo(() => {
    return gyms.filter(gym => {
      const matchesSearch = gym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          gym.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (gym.features && gym.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase())));
      
      const matchesCity = !selectedCity || gym.address.includes(selectedCity);
      
      const matchesFeatures = selectedFeatures.length === 0 || 
                            selectedFeatures.every(f => gym.features && gym.features.includes(f));
      
      const matchesPrice = !maxPrice || (gym.pricing && gym.pricing.single <= maxPrice);

      return matchesSearch && matchesCity && matchesFeatures && matchesPrice;
    });
  }, [gyms, searchQuery, selectedCity, selectedFeatures, maxPrice]);

  const toggleFeature = (feature) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  };

  const loadGyms = async () => {
    try {
      setError(null);
      const data = await getGyms();

      setGyms(data);
    } catch (err) {
      console.error('Erreur chargement salles:', err);
      setError('Impossible de charger les salles. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    });
    return () => unsubscribe();
  }, []);

  // Update status every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadGyms();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadGyms();
  };

  const handleGymPress = (gym) => {
    navigation.navigate('GymDetail', { gymId: gym.id, gymName: gym.name });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f6dd1e" animating={true} />
        <Text style={styles.loadingText}>Chargement des salles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={loadGyms}>Réessayer</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <Image 
              source={require('../../assets/lone_logo.png')} 
              style={styles.logo} 
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>LONE</Text>
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Chercher une salle, ville..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#95a5a6"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Ville:</Text>
                <TouchableOpacity 
                  style={[styles.chip, !selectedCity && styles.chipActive]} 
                  onPress={() => setSelectedCity(null)}
                >
                  <Text style={[styles.chipText, !selectedCity && styles.chipTextActive]}>Toutes</Text>
                </TouchableOpacity>
                {cities.map(city => (
                  <TouchableOpacity 
                    key={city} 
                    style={[styles.chip, selectedCity === city && styles.chipActive]} 
                    onPress={() => setSelectedCity(city)}
                  >
                    <Text style={[styles.chipText, selectedCity === city && styles.chipTextActive]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>Services:</Text>
                {allFeatures.map(feature => (
                  <TouchableOpacity 
                    key={feature} 
                    style={[styles.chip, selectedFeatures.includes(feature) && styles.chipActive]} 
                    onPress={() => toggleFeature(feature)}
                  >
                    <Text style={[styles.chipText, selectedFeatures.includes(feature) && styles.chipTextActive]}>{feature}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.priceFilterContainer}>
              <View style={styles.priceHeader}>
                <Text style={styles.filterGroupLabel}>Prix max:</Text>
                <Text style={styles.priceValueDisplay}>{maxPrice ? `${maxPrice}€` : 'Tous'}</Text>
              </View>
              
              {/* Custom Slider */}
              <View 
                style={styles.customSliderContainer}
                onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(evt) => {
                  const { locationX } = evt.nativeEvent;
                  const newValue = Math.round(5 + (locationX / sliderWidth) * 25);
                  const clamped = Math.max(5, Math.min(30, newValue));
                  setMaxPrice(clamped === 30 ? null : clamped);
                }}
                onResponderMove={(evt) => {
                  const { locationX } = evt.nativeEvent;
                  const newValue = Math.round(5 + (locationX / sliderWidth) * 25);
                  const clamped = Math.max(5, Math.min(30, newValue));
                  setMaxPrice(clamped === 30 ? null : clamped);
                }}
              >
                <View style={styles.customSliderTrack}>
                  <View 
                    style={[
                      styles.customSliderActiveTrack, 
                      { width: `${((maxPrice || 30) - 5) / 25 * 100}%` }
                    ]} 
                  />
                </View>
                <View 
                  style={[
                    styles.customSliderThumb,
                    { left: `${((maxPrice || 30) - 5) / 25 * 100}%` }
                  ]}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={filteredGyms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GymCard gym={item} onPress={() => handleGymPress(item)} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            colors={['#f6dd1e']}
            tintColor="#f6dd1e"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune salle trouvée</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2c3e50',
    letterSpacing: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    paddingVertical: 8,
  },
  clearIcon: {
    fontSize: 14,
    color: '#95a5a6',
    marginLeft: 8,
    padding: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#f1f3f4',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#f6dd1e25',
    borderWidth: 1.5,
    borderColor: '#f6dd1e',
  },
  filterIcon: {
    fontSize: 20,
  },
  filtersSection: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  filtersScroll: {
    marginBottom: 10,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f8c8d',
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  chipActive: {
    backgroundColor: '#f6dd1e',
    borderColor: '#f6dd1e',
  },
  chipText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  chipTextActive: {
    color: '#2c3e50',
    fontWeight: '700',
  },
  priceFilterContainer: {
    marginTop: 8,
    paddingBottom: 8,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceValueDisplay: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2c3e50',
    backgroundColor: '#f6dd1e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  customSliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  customSliderTrack: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  customSliderActiveTrack: {
    height: '100%',
    backgroundColor: '#f6dd1e',
  },
  customSliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f6dd1e',
    borderWidth: 3,
    borderColor: '#fff',
    top: 8,
    marginLeft: -12,
    boxShadow: '0 2 4 rgba(0,0,0,0.2)',
    elevation: 3,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginHorizontal: 40,
  },
  retryText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#95a5a6',
  },
});

export default HomeScreen;
