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
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import CrowdSelector from '../components/CrowdSelector';
import {
  getGym,
  subscribe,
  unsubscribe,
  getUserSubscriptions,
  updateCrowdLevel,
  reportSectorChange,
} from '../services/api';

const CROWD_LEVELS = [
  { level: 1, label: 'Très calme', color: '#27ae60', emoji: '🟢' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71', emoji: '🟢' },
  { level: 3, label: 'Modéré', color: '#f39c12', emoji: '🟡' },
  { level: 4, label: 'Fréquenté', color: '#e67e22', emoji: '🟠' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c', emoji: '🔴' },
];

const GymDetailScreen = ({ route, navigation }) => {
  const { gymId } = route.params;
  const { user } = useAuth();

  const [gym, setGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedCrowd, setSelectedCrowd] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [sectorModalVisible, setSectorModalVisible] = useState(false);
  const [sectorName, setSectorName] = useState('');
  const [sectorDescription, setSectorDescription] = useState('');
  const [showSectorAlert, setShowSectorAlert] = useState(true);

  const loadGym = async () => {
    try {
      const data = await getGym(gymId);
      setGym(data);
      setSelectedCrowd(data.crowdLevel);

      // Vérifier si l'utilisateur a déjà masqué cette notification pour cette version
      if (data.sectorChangedRecently && data.lastSectorChange) {
        const dismissedTimestamp = await AsyncStorage.getItem(`dismissed_alert_${gymId}`);
        if (dismissedTimestamp === data.lastSectorChange.timestamp) {
          setShowSectorAlert(false);
        } else {
          setShowSectorAlert(true);
        }
      }
    } catch (error) {
      console.error('Erreur chargement salle:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la salle');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const subscriptions = await getUserSubscriptions(user.id);
      setIsSubscribed(subscriptions.some(g => g.id === gymId));
    } catch (error) {
      console.error('Erreur vérification abonnement:', error);
    }
  };

  useEffect(() => {
    loadGym();
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      loadGym();
      checkSubscription();
    }, [user])
  );

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous pour suivre cette salle et recevoir les notifications.',
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
        'Connectez-vous pour mettre à jour l\'affluence.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    setSelectedCrowd(level);
    try {
      setUpdating(true);
      const result = await updateCrowdLevel(gymId, user.id, level);
      setGym(result.gym);
      Alert.alert('✓', 'Merci pour votre contribution !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'affluence');
    } finally {
      setUpdating(false);
    }
  };

  const handleReportSectorChange = async () => {
    if (!user) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous pour signaler un changement.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    setSectorModalVisible(true);
  };

  const submitSectorChange = async () => {
    try {
      setUpdating(true);
      const result = await reportSectorChange(gymId, user.id, sectorName, sectorDescription);
      setSectorModalVisible(false);
      setSectorName('');
      setSectorDescription('');
      setGym(result.gym);
      Alert.alert(
        '✓ Merci !',
        `Changement signalé. ${result.notifiedUsers} abonné(s) notifié(s).`
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de signaler le changement');
    } finally {
      setUpdating(false);
    }
  };

  const openWebsite = () => {
    if (gym?.website) {
      Linking.openURL(gym.website);
    }
  };

  const openMaps = () => {
    if (gym?.address) {
      const url = `https://maps.google.com/?q=${encodeURIComponent(gym.address)}`;
      Linking.openURL(url);
    }
  };

  const callGym = () => {
    if (gym?.phone) {
      Linking.openURL(`tel:${gym.phone}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e74c3c" />
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

  const crowdInfo = CROWD_LEVELS.find(c => c.level === gym.crowdLevel) || CROWD_LEVELS[2];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Image source={{ uri: gym.image }} style={styles.image} />

      {gym.sectorChangedRecently && showSectorAlert && (
        <View style={styles.alertBanner}>
          <View style={styles.alertContent}>
            <Text style={styles.alertText}>🆕 Un secteur a été récemment modifié !</Text>
            {gym.lastSectorChange && (
              <Text style={styles.alertDetail}>
                {gym.lastSectorChange.sectorName}: {gym.lastSectorChange.description}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeAlertButton}
            onPress={async () => {
              setShowSectorAlert(false);
              if (gym?.lastSectorChange?.timestamp) {
                await AsyncStorage.setItem(`dismissed_alert_${gymId}`, gym.lastSectorChange.timestamp);
              }
            }}
          >
            <Text style={styles.closeAlertText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
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
            disabled={updating}
          >
            <Text style={[styles.subscribeText, isSubscribed && styles.subscribedText]}>
              {isSubscribed ? '✓ Abonné' : '+ Suivre'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contributionSection}>
          <Text style={styles.contributionTitle}>🤝 Contribuez</Text>

          <CrowdSelector
            selectedLevel={selectedCrowd}
            onSelect={handleCrowdUpdate}
            disabled={!user || updating}
          />

          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportSectorChange}
            disabled={updating}
          >
            <Text style={styles.reportButtonText}>
              🔄 Signaler un changement de secteur
            </Text>
          </TouchableOpacity>

          {!user && (
            <Text style={styles.loginHint}>
              Connectez-vous pour contribuer
            </Text>
          )}
        </View>

        <View style={[styles.crowdBanner, { backgroundColor: crowdInfo.color + '15' }]}>
          <Text style={styles.crowdTitle}>Affluence actuelle</Text>
          <View style={styles.crowdDisplay}>
            <Text style={styles.crowdEmoji}>{crowdInfo.emoji}</Text>
            <Text style={[styles.crowdLabel, { color: crowdInfo.color }]}>
              {crowdInfo.label}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{gym.description}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact</Text>
          <TouchableOpacity onPress={callGym}>
            <Text style={styles.link}>{gym.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openWebsite}>
            <Text style={styles.link}>🌐 Site web</Text>
          </TouchableOpacity>
        </View>

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

      <Modal
        visible={sectorModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSectorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Signaler un changement</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom du secteur (optionnel)"
              value={sectorName}
              onChangeText={setSectorName}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description du changement"
              value={sectorDescription}
              onChangeText={setSectorDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSectorModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={submitSectorChange}
                disabled={updating}
              >
                <Text style={styles.modalSubmitText}>
                  {updating ? 'Envoi...' : 'Envoyer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  alertBanner: {
    backgroundColor: '#e74c3c',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  alertDetail: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  closeAlertButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeAlertText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
  crowdBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  crowdTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  crowdDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crowdEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  crowdLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
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
  contributionSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 40,
  },
  contributionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginHint: {
    textAlign: 'center',
    color: '#95a5a6',
    marginTop: 12,
    fontSize: 13,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ecf0f1',
    marginRight: 8,
  },
  modalCancelText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#3498db',
    marginLeft: 8,
  },
  modalSubmitText: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: '600',
  },
});

export default GymDetailScreen;
