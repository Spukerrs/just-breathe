import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SleepScreen } from '../screens/Sleep/SleepScreen';
import { SLEEP_THEME } from '../constants/sleepConstants';

const Tab = createBottomTabNavigator();

/**
 * Ejemplo de integración desacoplada en el Bottom Tab Navigator de "Just Breathe".
 */
export const SleepTabExample: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SLEEP_THEME.colors.surface,
          borderTopColor: SLEEP_THEME.colors.border,
          elevation: 0,
        },
        tabBarActiveTintColor: SLEEP_THEME.colors.accent,
        tabBarInactiveTintColor: SLEEP_THEME.colors.textMuted,
      }}
    >
      <Tab.Screen
        name="SleepTab"
        component={SleepScreen}
        options={{
          tabBarLabel: 'Sueño',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="moon-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
