import './src/services/polyfills';

import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, 
  StatusBar, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Clipboard
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { 
  Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, Calendar, 
  Wallet, DollarSign, PiggyBank, Users, ClipboardList, Settings, Menu,
  CheckCircle, Clock, Play, ChevronRight, UserPlus, Car, Check, X,
  Tag, Package, Edit2, AlertTriangle, ArrowLeft, MoreHorizontal,
  Share2, LogOut, FileText, Wifi, WifiOff, PenTool
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import Svg, { Rect, Line, G, SvgXml } from 'react-native-svg';
// Context & Types
import { DatabaseProvider, useDatabase } from './src/context/DatabaseContext';
import { 
  Client, Vehicle, ServiceItem, PartItem, 
  WorkOrder, Billing, FinancialTransaction, OSItemService, OSItemPart, 
  OSStatus, PaymentMethod, BillingStatus 
} from './src/types';

// Components & Modals
import SignaturePad from './src/components/SignaturePad';
import ClientModal from './src/components/ClientModal';
import VehicleModal from './src/components/VehicleModal';
import ExpenseModal from './src/components/ExpenseModal';
import CatalogServiceModal from './src/components/CatalogServiceModal';
import CatalogPartModal from './src/components/CatalogPartModal';
import OSWizardModal from './src/components/OSWizardModal';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import OSScreen from './src/screens/OSScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import MoreScreen from './src/screens/MoreScreen';

import { theme } from './src/styles/theme';
import { formatCurrency, formatDate, validateEmail } from './src/utils/formatters';

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
        if (nextAttempts >= 3) {
          const cooldown = 30 * (nextAttempts - 2);
          setLockoutTime(cooldown);
          Alert.alert(
            'Múltiplas Tentativas',
            `Múltiplas tentativas de login incorretas detectadas. Botão de login bloqueado por ${cooldown} segundos.`
          );
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
        setIsLogin(true); // Toggle to login after registering workshop
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
        />

        {loading ? (
          <ActivityIndicator color="#3b66ff" style={{ marginVertical: 20 }} />
        ) : (
          <TouchableOpacity 
            style={[styles.submitButton, lockoutTime > 0 ? { backgroundColor: theme.colors.border, opacity: 0.5 } : null]} 
            onPress={handleSubmit}
            disabled={lockoutTime > 0}
          >
            <Text style={styles.submitButtonText}>
              {lockoutTime > 0 ? `Aguarde ${lockoutTime}s` : (isLogin ? 'Entrar no Painel' : 'Cadastrar Oficina')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.switchAuthMode} 
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchAuthText}>
            {isLogin ? 'Não tem conta? Cadastre sua oficina' : 'Já possui conta? Faça o Login'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- MAIN PORTAL APPLICATION ---

function MainWorkshopApp() {
  const { 
    clients, vehicles, services, parts, workOrders, billings, transactions, settings, online, signOut,
    addClient, addVehicle, addService, addPart, addWorkOrder, updateWorkOrderStatus, saveWorkOrderSignature,
    addTransaction, updateSettings, payInstallment, exportDatabaseJson, syncWithSupabase, resetDatabase, restoreBackup,
    addBilling, updateWorkOrder,
    updateClient, deleteClient, updateVehicle, deleteVehicle, updateService, deleteService, updatePart, deletePart, deleteTransaction
  } = useDatabase();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'os' | 'finance' | 'more'>('dashboard');
  const [moreSubScreen, setMoreSubScreen] = useState<'menu' | 'catalog' | 'settings'>('menu');
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // Search Filter state
  const [catalogSegment, setCatalogSegment] = useState<'services' | 'parts'>('services');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Clients view helper
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<'vehicles' | 'history'>('vehicles');
  const [clientTabSearch, setClientTabSearch] = useState('');

  // OS signature overlay
  const [signingOSId, setSigningOSId] = useState<string | null>(null);

  // Finance and Billing state trackers
  const [activeFinanceFilter, setActiveFinanceFilter] = useState<'Todos' | 'Entradas' | 'Saídas'>('Todos');
  const [billingSearch, setBillingSearch] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState<BillingStatus | 'Todos'>('Todos');
  const [selectedBillingDetail, setSelectedBillingDetail] = useState<Billing | null>(null);

  // Wizard OS step and list filters
  const [osSearch, setOsSearch] = useState('');
  const [osStatusFilter, setOsStatusFilter] = useState<OSStatus | 'Todos'>('Todos');
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [billingForm, setBillingForm] = useState<{ paymentMethod: PaymentMethod; installmentsCount: string }>({
    paymentMethod: 'PIX',
    installmentsCount: '1',
  });
  const [selectedOS, setSelectedOS] = useState<WorkOrder | null>(null);

  // Modals Visibility and Forms Trackers
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientInitialForm, setClientInitialForm] = useState<any>(null);

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleInitialForm, setVehicleInitialForm] = useState<any>(null);

  const [expenseModalVisible, setExpenseModalVisible] = useState(false);

  const [catalogServiceModalVisible, setCatalogServiceModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceInitialForm, setServiceInitialForm] = useState<any>(null);

  const [catalogPartModalVisible, setCatalogPartModalVisible] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partInitialForm, setPartInitialForm] = useState<any>(null);

  const [osWizardModalVisible, setOsWizardModalVisible] = useState(false);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [osInitialForm, setOsInitialForm] = useState<any>(null);

  // --- HANDLERS CONTROLANDO OS MODAIS ---

  const handleOpenClientModalForCreate = () => {
    setEditingClientId(null);
    setClientInitialForm(null);
    setClientModalVisible(true);
  };

  const handleOpenClientModalForEdit = (client: Client) => {
    setEditingClientId(client.id);
    setClientInitialForm({
      name: client.name,
      cpfCnpj: client.cpfCnpj || '',
      phone: client.phone,
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setClientModalVisible(true);
  };

  const handleClientSubmit = async (form: any) => {
    let success = false;
    if (editingClientId) {
      success = await updateClient(editingClientId, form);
      if (success) {
        setSelectedClient((prev: Client | null) => prev ? { ...prev, ...form } : null);
        Alert.alert('Sucesso', 'Cliente atualizado com sucesso!');
      }
    } else {
      const client = await addClient(form);
      success = !!client;
      if (success) {
        Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
      }
    }
    return success;
  };

  const handleOpenVehicleModalForCreate = () => {
    setEditingVehicleId(null);
    setVehicleInitialForm(null);
    setVehicleModalVisible(true);
  };

  const handleOpenVehicleModalForEdit = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setVehicleInitialForm({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      chassis: vehicle.chassis || '',
      odometer: vehicle.odometer
    });
    setVehicleModalVisible(true);
  };

  const handleVehicleSubmit = async (form: any) => {
    if (!selectedClient) return false;
    let success = false;
    if (editingVehicleId) {
      success = await updateVehicle(editingVehicleId, {
        ...form,
        clientId: selectedClient.id
      });
      if (success) {
        Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
      }
    } else {
      const v = await addVehicle({
        ...form,
        clientId: selectedClient.id
      });
      success = !!v;
      if (success) {
        Alert.alert('Sucesso', 'Veículo cadastrado!');
      }
    }
    return success;
  };

  const handleExpenseSubmit = async (form: any) => {
    const res = await addTransaction({
      type: 'Saída',
      category: form.category,
      amount: parseFloat(form.amount) || 0,
      date: form.date,
      description: form.description
    });
    if (res) {
      Alert.alert('Sucesso', 'Despesa lançada com sucesso.');
    }
    return !!res;
  };

  const handleOpenCatalogServiceForCreate = () => {
    setEditingServiceId(null);
    setServiceInitialForm(null);
    setCatalogServiceModalVisible(true);
  };

  const handleOpenCatalogServiceForEdit = (item: ServiceItem) => {
    setEditingServiceId(item.id);
    setServiceInitialForm({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      price: item.price.toString()
    });
    setCatalogServiceModalVisible(true);
  };

  const handleCatalogServiceSubmit = async (form: any) => {
    let success = false;
    if (editingServiceId) {
      success = await updateService(editingServiceId, {
        name: form.name,
        code: form.code,
        description: form.description,
        price: parseFloat(form.price) || 0
      });
      if (success) {
        Alert.alert('Sucesso', 'Serviço atualizado!');
      }
    } else {
      const res = await addService({
        name: form.name,
        code: form.code,
        description: form.description,
        price: parseFloat(form.price) || 0
      });
      success = !!res;
      if (success) {
        Alert.alert('Sucesso', 'Serviço catalogado!');
      }
    }
    return success;
  };

  const handleOpenCatalogPartForCreate = () => {
    setEditingPartId(null);
    setPartInitialForm(null);
    setCatalogPartModalVisible(true);
  };

  const handleOpenCatalogPartForEdit = (item: PartItem) => {
    setEditingPartId(item.id);
    setPartInitialForm({
      name: item.name,
      code: item.code,
      supplier: item.supplier || '',
      purchasePrice: item.purchasePrice.toString(),
      salePrice: item.salePrice.toString(),
      stock: item.stock.toString()
    });
    setCatalogPartModalVisible(true);
  };

  const handleCatalogPartSubmit = async (form: any) => {
    let success = false;
    if (editingPartId) {
      success = await updatePart(editingPartId, {
        name: form.name,
        code: form.code,
        supplier: form.supplier,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        stock: parseInt(form.stock) || 0
      });
      if (success) {
        Alert.alert('Sucesso', 'Peça atualizada no catálogo!');
      }
    } else {
      const res = await addPart({
        name: form.name,
        code: form.code,
        supplier: form.supplier,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        stock: parseInt(form.stock) || 0
      });
      success = !!res;
      if (success) {
        Alert.alert('Sucesso', 'Peça adicionada ao catálogo!');
      }
    }
    return success;
  };

  const handleOpenOSWizardForCreate = () => {
    setEditingOSId(null);
    setOsInitialForm(null);
    setOsWizardModalVisible(true);
  };

  const handleOpenOSWizardForEdit = (os: WorkOrder) => {
    setEditingOSId(os.id);
    setOsInitialForm({
      clientId: os.clientId,
      vehicleId: os.vehicleId,
      notes: os.notes || '',
      status: os.status,
      selectedServices: os.services,
      selectedParts: os.parts,
    });
    setOsWizardModalVisible(true);
  };

  const handleOSWizardSubmit = async (form: any) => {
    let success = false;
    
    const servicesTotal = form.selectedServices.reduce((acc: number, s: any) => acc + (s.price * s.quantity), 0);
    const partsTotal = form.selectedParts.reduce((acc: number, p: any) => acc + (p.salePrice * p.quantity), 0);
    const grandTotal = servicesTotal + partsTotal;

    const dataToSave = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      notes: form.notes,
      status: form.status,
      services: form.selectedServices,
      parts: form.selectedParts,
      servicesTotal,
      partsTotal,
      grandTotal,
    };

    if (editingOSId) {
      success = await updateWorkOrder(editingOSId, dataToSave);
      if (success) {
        setSelectedOS((prev: WorkOrder | null) => prev ? { ...prev, ...dataToSave } : null);
        Alert.alert('Sucesso', 'Ordem de serviço atualizada com sucesso!');
      }
    } else {
      const res = await addWorkOrder({
        ...dataToSave,
        date: new Date().toISOString().split('T')[0],
      });
      success = !!res;
      if (success) {
        Alert.alert('Sucesso', 'Ordem de serviço gerada com sucesso!');
      }
    }
    return success;
  };

  // --- PDF & BACKUPS UTILS REDIRECTED ---

  const handleShareOS = async (os: WorkOrder) => {
    const client = clients.find(c => c.id === os.clientId);
    const vehicle = vehicles.find(v => v.id === os.vehicleId);

    const servicesListHTML = os.services
      .map((s: OSItemService) => `<tr>
        <td>${s.name} ${s.code ? `(${s.code})` : ''}</td>
        <td>${s.quantity || 1}</td>
        <td>${formatCurrency(s.price)}</td>
        <td>${formatCurrency(s.price * (s.quantity || 1))}</td>
      </tr>`)
      .join('');

    const partsListHTML = os.parts
      .map((p: OSItemPart) => `<tr>
        <td>${p.name} ${p.code ? `(${p.code})` : ''}</td>
        <td>${p.quantity}</td>
        <td>${formatCurrency(p.salePrice)}</td>
        <td>${formatCurrency(p.salePrice * p.quantity)}</td>
      </tr>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ordem de Serviço ${os.osNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.4;
            padding: 0;
            width: calc(100% - 8px);
            margin: 0 auto;
            background: #ffffff;
            font-size: 11px;
            box-sizing: border-box;
          }
          .header-grid {
            display: grid;
            grid-template-columns: 7fr 3fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .border-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            box-sizing: border-box;
          }
          .company-title {
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 4px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .company-text {
            font-size: 9.5px;
            font-weight: 500;
            margin-bottom: 3px;
            color: #0f172a;
          }
          .center-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .os-tag {
            border: 1.5px solid #0f172a;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 6px;
            color: #0f172a;
          }
          .os-num {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .os-meta {
            font-size: 9.5px;
            color: #334155;
            font-weight: 500;
            margin-top: 1px;
          }
          .section-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            margin-bottom: 12px;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
          }
          .section-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .section-content {
            padding: 10px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: 38fr 34fr 28fr;
            gap: 10px;
            font-size: 10px;
          }
          .customer-row {
            margin-bottom: 4px;
          }
          .customer-label {
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px 12px;
            font-size: 10px;
            border-right: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            box-sizing: border-box;
            color: #0f172a;
          }
          th {
            background: #ffffff;
            color: #0f172a;
            font-weight: 800;
            text-transform: uppercase;
            text-align: left;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .center-col {
            text-align: center;
          }
          .right-col {
            text-align: right;
          }
          .totals-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .total-card {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 10px;
            box-sizing: border-box;
            background: #ffffff;
          }
          .total-card-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .total-card-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .bottom-row {
            display: grid;
            grid-template-columns: 3fr 2fr;
            gap: 12px;
            margin-bottom: 25px;
          }
          .obs-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            min-height: 85px;
            box-sizing: border-box;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .obs-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .obs-content {
            padding: 10px;
            font-size: 10px;
            line-height: 1.4;
          }
          .signature-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            min-height: 85px;
            box-sizing: border-box;
            padding: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            text-align: center;
          }
          .signature-svg {
            max-height: 50px;
            width: 100%;
            object-fit: contain;
            margin-bottom: 4px;
          }
          .signature-line {
            width: 80%;
            border-top: 1px solid #334155;
            margin-top: 4px;
            padding-top: 3px;
            font-size: 8px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
          }
          .pdf-footer {
            border-top: 1.5px solid #0f172a;
            padding-top: 8px;
            text-align: center;
            font-size: 8.5px;
            font-weight: 600;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="border-box">
            <div class="company-title">${settings.name.toUpperCase()}</div>
            <div class="company-text">CNPJ: ${settings.cnpj || '-'}</div>
            <div class="company-text">Tel/Whats: ${settings.phone} ${settings.whatsapp ? `/ ${settings.whatsapp}` : ''}</div>
            <div class="company-text">End: ${settings.address || '-'}</div>
          </div>
          <div class="border-box center-box">
            <div class="os-tag">Ordem de Serviço</div>
            <div class="os-num">${os.osNumber}</div>
            <div class="os-meta">Status: <b>${os.status}</b></div>
            <div class="os-meta">${os.date.split('-').reverse().join('/')}</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente & Veículo</div>
          <div class="section-content">
            <div class="customer-grid">
              <div class="customer-row">
                <span class="customer-label">Cliente:</span> ${client?.name || '-'}<br>
                <span class="customer-label">Endereço:</span> ${client?.address || '-'}<br>
                <span class="customer-label">Contatos:</span> ${client?.phone || '-'}
              </div>
              <div class="customer-row">
                <span class="customer-label">Veículo:</span> ${vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}<br>
                <span class="customer-label">Placa:</span> ${vehicle?.plate.toUpperCase() || '-'}<br>
                <span class="customer-label">Km/Odo:</span> ${vehicle?.odometer || '0'} Km
              </div>
              <div class="customer-row">
                <span class="customer-label">Ano:</span> ${vehicle?.year || '-'}<br>
                <span class="customer-label">Chassi:</span> ${vehicle?.chassis || '-'}
              </div>
            </div>
          </div>
        </div>

        ${os.services.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Serviços Executados (Mão de Obra)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Descrição do Serviço</th>
                  <th style="width: 10%;" class="center-col">Qtd</th>
                  <th style="width: 20%;" class="right-col">Unitário</th>
                  <th style="width: 20%;" class="right-col">Total</th>
                </tr>
              </thead>
              <tbody>
                ${servicesListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${os.parts.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Peças Aplicadas</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Nome da Peça / Código</th>
                  <th style="width: 10%;" class="center-col">Qtd</th>
                  <th style="width: 20%;" class="right-col">Unitário</th>
                  <th style="width: 20%;" class="right-col">Total</th>
                </tr>
              </thead>
              <tbody>
                ${partsListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="totals-row">
          <div class="total-card">
            <div class="total-card-label">Total Mão de Obra</div>
            <div class="total-card-value">${formatCurrency(os.servicesTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Total Peças</div>
            <div class="total-card-value">${formatCurrency(os.partsTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Desconto</div>
            <div class="total-card-value">- ${formatCurrency(0)}</div>
          </div>
          <div class="total-card" style="border-color: #0f172a; background: #f8fafc;">
            <div class="total-card-label" style="color: #0f172a;">VALOR TOTAL GERAL</div>
            <div class="total-card-value" style="color: #0f172a; font-size: 15px;">${formatCurrency(os.grandTotal)}</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="obs-box">
            <div class="obs-title">Constatações Técnicas & Observações</div>
            <div class="obs-content">
              ${os.notes || 'Sem observações registradas para esta Ordem de Serviço.'}
            </div>
          </div>
          
          <div class="signature-box">
            ${os.signature ? `
              <div class="signature-svg">
                ${os.signature}
              </div>
            ` : '<div style="height: 48px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">Aguardando Assinatura</div>'}
            <div class="signature-line">${client?.name || 'Assinatura do Cliente'}</div>
          </div>
        </div>

        <div class="pdf-footer">
          ${settings.pdfNotes || 'Obrigado pela preferência! Volte Sempre.'}
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Ordem de Serviço ${os.osNumber}` });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = exportDatabaseJson();
      const filename = `oficinapro_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', UTI: 'public.json' });
    } catch (e) {
      console.error('Error sharing JSON backup', e);
      Alert.alert(
        'Exportar Backup',
        'Não foi possível compartilhar o arquivo diretamente. Deseja copiar os dados brutos para a área de transferência?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Copiar JSON', 
            onPress: () => {
              Clipboard.setString(exportDatabaseJson());
              Alert.alert('Copiado!', 'Dados brutos copiados para a área de transferência.');
            }
          }
        ]
      );
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      
      const success = await restoreBackup(fileContent);
      if (success) {
        Alert.alert('Sucesso', 'Backup restaurado e base de dados atualizada!');
      } else {
        Alert.alert('Erro', 'Arquivo de backup inválido. Certifique-se de selecionar um JSON válido da OficinaPro.');
      }
    } catch (e) {
      console.error('Error importing backup', e);
      Alert.alert('Erro', 'Não foi possível ler ou importar o arquivo de backup.');
    }
  };

  const handleExportCsv = async () => {
    try {
      let csv = '\uFEFF'; // UTF-8 BOM for Excel
      csv += 'Nº OS;Data;Cliente;Veículo;Placa;Serviços;Peças;Total;Status\n';

      workOrders.forEach(os => {
        const clientName = clients.find(c => c.id === os.clientId)?.name || '';
        const vehicle = vehicles.find(v => v.id === os.vehicleId);
        const vehicleStr = vehicle ? `${vehicle.brand} ${vehicle.model}` : '';
        const plate = vehicle?.plate || '';
        
        csv += `${os.osNumber};${os.date};"${clientName}";"${vehicleStr}";${plate};${os.servicesTotal};${os.partsTotal};${os.grandTotal};${os.status}\n`;
      });

      const filename = `relatorio_os_${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (e) {
      console.error('Error sharing CSV report', e);
      Alert.alert('Erro', 'Não foi possível gerar ou exportar o relatório CSV.');
    }
  };

  const handleResetDatabase = () => {
    Alert.alert(
      'Atenção',
      'Isso irá apagar todos os dados cadastrados e redefinir a oficina para os valores originais de demonstração. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resetar Tudo', 
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090b0f" />
      
      {/* HEADER PRINCIPAL */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {settings.name ? settings.name.toUpperCase() : 'OFICINAPRO'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Text style={styles.headerSubtitle}>PAINEL SAAS</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8
            }}>
              {online ? (
                <Wifi size={10} color="#22c55e" />
              ) : (
                <WifiOff size={10} color="#ef4444" />
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* RENDERIZADOR DE TELAS MODULARES */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {currentTab === 'dashboard' && (
          <DashboardScreen 
            setCurrentTab={setCurrentTab}
            setSelectedOS={setSelectedOS}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsScreen 
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            activeClientTab={activeClientTab}
            setActiveClientTab={setActiveClientTab}
            clientTabSearch={clientTabSearch}
            setClientTabSearch={setClientTabSearch}
            onAddClient={handleOpenClientModalForCreate}
            onEditClient={handleOpenClientModalForEdit}
            onAddVehicle={handleOpenVehicleModalForCreate}
            onEditVehicle={handleOpenVehicleModalForEdit}
            handleShareOS={handleShareOS}
          />
        )}

        {currentTab === 'os' && (
          <OSScreen 
            selectedOS={selectedOS}
            setSelectedOS={setSelectedOS}
            osSearch={osSearch}
            setOsSearch={setOsSearch}
            osStatusFilter={osStatusFilter}
            setOsStatusFilter={setOsStatusFilter}
            showBillingPanel={showBillingPanel}
            setShowBillingPanel={setShowBillingPanel}
            billingForm={billingForm}
            setBillingForm={setBillingForm}
            onStartNewOS={handleOpenOSWizardForCreate}
            onStartEditOS={handleOpenOSWizardForEdit}
            handleShareOS={handleShareOS}
            setSigningOSId={setSigningOSId}
          />
        )}

        {currentTab === 'finance' && (
          <FinanceScreen 
            summaryPeriod={summaryPeriod}
            setSummaryPeriod={setSummaryPeriod}
            activeFinanceFilter={activeFinanceFilter}
            setActiveFinanceFilter={setActiveFinanceFilter}
            billingSearch={billingSearch}
            setBillingSearch={setBillingSearch}
            billingStatusFilter={billingStatusFilter}
            setBillingStatusFilter={setBillingStatusFilter}
            selectedBillingDetail={selectedBillingDetail}
            setSelectedBillingDetail={setSelectedBillingDetail}
            onAddExpense={() => setExpenseModalVisible(true)}
          />
        )}

        {currentTab === 'more' && (
          <MoreScreen 
            moreSubScreen={moreSubScreen}
            setMoreSubScreen={setMoreSubScreen}
            catalogSegment={catalogSegment}
            setCatalogSegment={setCatalogSegment}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            onAddCatalogService={handleOpenCatalogServiceForCreate}
            onEditCatalogService={handleOpenCatalogServiceForEdit}
            onAddCatalogPart={handleOpenCatalogPartForCreate}
            onEditCatalogPart={handleOpenCatalogPartForEdit}
            handleExportBackup={handleExportBackup}
            handleImportBackup={handleImportBackup}
            handleExportCsv={handleExportCsv}
            handleResetDatabase={handleResetDatabase}
          />
        )}
      </ScrollView>

      {/* RODAPÉ DE NAVEGAÇÃO */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('dashboard')}>
          <Menu size={20} color={currentTab === 'dashboard' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'dashboard' ? styles.tabLabelActive : null]}>Painel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setSelectedClient(null); setCurrentTab('clients'); }}>
          <Users size={20} color={currentTab === 'clients' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'clients' ? styles.tabLabelActive : null]}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setSelectedOS(null); setCurrentTab('os'); }}>
          <ClipboardList size={20} color={currentTab === 'os' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'os' ? styles.tabLabelActive : null]}>Serviços</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setSelectedBillingDetail(null); setCurrentTab('finance'); }}>
          <Wallet size={20} color={currentTab === 'finance' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'finance' ? styles.tabLabelActive : null]}>Financeiro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('more'); setMoreSubScreen('menu'); }}>
          <MoreHorizontal size={20} color={currentTab === 'more' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'more' ? styles.tabLabelActive : null]}>Mais</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODAL DE ASSINATURA DIGITAL --- */}
      <Modal visible={signingOSId !== null} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            {signingOSId && (
              <SignaturePad 
                onSave={async (svg) => {
                  const success = await saveWorkOrderSignature(signingOSId, svg);
                  if (success) {
                    if (selectedOS && selectedOS.id === signingOSId) {
                      setSelectedOS((prev: WorkOrder | null) => prev ? { ...prev, signature: svg } : null);
                    }
                    setSigningOSId(null);
                    Alert.alert('Sucesso', 'Assinatura registrada!');
                  }
                }}
                onCancel={() => setSigningOSId(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* --- FORM MODAL: ADD CLIENT --- */}
      <ClientModal 
        visible={clientModalVisible}
        editingClientId={editingClientId}
        initialForm={clientInitialForm}
        onClose={() => setClientModalVisible(false)}
        onSubmit={handleClientSubmit}
      />

      {/* --- FORM MODAL: ADD VEHICLE --- */}
      <VehicleModal 
        visible={vehicleModalVisible}
        editingVehicleId={editingVehicleId}
        initialForm={vehicleInitialForm}
        clientName={selectedClient ? selectedClient.name : ''}
        onClose={() => setVehicleModalVisible(false)}
        onSubmit={handleVehicleSubmit}
      />

      {/* --- FORM MODAL: ADD EXPENSE --- */}
      <ExpenseModal 
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={handleExpenseSubmit}
      />

      {/* --- FORM MODAL: ADD CATALOG SERVICE --- */}
      <CatalogServiceModal 
        visible={catalogServiceModalVisible}
        editingServiceId={editingServiceId}
        initialForm={serviceInitialForm}
        onClose={() => setCatalogServiceModalVisible(false)}
        onSubmit={handleCatalogServiceSubmit}
      />

      {/* --- FORM MODAL: ADD CATALOG PART --- */}
      <CatalogPartModal 
        visible={catalogPartModalVisible}
        editingPartId={editingPartId}
        initialForm={partInitialForm}
        onClose={() => setCatalogPartModalVisible(false)}
        onSubmit={handleCatalogPartSubmit}
      />

      {/* --- FORM MODAL: CREATE OS WIZARD --- */}
      <OSWizardModal 
        visible={osWizardModalVisible}
        editingOSId={editingOSId}
        initialForm={osInitialForm}
        clients={clients}
        vehicles={vehicles}
        services={services}
        parts={parts}
        onClose={() => setOsWizardModalVisible(false)}
        onSubmit={handleOSWizardSubmit}
      />

    </SafeAreaView>
  );
}

function AppContent() {
  const { session, loading } = useDatabase();
  
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090b0f', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b66ff" />
      </View>
    );
  }

  return session ? <MainWorkshopApp /> : <AuthScreen />;
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
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ef444410',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
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
  tabLabelActive: {
    color: '#3b66ff',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.lg,
    borderTopRightRadius: theme.roundness.lg,
    padding: theme.spacing.xxl,
    maxHeight: '90%',
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
  }
});
