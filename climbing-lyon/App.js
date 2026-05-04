import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';


import { AuthProvider } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import GymDetailScreen from './src/screens/GymDetailScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    'Salles': '🧗',
    'Carte': '📍',
    'Mes salles': '⭐',
    'A propos de LONE': '👤',
  };
  
  if (name === 'A propos de LONE') {
    return (
      <View style={{ alignItems: 'center' }}>
        <Image 
          source={require('./assets/lone_logo.png')} 
          style={{ 
            width: focused ? 28 : 24, 
            height: focused ? 28 : 24,
            opacity: focused ? 1 : 0.7,
            borderRadius: 4
          }} 
          resizeMode="contain"
        />
      </View>
    );
  }

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
      tabBarActiveTintColor: '#f6dd1e',
      tabBarInactiveTintColor: '#95a5a6',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ecf0f1',
        paddingTop: 8,
        paddingBottom: 24,
        height: 85,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 0,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Salles" component={HomeStack} />
    <Tab.Screen name="Carte" component={MapScreen} />
    <Tab.Screen name="Mes salles" component={SubscriptionsScreen} />
    <Tab.Screen 
      name="A propos de LONE" 
      component={ProfileScreen} 
      options={{ tabBarLabel: "L'app" }}
    />
  </Tab.Navigator>
);

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Basic app initialization can go here
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" animated={true} />
          <MainTabs />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>

  );
}

