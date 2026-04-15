import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import CrowdSelector from '../components/CrowdSelector';
import VisitSlotModal from '../components/VisitSlotModal';
import CrowdChart from '../components/CrowdChart';
import {
  getGym,
  subscribe,
  unsubscribe,
  getUserSubscriptions,
  updateCrowdLevel,
  getGymCrowdHistory,
  registerVisitSlot,
} from '../services/api';
import { subscribeToCrowdUpdates } from '../services/socketService';

const CROWD_LEVELS = [
  { level: 1, label: 'Très calme', color: '#27ae60', emoji: '🟢' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71', emoji: '🟢' },
  { level: 3, label: 'Modéré', color: '#f39c12', emoji: '🟡' },
  { level: 4, label: 'Fréquenté', color: '#e67e22', emoji: '🟠' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c', emoji: '🔴' },
];

// Convert a person count to a crowdLevel  (< 5 → 1, < 10 → 2, < 15 → 3, < 20 → 4, ≥ 20 → 5)
const personCountToCrowdLevel = (count) => {
  if (count < 5) return 1;
  if (count < 10) return 2;
  if (count < 15) return 3;
  if (count < 20) return 4;
  return 5;
};

// Calculate forecast crowdLevel based on number of planned visits overlapping with the window
const computeForecast = (plannedVisits, arrivalTime, duration) => {
  if (!plannedVisits || plannedVisits.length === 0) return 1; // Default to Très calme if empty

  // Parse arrival as minutes-since-midnight
  const [h, m] = arrivalTime.split(':').map(Number);
  const arrivalMins = h * 60 + m;
  const departureMins = arrivalMins + duration;

  // Count how many people are there during our stay
  // A person is "there" if their window [start2, end2] overlaps with ours [start, end]
  const overlapping = plannedVisits.filter((v) => {
    const [h2, m2] = v.arrivalTime.split(':').map(Number);
    const start2 = h2 * 60 + m2;
    const end2 = start2 + v.duration;

    // Overlap condition: start1 < end2 AND start2 < end1
    return arrivalMins < end2 && start2 < departureMins;
  });

  const count = overlapping.length;
  if (count < 5) return 1;
  if (count < 10) return 2;
  if (count < 15) return 3;
  if (count < 20) return 4;
  return 5;
};

const VISIT_SLOT_KEY_PREFIX = 'visitSlot_';

const GymDetailScreen = ({ route, navigation }) => {
  const { gymId } = route.params;
  const { user } = useAuth();

  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedCrowd, setSelectedCrowd] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Visit slot state
  const [visitSlot, setVisitSlot] = useState(null); // { arrivalTime, duration } | null
  const [slotModalVisible, setSlotModalVisible] = useState(false);
  const [plannedVisits, setPlannedVisits] = useState([]);
  const [forecastLevel, setForecastLevel] = useState(null);

  // ─── Load gym ────────────────────────────────────────────────────────────
  const loadGym = async () => {
    try {
      const data = await getGym(gymId, user?.id);
      setGym(data);
      setSelectedCrowd(data.userLastContribution);
    } catch (error) {
      console.error('Erreur chargement salle:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la salle');
    } finally {
      setLoading(false);
    }
  };

  // ─── Load crowd history & planned slots ──────────────────────────────────
  const loadHistoryAndSlots = async () => {
    try {
      const data = await getGymCrowdHistory(gymId);
      // data is now { updates, plannedVisits }
      setPlannedVisits(data.plannedVisits || []);
    } catch (err) {
      console.error('Erreur historique/créneaux:', err);
    }
  };

  // ─── Load persisted visit slot ────────────────────────────────────────────
  const loadVisitSlot = async () => {
    try {
      const raw = await AsyncStorage.getItem(`${VISIT_SLOT_KEY_PREFIX}${gymId}`);
      if (raw) {
        const saved = JSON.parse(raw);
        const savedDate = new Date(saved.savedAt).toDateString();
        const today = new Date().toDateString();
        if (savedDate === today) {
          setVisitSlot(saved.slot);
        } else {
          await AsyncStorage.removeItem(`${VISIT_SLOT_KEY_PREFIX}${gymId}`);
        }
      }
    } catch (err) {
      console.error('Erreur lecture créneau:', err);
    }
  };

  const saveVisitSlot = async (slot) => {
    try {
      await AsyncStorage.setItem(
        `${VISIT_SLOT_KEY_PREFIX}${gymId}`,
        JSON.stringify({ slot, savedAt: new Date().toISOString() })
      );

      // Also register on server if logged in
      if (user) {
        await registerVisitSlot(gymId, user.id, slot);
        // Refresh slots from server to update forecast count
        loadHistoryAndSlots();
      }
    } catch (err) {
      console.error('Erreur sauvegarde créneau:', err);
    }
  };

  // ─── Check subscription ───────────────────────────────────────────────────
  const checkSubscription = async () => {
    if (!user) return;
    try {
      const subscriptions = await getUserSubscriptions(user.id);
      setIsSubscribed(subscriptions.some(g => g.id === gymId));
    } catch (error) {
      console.error('Erreur vérification abonnement:', error);
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadGym();
    loadHistoryAndSlots();
    loadVisitSlot();
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      loadGym();
      checkSubscription();
    }, [user])
  );

  useEffect(() => {
    const unsubscribe = subscribeToCrowdUpdates((data) => {
      if (data.gymId === gymId) {
        setGym(prev => prev ? { ...prev, crowdLevel: data.crowdLevel } : null);
      }
    });
    return () => unsubscribe();
  }, [gymId]);

  // Recompute forecast when slot or plannedVisits changes
  useEffect(() => {
    if (visitSlot) {
      const level = computeForecast(plannedVisits, visitSlot.arrivalTime, visitSlot.duration);
      setForecastLevel(level);
    } else {
      setForecastLevel(null);
    }
  }, [visitSlot, plannedVisits]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSlotConfirm = async (slot) => {
    setVisitSlot(slot);
    await saveVisitSlot(slot);
    setSlotModalVisible(false);
  };

  const handleResetSlot = async () => {
    setVisitSlot(null);
    setForecastLevel(null);
    await AsyncStorage.removeItem(`${VISIT_SLOT_KEY_PREFIX}${gymId}`);
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous pour suivre cette salle.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    try {
      setUpdating(true);
      if (isSubscribed) {
        await unsubscribe(user.id, gymId);
        setIsSubscribed(false);
        Alert.alert('✓', 'Vous ne suivez plus cette salle');
      } else {
        await subscribe(user.id, gymId);
        setIsSubscribed(true);
        Alert.alert('✓', 'Vous suivez maintenant cette salle !');
      }
    } catch (error) {
      Alert.alert('Erreur', error.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setUpdating(false);
    }
  };

  const handleCrowdUpdate = async (level) => {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        "Connectez-vous pour mettre à jour l'affluence.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    const previousCrowd = selectedCrowd;
    setSelectedCrowd(level);
    try {
      setUpdating(true);
      const result = await updateCrowdLevel(gymId, user.id, level);
      setGym(prev => ({ ...prev, crowdLevel: result.gym.crowdLevel }));
    } catch (error) {
      setSelectedCrowd(previousCrowd);
      Alert.alert('Erreur', "Impossible de mettre à jour l'affluence");
    } finally {
      setUpdating(false);
    }
  };

  const openWebsite = () => { if (gym?.website) Linking.openURL(gym.website); };
  const openMaps = () => {
    if (gym?.address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(gym.address)}`);
    }
  };
  const callGym = () => { if (gym?.phone) Linking.openURL(`tel:${gym.phone}`); };

  // ─── Render helpers ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e74c3c" animating={true} />
      </View>
    );
  }

  if (!gym) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Salle non trouvée</Text>
      </View>
    );
  }

  const crowdInfo = CROWD_LEVELS.find(c => Number(c.level) === Number(gym.crowdLevel)) || CROWD_LEVELS[2];
  const forecastInfo = forecastLevel
    ? CROWD_LEVELS.find(c => c.level === forecastLevel) || CROWD_LEVELS[2]
    : null;

  const durationLabel = visitSlot
    ? [60, 90, 120, 150, 180]
      .map((v, i) => ({ v, l: ['1h', '1h30', '2h', '2h30', '3h+'][i] }))
      .find(x => x.v === visitSlot.duration)?.l || `${visitSlot.duration / 60}h`
    : '';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: gym.image }} style={styles.image} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.name}>{gym.name}</Text>
            <TouchableOpacity onPress={openMaps}>
              <Text style={styles.address}>📍 {gym.address}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.subscribeButton, isSubscribed && styles.subscribedButton]}
            onPress={handleSubscribe}
            disabled={Boolean(updating)}
          >
            <Text style={[styles.subscribeText, isSubscribed && styles.subscribedText]}>
              {isSubscribed ? '✓ Abonné' : '+ Suivre'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Affluence actuelle (conditionally blurred) ─────────────────── */}
        {visitSlot ? (
          // UNLOCKED — show real crowd level
          <View style={[styles.crowdBanner, { backgroundColor: crowdInfo.color + '15' }]}>
            <View style={styles.crowdBannerHeader}>
              <Text style={styles.crowdTitle}>Affluence actuelle</Text>
              <TouchableOpacity onPress={() => setSlotModalVisible(true)}>
                <Text style={styles.slotChip}>
                  🕐 {visitSlot.arrivalTime} · {durationLabel}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.crowdDisplay}>
              <Text style={styles.crowdEmoji}>{crowdInfo.emoji}</Text>
              <Text style={[styles.crowdLabel, { color: crowdInfo.color }]}>
                {crowdInfo.label}
              </Text>
            </View>

            {/* Forecast section */}
            <View style={styles.forecastDivider} />
            <Text style={styles.forecastTitle}>📊 Prévision pour votre créneau</Text>
            {forecastInfo ? (
              <View style={styles.forecastRow}>
                <Text style={styles.forecastEmoji}>{forecastInfo.emoji}</Text>
                <Text style={[styles.forecastLabel, { color: forecastInfo.color }]}>
                  {forecastInfo.label}
                </Text>
              </View>
            ) : (
              <Text style={styles.forecastNoData}>
                Pas assez de données pour ce créneau
              </Text>
            )}

            {/* Daily forecast chart */}
            <CrowdChart
              plannedVisits={plannedVisits}
              openingHours={gym?.openingHours}
            />

            {/* Reset */}
            <TouchableOpacity onPress={handleResetSlot} style={styles.resetButton}>
              <Text style={styles.resetText}>Réinitialiser le créneau</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // LOCKED — blurred overlay
          <View style={styles.lockedBanner}>
            {/* Blurred content behind overlay */}
            <View style={[styles.crowdBannerBlurred, { backgroundColor: '#f39c1215' }]}>
              <Text style={styles.crowdTitleBlurred}>Affluence actuelle</Text>
              <View style={styles.crowdDisplay}>
                <Text style={[styles.crowdEmojiBlurred]}>🟡</Text>
                <Text style={styles.crowdLabelBlurred}>••••••</Text>
              </View>
            </View>
            {/* Overlay */}
            <View style={styles.blurOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockTitle}>Renseignez votre créneau</Text>
              <Text style={styles.lockSubtitle}>
                Indiquez quand vous prévoyez de venir pour débloquer l'affluence et obtenir une prévision personnalisée
              </Text>
              <TouchableOpacity
                style={styles.unlockButton}
                onPress={() => setSlotModalVisible(true)}
              >
                <Text style={styles.unlockButtonText}>🗓️ Définir mon créneau</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Contribution section */}
        <View style={styles.contributionSection}>
          <Text style={styles.contributionTitle}>🤝 Contribuez</Text>

          <CrowdSelector
            selectedLevel={selectedCrowd}
            onSelect={handleCrowdUpdate}
            disabled={Boolean(!user || updating)}
          />

          {selectedCrowd && user && (() => {
            const myInfo = CROWD_LEVELS.find(c => Number(c.level) === Number(selectedCrowd));
            return myInfo ? (
              <Text style={styles.myContributionText}>
                {updating ? '⏳ Envoi...' : `✓ Votre contribution : ${myInfo.emoji} ${myInfo.label}`}
              </Text>
            ) : null;
          })()}

          {!user && (
            <Text style={styles.loginHint}>Connectez-vous pour contribuer</Text>
          )}
        </View>

        <Text style={styles.description}>{gym.description}</Text>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact</Text>
          <TouchableOpacity onPress={callGym}>
            <Text style={styles.link}>{gym.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openWebsite}>
            <Text style={styles.link}>🌐 Site web</Text>
          </TouchableOpacity>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Tarifs</Text>
          <View style={styles.pricingGrid}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Entrée unique</Text>
              <Text style={styles.priceValue}>{gym.pricing.singleEntry}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Carte 10 séances</Text>
              <Text style={styles.priceValue}>{gym.pricing.tenSessions}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Abonnement mensuel</Text>
              <Text style={styles.priceValue}>{gym.pricing.monthlyUnlimited}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Abonnement annuel</Text>
              <Text style={styles.priceValue}>{gym.pricing.yearlySubscription}</Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Location matériel</Text>
              <Text style={styles.priceValue}>{gym.pricing.equipmentRental}</Text>
            </View>
          </View>
        </View>

        {/* Opening hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 Horaires</Text>
          {Object.entries(gym.openingHours).map(([day, hours]) => (
            <View key={day} style={styles.scheduleRow}>
              <Text style={styles.dayText}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </Text>
              <Text style={styles.hoursText}>{hours}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Équipements</Text>
          <View style={styles.featuresContainer}>
            {gym.features.map((feature, index) => (
              <View key={index} style={styles.featureTag}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Visit slot modal */}
      <VisitSlotModal
        visible={slotModalVisible}
        openingHours={gym?.openingHours}
        onConfirm={handleSlotConfirm}
        onClose={() => setSlotModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: '#3498db',
  },
  subscribeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  subscribedButton: {
    backgroundColor: '#27ae60',
  },
  subscribeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  subscribedText: {
    color: '#fff',
  },
  // ── Contribution section ──────────────────────────────────────────────────
  contributionSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  contributionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  myContributionText: {
    textAlign: 'center',
    color: '#27ae60',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 10,
  },
  loginHint: {
    textAlign: 'center',
    color: '#95a5a6',
    marginTop: 12,
    fontSize: 13,
  },
  // ── Crowd banner (unlocked) ───────────────────────────────────────────────
  crowdBanner: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  crowdBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  crowdTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  slotChip: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
    backgroundColor: '#ebf5fb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  crowdDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  crowdEmoji: {
    fontSize: 22,
    marginRight: 8,
  },
  crowdLabel: {
    fontSize: 20,
    fontWeight: '800',
  },
  // ── Forecast ─────────────────────────────────────────────────────────────
  forecastDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 12,
  },
  forecastTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  forecastLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  forecastHint: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 4,
  },
  forecastNoData: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  resetButton: {
    marginTop: 14,
    alignSelf: 'flex-end',
  },
  resetText: {
    fontSize: 12,
    color: '#95a5a6',
    textDecorationLine: 'underline',
  },
  // ── Locked banner ─────────────────────────────────────────────────────────
  lockedBanner: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 280, // Augmenté pour s'assurer que tout le contenu (icône, texte, bouton) loge
    backgroundColor: '#f8f9fa',
  },
  crowdBannerBlurred: {
    padding: 16,
  },
  crowdTitleBlurred: {
    fontSize: 12,
    color: '#7f8c8d',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.5,
  },
  crowdEmojiBlurred: {
    fontSize: 22,
    marginRight: 8,
    opacity: 0.2,
  },
  crowdLabelBlurred: {
    fontSize: 20,
    fontWeight: '800',
    color: '#bdc3c7',
    letterSpacing: 6,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#dde1e7',
    borderStyle: 'dashed',
    zIndex: 10,
  },
  lockIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 6,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  unlockButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  unlockButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // ── Misc ──────────────────────────────────────────────────────────────────
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  link: {
    fontSize: 15,
    color: '#3498db',
    marginBottom: 8,
  },
  pricingGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  priceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e74c3c',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  dayText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  hoursText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
});

export default GymDetailScreen;
