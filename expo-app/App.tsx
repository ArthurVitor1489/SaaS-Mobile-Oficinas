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

// --- AUTHENTICATION SCREEN ---

function AuthScreen() {
  const { signIn, signUp } = useDatabase();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);

  React.useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTime]);

  const handleSubmit = async () => {
    if (isLogin && lockoutTime > 0) {
      Alert.alert(
        'Bloqueio de Segurança',
        `Múltiplas tentativas de login incorretas. Aguarde ${lockoutTime} segundos.`
      );
      return;
    }

    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Erro', 'Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    if (isLogin) {
      const success = await signIn(email.trim(), password);
      setLoading(false);
      if (success) {
        setFailedAttempts(0);
        setLockoutTime(0);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        
        let cooldown = 0;
        if (nextAttempts === 2) {
          cooldown = 5; // 5s progressive delay
        } else if (nextAttempts === 3) {
          cooldown = 15; // 15s progressive delay
        } else if (nextAttempts === 4) {
          cooldown = 30; // 30s progressive delay
        } else if (nextAttempts >= 5) {
          cooldown = 300; // 5-minute temporary lockout
        }

        if (cooldown > 0) {
          setLockoutTime(cooldown);
          if (nextAttempts >= 5) {
            Alert.alert(
              'Bloqueio Temporário',
              'Limite de tentativas de login excedido. Acesso bloqueado por 5 minutos.'
            );
          } else {
            Alert.alert(
              'Suspensão Temporária',
              `Dados de login incorretos. Por favor, aguarde ${cooldown} segundos para tentar novamente.`
            );
          }
        } else {
          Alert.alert('Erro no Login', 'E-mail ou senha incorretos.');
        }
      }
    } else {
      if (!companyName) {
        Alert.alert('Erro', 'Por favor, informe o nome da oficina.');
        setLoading(false);
        return;
      }
      const success = await signUp(email.trim(), password, companyName, cnpj);
      setLoading(false);
      if (success) {
        setIsLogin(true);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.authContainer}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>OFICINAPRO</Text>
        <Text style={styles.authSubtitle}>
          {isLogin ? 'Faça login para gerenciar sua oficina' : 'Cadastre sua oficina e crie sua conta SaaS'}
        </Text>

        {!isLogin && (
          <>
            <Text style={styles.inputLabel}>Nome da Oficina / Razão Social *</Text>
            <TextInput 
              placeholder="Ex: AutoTech Mecânica Premium" 
              placeholderTextColor="#475569"
              value={companyName} 
              onChangeText={setCompanyName}
              style={styles.modalInput} 
            />

            <Text style={styles.inputLabel}>CNPJ (Opcional)</Text>
            <TextInput 
              placeholder="Ex: 00.000.000/0001-00" 
              placeholderTextColor="#475569"
              value={cnpj} 
              onChangeText={setCnpj}
              style={styles.modalInput} 
            />
          </>
        )}

        <Text style={styles.inputLabel}>E-mail de Acesso *</Text>
        <TextInput 
          placeholder="seuemail@oficina.com" 
          placeholderTextColor="#475569"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email} 
          onChangeText={setEmail}
          style={styles.modalInput} 
          editable={lockoutTime === 0}
        />

        <Text style={styles.inputLabel}>Senha *</Text>
        <TextInput 
          placeholder="••••••••" 
          placeholderTextColor="#475569"
          secureTextEntry
          autoCapitalize="none"
          value={password} 
          onChangeText={setPassword}
          style={styles.modalInput} 
          editable={lockoutTime === 0}
        />

        {isLogin && failedAttempts > 0 && (
          <Text style={styles.attemptsWarningText}>
            {failedAttempts === 1 ? '1 falha. Mais 4 falhas bloquearão a conta por 5 min.' :
             failedAttempts === 2 ? '2 falhas. Mais 3 falhas bloquearão a conta por 5 min.' :
             failedAttempts === 3 ? '3 falhas. Mais 2 falhas bloquearão a conta por 5 min.' :
             failedAttempts === 4 ? '4 falhas. Próxima falha bloqueará a conta por 5 min.' :
             'Acesso bloqueado por segurança.'}
          </Text>
        )}

        {loading ? (
          <ActivityIndicator color="#3b66ff" style={styles.loadingIndicator} />
        ) : (
          <TouchableOpacity 
            style={[styles.submitButton, lockoutTime > 0 ? { backgroundColor: theme.colors.border, opacity: 0.5 } : null]} 
            onPress={handleSubmit}
            disabled={lockoutTime > 0}
          >
            <Text style={styles.submitButtonText}>
              {lockoutTime > 0 ? `Bloqueado (${lockoutTime}s)` : (isLogin ? 'Entrar no Painel' : 'Cadastrar Oficina')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.switchAuthMode} 
          onPress={() => {
            setIsLogin(!isLogin);
            setFailedAttempts(0);
            setLockoutTime(0);
          }}
        >
          <Text style={styles.switchAuthText}>
            {isLogin ? 'Não tem conta? Cadastre sua oficina' : 'Já possui conta? Faça o Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  const { session, loading } = useDatabase();
  
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
        {session ? (
          <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
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
