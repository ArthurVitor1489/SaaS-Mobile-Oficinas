import './src/services/polyfills';

import React, { useState, useEffect } from 'react';
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

// Store & Services
import { useAppStore } from './src/store/useAppStore';
import { startSyncEngine, stopSyncEngine, processOfflineQueue } from './src/services/syncEngine';
import { theme } from './src/styles/theme';

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
  const settings = useAppStore((state) => state.settings);
  const online = useAppStore((state) => state.isOnline);
  const queueLength = useAppStore((state) => state.offlineQueue.length);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090b0f" />
      
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {settings.name ? settings.name.toUpperCase() : 'VOLTRUCK'}
          </Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerSubtitle}>PAINEL SAAS</Text>
            <View style={online ? styles.statusBadgeOnline : styles.statusBadgeOffline}>
              {online ? (
                <>
                  <Wifi size={10} color="#22c55e" />
                  <Text style={styles.badgeText}>Online</Text>
                </>
              ) : (
                <>
                  <WifiOff size={10} color="#ef4444" />
                  <Text style={styles.badgeText}>Offline ({queueLength})</Text>
                </>
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

// --- AUTH SCREEN ---

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');

  const store = useAppStore();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    if (isRegister) {
      if (!name || !workshopName) {
        Alert.alert('Erro', 'Preencha seu nome e o nome da oficina.');
        setLoading(false);
        return;
      }
      const success = await store.signup({
        name,
        email,
        password,
        workshopName,
        cnpj,
        phone,
      });
      if (success) {
        Alert.alert('Sucesso', 'Oficina cadastrada! Faça login para entrar.');
        setIsRegister(false);
      } else {
        Alert.alert('Erro', 'Erro no cadastro. Verifique as informações.');
      }
    } else {
      const success = await store.login({ email, password });
      if (success) {
        onLoginSuccess();
      } else {
        Alert.alert('Erro', 'E-mail ou senha incorretos.');
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.authContainer}
    >
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>VOLTRUCK</Text>
        <Text style={styles.authSubtitle}>
          {isRegister ? 'Crie sua conta SaaS' : 'Acesse seu painel SaaS'}
        </Text>

        {isRegister && (
          <>
            <Text style={styles.inputLabel}>Seu Nome</Text>
            <TextInput 
              style={styles.modalInput} 
              value={name} 
              onChangeText={setName} 
              placeholder="Digite seu nome"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Nome da Oficina</Text>
            <TextInput 
              style={styles.modalInput} 
              value={workshopName} 
              onChangeText={setWorkshopName} 
              placeholder="Nome da sua oficina"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>CNPJ (Opcional)</Text>
            <TextInput 
              style={styles.modalInput} 
              value={cnpj} 
              onChangeText={setCnpj} 
              placeholder="00.000.000/0001-00"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Telefone (Opcional)</Text>
            <TextInput 
              style={styles.modalInput} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="(11) 99999-9999"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
            />
          </>
        )}

        <Text style={styles.inputLabel}>E-mail</Text>
        <TextInput 
          style={styles.modalInput} 
          value={email} 
          onChangeText={setEmail} 
          placeholder="seuemail@exemplo.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Senha</Text>
        <TextInput 
          style={styles.modalInput} 
          value={password} 
          onChangeText={setPassword} 
          placeholder="••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isRegister ? 'CADASTRAR' : 'ENTRAR'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchAuthMode}
          onPress={() => setIsRegister(!isRegister)}
        >
          <Text style={styles.switchAuthText}>
            {isRegister ? 'Já tenho uma conta. Entrar' : 'Não tem conta? Cadastre-se'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  const user = useAppStore((state) => state.user);
  const accessToken = useAppStore((state) => state.accessToken);
  const loading = useAppStore((state) => state.loading);
  const pullAll = useAppStore((state) => state.pullAll);

  useEffect(() => {
    startSyncEngine();
    if (accessToken) {
      pullAll();
    }
    return () => {
      stopSyncEngine();
    };
  }, [accessToken]);

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
        {!accessToken || !user ? (
          <RootStack.Screen name="Auth" options={{ animationTypeForReplace: 'pop' }}>
            {(props) => <AuthScreen {...props} onLoginSuccess={() => pullAll()} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
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
    backgroundColor: '#1c2230',
    borderWidth: 1,
    borderColor: '#2e394e',
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 16,
    minHeight: 50,
  },
  submitButton: {
    backgroundColor: '#3b66ff',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
  headerLeft: {
    flex: 1,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
