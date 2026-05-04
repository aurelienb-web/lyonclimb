import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Keyboard,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Pressable,
  Dimensions,
} from 'react-native';
import { parseTime } from '../utils/timeUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const DURATIONS = [
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '2h30', value: 150 },
  { label: '3h+', value: 180 },
];

const VisitSlotModal = ({ visible, openingHours, onConfirm, onClose }) => {
  const now = new Date();
  const defaultHour = String(now.getHours()).padStart(2, '0');
  const defaultMin = String(now.getMinutes()).padStart(2, '0');

  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [time, setTime] = useState(`${defaultHour}:${defaultMin}`);
  const [timeError, setTimeError] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(90);

  // Animation
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Update default time to NOW when opening
      const nowOpen = new Date();
      const h = String(nowOpen.getHours()).padStart(2, '0');
      const m = String(nowOpen.getMinutes()).padStart(2, '0');
      const newTime = `${h}:${m}`;
      setTime(newTime);
      setPrevTime(newTime);
      setTimeError('');

      translateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // PanResponder — attached ONLY to the drag handle area
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          // Fade backdrop as user drags
          const opacity = Math.max(0, 1 - gestureState.dy / 400);
          backdropOpacity.setValue(opacity);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close if dragged enough or fast enough
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
          });
        } else {
          // Spring back
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

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
    Keyboard.dismiss();
    if (!validateTime(time)) {
      setTimeError('Format invalide (HH:MM)');
      return;
    }

    const startMins = parseTime(time);

    // Validation du créneau passé
    const nowLocal = new Date();
    const todayStrLocal = nowLocal.toISOString().split('T')[0];
    if (selectedDay === todayStrLocal) {
      const currentMins = nowLocal.getHours() * 60 + nowLocal.getMinutes();
      if (startMins < currentMins) {
        setTimeError("L'heure de début est déjà passée.");
        return;
      }
    }

    // Validation des horaires d'ouverture
    if (openingHours) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDate = new Date(selectedDay);
      const dayKey = days[targetDate.getDay()];
      const hoursString = openingHours[dayKey];
      const isTodaySelected = selectedDay === todayStr;

      // Use same robust parsing as getGymStatus
      if (!hoursString || hoursString.trim().toLowerCase() === 'fermé') {
        setTimeError(`La salle est fermée ${isTodaySelected ? "aujourd'hui" : "demain"}.`);
        return;
      }

      const parts = hoursString.split(/[-–—à]| au /i).map(s => s.trim());
      if (parts.length < 2) {
        setTimeError(`La salle est fermée ${isTodaySelected ? "aujourd'hui" : "demain"}.`);
        return;
      }

      const openMins = parseTime(parts[0]);
      const closeMins = parseTime(parts[1]);

      if (openMins === null || closeMins === null) {
        setTimeError(`La salle est fermée ${isTodaySelected ? "aujourd'hui" : "demain"}.`);
        return;
      }

      const endMins = startMins + selectedDuration;

      // Handle midnight wrap-around
      let effectiveCloseMins = closeMins;
      if (closeMins <= openMins) {
        effectiveCloseMins += 24 * 60;
      }

      if (startMins < openMins) {
        setTimeError(`La salle n'ouvre qu'à ${parts[0]}.`);
        return;
      }

      if (endMins > effectiveCloseMins) {
        setTimeError(`Le créneau dépasse la fermeture (${parts[1]}).`);
        return;
      }
    }

    onConfirm({ arrivalTime: time, duration: selectedDuration, date: selectedDay });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.overlay}>
        {/* Animated backdrop background */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,0,0,0.55)',
              opacity: backdropOpacity,
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end', width: '100%', pointerEvents: 'box-none' }}
        >
          {/* Pressable backdrop — ensures single tap works even with keyboard open */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={animateClose}
          />

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY }] },
            ]}
          >
            {/* ── Drag Handle Zone ── */}
            <View {...panResponder.panHandlers} style={styles.dragZone}>
              <View style={styles.handle} />
            </View>

            <Text style={styles.title}>🗓️ Planifiez votre visite</Text>
            <Text style={styles.subtitle}>
              Pour voir l'affluence et obtenir une prévision personnalisée
            </Text>

            {/* Day selection */}
            <Text style={styles.label}>📅 Quel jour ?</Text>
            <View style={styles.daySelector}>
              <TouchableOpacity
                style={[styles.dayButton, selectedDay === todayStr && styles.dayButtonActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedDay(todayStr);
                }}
              >
                <Text style={[styles.dayButtonText, selectedDay === todayStr && styles.dayButtonTextActive]}>
                  Aujourd'hui
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dayButton, selectedDay === tomorrowStr && styles.dayButtonActive]}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedDay(tomorrowStr);
                }}
              >
                <Text style={[styles.dayButtonText, selectedDay === tomorrowStr && styles.dayButtonTextActive]}>
                  Demain
                </Text>
              </TouchableOpacity>
            </View>

            {/* Arrival time */}
            <Text style={styles.label}>⏰ À quelle heure comptez-vous arriver ?</Text>
            <TextInput
              style={[styles.input, timeError ? styles.inputError : null]}
              value={time}
              onChangeText={handleTimeChange}
              placeholder="HH:MM"
              keyboardType="numeric"
              maxLength={5}
              placeholderTextColor="#b0bec5"
            />
            {timeError ? <Text style={styles.errorText}>{timeError}</Text> : null}

            {/* Duration */}
            <Text style={styles.label}>⏱️ Pour combien de temps ?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.durationRow}
              keyboardShouldPersistTaps="handled"
            >
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[
                    styles.durationChip,
                    selectedDuration === d.value && styles.durationChipActive,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setSelectedDuration(d.value);
                  }}
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

            <TouchableOpacity style={styles.cancelButton} onPress={animateClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  dragZone: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    // Larger hit area for easier grabbing
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#dde1e7',
    borderRadius: 2,
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
  daySelector: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#dde1e7',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  dayButtonActive: {
    backgroundColor: '#f6dd1e',
    borderColor: '#f6dd1e',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7f8c8d',
  },
  dayButtonTextActive: {
    color: '#2c3e50',
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
    backgroundColor: '#f6dd1e',
    borderColor: '#f6dd1e',
  },
  durationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  durationTextActive: {
    color: '#2c3e50',
  },
  confirmButton: {
    backgroundColor: '#f6dd1e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0 4 8 rgba(246, 221, 30, 0.3)',
    elevation: 4,
  },
  confirmText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '800',
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
