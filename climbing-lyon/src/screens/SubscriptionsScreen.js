import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import GymCard from '../components/GymCard';
import { getUserSubscriptions } from '../services/api';

const SubscriptionsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubscriptions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await getUserSubscriptions(user.id);
      setSubscriptions(data);
    } catch (error) {
      console.error('Erreur chargement abonnements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSubscriptions();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSubscriptions();
  };

  const handleGymPress = (gym) => {
    navigation.navigate('Home', {
      screen: 'GymDetail',
      params: { gymId: gym.id, gymName: gym.name },
    });
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Connexion requise</Text>
          <Text style={styles.subtitle}>
            Connectez-vous pour voir vos salles suivies
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⭐ Mes salles</Text>
        <Text style={styles.headerSubtitle}>
          {subscriptions.length} salle{subscriptions.length !== 1 ? 's' : ''} suivie{subscriptions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🧗</Text>
          <Text style={styles.emptyTitle}>Aucune salle suivie</Text>
          <Text style={styles.emptyText}>
            Abonnez-vous à vos salles préférées pour recevoir les notifications de changements de secteur
          </Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GymCard gym={item} onPress={() => handleGymPress(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e74c3c']}
              tintColor="#e74c3c"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  icon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SubscriptionsScreen;
