import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CROWD_LEVELS = [
  { level: 1, label: 'Très calme', color: '#27ae60', emoji: '😌' },
  { level: 2, label: 'Peu fréquenté', color: '#2ecc71', emoji: '🙂' },
  { level: 3, label: 'Modéré', color: '#f39c12', emoji: '😐' },
  { level: 4, label: 'Fréquenté', color: '#e67e22', emoji: '😅' },
  { level: 5, label: 'Très fréquenté', color: '#e74c3c', emoji: '😰' },
];

const CrowdSelector = ({ selectedLevel, onSelect, disabled = false }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quelle est l'affluence actuelle ?</Text>
      <View style={styles.levelsContainer}>
        {CROWD_LEVELS.map((crowd) => (
          <TouchableOpacity
            key={crowd.level}
            style={[
              styles.levelButton,
              selectedLevel === crowd.level && { 
                backgroundColor: crowd.color,
                borderColor: crowd.color,
              },
              disabled && styles.disabled,
            ]}
            onPress={() => !disabled && onSelect(crowd.level)}
            activeOpacity={disabled ? 1 : 0.7}
          >
            <Text style={styles.emoji}>{crowd.emoji}</Text>
            <Text 
              style={[
                styles.levelText,
                selectedLevel === crowd.level && styles.selectedText,
              ]}
            >
              {crowd.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  levelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  levelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    backgroundColor: '#fff',
    width: '30%',
    minWidth: 100,
  },
  disabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CrowdSelector;
