import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const CROWD_LEVELS = [
  { level: 1, label: 'Très calme', color: '#27ae60', emoji: '🟢' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71', emoji: '🟢' },
  { level: 3, label: 'Modéré', color: '#f39c12', emoji: '🟡' },
  { level: 4, label: 'Fréquenté', color: '#e67e22', emoji: '🟠' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c', emoji: '🔴' },
];

const GymCard = ({ gym, onPress }) => {
  const crowdInfo = CROWD_LEVELS.find(c => c.level === gym.crowdLevel) || CROWD_LEVELS[2];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image 
        source={{ uri: gym.image }} 
        style={styles.image}
        defaultSource={require('../../assets/placeholder.png')}
      />
      {gym.sectorChangedRecently && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>🆕 Nouveau secteur</Text>
        </View>
      )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#f0f0f0',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
