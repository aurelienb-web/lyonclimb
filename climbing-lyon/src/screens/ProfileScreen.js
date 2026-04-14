import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e74c3c" />
        </View>
      </SafeAreaView>
    );
  }

  // Truncate device ID for display: show first 8 and last 4 chars
  const displayId = user?.id
    ? `${user.id.substring(0, 12)}…`
    : '—';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarIcon}>📱</Text>
          </View>
          <Text style={styles.userName}>Mon appareil</Text>
          <Text style={styles.deviceId}>ID : {displayId}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>📱 À propos de l'app</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🧗 Salles d'Escalade Lyon</Text>
            <Text style={styles.infoText}>
              Cette application vous permet de découvrir les salles d'escalade de Lyon et ses environs.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>⭐ Suivez vos salles</Text>
            <Text style={styles.infoText}>
              Abonnez-vous à vos salles préférées pour les retrouver facilement.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🤝 Contribuez</Text>
            <Text style={styles.infoText}>
              Partagez l'affluence en temps réel pour aider la communauté. Vos contributions sont liées à cet appareil automatiquement.
            </Text>
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fdecea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarIcon: {
    fontSize: 48,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 13,
    color: '#95a5a6',
    fontFamily: 'monospace',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  version: {
    textAlign: 'center',
    color: '#bdc3c7',
    fontSize: 12,
  },
});

export default ProfileScreen;
