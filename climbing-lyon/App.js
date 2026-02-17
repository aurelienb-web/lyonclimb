import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import GymDetailScreen from './src/screens/GymDetailScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    'Salles': '🧗',
    'Mes salles': '⭐',
    'Notifications': '🔔',
    'Profil': '👤',
  };
  
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: focused ? 26 : 22 }}>{icons[name]}</Text>
    </View>
  );
};

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#fff' },
      headerTintColor: '#2c3e50',
      headerTitleStyle: { fontWeight: '700' },
    }}
  >
    <Stack.Screen 
      name="GymList" 
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="GymDetail" 
      component={GymDetailScreen}
      options={({ route }) => ({ 
        title: route.params?.gymName || 'Détails',
        headerBackTitle: 'Retour',
      })}
    />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarActiveTintColor: '#e74c3c',
      tabBarInactiveTintColor: '#95a5a6',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingTop: 8,
        paddingBottom: 8,
        height: 70,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Salles" component={HomeStack} />
    <Tab.Screen name="Mes salles" component={SubscriptionsScreen} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Profil" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <MainTabs />
      </NavigationContainer>
    </AuthProvider>
  );
}
