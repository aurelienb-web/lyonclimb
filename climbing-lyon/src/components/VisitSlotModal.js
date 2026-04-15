import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';

const DURATIONS = [
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '2h30', value: 150 },
  { label: '3h+', value: 180 },
];

const VisitSlotModal = ({ visible, onConfirm, onClose }) => {
  const now = new Date();
  const defaultHour = String(now.getHours()).padStart(2, '0');
  const defaultMin = String(now.getMinutes()).padStart(2, '0');

  const [time, setTime] = useState(`${defaultHour}:${defaultMin}`);
  const [timeError, setTimeError] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(90);

  const validateTime = (val) => {
    const regex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    return regex.test(val);
  };

  const [prevTime, setPrevTime] = useState(`${defaultHour}:${defaultMin}`);

  const handleTimeChange = (val) => {
    // Si on efface et qu'on vient de supprimer le ":" (on passe de length 3 à 2 dans cleaned)
    // ou si on est à length 3 avec le ":" à la fin
    let cleaned = val.replace(/\D/g, '');
    
    // Si l'utilisateur a supprimé le ":" manuellement (val.length < prevTime.length)
    // et que le curseur était juste après le ":"
    if (val.length < prevTime.length && prevTime.includes(':') && !val.includes(':')) {
       // On supprime un chiffre de plus pour "dépasser" le blocage du formatage auto
       cleaned = cleaned.slice(0, -1);
    }

    let formatted = cleaned;
    if (cleaned.length >= 3) {
      formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }
    
    setTime(formatted);
    setPrevTime(formatted);
    if (timeError) setTimeError('');
  };

  const handleConfirm = () => {
    if (!validateTime(time)) {
      setTimeError('Format invalide (HH:MM)');
      return;
    }
    onConfirm({ arrivalTime: time, duration: selectedDuration });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          <Text style={styles.title}>🗓️ Planifiez votre visite</Text>
          <Text style={styles.subtitle}>
            Pour voir l'affluence et obtenir une prévision personnalisée
          </Text>

          {/* Arrival time */}
          <Text style={styles.label}>⏰ À quelle heure comptez-vous arriver ?</Text>
          <TextInput
            style={[styles.input, timeError ? styles.inputError : null]}
            value={time}
            onChangeText={handleTimeChange}
            placeholder="HH:MM"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            placeholderTextColor="#b0bec5"
          />
          {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}

          {/* Duration */}
          <Text style={styles.label}>⏱️ Pour combien de temps ?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[
                  styles.durationChip,
                  selectedDuration === d.value && styles.durationChipActive,
                ]}
                onPress={() => setSelectedDuration(d.value)}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === d.value && styles.durationTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>🔓 Voir l'affluence</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#dde1e7',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a2332',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dde1e7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: '700',
    color: '#1a2332',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 4,
    backgroundColor: '#f8f9fa',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 4,
  },
  durationChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#dde1e7',
    marginRight: 10,
    backgroundColor: '#f8f9fa',
  },
  durationChipActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  durationTextActive: {
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelText: {
    color: '#95a5a6',
    fontSize: 15,
  },
});

export default VisitSlotModal;
