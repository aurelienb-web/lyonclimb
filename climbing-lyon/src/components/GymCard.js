import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { getGymStatus } from '../utils/timeUtils';

const CROWD_LEVELS = [
  { level: 0, label: 'Aucune donnée pour le moment', color: '#bdc3c7', emoji: '⚪' },
  { level: 1, label: 'Très calme', color: '#27ae60', emoji: '🟢' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71', emoji: '🟢' },
  { level: 3, label: 'Modéré', color: '#f39c12', emoji: '🟡' },
  { level: 4, label: 'Fréquenté', color: '#e67e22', emoji: '🟠' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c', emoji: '🔴' },
];

const GymCard = ({ gym, onPress }) => {
  const crowdInfo = CROWD_LEVELS.find(c => c.level === gym.crowdLevel) || CROWD_LEVELS[0];
  const status = getGymStatus(gym.openingHours);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: gym.image }} 
          style={styles.image}
          defaultSource={require('../../assets/placeholder.png')}
        />
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{gym.name}</Text>
        <Text style={styles.address} numberOfLines={1}>{gym.address}</Text>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Entrée</Text>
            <Text style={styles.price}>{gym.pricing.singleEntry}</Text>
          </View>
          
          <View style={[styles.crowdContainer, { backgroundColor: crowdInfo.color + '20' }]}>
            <Text style={styles.crowdEmoji}>{crowdInfo.emoji}</Text>
            <Text style={[styles.crowdText, { color: crowdInfo.color }]}>
              {crowdInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.features}>
          {gym.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    boxShadow: '0 2 8 rgba(0, 0, 0, 0.1)',
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    boxShadow: '0 2 4 rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  priceLabel: {
    fontSize: 11,
    color: '#95a5a6',
    textTransform: 'uppercase',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e74c3c',
  },
  crowdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  crowdEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  crowdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});

export default GymCard;
