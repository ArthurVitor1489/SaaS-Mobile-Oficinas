import './src/services/polyfills';

import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, StatusBar, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator, TextInput, TouchableOpacity
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { 
  Menu, Users, ClipboardList, Wallet, MoreHorizontal, Wifi, WifiOff 
} from 'lucide-react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Context & Types
import { DatabaseProvider, useDatabase } from './src/context/DatabaseContext';
import { theme } from './src/styles/theme';
import { validateEmail } from './src/utils/formatters';

// Screen Stacks
import DashboardScreen from './src/screens/DashboardScreen';
import ClientsListScreen from './src/screens/ClientsListScreen';
import ClientDetailScreen from './src/screens/ClientDetailScreen';
import OSListScreen from './src/screens/OSListScreen';
import OSDetailScreen from './src/screens/OSDetailScreen';
import FinanceFlowScreen from './src/screens/FinanceFlowScreen';
import BillingDetailScreen from './src/screens/BillingDetailScreen';
import MoreMenuScreen from './src/screens/MoreMenuScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { 
  RootStackParamList, MainTabParamList, DashboardStackParamList, 
  ClientsStackParamList, OSStackParamList, FinanceStackParamList, MoreStackParamList 
} from './src/types/navigation';

// --- SUB-STACK NAVIGATORS ---

const DashboardStack = createStackNavigator<DashboardStackParamList>();
function DashboardStackNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="Dashboard" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

const ClientsStack = createStackNavigator<ClientsStackParamList>();
function ClientsStackNavigator() {
  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientsStack.Screen name="ClientsList" component={ClientsListScreen} />
      <ClientsStack.Screen name="ClientDetail" component={ClientDetailScreen} />
    </ClientsStack.Navigator>
  );
}

const OSStack = createStackNavigator<OSStackParamList>();
function OSStackNavigator() {
  return (
    <OSStack.Navigator screenOptions={{ headerShown: false }}>
      <OSStack.Screen name="OSList" component={OSListScreen} />
      <OSStack.Screen name="OSDetail" component={OSDetailScreen} />
    </OSStack.Navigator>
  );
}

const FinanceStack = createStackNavigator<FinanceStackParamList>();
function FinanceStackNavigator() {
  return (
    <FinanceStack.Navigator screenOptions={{ headerShown: false }}>
      <FinanceStack.Screen name="FinanceFlow" component={FinanceFlowScreen} />
      <FinanceStack.Screen name="BillingDetail" component={BillingDetailScreen} />
    </FinanceStack.Navigator>
  );
}

const MoreStack = createStackNavigator<MoreStackParamList>();
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} />
      <MoreStack.Screen name="Catalog" component={CatalogScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

// --- TAB NAVIGATOR AND HEADER ---

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const { settings, online } = useDatabase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090b0f" />
      
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {settings.name ? settings.name.toUpperCase() : 'OFICINAPRO'}
          </Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>PAINEL SAAS</Text>
            <View style={online ? styles.statusBadgeOnline : styles.statusBadgeOffline}>
              {online ? (
                <Wifi size={10} color="#22c55e" />
              ) : (
                <WifiOff size={10} color="#ef4444" />
              )}
            </View>
          </View>
        </View>
      </View>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#3b66ff',
          tabBarInactiveTintColor: '#64748b',
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color }) => {
            const iconSize = 20;
            if (route.name === 'DashboardTab') {
              return <Menu size={iconSize} color={color} />;
            } else if (route.name === 'ClientsTab') {
              return <Users size={iconSize} color={color} />;
            } else if (route.name === 'OSTab') {
              return <ClipboardList size={iconSize} color={color} />;
            } else if (route.name === 'FinanceTab') {
              return <Wallet size={iconSize} color={color} />;
            } else {
              return <MoreHorizontal size={iconSize} color={color} />;
            }
          }
        })}
      >
        <Tab.Screen
          name="DashboardTab"
          component={DashboardStackNavigator}
          options={{ tabBarLabel: 'Painel' }}
        />
        <Tab.Screen
          name="ClientsTab"
          component={ClientsStackNavigator}
          options={{ tabBarLabel: 'Clientes' }}
        />
        <Tab.Screen
          name="OSTab"
          component={OSStackNavigator}
          options={{ tabBarLabel: 'Serviços' }}
        />
        <Tab.Screen
          name="FinanceTab"
          component={FinanceStackNavigator}
          options={{ tabBarLabel: 'Financeiro' }}
        />
        <Tab.Screen
          name="MoreTab"
          component={MoreStackNavigator}
          options={{ tabBarLabel: 'Mais' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// --- MAIN NAVIGATOR ENTRYPOINT ---

const RootStack = createStackNavigator<RootStackParamList>();

const MyDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3b66ff',
    background: '#090b0f',
    card: '#0f1115',
    text: '#ffffff',
    border: '#1e293b',
    notification: '#ff3b30',
  },
};

function AppContent() {
  const { loading } = useDatabase();
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b66ff" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyDarkTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b0f',
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: '#090b0f',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },

  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#0f1115',
    borderTopWidth: 1.5,
    borderTopColor: '#1e293b',
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    marginTop: 3,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  authCard: {
    backgroundColor: '#181c24',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  authSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    minHeight: 56,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  switchAuthMode: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchAuthText: {
    fontSize: 13,
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  attemptsWarningText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  headerLeft: {
    flex: 1,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusBadgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
