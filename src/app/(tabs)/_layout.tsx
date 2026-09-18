import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Settings, List, PieChart } from 'lucide-react-native';
import { BudgetProvider } from '../../hooks/useBudget';

export default function TabLayout() {
  return (
    <BudgetProvider>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#0ea5e9', // Tailwind sky-500
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <Home color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <List color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Analysis',
            tabBarIcon: ({ color }) => <PieChart color={color} size={24} />,
          }}
        />
      </Tabs>
    </BudgetProvider>
  );
}
