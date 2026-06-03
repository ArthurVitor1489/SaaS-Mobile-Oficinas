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

import { DatabaseProvider, useDatabase, Client, Vehicle, ServiceItem, PartItem, WorkOrder, Billing, FinancialTransaction, OSItemService, OSItemPart, OSStatus, PaymentMethod, BillingStatus } from './src/context/DatabaseContext';
import SignaturePad from './src/components/SignaturePad';

// --- AUTHENTICATION SCREEN ---

function AuthScreen() {
  const { signIn, signUp } = useDatabase();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    if (isLogin) {
      const success = await signIn(email, password);
      setLoading(false);
    } else {
      if (!companyName) {
        Alert.alert('Erro', 'Por favor, informe o nome da oficina.');
        setLoading(false);
        return;
      }
      const success = await signUp(email, password, companyName, cnpj);
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
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {isLogin ? 'Entrar no Painel' : 'Cadastrar Oficina'}
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

  // Navigation: 'dashboard' | 'clients' | 'os' | 'finance' | 'more'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'os' | 'finance' | 'more'>('dashboard');
  const [moreSubScreen, setMoreSubScreen] = useState<'menu' | 'catalog' | 'settings' | 'billing'>('menu');
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // Search Filter state
  const [catalogSegment, setCatalogSegment] = useState<'services' | 'parts'>('services');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Clients view helper
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<'vehicles' | 'history'>('vehicles');
  const [clientTabSearch, setClientTabSearch] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });

  // OS signature overlay
  const [signingOSId, setSigningOSId] = useState<string | null>(null);

  // Editing state trackers
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  // Finance and Billing state trackers
  const [activeFinanceFilter, setActiveFinanceFilter] = useState<'Todos' | 'Entradas' | 'Saídas'>('Todos');
  const [billingSearch, setBillingSearch] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState<BillingStatus | 'Todos'>('Todos');
  const [selectedBillingDetail, setSelectedBillingDetail] = useState<Billing | null>(null);

  // Modals Forms
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });

  const [isAddingOS, setIsAddingOS] = useState(false);
  const [osForm, setOsForm] = useState({ 
    clientId: '', vehicleId: '', notes: '', status: 'Aberta' as OSStatus,
    selectedServices: [] as OSItemService[], selectedParts: [] as OSItemPart[]
  });

  // OS Wizard Step States
  const [wizardStep, setWizardStep] = useState(1);
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  // OS search and details states
  const [selectedOS, setSelectedOS] = useState<WorkOrder | null>(null);
  const [osSearch, setOsSearch] = useState('');
  const [osStatusFilter, setOsStatusFilter] = useState<OSStatus | 'Todos'>('Todos');
  const [showBillingPanel, setShowBillingPanel] = useState(false);
  const [billingForm, setBillingForm] = useState<{ paymentMethod: PaymentMethod; installmentsCount: string }>({
    paymentMethod: 'PIX',
    installmentsCount: '1',
  });
  const [editingOSId, setEditingOSId] = useState<string | null>(null);

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Operacional' as any, date: new Date().toISOString().split('T')[0] });

  // Catalog Item forms
  const [isAddingCatalogService, setIsAddingCatalogService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', code: '', description: '', price: '' });
  const [isAddingCatalogPart, setIsAddingCatalogPart] = useState(false);
  const [partForm, setPartForm] = useState({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('/');
  };

  // --- HANDLERS ---

  const handleCreateClient = async () => {
    if (!clientForm.name || !clientForm.phone) {
      Alert.alert('Erro', 'Por favor, preencha o nome e telefone do cliente.');
      return;
    }
    if (editingClientId) {
      const res = await updateClient(editingClientId, {
        name: clientForm.name,
        cpfCnpj: clientForm.cpfCnpj,
        phone: clientForm.phone,
        whatsapp: clientForm.whatsapp || clientForm.phone,
        email: clientForm.email,
        address: clientForm.address,
        notes: clientForm.notes
      });
      if (res) {
        setSelectedClient(prev => prev ? { ...prev, ...clientForm, whatsapp: clientForm.whatsapp || clientForm.phone } : null);
        setIsAddingClient(false);
        setEditingClientId(null);
        setClientForm({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
        Alert.alert('Sucesso', 'Cliente atualizado com sucesso!');
      }
    } else {
      const res = await addClient({
        name: clientForm.name,
        cpfCnpj: clientForm.cpfCnpj,
        phone: clientForm.phone,
        whatsapp: clientForm.whatsapp || clientForm.phone,
        email: clientForm.email,
        address: clientForm.address,
        notes: clientForm.notes
      });
      if (res) {
        setIsAddingClient(false);
        setClientForm({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
        Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
      }
    }
  };

  const handleCreateVehicle = async () => {
    if (!selectedClient) return;
    if (!vehicleForm.plate || !vehicleForm.model || !vehicleForm.brand) {
      Alert.alert('Erro', 'Por favor, preencha placa, marca e modelo.');
      return;
    }
    if (editingVehicleId) {
      const res = await updateVehicle(editingVehicleId, {
        clientId: selectedClient.id,
        plate: vehicleForm.plate.toUpperCase(),
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year || new Date().getFullYear().toString(),
        chassis: vehicleForm.chassis,
        odometer: vehicleForm.odometer || '0'
      });
      if (res) {
        setIsAddingVehicle(false);
        setEditingVehicleId(null);
        setVehicleForm({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });
        Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
      }
    } else {
      const res = await addVehicle({
        clientId: selectedClient.id,
        plate: vehicleForm.plate.toUpperCase(),
        brand: vehicleForm.brand,
        model: vehicleForm.model,
        year: vehicleForm.year || new Date().getFullYear().toString(),
        chassis: vehicleForm.chassis,
        odometer: vehicleForm.odometer || '0'
      });
      if (res) {
        setIsAddingVehicle(false);
        setVehicleForm({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });
        Alert.alert('Sucesso', 'Veículo associado com sucesso!');
      }
    }
  };

  const handleCreateOS = async () => {
    if (!osForm.clientId || !osForm.vehicleId) {
      Alert.alert('Erro', 'Selecione o cliente e o veículo.');
      return;
    }
    if (osForm.selectedServices.length === 0 && osForm.selectedParts.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um serviço ou peça na ordem.');
      return;
    }

    if (editingOSId) {
      const res = await updateWorkOrder(editingOSId, {
        clientId: osForm.clientId,
        vehicleId: osForm.vehicleId,
        services: osForm.selectedServices,
        parts: osForm.selectedParts,
        notes: osForm.notes,
        status: osForm.status
      });
      if (res) {
        setIsAddingOS(false);
        setEditingOSId(null);
        setOsForm({ clientId: '', vehicleId: '', notes: '', status: 'Aberta', selectedServices: [], selectedParts: [] });
        Alert.alert('Sucesso', 'Ordem de Serviço atualizada!');
        setSelectedOS(prev => prev && prev.id === editingOSId ? {
          ...prev,
          clientId: osForm.clientId,
          vehicleId: osForm.vehicleId,
          services: osForm.selectedServices,
          parts: osForm.selectedParts,
          notes: osForm.notes,
          status: osForm.status,
          servicesTotal: osForm.selectedServices.reduce((sum, s) => sum + s.price * s.quantity, 0),
          partsTotal: osForm.selectedParts.reduce((sum, p) => sum + p.salePrice * p.quantity, 0),
          grandTotal: osForm.selectedServices.reduce((sum, s) => sum + s.price * s.quantity, 0) + osForm.selectedParts.reduce((sum, p) => sum + p.salePrice * p.quantity, 0)
        } : prev);
      }
    } else {
      const res = await addWorkOrder({
        clientId: osForm.clientId,
        vehicleId: osForm.vehicleId,
        services: osForm.selectedServices,
        parts: osForm.selectedParts,
        notes: osForm.notes,
        status: osForm.status,
        date: new Date().toISOString().split('T')[0]
      });

      if (res) {
        setIsAddingOS(false);
        setOsForm({ clientId: '', vehicleId: '', notes: '', status: 'Aberta', selectedServices: [], selectedParts: [] });
        Alert.alert('Sucesso', 'Ordem de Serviço criada!');
      }
    }
  };

  const handleNewOS = () => {
    setEditingOSId(null);
    setWizardStep(1);
    setClientSearch('');
    setServiceSearch('');
    setPartSearch('');
    setOsForm({
      clientId: '',
      vehicleId: '',
      notes: '',
      status: 'Aberta',
      selectedServices: [],
      selectedParts: []
    });
    setIsAddingOS(true);
  };

  const handleStartEditOS = (os: WorkOrder) => {
    setEditingOSId(os.id);
    setWizardStep(1);
    setClientSearch('');
    setServiceSearch('');
    setPartSearch('');
    setOsForm({
      clientId: os.clientId,
      vehicleId: os.vehicleId,
      notes: os.notes || '',
      status: os.status,
      selectedServices: os.services,
      selectedParts: os.parts
    });
    setIsAddingOS(true);
  };

  const handleUpdateServiceQty = (item: ServiceItem, qty: number) => {
    if (qty <= 0) {
      setOsForm(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.id !== item.id)
      }));
      return;
    }
    const exists = osForm.selectedServices.find(s => s.id === item.id);
    if (exists) {
      setOsForm(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.map(s => s.id === item.id ? { ...s, quantity: qty } : s)
      }));
    } else {
      setOsForm(prev => ({
        ...prev,
        selectedServices: [...prev.selectedServices, { id: item.id, name: item.name, price: item.price, quantity: qty, code: item.code }]
      }));
    }
  };

  const handleUpdatePartQty = (item: PartItem, qty: number) => {
    if (qty <= 0) {
      setOsForm(prev => ({
        ...prev,
        selectedParts: prev.selectedParts.filter(p => p.id !== item.id)
      }));
      return;
    }
    const exists = osForm.selectedParts.find(p => p.id === item.id);
    if (exists) {
      setOsForm(prev => ({
        ...prev,
        selectedParts: prev.selectedParts.map(p => p.id === item.id ? { ...p, quantity: qty } : p)
      }));
    } else {
      setOsForm(prev => ({
        ...prev,
        selectedParts: [...prev.selectedParts, { id: item.id, name: item.name, code: item.code, salePrice: item.salePrice, quantity: qty }]
      }));
    }
  };

  const handleFaturarOS = async () => {
    if (!selectedOS) return;

    const amount = selectedOS.grandTotal;
    const installmentsCount = parseInt(billingForm.installmentsCount);
    
    // Generate installments array
    const installments = [];
    const baseVal = Math.floor((amount / installmentsCount) * 100) / 100;
    let diff = Math.round((amount - (baseVal * installmentsCount)) * 100) / 100;

    for (let i = 1; i <= installmentsCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (30 * (i - 1)));
      
      // Pad exact cents diff to last installment
      const instAmount = i === installmentsCount ? (baseVal + diff) : baseVal;

      installments.push({
        number: i,
        amount: instAmount,
        dueDate: d.toISOString().split('T')[0],
        status: 'Pendente' as const
      });
    }

    const success = await addBilling({
      osId: selectedOS.id,
      amount,
      paymentMethod: billingForm.paymentMethod,
      status: 'Pendente',
      installments,
      dueDate: installments[0].dueDate
    });

    if (success) {
      setShowBillingPanel(false);
      Alert.alert('Sucesso', 'Ordem de serviço faturada com sucesso!');
    } else {
      Alert.alert('Erro', 'Não foi possível faturar esta ordem.');
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount) {
      Alert.alert('Erro', 'Informe a descrição e o valor.');
      return;
    }
    const res = await addTransaction({
      type: 'Saída',
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount) || 0,
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      description: expenseForm.description
    });
    if (res) {
      setIsAddingExpense(false);
      setExpenseForm({ description: '', amount: '', category: 'Operacional', date: new Date().toISOString().split('T')[0] });
      Alert.alert('Sucesso', 'Despesa lançada com sucesso.');
    }
  };

  const handleSaveCatalogService = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      Alert.alert('Erro', 'Nome e valor de serviço são obrigatórios.');
      return;
    }
    if (editingServiceId) {
      const res = await updateService(editingServiceId, {
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
        price: parseFloat(serviceForm.price) || 0
      });
      if (res) {
        setIsAddingCatalogService(false);
        setEditingServiceId(null);
        setServiceForm({ name: '', code: '', description: '', price: '' });
        Alert.alert('Sucesso', 'Serviço atualizado com sucesso!');
      }
    } else {
      const res = await addService({
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
        price: parseFloat(serviceForm.price) || 0
      });
      if (res) {
        setIsAddingCatalogService(false);
        setServiceForm({ name: '', code: '', description: '', price: '' });
        Alert.alert('Sucesso', 'Serviço catalogado!');
      }
    }
  };

  const handleSaveCatalogPart = async () => {
    if (!partForm.name || !partForm.code || !partForm.salePrice || !partForm.stock) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios (*).');
      return;
    }
    if (editingPartId) {
      const res = await updatePart(editingPartId, {
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || '',
        purchasePrice: parseFloat(partForm.purchasePrice) || 0,
        salePrice: parseFloat(partForm.salePrice) || 0,
        stock: parseInt(partForm.stock) || 0
      });
      if (res) {
        setIsAddingCatalogPart(false);
        setEditingPartId(null);
        setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
        Alert.alert('Sucesso', 'Peça atualizada com sucesso!');
      }
    } else {
      const res = await addPart({
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || '',
        purchasePrice: parseFloat(partForm.purchasePrice) || 0,
        salePrice: parseFloat(partForm.salePrice) || 0,
        stock: parseInt(partForm.stock) || 0
      });
      if (res) {
        setIsAddingCatalogPart(false);
        setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
        Alert.alert('Sucesso', 'Peça adicionada ao estoque.');
      }
    }
  };

  // --- PRINT PDF & SHARE INVOICE ---

  const handleShareOS = async (os: WorkOrder) => {
    const client = clients.find(c => c.id === os.clientId);
    const vehicle = vehicles.find(v => v.id === os.vehicleId);

    const servicesListHTML = os.services
      .map(s => `<tr>
        <td>${s.name} ${s.code ? `(${s.code})` : ''}</td>
        <td>${s.quantity || 1}</td>
        <td>${formatCurrency(s.price)}</td>
        <td>${formatCurrency(s.price * (s.quantity || 1))}</td>
      </tr>`)
      .join('');

    const partsListHTML = os.parts
      .map(p => `<tr>
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
            white-space: pre-wrap;
            color: #0f172a;
          }
          .grand-total-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            text-align: center;
            box-sizing: border-box;
            padding: 10px;
          }
          .grand-total-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #64748b;
          }
          .grand-total-price {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .signature-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            margin-bottom: 20px;
          }
          .sig-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            text-align: center;
          }
          .sig-line {
            width: 100%;
            border-top: 1.5px solid #0f172a;
            margin-top: 4px;
            padding-top: 4px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
          }
          .sig-img {
            max-height: 45px;
            object-fit: contain;
            margin-bottom: 4px;
          }
          .print-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            font-weight: 700;
            border-top: 1.5px solid #0f172a;
            padding-top: 8px;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="border-box">
            <div class="company-title">${settings.name.toUpperCase()}</div>
            <div class="company-text"><strong>CNPJ:</strong> ${settings.cnpj}</div>
            <div class="company-text"><strong>TEL:</strong> ${settings.phone} / ${settings.whatsapp}</div>
            <div class="company-text"><strong>END:</strong> ${settings.address.toUpperCase()}</div>
          </div>
          
          <div class="border-box center-box">
            <div class="os-tag">Ordem de Serviço</div>
            <div class="os-num">${os.osNumber}</div>
            <div class="os-meta"><strong>Data:</strong> ${formatDate(os.date)}</div>
            <div class="os-meta" style="text-transform: uppercase;"><strong>Status:</strong> ${os.status}</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente e Veículo</div>
          <div class="section-content">
            <div class="customer-grid">
              <div>
                <div class="customer-row"><span class="customer-label">Cliente:</span> ${client?.name?.toUpperCase() || ''}</div>
                <div class="customer-row"><span class="customer-label">Placa:</span> ${vehicle?.plate?.toUpperCase() || ''}</div>
              </div>
              <div>
                <div class="customer-row"><span class="customer-label">Telefone:</span> ${client?.phone || '-'}</div>
                <div class="customer-row"><span class="customer-label">Endereço:</span> ${client?.address?.toUpperCase() || ''}</div>
              </div>
              <div>
                <div class="customer-row"><span class="customer-label">Veículo:</span> ${vehicle?.brand?.toUpperCase() || ''} ${vehicle?.model?.toUpperCase() || ''}</div>
              </div>
            </div>
          </div>
        </div>

        ${os.parts.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Peças Utilizadas</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">Peça</th>
                  <th style="width: 10%; text-align: center;">Qtd</th>
                  <th style="width: 15%; text-align: right;">Valor Unit.</th>
                  <th style="width: 20%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${partsListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${os.services.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Serviços Executados</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">Serviço</th>
                  <th style="width: 10%; text-align: center;">Qtd</th>
                  <th style="width: 15%; text-align: right;">Valor Unit.</th>
                  <th style="width: 20%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${servicesListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="totals-row">
          <div class="total-card">
            <div class="total-card-label">Total Peças</div>
            <div class="total-card-value">${formatCurrency(os.partsTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Total Serviços</div>
            <div class="total-card-value">${formatCurrency(os.servicesTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Subtotal</div>
            <div class="total-card-value">${formatCurrency(os.grandTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Desconto</div>
            <div class="total-card-value">-R$ 0,00</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="obs-box">
            <div class="obs-title">Observações</div>
            <div class="obs-content">${os.notes || '-'}</div>
          </div>
          
          <div class="grand-total-box">
            <div class="grand-total-title">Total da Ordem de Serviço</div>
            <div class="grand-total-price">${formatCurrency(os.grandTotal)}</div>
          </div>
        </div>

        <div class="signature-row">
          <div class="sig-container">
            <div style="height: 45px; display: flex; align-items: flex-end; justify-content: center; width: 100%;">
              ${os.signature ? (os.signature.startsWith('<svg') ? os.signature : `<img class="sig-img" src="${os.signature}" alt="Assinatura">`) : ''}
            </div>
            <div class="sig-line">Assinatura do Cliente</div>
          </div>
          <div class="sig-container">
            <div style="height: 45px;"></div>
            <div class="sig-line">Responsável pela Oficina</div>
          </div>
        </div>

        <div class="print-footer">
          <div>Documento Interno da Oficina</div>
          <div>${os.osNumber}</div>
        </div>

        <div style="margin-top: 30px; font-size: 8.5px; color: #64748b; text-align: center; text-transform: uppercase; font-weight: 500; line-height: 1.4;">
          ${settings.pdfNotes}
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
        const client = clients.find(c => c.id === os.clientId)?.name || '';
        const vehicle = vehicles.find(v => v.id === os.vehicleId);
        const vehicleStr = vehicle ? `${vehicle.brand} ${vehicle.model}` : '';
        const plate = vehicle?.plate || '';
        
        csv += `${os.osNumber};${os.date};"${client}";"${vehicleStr}";${plate};${os.servicesTotal};${os.partsTotal};${os.grandTotal};${os.status}\n`;
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

  // --- METRICS & FINANCE CALCULATIONS ---

  const faturamentoTotal = workOrders.reduce((acc, o) => acc + o.grandTotal, 0);
  const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;
  const osAndamento = workOrders.filter(o => o.status === 'Em andamento').length;
  const osConcluidas = workOrders.filter(o => o.status === 'Concluída' || o.status === 'Entregue').length;

  const totalRecebido = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalDespesas = transactions.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoAtual = totalRecebido - totalDespesas;

  const totalAReceber = billings.reduce((acc, b) => {
    if (b.status === 'Cancelado') return acc;
    return acc + b.installments.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.amount, 0);
  }, 0);

  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const faturamentoMes = workOrders
    .filter(o => o.date.startsWith(currentMonthStr))
    .reduce((acc, o) => acc + o.grandTotal, 0);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Daily Stats (Hoje)
  const transactionsHoje = transactions.filter(t => t.date === todayStr);
  const entradasHoje = transactionsHoje.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasHoje = transactionsHoje.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoHoje = entradasHoje - saidasHoje;

  // 2. Weekly Stats (Esta Semana)
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayIndex = today.getDay();
  startOfWeek.setDate(today.getDate() - dayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const isThisWeek = (dateStr: string) => {
    const tDate = new Date(dateStr + 'T00:00:00');
    return tDate >= startOfWeek && tDate <= endOfWeek;
  };

  const transactionsSemana = transactions.filter(t => isThisWeek(t.date));
  const entradasSemana = transactionsSemana.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasSemana = transactionsSemana.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoSemana = entradasSemana - saidasSemana;

  // 3. Monthly Stats (Este Mês)
  const transactionsMes = transactions.filter(t => t.date.startsWith(currentMonthStr));
  const entradasMes = transactionsMes.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasMes = transactionsMes.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoMes = entradasMes - saidasMes;

  // Chart data: last 5 days cash flow
  const chartDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    
    const dayInflows = transactions
      .filter(t => t.type === 'Entrada' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const dayOutflows = transactions
      .filter(t => t.type === 'Saída' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    return { dayName, inflows: dayInflows, outflows: dayOutflows };
  });

  const chartMaxVal = Math.max(...chartDays.map(d => Math.max(d.inflows, d.outflows, 300)));
  const chartHeight = 100;
  const chartPadding = 15;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0c10" />
      
      {/* HEADER BAR */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text 
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {settings.name.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={styles.headerSubtitle}>OFICINAPRO MOBILE</Text>
            <View style={{ marginLeft: 6 }}>
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

      {/* MAIN SCREEN RENDER */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <View style={styles.screenContainer}>
            <View style={[styles.card, styles.heroCard]}>
              <Text style={styles.heroCardLabel}>FATURAMENTO DO MÊS</Text>
              <Text style={styles.heroCardValue}>{formatCurrency(faturamentoMes)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>{formatCurrency(entradasMes)}</Text>
                <Text style={{ fontSize: 9, color: '#dbeafe' }}>recebido à vista/parcelas</Text>
              </View>
            </View>

            {/* Metrics cards grid */}
            <View style={styles.grid}>
              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>ABERTAS</Text>
                  <ClipboardList size={14} color="#3b66ff" />
                </View>
                <Text style={styles.metricValue}>{osAbertas}</Text>
              </View>

              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>EM CURSO</Text>
                  <Play size={14} color="#eab308" />
                </View>
                <Text style={styles.metricValue}>{osAndamento}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>CONCLUÍDAS</Text>
                  <CheckCircle size={14} color="#22c55e" />
                </View>
                <Text style={styles.metricValue}>{osConcluidas}</Text>
              </View>

              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>A RECEBER</Text>
                  <Wallet size={14} color="#3b66ff" />
                </View>
                <Text style={[styles.metricValue, { color: '#3b66ff' }]} numberOfLines={1}>
                  {formatCurrency(totalAReceber)}
                </Text>
              </View>
            </View>

            {/* Quick counts grid */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#0f1115', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: 'rgba(59, 102, 255, 0.1)', borderRadius: 8, padding: 6 }}>
                  <Users size={14} color="#3b66ff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>{clients.length}</Text>
                  <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>CLIENTES</Text>
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: '#0f1115', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: 'rgba(59, 102, 255, 0.1)', borderRadius: 8, padding: 6 }}>
                  <Car size={14} color="#3b66ff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>{vehicles.length}</Text>
                  <Text style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold' }}>VEÍCULOS</Text>
                </View>
              </View>
            </View>

            {/* Cash Flow Interactive Chart */}
            <View style={[styles.card, { padding: 14, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 7, fontWeight: '900', color: '#64748b', letterSpacing: 0.8 }}>FLUXO DE CAIXA</Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f1f5f9', marginTop: 1 }}>Últimos 5 Dias</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#3b66ff' }} />
                    <Text style={{ fontSize: 8, color: '#94a3b8', fontWeight: 'bold' }}>Entradas</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#ef4444' }} />
                    <Text style={{ fontSize: 8, color: '#94a3b8', fontWeight: 'bold' }}>Saídas</Text>
                  </View>
                </View>
              </View>

              <View style={{ height: 100, width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Svg height="100%" width="100%" viewBox="0 0 200 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <Line x1="0" y1="20" x2="200" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                  <Line x1="0" y1="50" x2="200" y2="50" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />
                  <Line x1="0" y1="80" x2="200" y2="80" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2" />

                  {chartDays.map((d, index) => {
                    const xPos = chartPadding + index * 36;
                    const inflowHeight = chartMaxVal > 0 ? (d.inflows / chartMaxVal) * (chartHeight - 30) : 0;
                    const outflowHeight = chartMaxVal > 0 ? (d.outflows / chartMaxVal) * (chartHeight - 30) : 0;

                    return (
                      <G key={index}>
                        {/* Entrada Bar */}
                        <Rect
                          x={xPos}
                          y={chartHeight - 18 - inflowHeight}
                          width={5}
                          height={Math.max(1, inflowHeight)}
                          rx={1}
                          fill="#3b66ff"
                        />
                        {/* Saída Bar */}
                        <Rect
                          x={xPos + 6}
                          y={chartHeight - 18 - outflowHeight}
                          width={5}
                          height={Math.max(1, outflowHeight)}
                          rx={1}
                          fill="#ef4444"
                        />
                      </G>
                    );
                  })}
                </Svg>
                
                {/* Labels at bottom */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 6, marginTop: 4 }}>
                  {chartDays.map((d, i) => (
                    <Text key={i} style={{ fontSize: 7, color: '#64748b', fontWeight: 'bold', width: 30, textAlign: 'center', textTransform: 'uppercase' }}>
                      {d.dayName}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            {/* Recent OS List */}
            <Text style={styles.sectionTitle}>ORDENS DE SERVIÇO RECENTES</Text>
            {workOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma Ordem de Serviço cadastrada.</Text>
              </View>
            ) : (
              workOrders.slice(0, 3).map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const vehicle = vehicles.find(v => v.id === os.vehicleId);
                const billing = billings.find(b => b.osId === os.id);
                
                let osStatusStyle = styles.cardOpen;
                let badgeColor = 'rgba(59, 102, 255, 0.1)';
                let badgeTextColor = '#3b66ff';
                let badgeBorderColor = 'rgba(59, 102, 255, 0.3)';
                if (os.status === 'Em andamento') {
                  osStatusStyle = styles.cardProgress;
                  badgeColor = 'rgba(234, 179, 8, 0.1)';
                  badgeTextColor = '#eab308';
                  badgeBorderColor = 'rgba(234, 179, 8, 0.3)';
                } else if (os.status === 'Concluída') {
                  osStatusStyle = styles.cardDone;
                  badgeColor = 'rgba(34, 197, 94, 0.1)';
                  badgeTextColor = '#22c55e';
                  badgeBorderColor = 'rgba(34, 197, 94, 0.3)';
                } else if (os.status === 'Entregue') {
                  osStatusStyle = styles.cardDelivered;
                  badgeColor = '#272e3f';
                  badgeTextColor = '#cbd5e1';
                  badgeBorderColor = '#272e3f';
                }

                return (
                  <TouchableOpacity 
                    key={os.id} 
                    style={[styles.listItem, osStatusStyle, { flexDirection: 'column', alignItems: 'stretch' }]}
                    onPress={() => {
                      setSelectedOS(os);
                      setCurrentTab('os');
                    }}
                  >
                    {/* Header Row */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={[styles.osNum, { color: '#3b66ff', fontWeight: '900' }]}>{os.osNumber}</Text>
                        <View style={[
                          styles.statusBadge, 
                          { backgroundColor: badgeColor, borderColor: badgeBorderColor, borderWidth: 1 }
                        ]}>
                          <Text style={{ 
                            fontSize: 9, 
                            fontWeight: '900', 
                            color: badgeTextColor, 
                            textTransform: 'uppercase' 
                          }}>
                            {os.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.osDate}>{os.date.split('-').reverse().join('/')}</Text>
                    </View>

                    {/* Content */}
                    <View style={{ marginVertical: 4 }}>
                      <Text style={styles.cardLabelText}>Cliente</Text>
                      <Text style={[styles.cardValueText, { color: '#fff', fontWeight: 'bold' }]}>{client?.name}</Text>
                      
                      {vehicle && (
                        <>
                          <Text style={styles.cardLabelText}>Veículo</Text>
                          <Text style={styles.cardValueText}>
                            {vehicle.brand} {vehicle.model} • Placa: <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{vehicle.plate.toUpperCase()}</Text>
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Footer Row */}
                    <View style={styles.cardFooterRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {billing ? (
                          <View style={{ 
                            backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6
                          }}>
                            <Text style={{ 
                              fontSize: 9, 
                              fontWeight: '900', 
                              color: billing.status === 'Pago' ? '#22c55e' : '#eab308' 
                            }}>
                              💰 {billing.status.toUpperCase()}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 9, fontWeight: '900', color: '#ef4444' }}>
                              💸 NÃO FATURADA
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.osTotal, { fontSize: 16, color: '#fff', fontWeight: '900' }]}>
                        {formatCurrency(os.grandTotal)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Recent Finance Transactions Feed */}
            <Text style={styles.sectionTitle}>ÚLTIMOS LANÇAMENTOS</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum lançamento financeiro cadastrado.</Text>
              </View>
            ) : (
              transactions.slice(0, 4).map(t => {
                const isInflow = t.type === 'Entrada';
                const transStyle = isInflow ? styles.cardInflow : styles.cardOutflow;
                return (
                  <View key={t.id} style={[styles.listItem, transStyle, { borderWidth: 1.5 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                      <View style={{ 
                        backgroundColor: isInflow ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        padding: 10, 
                        borderRadius: 12 
                      }}>
                        {isInflow ? (
                          <ArrowUpRight size={16} color="#22c55e" />
                        ) : (
                          <ArrowDownRight size={16} color="#ef4444" />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.tDesc} numberOfLines={1}>
                          {t.description}
                        </Text>
                        <Text style={[styles.tDate, { textTransform: 'uppercase', fontWeight: 'bold' }]}>
                          {t.category} • {t.date.split('-').reverse().join('/')}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.tAmount, { 
                      color: isInflow ? '#22c55e' : '#ef4444' 
                    }]}>
                      {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: CLIENTS */}
        {currentTab === 'clients' && (
          <View style={styles.screenContainer}>
            <View style={styles.screenHeader}>
              <Text style={styles.tabTitle}>Clientes e Veículos</Text>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsAddingClient(true)}>
                <UserPlus size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Novo Cliente</Text>
              </TouchableOpacity>
            </View>

            {!selectedClient ? (
              <View style={{ flex: 1 }}>
                {/* Client Search Bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 10 }}>
                  <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Buscar por nome, telefone, CPF/CNPJ..."
                    placeholderTextColor="#475569"
                    value={clientTabSearch}
                    onChangeText={setClientTabSearch}
                    style={{ flex: 1, color: '#f1f5f9', fontSize: 11, paddingVertical: 6 }}
                  />
                  {clientTabSearch !== '' && (
                    <TouchableOpacity onPress={() => setClientTabSearch('')}>
                      <X size={14} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Clients List */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {(() => {
                    const filtered = clients.filter(c => 
                      c.name.toLowerCase().includes(clientTabSearch.toLowerCase()) ||
                      (c.phone && c.phone.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
                      (c.email && c.email.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
                      (c.cpfCnpj && c.cpfCnpj.includes(clientTabSearch))
                    );

                    if (filtered.length === 0) {
                      return (
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>
                            {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
                          </Text>
                        </View>
                      );
                    }

                    return filtered.map(client => {
                      const clientCars = vehicles.filter(v => v.clientId === client.id);
                      const totalCars = clientCars.length;
                      return (
                        <TouchableOpacity 
                          key={client.id} 
                          style={[styles.card, { padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                          onPress={() => {
                            setSelectedClient(client);
                            setActiveClientTab('vehicles');
                          }}
                        >
                          <View style={{ flex: 1, gap: 6 }}>
                            <Text style={styles.clientName}>{client.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <Text style={[styles.clientDetails, { marginTop: 0 }]}>{client.phone}</Text>
                              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#475569' }} />
                              <View style={{ 
                                backgroundColor: 'rgba(59, 102, 255, 0.1)', 
                                paddingHorizontal: 8, 
                                paddingVertical: 2, 
                                borderRadius: 8,
                                borderWidth: 0.5,
                                borderColor: 'rgba(59, 102, 255, 0.3)'
                              }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3b66ff' }}>
                                  {totalCars} {totalCars === 1 ? 'VEÍCULO' : 'VEÍCULOS'}
                                </Text>
                              </View>
                            </View>
                            {clientCars.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                {clientCars.map(c => (
                                  <Text key={c.id} style={[styles.catalogItemCodeBadge, { marginTop: 0 }]}>{c.plate.toUpperCase()}</Text>
                                ))}
                              </View>
                            )}
                          </View>
                          <ChevronRight size={18} color="#64748b" />
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </ScrollView>
              </View>
            ) : (
              // Client Profile Details
              <View style={[styles.card, { padding: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity 
                    onPress={() => setSelectedClient(null)} 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <ArrowLeft size={16} color="#3b66ff" />
                    <Text style={{ fontSize: 11, color: '#3b66ff', fontWeight: 'bold', marginLeft: 4 }}>Voltar à Lista</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{ padding: 6, backgroundColor: '#3b66ff', borderRadius: 8 }}
                      onPress={() => {
                        setEditingClientId(selectedClient.id);
                        setClientForm({
                          name: selectedClient.name,
                          cpfCnpj: selectedClient.cpfCnpj || '',
                          phone: selectedClient.phone,
                          whatsapp: selectedClient.whatsapp || '',
                          email: selectedClient.email || '',
                          address: selectedClient.address || '',
                          notes: selectedClient.notes || ''
                        });
                        setIsAddingClient(true);
                      }}
                    >
                      <Edit2 size={12} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ padding: 6, backgroundColor: '#ef4444', borderRadius: 8 }}
                      onPress={() => {
                        Alert.alert(
                          'Excluir Cliente',
                          'Tem certeza que deseja excluir este cliente e todos os seus veículos?',
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Excluir',
                              style: 'destructive',
                              onPress: async () => {
                                const success = await deleteClient(selectedClient.id);
                                if (success) {
                                  setSelectedClient(null);
                                  Alert.alert('Sucesso', 'Cliente excluído com sucesso!');
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Trash2 size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.clientName}>{selectedClient.name}</Text>
                <Text style={styles.clientDetails}>Tel: {selectedClient.phone} | WhatsApp: {selectedClient.whatsapp}</Text>
                <Text style={styles.clientDetails}>E-mail: {selectedClient.email || 'N/A'}</Text>
                <Text style={styles.clientDetails}>Endereço: {selectedClient.address || 'N/A'}</Text>

                {selectedClient.notes ? (
                  <View style={{ backgroundColor: '#0a0c10', padding: 8, borderRadius: 8, marginVertical: 8 }}>
                    <Text style={{ fontSize: 8, color: '#64748b', fontWeight: 'bold' }}>OBSERVAÇÕES DO CLIENTE</Text>
                    <Text style={{ fontSize: 9, color: '#cbd5e1', marginTop: 2 }}>{selectedClient.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.catalogSegmentContainer}>
                  <TouchableOpacity 
                    onPress={() => setActiveClientTab('vehicles')}
                    style={[styles.catalogSegmentTab, activeClientTab === 'vehicles' ? styles.catalogSegmentTabActive : null]}
                  >
                    <Text style={[styles.catalogSegmentTabText, activeClientTab === 'vehicles' ? styles.catalogSegmentTabTextActive : null]}>Veículos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActiveClientTab('history')}
                    style={[styles.catalogSegmentTab, activeClientTab === 'history' ? styles.catalogSegmentTabActive : null]}
                  >
                    <Text style={[styles.catalogSegmentTabText, activeClientTab === 'history' ? styles.catalogSegmentTabTextActive : null]}>Histórico OS</Text>
                  </TouchableOpacity>
                </View>

                {activeClientTab === 'vehicles' ? (
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.sectionTitle}>FROTA VINCULADA</Text>
                      <TouchableOpacity style={styles.actionButton} onPress={() => setIsAddingVehicle(true)}>
                        <Car size={12} color="#fff" />
                        <Text style={styles.actionButtonText}>+ Carro</Text>
                      </TouchableOpacity>
                    </View>

                    {vehicles.filter(v => v.clientId === selectedClient.id).length === 0 ? (
                      <Text style={styles.emptyText}>Nenhum veículo associado.</Text>
                    ) : (
                      vehicles.filter(v => v.clientId === selectedClient.id).map(car => (
                        <View key={car.id} style={[styles.carRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Car size={14} color="#3b66ff" />
                            <View style={{ marginLeft: 8, flex: 1 }}>
                              <Text style={styles.carText}>{car.brand} {car.model} ({car.year})</Text>
                              <Text style={{ fontSize: 8, color: '#64748b' }}>Placa: {car.plate} | Km: {car.odometer}</Text>
                            </View>
                          </View>
                          
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={{ padding: 6, backgroundColor: 'rgba(59, 102, 255, 0.1)', borderRadius: 6 }}
                              onPress={() => {
                                setEditingVehicleId(car.id);
                                setVehicleForm({
                                  plate: car.plate,
                                  brand: car.brand,
                                  model: car.model,
                                  year: car.year,
                                  chassis: car.chassis || '',
                                  odometer: car.odometer
                                });
                                setIsAddingVehicle(true);
                              }}
                            >
                              <Edit2 size={10} color="#3b66ff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}
                              onPress={() => {
                                Alert.alert(
                                  'Excluir Veículo',
                                  'Deseja desvincular este veículo da frota?',
                                  [
                                    { text: 'Cancelar', style: 'cancel' },
                                    {
                                      text: 'Excluir',
                                      style: 'destructive',
                                      onPress: async () => {
                                        const success = await deleteVehicle(car.id);
                                        if (success) {
                                          Alert.alert('Sucesso', 'Veículo removido com sucesso!');
                                        }
                                      }
                                    }
                                  ]
                                );
                              }}
                            >
                              <Trash2 size={10} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.sectionTitle}>HISTÓRICO COMPLETO</Text>
                    {workOrders.filter(o => o.clientId === selectedClient.id).length === 0 ? (
                      <Text style={styles.emptyText}>Nenhuma OS encontrada para este cliente.</Text>
                    ) : (
                      workOrders.filter(o => o.clientId === selectedClient.id).map(os => (
                        <TouchableOpacity 
                          key={os.id} 
                          style={styles.listItem}
                          onPress={() => handleShareOS(os)}
                        >
                          <View>
                            <Text style={styles.osNum}>{os.osNumber}</Text>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>{os.date.split('-').reverse().join('/')}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.osTotal}>{formatCurrency(os.grandTotal)}</Text>
                            <Text style={styles.osStatus}>{os.status}</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: WORK ORDERS */}
        {currentTab === 'os' && (
          <View style={styles.screenContainer}>
            {!selectedOS ? (
              // 1. OS LIST VIEW
              <View style={{ flex: 1 }}>
                <View style={styles.screenHeader}>
                  <Text style={styles.tabTitle}>Ordens de Serviço</Text>
                  <TouchableOpacity style={styles.actionButton} onPress={handleNewOS}>
                    <Plus size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Nova OS</Text>
                  </TouchableOpacity>
                </View>

                {/* OS Search Bar */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, marginBottom: 10 }}>
                  <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
                  <TextInput
                    placeholder="Buscar por OS, cliente, placa..."
                    placeholderTextColor="#475569"
                    value={osSearch}
                    onChangeText={setOsSearch}
                    style={{ flex: 1, color: '#f1f5f9', fontSize: 11, paddingVertical: 6 }}
                  />
                  {osSearch !== '' && (
                    <TouchableOpacity onPress={() => setOsSearch('')}>
                      <X size={14} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* OS Status Horizontal Slider Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10, height: 26 }}>
                  {['Todos', 'Aberta', 'Em andamento', 'Concluída', 'Entregue'].map(st => {
                    const isActive = osStatusFilter === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setOsStatusFilter(st as any)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isActive ? '#3b66ff' : '#1e293b',
                          backgroundColor: isActive ? '#3b66ff' : '#0f172a',
                          marginRight: 6
                        }}
                      >
                        <Text style={{ fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: isActive ? '#fff' : '#64748b' }}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* OS List */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {workOrders.filter(os => {
                    const client = clients.find(c => c.id === os.clientId);
                    const vehicle = vehicles.find(v => v.id === os.vehicleId);
                    
                    const matchesSearch = 
                      os.osNumber.toLowerCase().includes(osSearch.toLowerCase()) ||
                      (client?.name || '').toLowerCase().includes(osSearch.toLowerCase()) ||
                      (vehicle?.plate || '').toLowerCase().includes(osSearch.toLowerCase());

                    const matchesStatus = osStatusFilter === 'Todos' || os.status === osStatusFilter;

                    return matchesSearch && matchesStatus;
                  }).length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Nenhuma OS encontrada.</Text>
                    </View>
                  ) : (
                    workOrders.filter(os => {
                      const client = clients.find(c => c.id === os.clientId);
                      const vehicle = vehicles.find(v => v.id === os.vehicleId);
                      
                      const matchesSearch = 
                        os.osNumber.toLowerCase().includes(osSearch.toLowerCase()) ||
                        (client?.name || '').toLowerCase().includes(osSearch.toLowerCase()) ||
                        (vehicle?.plate || '').toLowerCase().includes(osSearch.toLowerCase());

                      const matchesStatus = osStatusFilter === 'Todos' || os.status === osStatusFilter;

                      return matchesSearch && matchesStatus;
                    }).map(os => {
                      const client = clients.find(c => c.id === os.clientId);
                      const vehicle = vehicles.find(v => v.id === os.vehicleId);
                      const billing = billings.find(b => b.osId === os.id);
                      let osStatusStyle = styles.cardOpen;
                      let badgeColor = 'rgba(59, 102, 255, 0.1)';
                      let badgeTextColor = '#3b66ff';
                      let badgeBorderColor = 'rgba(59, 102, 255, 0.3)';
                      if (os.status === 'Em andamento') {
                        osStatusStyle = styles.cardProgress;
                        badgeColor = 'rgba(234, 179, 8, 0.1)';
                        badgeTextColor = '#eab308';
                        badgeBorderColor = 'rgba(234, 179, 8, 0.3)';
                      } else if (os.status === 'Concluída') {
                        osStatusStyle = styles.cardDone;
                        badgeColor = 'rgba(34, 197, 94, 0.1)';
                        badgeTextColor = '#22c55e';
                        badgeBorderColor = 'rgba(34, 197, 94, 0.3)';
                      } else if (os.status === 'Entregue') {
                        osStatusStyle = styles.cardDelivered;
                        badgeColor = '#272e3f';
                        badgeTextColor = '#cbd5e1';
                        badgeBorderColor = '#272e3f';
                      }

                      return (
                        <TouchableOpacity
                          key={os.id}
                          onPress={() => setSelectedOS(os)}
                          style={[styles.card, osStatusStyle, { padding: 18, marginBottom: 12 }]}
                        >
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.cardHeaderLeft}>
                              <Text style={[styles.osNum, { color: '#3b66ff', fontWeight: '900' }]}>{os.osNumber}</Text>
                              <View style={[
                                styles.statusBadge, 
                                { backgroundColor: badgeColor, borderColor: badgeBorderColor, borderWidth: 1 }
                              ]}>
                                <Text style={{ fontSize: 9, fontWeight: '900', color: badgeTextColor, textTransform: 'uppercase' }}>
                                  {os.status}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.osDate}>{os.date.split('-').reverse().join('/')}</Text>
                          </View>
                          
                          <View style={{ marginVertical: 4 }}>
                            <Text style={styles.cardLabelText}>Cliente</Text>
                            <Text style={[styles.cardValueText, { color: '#fff', fontWeight: 'bold' }]}>{client?.name}</Text>
                            
                            {vehicle && (
                              <>
                                <Text style={styles.cardLabelText}>Veículo</Text>
                                <Text style={styles.cardValueText}>
                                  {vehicle.brand} {vehicle.model} • Placa: <Text style={{ fontWeight: 'bold', color: '#cbd5e1' }}>{vehicle.plate.toUpperCase()}</Text>
                                </Text>
                              </>
                            )}
                          </View>

                          <View style={styles.cardFooterRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {billing ? (
                                <View style={{ 
                                  backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6
                                }}>
                                  <Text style={{ 
                                    fontSize: 9, 
                                    fontWeight: '900', 
                                    color: billing.status === 'Pago' ? '#22c55e' : '#eab308' 
                                  }}>
                                    💰 {billing.status.toUpperCase()}
                                  </Text>
                                </View>
                              ) : (
                                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#ef4444' }}>
                                    💸 NÃO FATURADA
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.osTotalVal, { fontSize: 16, fontWeight: '900' }]}>{formatCurrency(os.grandTotal)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : (
              // 2. OS DETAILED VIEW
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {/* Header Actions */}
                <View style={[styles.screenHeader, { marginBottom: 16 }]}>
                  <TouchableOpacity 
                    onPress={() => setSelectedOS(null)} 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <ArrowLeft size={20} color="#3b66ff" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 14, color: '#3b66ff', fontWeight: 'bold' }}>Voltar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => handleStartEditOS(selectedOS)} 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 102, 255, 0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
                  >
                    <Edit2 size={14} color="#3b66ff" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, color: '#3b66ff', fontWeight: 'bold' }}>Editar</Text>
                  </TouchableOpacity>
                </View>

                {/* Status selector badges */}
                <Text style={styles.cardLabelText}>Status da Ordem</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, marginTop: 4 }}>
                  {['Aberta', 'Em andamento', 'Concluída', 'Entregue'].map(st => {
                    const isActive = selectedOS.status === st;
                    let activeColor = '#3b66ff';
                    if (st === 'Em andamento') activeColor = '#eab308';
                    else if (st === 'Concluída') activeColor = '#22c55e';
                    else if (st === 'Entregue') activeColor = '#64748b';

                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={async () => {
                          const success = await updateWorkOrderStatus(selectedOS.id, st as OSStatus);
                          if (success) {
                            setSelectedOS(prev => prev ? { ...prev, status: st as OSStatus } : null);
                          }
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          backgroundColor: isActive ? activeColor : '#181c24',
                          borderWidth: 1.5,
                          borderColor: isActive ? activeColor : '#1e293b',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: isActive ? '#fff' : '#64748b', textTransform: 'uppercase' }}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Info Card */}
                <View style={[styles.card, { padding: 18, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#3b66ff' }}>{selectedOS.osNumber}</Text>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Data: {selectedOS.date.split('-').reverse().join('/')}</Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: '#272e3f', paddingTop: 10, gap: 6 }}>
                    <View>
                      <Text style={styles.cardLabelText}>Cliente</Text>
                      <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>{clients.find(c => c.id === selectedOS.clientId)?.name}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardLabelText}>Veículo</Text>
                      <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>
                        {(() => {
                          const v = vehicles.find(veh => veh.id === selectedOS.vehicleId);
                          return v ? `${v.brand} ${v.model} (${v.plate.toUpperCase()})` : 'N/A';
                        })()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Services details */}
                {selectedOS.services.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.cardLabelText}>Serviços Executados</Text>
                    <View style={{ backgroundColor: '#181c24', borderRadius: 16, borderWidth: 1.5, borderColor: '#1e293b', overflow: 'hidden', marginTop: 6 }}>
                      {selectedOS.services.map((s, idx) => (
                        <View key={idx} style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: idx === selectedOS.services.length - 1 ? 0 : 1, borderBottomColor: '#1e293b' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{s.name}</Text>
                            {s.code ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>CÓD: {s.code.toUpperCase()}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{formatCurrency(s.price * (s.quantity || 1))}</Text>
                            {(s.quantity || 1) > 1 ? (
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{(s.quantity || 1)}x {formatCurrency(s.price)}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Parts details */}
                {selectedOS.parts.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.cardLabelText}>Peças Substituídas</Text>
                    <View style={{ backgroundColor: '#181c24', borderRadius: 16, borderWidth: 1.5, borderColor: '#1e293b', overflow: 'hidden', marginTop: 6 }}>
                      {selectedOS.parts.map((p, idx) => (
                        <View key={idx} style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: idx === selectedOS.parts.length - 1 ? 0 : 1, borderBottomColor: '#1e293b' }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{p.name}</Text>
                            {p.code ? <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>SKU: {p.code.toUpperCase()}</Text> : null}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{formatCurrency(p.salePrice * p.quantity)}</Text>
                            {p.quantity > 1 ? (
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{p.quantity}x {formatCurrency(p.salePrice)}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Summary totals */}
                <View style={[styles.card, { padding: 16, gap: 6, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Mão de Obra:</Text>
                    <Text style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 'bold' }}>{formatCurrency(selectedOS.servicesTotal)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Peças:</Text>
                    <Text style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 'bold' }}>{formatCurrency(selectedOS.partsTotal)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#272e3f', paddingTop: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#3b66ff' }}>TOTAL GERAL:</Text>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{formatCurrency(selectedOS.grandTotal)}</Text>
                  </View>
                </View>

                {/* Observations */}
                {selectedOS.notes ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.cardLabelText}>Observações</Text>
                    <View style={{ backgroundColor: '#181c24', padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#1e293b', marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 18 }}>{selectedOS.notes}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Client Signature display */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.cardLabelText}>Assinatura Digital do Cliente</Text>
                  <View style={{ marginTop: 6 }}>
                    {selectedOS.signature ? (
                      <View style={{ backgroundColor: '#181c24', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}>
                        <SvgXml xml={selectedOS.signature} width="220" height="90" />
                        <Text style={{ fontSize: 11, color: '#64748b', fontWeight: 'bold', marginTop: 6, letterSpacing: 0.5 }}>ASSINADO DIGITALMENTE</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        onPress={() => setSigningOSId(selectedOS.id)}
                        style={{ backgroundColor: '#181c24', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#1e293b', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                      >
                        <PenTool size={16} color="#64748b" />
                        <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: 'bold' }}>Coletar Assinatura do Cliente</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Actions Panel */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  <TouchableOpacity 
                    onPress={() => handleShareOS(selectedOS)}
                    style={{ flex: 1, backgroundColor: '#3b66ff', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    <FileText size={16} color="#fff" />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>Imprimir / PDF</Text>
                  </TouchableOpacity>

                  {(() => {
                    const billing = billings.find(b => b.osId === selectedOS.id);
                    if (billing) {
                      return (
                        <View style={{ flex: 1, backgroundColor: 'rgba(34, 197, 94, 0.1)', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#22c55e', textTransform: 'uppercase' }}>💰 FATURADA ({billing.status.toUpperCase()})</Text>
                        </View>
                      );
                    } else {
                      return (
                        <TouchableOpacity 
                          onPress={() => setShowBillingPanel(true)}
                          style={{ flex: 1, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                        >
                          <DollarSign size={16} color="#fff" />
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>Faturar OS</Text>
                        </TouchableOpacity>
                      );
                    }
                  })()}
                </View>
              </ScrollView>
            )}

            {/* MODAL: BILLING PANEL */}
            <Modal visible={showBillingPanel && !!selectedOS} animationType="slide" transparent>
              <View style={styles.modalBg}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Faturamento da OS</Text>
                    <TouchableOpacity onPress={() => setShowBillingPanel(false)}>
                      <X size={20} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 9, color: '#64748b', fontWeight: 'bold' }}>VALOR TOTAL A FATURAR</Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#22c55e', marginTop: 2 }}>
                        {selectedOS ? formatCurrency(selectedOS.grandTotal) : ''}
                      </Text>
                    </View>

                    <Text style={styles.inputLabel}>Forma de Pagamento</Text>
                    <View style={styles.pickerFakeRow}>
                      {['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto'].map(method => (
                        <TouchableOpacity 
                          key={method}
                          onPress={() => setBillingForm(prev => ({ ...prev, paymentMethod: method as any }))}
                          style={[styles.pickerTag, billingForm.paymentMethod === method ? styles.pickerTagActive : null]}
                        >
                          <Text style={[styles.pickerTagText, billingForm.paymentMethod === method ? styles.pickerTagActiveText : null]}>{method}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.inputLabel}>Número de Parcelas</Text>
                    <View style={styles.pickerFake}>
                      {['1', '2', '3', '4', '6', '12'].map(count => {
                        const label = count === '1' ? 'À vista (1x)' : `${count} parcelas`;
                        return (
                          <TouchableOpacity 
                            key={count} 
                            onPress={() => setBillingForm(prev => ({ ...prev, installmentsCount: count }))}
                            style={[styles.pickerItem, billingForm.installmentsCount === count ? styles.pickerItemActive : null]}
                          >
                            <Text style={[styles.pickerItemText, billingForm.installmentsCount === count ? styles.pickerItemActiveText : null]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Prévia das Parcelas */}
                    <Text style={styles.inputLabel}>Prévia das Parcelas</Text>
                    <View style={{ backgroundColor: '#0a0c10', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', marginBottom: 15 }}>
                      {(() => {
                        if (!selectedOS) return null;
                        const arr = [];
                        const count = parseInt(billingForm.installmentsCount);
                        const baseVal = selectedOS.grandTotal / count;
                        for (let i = 1; i <= count; i++) {
                          const d = new Date();
                          d.setDate(d.getDate() + (30 * (i - 1)));
                          arr.push(
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>Parcela {i}:</Text>
                              <Text style={{ fontSize: 9, color: '#f1f5f9', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {formatCurrency(baseVal)} • Venc: {d.toLocaleDateString('pt-BR')}
                              </Text>
                            </View>
                          );
                        }
                        return arr;
                      })()}
                    </View>

                    <TouchableOpacity style={styles.submitButton} onPress={handleFaturarOS}>
                      <Text style={styles.submitButtonText}>Confirmar e Faturar OS</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* TAB 4: FINANCE */}
        {currentTab === 'finance' && (
          <View style={styles.screenContainer}>
            <View style={styles.screenHeader}>
              <Text style={styles.tabTitle}>Financeiro</Text>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#ef4444' }]} onPress={() => setIsAddingExpense(true)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Despesa</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Balanço Geral */}
              <View style={[styles.card, styles.balanceCard, { paddingVertical: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.balanceLabel}>SALDO EM CAIXA (ATUAL)</Text>
                    <Text style={[styles.balanceValue, saldoAtual >= 0 ? styles.textGreen : styles.textRed, { fontSize: 22, marginTop: 4 }]}>
                      {formatCurrency(saldoAtual)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: 'bold' }}>
                      Faturamento: <Text style={{ color: '#f1f5f9' }}>{formatCurrency(faturamentoMes)}</Text>
                    </Text>
                    <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: 'bold' }}>
                      A Receber: <Text style={{ color: '#3b66ff' }}>{formatCurrency(totalAReceber)}</Text>
                    </Text>
                  </View>
                </View>
                <View style={[styles.balanceSummary, { borderTopWidth: 1, borderTopColor: '#1e293b', marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text style={styles.balanceSubText}>Total Entradas: <Text style={styles.textGreen}>{formatCurrency(totalRecebido)}</Text></Text>
                  <Text style={styles.balanceSubText}>Total Saídas: <Text style={styles.textRed}>{formatCurrency(totalDespesas)}</Text></Text>
                </View>
              </View>

              {/* Resumo por Período */}
              <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#f1f5f9' }}>RESUMO POR PERÍODO</Text>
                    <Text style={{ fontSize: 7, color: '#64748b' }}>Entradas, saídas e resultado líquido</Text>
                  </View>
                  
                  {/* Seletores de Período */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 8, padding: 2 }}>
                    {(['diario', 'semanal', 'mensal'] as const).map(period => (
                      <TouchableOpacity
                        key={period}
                        onPress={() => setSummaryPeriod(period)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: summaryPeriod === period ? '#3b66ff' : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 8, fontWeight: 'bold', color: summaryPeriod === period ? '#fff' : '#64748b' }}>
                          {period === 'diario' ? 'Diário' : period === 'semanal' ? 'Semanal' : 'Mensal'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Grid de Período */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {/* Entradas */}
                  <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#22c55e' }}>ENTRADAS</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                      {formatCurrency(
                        summaryPeriod === 'diario' ? entradasHoje :
                        summaryPeriod === 'semanal' ? entradasSemana :
                        entradasMes
                      )}
                    </Text>
                  </View>
                  {/* Saídas */}
                  <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#ef4444' }}>SAÍDAS</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                      {formatCurrency(
                        summaryPeriod === 'diario' ? saidasHoje :
                        summaryPeriod === 'semanal' ? saidasSemana :
                        saidasMes
                      )}
                    </Text>
                  </View>
                  {/* Líquido */}
                  <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#3b66ff' }}>LÍQUIDO</Text>
                    <Text style={[
                      { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
                      (summaryPeriod === 'diario' ? saldoHoje : summaryPeriod === 'semanal' ? saldoSemana : saldoMes) >= 0
                        ? styles.textGreen
                        : styles.textRed
                    ]}>
                      {formatCurrency(
                        summaryPeriod === 'diario' ? saldoHoje :
                        summaryPeriod === 'semanal' ? saldoSemana :
                        saldoMes
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Listagem de Transações com Filtro */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 }}>
                <Text style={styles.sectionTitle}>TRANSAÇÕES</Text>
                
                <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 8, padding: 2 }}>
                  {(['Todos', 'Entradas', 'Saídas'] as const).map(fl => (
                    <TouchableOpacity
                      key={fl}
                      onPress={() => setActiveFinanceFilter(fl)}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: activeFinanceFilter === fl ? '#3b66ff' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 8, fontWeight: 'bold', color: activeFinanceFilter === fl ? '#fff' : '#94a3b8' }}>
                        {fl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Lista de Transações */}
              {transactions.filter(t => {
                if (activeFinanceFilter === 'Todos') return true;
                return activeFinanceFilter === 'Entradas' ? t.type === 'Entrada' : t.type === 'Saída';
              }).length === 0 ? (
                <Text style={styles.emptyText}>Nenhum lançamento encontrado.</Text>
              ) : (
                transactions.filter(t => {
                  if (activeFinanceFilter === 'Todos') return true;
                  return activeFinanceFilter === 'Entradas' ? t.type === 'Entrada' : t.type === 'Saída';
                }).map(t => {
                  const isInflow = t.type === 'Entrada';
                  const transStyle = isInflow ? styles.cardInflow : styles.cardOutflow;
                  return (
                    <View key={t.id} style={[styles.listItem, transStyle, { borderWidth: 1.5, padding: 18, marginBottom: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                        <View style={{ 
                          backgroundColor: isInflow ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          padding: 10, 
                          borderRadius: 12 
                        }}>
                          {isInflow ? (
                            <ArrowUpRight size={16} color="#22c55e" />
                          ) : (
                            <ArrowDownRight size={16} color="#ef4444" />
                          )}
                        </View>
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={styles.tDesc} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={[styles.tDate, { textTransform: 'uppercase', fontWeight: 'bold' }]}>
                            {t.category} • {t.date.split('-').reverse().join('/')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={[styles.tAmount, { 
                          color: isInflow ? '#22c55e' : '#ef4444' 
                        }]}>
                          {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                        </Text>
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8 }}
                          onPress={() => {
                            Alert.alert(
                              'Excluir Transação',
                              'Deseja excluir este lançamento financeiro? O saldo será recalculado.',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Excluir',
                                  style: 'destructive',
                                  onPress: async () => {
                                    await deleteTransaction(t.id);
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 5: MORE */}
        {currentTab === 'more' && moreSubScreen === 'menu' && (
          <View style={styles.screenContainer}>
            <Text style={styles.tabTitle}>Mais Opções</Text>
            <Text style={[styles.menuCardSub, { marginBottom: 15 }]}>Ferramentas SaaS de suporte administrativo</Text>

            <TouchableOpacity 
              style={[styles.card, styles.menuCard]} 
              onPress={() => {
                setMoreSubScreen('catalog');
                setCatalogSegment('services');
              }}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIconContainer}>
                  <Package size={18} color="#3b66ff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuCardTitle}>Catálogo de Serviços e Peças</Text>
                  <Text style={styles.menuCardSub}>Configure preços e quantidade em estoque.</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.menuCard]} 
              onPress={() => {
                setMoreSubScreen('billing');
                setSelectedBillingDetail(null);
                setBillingSearch('');
                setBillingStatusFilter('Todos');
              }}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIconContainer}>
                  <Wallet size={18} color="#3b66ff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuCardTitle}>Cobranças & Parcelamentos</Text>
                  <Text style={styles.menuCardSub}>Controle de recebimentos de OS e parcelas.</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.menuCard]} 
              onPress={() => setMoreSubScreen('settings')}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIconContainer}>
                  <Settings size={18} color="#3b66ff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuCardTitle}>Dados da Oficina & Configurações</Text>
                  <Text style={styles.menuCardSub}>Edite CNPJ, cabeçalho de PDFs e backups.</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        {/* SUB MORE: CATALOG */}
        {currentTab === 'more' && moreSubScreen === 'catalog' && (
          <View style={styles.screenContainer}>
            <View style={styles.screenHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setMoreSubScreen('menu')}>
                <ArrowLeft size={14} color="#fff" />
                <Text style={styles.backButtonText}>Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if (catalogSegment === 'services') setIsAddingCatalogService(true);
                  else setIsAddingCatalogPart(true);
                }}
              >
                <Plus size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Cadastrar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.catalogSegmentContainer}>
              <TouchableOpacity 
                onPress={() => setCatalogSegment('services')}
                style={[styles.catalogSegmentTab, catalogSegment === 'services' ? styles.catalogSegmentTabActive : null]}
              >
                <Text style={[styles.catalogSegmentTabText, catalogSegment === 'services' ? styles.catalogSegmentTabTextActive : null]}>Serviços ({services.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setCatalogSegment('parts')}
                style={[styles.catalogSegmentTab, catalogSegment === 'parts' ? styles.catalogSegmentTabActive : null]}
              >
                <Text style={[styles.catalogSegmentTabText, catalogSegment === 'parts' ? styles.catalogSegmentTabTextActive : null]}>Peças ({parts.length})</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.catalogSearchWrapper}>
              <Search size={14} color="#64748b" style={styles.catalogSearchIcon} />
              <TextInput 
                placeholder="Buscar no catálogo..."
                placeholderTextColor="#475569"
                value={catalogSearch}
                onChangeText={setCatalogSearch}
                style={styles.catalogSearchInput}
              />
            </View>

            <View style={{ marginTop: 8 }}>
              {catalogSegment === 'services' ? (
                services.filter(s => s.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(item => (
                  <View key={item.id} style={[styles.catalogListItem, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      {item.code ? <Text style={styles.catalogItemCodeBadge}>{item.code}</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.price)}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={{ padding: 6, backgroundColor: 'rgba(59, 102, 255, 0.1)', borderRadius: 6 }}
                          onPress={() => {
                            setEditingServiceId(item.id);
                            setServiceForm({
                              name: item.name,
                              code: item.code || '',
                              description: item.description || '',
                              price: item.price.toString()
                            });
                            setIsAddingCatalogService(true);
                          }}
                        >
                          <Edit2 size={10} color="#3b66ff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}
                          onPress={() => {
                            Alert.alert(
                              'Excluir Serviço',
                              'Tem certeza que deseja remover este serviço do catálogo?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Excluir',
                                  style: 'destructive',
                                  onPress: async () => {
                                    const success = await deleteService(item.id);
                                    if (success) {
                                      Alert.alert('Sucesso', 'Serviço removido com sucesso!');
                                    }
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Trash2 size={10} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                parts.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(item => (
                  <View key={item.id} style={[styles.catalogListItem, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      <Text style={styles.clientDetails}>SKU: {item.code} | Forn: {item.supplier}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.salePrice)}</Text>
                        <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>Estoque: {item.stock}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={{ padding: 6, backgroundColor: 'rgba(59, 102, 255, 0.1)', borderRadius: 6 }}
                          onPress={() => {
                            setEditingPartId(item.id);
                            setPartForm({
                              name: item.name,
                              code: item.code,
                              supplier: item.supplier || '',
                              purchasePrice: item.purchasePrice.toString(),
                              salePrice: item.salePrice.toString(),
                              stock: item.stock.toString()
                            });
                            setIsAddingCatalogPart(true);
                          }}
                        >
                          <Edit2 size={10} color="#3b66ff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ padding: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6 }}
                          onPress={() => {
                            Alert.alert(
                              'Excluir Peça',
                              'Tem certeza que deseja remover esta peça do catálogo?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Excluir',
                                  style: 'destructive',
                                  onPress: async () => {
                                    const success = await deletePart(item.id);
                                    if (success) {
                                      Alert.alert('Sucesso', 'Peça removida com sucesso!');
                                    }
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Trash2 size={10} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* SUB MORE: SETTINGS & BACKUP */}
        {currentTab === 'more' && moreSubScreen === 'settings' && (
          <View style={styles.screenContainer}>
            <TouchableOpacity style={[styles.backButton, { marginBottom: 12 }]} onPress={() => setMoreSubScreen('menu')}>
              <ArrowLeft size={14} color="#fff" />
              <Text style={styles.backButtonText}>Menu</Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 10 }}>Dados Comerciais</Text>
              
              <Text style={styles.formLabel}>Nome Fantasia</Text>
              <TextInput 
                value={settings.name} 
                onChangeText={t => updateSettings({ name: t })}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>CNPJ</Text>
              <TextInput 
                value={settings.cnpj} 
                onChangeText={t => updateSettings({ cnpj: t })}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>Endereço Comercial</Text>
              <TextInput 
                value={settings.address} 
                onChangeText={t => updateSettings({ address: t })}
                style={styles.formInput} 
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Telefone Comercial</Text>
                  <TextInput 
                    value={settings.phone} 
                    onChangeText={t => updateSettings({ phone: t })}
                    style={styles.formInput} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>WhatsApp</Text>
                  <TextInput 
                    value={settings.whatsapp} 
                    onChangeText={t => updateSettings({ whatsapp: t })}
                    style={styles.formInput} 
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>E-mail de Contato</Text>
              <TextInput 
                value={settings.email} 
                onChangeText={t => updateSettings({ email: t })}
                style={styles.formInput} 
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>URL do Logotipo (.png/.jpg)</Text>
              <TextInput 
                value={settings.logoUrl} 
                onChangeText={t => updateSettings({ logoUrl: t })}
                style={styles.formInput} 
                autoCapitalize="none"
              />

              <Text style={styles.formLabel}>Notas de Rodapé do PDF</Text>
              <TextInput 
                value={settings.pdfNotes} 
                onChangeText={t => updateSettings({ pdfNotes: t })}
                style={styles.formInput} 
              />

              {/* Toggle autoSequence */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 10, marginTop: 4 }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>Numeração de OS automática</Text>
                  <Text style={{ color: '#64748b', fontSize: 8 }}>Gera OS-0001, OS-0002 em sequência</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => updateSettings({ autoSequence: !settings.autoSequence })}
                  style={{ 
                    width: 40, 
                    height: 22, 
                    borderRadius: 11, 
                    backgroundColor: settings.autoSequence ? '#3b66ff' : '#1e293b', 
                    padding: 2, 
                    justifyContent: 'center', 
                    alignItems: settings.autoSequence ? 'flex-end' : 'flex-start' 
                  }}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 6 }}>Backup & Segurança</Text>
              <Text style={styles.clientDetails}>Exporte seus cadastros de clientes, carros e finanças para segurança física offline, permitindo restaurar a qualquer momento.</Text>
              
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' }} 
                  onPress={handleExportBackup}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Exportar JSON</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' }} 
                  onPress={handleImportBackup}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Importar JSON</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={{ backgroundColor: '#1e293b', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 1, borderColor: '#10b981' }} 
                onPress={handleExportCsv}
              >
                <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 11 }}>Exportar Ordens (Excel .CSV)</Text>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: '#1e293b', marginVertical: 12 }} />

              <TouchableOpacity 
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }} 
                onPress={handleResetDatabase}
              >
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 11 }}>Resetar Base de Dados (Limpar Tudo)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SUB MORE: BILLINGS & INSTALLMENTS */}
        {currentTab === 'more' && moreSubScreen === 'billing' && (
          <View style={styles.screenContainer}>
            {!selectedBillingDetail ? (
              <View style={{ flex: 1 }}>
                <View style={[styles.screenHeader, { marginBottom: 16 }]}>
                  <TouchableOpacity style={styles.backButton} onPress={() => setMoreSubScreen('menu')}>
                    <ArrowLeft size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.backButtonText}>Menu</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>Cobranças</Text>
                </View>

                {/* Busca */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 }}>
                  <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Buscar por OS ou cliente..."
                    placeholderTextColor="#475569"
                    value={billingSearch}
                    onChangeText={setBillingSearch}
                    style={{ flex: 1, color: '#f1f5f9', fontSize: 14, paddingVertical: 8 }}
                  />
                  {billingSearch !== '' && (
                    <TouchableOpacity onPress={() => setBillingSearch('')}>
                      <X size={16} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filtro de Status horizontal */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14, height: 32 }}>
                  {['Todos', 'Pendente', 'Parcialmente pago', 'Pago', 'Cancelado'].map(st => {
                    const isActive = billingStatusFilter === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setBillingStatusFilter(st as any)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: isActive ? '#3b66ff' : '#1e293b',
                          backgroundColor: isActive ? '#3b66ff' : '#181c24',
                          marginRight: 6
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: isActive ? '#fff' : '#64748b' }}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Lista */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {billings.filter(b => {
                    const os = workOrders.find(o => o.id === b.osId);
                    const client = os ? clients.find(c => c.id === os.clientId) : null;
                    const matchesSearch = 
                      (os?.osNumber || '').toLowerCase().includes(billingSearch.toLowerCase()) ||
                      (client?.name || '').toLowerCase().includes(billingSearch.toLowerCase());
                    const matchesStatus = billingStatusFilter === 'Todos' || b.status === billingStatusFilter;
                    return matchesSearch && matchesStatus;
                  }).length === 0 ? (
                    <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                      <Text style={styles.emptyText}>Nenhuma cobrança encontrada.</Text>
                    </View>
                  ) : (
                    billings.filter(b => {
                      const os = workOrders.find(o => o.id === b.osId);
                      const client = os ? clients.find(c => c.id === os.clientId) : null;
                      const matchesSearch = 
                        (os?.osNumber || '').toLowerCase().includes(billingSearch.toLowerCase()) ||
                        (client?.name || '').toLowerCase().includes(billingSearch.toLowerCase());
                      const matchesStatus = billingStatusFilter === 'Todos' || b.status === billingStatusFilter;
                      return matchesSearch && matchesStatus;
                    }).map(b => {
                      const os = workOrders.find(o => o.id === b.osId);
                      const client = os ? clients.find(c => c.id === os.clientId) : null;
                      const paidCount = b.installments.filter(i => i.status === 'Pago').length;
                      
                      let badgeColor = 'rgba(59, 102, 255, 0.1)';
                      let badgeTextColor = '#3b66ff';
                      let cardBorderColor = 'rgba(59, 102, 255, 0.2)';
                      if (b.status === 'Pago') {
                        badgeColor = 'rgba(34, 197, 94, 0.1)';
                        badgeTextColor = '#22c55e';
                        cardBorderColor = 'rgba(34, 197, 94, 0.3)';
                      } else if (b.status === 'Parcialmente pago') {
                        badgeColor = 'rgba(234, 179, 8, 0.1)';
                        badgeTextColor = '#eab308';
                        cardBorderColor = 'rgba(234, 179, 8, 0.3)';
                      } else if (b.status === 'Cancelado') {
                        badgeColor = 'rgba(100, 116, 139, 0.1)';
                        badgeTextColor = '#64748b';
                        cardBorderColor = '#272e3f';
                      }

                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => setSelectedBillingDetail(b)}
                          style={[styles.card, { padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: cardBorderColor, borderWidth: 1.5 }]}
                        >
                          <View style={{ flex: 1, paddingRight: 10, gap: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#fff' }}>OS-{os?.osNumber || 'S/N'}</Text>
                              <View style={{ backgroundColor: badgeColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: badgeTextColor }}>{b.status.toUpperCase()}</Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 13, color: '#f8fafc', fontWeight: 'bold' }} numberOfLines={1}>{client?.name}</Text>
                            <Text style={{ fontSize: 12, color: '#cbd5e1' }}>
                              Método: {b.paymentMethod} • Parcelas: <Text style={{ color: '#3b66ff', fontWeight: 'bold' }}>{paidCount}/{b.installments.length}</Text>
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            <Text style={{ fontSize: 15, fontWeight: 'black', color: '#fff' }}>{formatCurrency(b.amount)}</Text>
                            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Venc: {b.dueDate.split('-').reverse().join('/')}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => setSelectedBillingDetail(null)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                >
                  <ArrowLeft size={20} color="#3b66ff" />
                  <Text style={{ fontSize: 14, color: '#3b66ff', fontWeight: 'bold', marginLeft: 6 }}>Voltar</Text>
                </TouchableOpacity>

                {/* Detalhes Cabeçalho */}
                <View style={[styles.card, { padding: 18, marginBottom: 16 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View>
                      <Text style={styles.cardLabelText}>COBRANÇA DA ORDEM</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#3b66ff', marginTop: 2 }}>
                        OS-{workOrders.find(o => o.id === selectedBillingDetail.osId)?.osNumber || 'S/N'}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: selectedBillingDetail.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : selectedBillingDetail.status === 'Parcialmente pago' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 102, 255, 0.1)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}>
                      <Text style={{
                        fontSize: 9,
                        fontWeight: 'bold',
                        color: selectedBillingDetail.status === 'Pago' ? '#22c55e' : selectedBillingDetail.status === 'Parcialmente pago' ? '#eab308' : '#3b66ff'
                      }}>{selectedBillingDetail.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: '#272e3f', paddingTop: 10, gap: 6 }}>
                    <View>
                      <Text style={styles.cardLabelText}>Cliente</Text>
                      <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>
                        {(() => {
                          const os = workOrders.find(o => o.id === selectedBillingDetail.osId);
                          const client = os ? clients.find(c => c.id === os.clientId) : null;
                          return client ? client.name : 'Cliente';
                        })()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.cardLabelText}>Forma de Recebimento</Text>
                      <Text style={{ fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>{selectedBillingDetail.paymentMethod}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardLabelText}>Valor Total</Text>
                      <Text style={{ fontSize: 16, color: '#22c55e', fontWeight: '900', marginTop: 2 }}>{formatCurrency(selectedBillingDetail.amount)}</Text>
                    </View>
                  </View>
                </View>

                {/* Lista de Parcelas */}
                <Text style={[styles.cardLabelText, { marginBottom: 10 }]}>
                  LISTA CRONOLÓGICA DE PARCELAS
                </Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {selectedBillingDetail.installments.map((inst, index) => {
                    const isPaid = inst.status === 'Pago';
                    return (
                      <View
                        key={index}
                        style={[
                          styles.card,
                          {
                            padding: 16,
                            marginBottom: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderColor: isPaid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                            borderWidth: 1.5,
                            shadowColor: isPaid ? '#22c55e' : '#eab308',
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                          }
                        ]}
                      >
                        <View style={{ flex: 1, paddingRight: 8, gap: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>Parcela {inst.number} de {selectedBillingDetail.installments.length}</Text>
                            <View style={{ backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: isPaid ? '#22c55e' : '#eab308' }}>{inst.status.toUpperCase()}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 12, color: '#cbd5e1' }}>
                            Vencimento: {inst.dueDate.split('-').reverse().join('/')}
                            {isPaid && inst.paidAt && ` • Pago em: ${inst.paidAt.split('T')[0].split('-').reverse().join('/')}`}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>{formatCurrency(inst.amount)}</Text>
                          {!isPaid ? (
                            <TouchableOpacity
                              onPress={async () => {
                                const success = await payInstallment(selectedBillingDetail.id, inst.number);
                                if (success) {
                                  setSelectedBillingDetail(prev => {
                                    if (!prev) return null;
                                    const updatedInstallments = prev.installments.map(i => 
                                      i.number === inst.number ? { ...i, status: 'Pago' as const, paidAt: new Date().toISOString() } : i
                                    );
                                    const paidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
                                    const newStatus = paidCount === updatedInstallments.length ? 'Pago' as const : 'Parcialmente pago' as const;
                                    return { ...prev, status: newStatus, installments: updatedInstallments };
                                  });
                                  Alert.alert('Sucesso', 'Baixa realizada com sucesso!');
                                }
                              }}
                              style={{
                                backgroundColor: '#10b981',
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 10
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>BAIXAR</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 6, borderRadius: 12 }}>
                              <Check size={14} color="#22c55e" />
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* FOOTER TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('dashboard')}>
          <Menu size={20} color={currentTab === 'dashboard' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'dashboard' ? styles.tabLabelActive : null]}>Painel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('clients'); setSelectedClient(null); }}>
          <Users size={20} color={currentTab === 'clients' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'clients' ? styles.tabLabelActive : null]}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('os')}>
          <ClipboardList size={20} color={currentTab === 'os' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'os' ? styles.tabLabelActive : null]}>Serviços</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('finance')}>
          <Wallet size={20} color={currentTab === 'finance' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'finance' ? styles.tabLabelActive : null]}>Financeiro</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => { setCurrentTab('more'); setMoreSubScreen('menu'); }}>
          <MoreHorizontal size={20} color={currentTab === 'more' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'more' ? styles.tabLabelActive : null]}>Mais</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODAL: SIGNATURE OVERLAY --- */}
      <Modal visible={signingOSId !== null} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            {signingOSId && (
              <SignaturePad 
                onSave={async (svg) => {
                  const success = await saveWorkOrderSignature(signingOSId, svg);
                  if (success) {
                    if (selectedOS && selectedOS.id === signingOSId) {
                      setSelectedOS(prev => prev ? { ...prev, signature: svg } : null);
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
      <Modal visible={isAddingClient} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingClientId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingClient(false);
                setEditingClientId(null);
                setClientForm({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
              }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome Completo / Razão Social *</Text>
              <TextInput 
                placeholder="Ex: João da Silva" 
                placeholderTextColor="#475569"
                value={clientForm.name} 
                onChangeText={t => setClientForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>CPF / CNPJ</Text>
              <TextInput 
                placeholder="Ex: 123.456.789-00" 
                placeholderTextColor="#475569"
                value={clientForm.cpfCnpj} 
                onChangeText={t => setClientForm(prev => ({ ...prev, cpfCnpj: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Telefone *</Text>
              <TextInput 
                placeholder="Ex: (11) 4500-0000" 
                placeholderTextColor="#475569"
                value={clientForm.phone} 
                onChangeText={t => setClientForm(prev => ({ ...prev, phone: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>WhatsApp / Celular</Text>
              <TextInput 
                placeholder="Ex: (11) 99999-9999" 
                placeholderTextColor="#475569"
                value={clientForm.whatsapp} 
                onChangeText={t => setClientForm(prev => ({ ...prev, whatsapp: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput 
                placeholder="Ex: joao@email.com" 
                placeholderTextColor="#475569"
                value={clientForm.email} 
                onChangeText={t => setClientForm(prev => ({ ...prev, email: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Endereço Completo</Text>
              <TextInput 
                placeholder="Ex: Av. Paulista, 1000 - Bela Vista" 
                placeholderTextColor="#475569"
                value={clientForm.address} 
                onChangeText={t => setClientForm(prev => ({ ...prev, address: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Observações Adicionais</Text>
              <TextInput 
                placeholder="Algum detalhe particular deste cliente..." 
                placeholderTextColor="#475569"
                value={clientForm.notes} 
                onChangeText={t => setClientForm(prev => ({ ...prev, notes: t }))}
                style={styles.modalInput} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateClient}>
                <Text style={styles.submitButtonText}>{editingClientId ? 'Salvar Alterações' : 'Salvar Cadastro'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: ADD VEHICLE --- */}
      <Modal visible={isAddingVehicle} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingVehicle(false);
                setEditingVehicleId(null);
                setVehicleForm({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });
              }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Marca *</Text>
              <TextInput 
                placeholder="Ex: Volvo" 
                placeholderTextColor="#475569"
                value={vehicleForm.brand} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, brand: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Modelo *</Text>
              <TextInput 
                placeholder="Ex: FH 540" 
                placeholderTextColor="#475569"
                value={vehicleForm.model} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, model: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Placa *</Text>
              <TextInput 
                placeholder="Ex: PLACA77" 
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                value={vehicleForm.plate} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, plate: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Ano</Text>
              <TextInput 
                placeholder="Ex: 2022" 
                placeholderTextColor="#475569"
                value={vehicleForm.year} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, year: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Código do Chassi (Opcional)</Text>
              <TextInput 
                placeholder="Número do Chassi" 
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                value={vehicleForm.chassis} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, chassis: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Quilometragem Atual (Odomêtro)</Text>
              <TextInput 
                placeholder="Ex: 125000" 
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={vehicleForm.odometer} 
                onChangeText={t => setVehicleForm(prev => ({ ...prev, odometer: t }))}
                style={styles.modalInput} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateVehicle}>
                <Text style={styles.submitButtonText}>{editingVehicleId ? 'Salvar Alterações' : 'Salvar Veículo'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: CREATE OS --- */}
      <Modal visible={isAddingOS} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editingOSId ? 'Editar OS' : 'Gerar Nova OS'}</Text>
                <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2, fontWeight: 'bold' }}>
                  Passo {wizardStep} de 4
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddingOS(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Stepper indicator line */}
            <View style={{ flexDirection: 'row', gap: 4, height: 3, width: '100%', backgroundColor: '#1e293b', marginBottom: 12, borderRadius: 2 }}>
              <View style={{ height: '100%', borderRadius: 2, flex: 1, backgroundColor: wizardStep >= 1 ? '#3b66ff' : 'transparent' }} />
              <View style={{ height: '100%', borderRadius: 2, flex: 1, backgroundColor: wizardStep >= 2 ? '#3b66ff' : 'transparent' }} />
              <View style={{ height: '100%', borderRadius: 2, flex: 1, backgroundColor: wizardStep >= 3 ? '#3b66ff' : 'transparent' }} />
              <View style={{ height: '100%', borderRadius: 2, flex: 1, backgroundColor: wizardStep >= 4 ? '#3b66ff' : 'transparent' }} />
            </View>

            {/* STEP 1: SELECT CLIENT & VEHICLE */}
            {wizardStep === 1 && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                <Text style={styles.inputLabel}>1. Selecionar Cliente *</Text>
                
                {/* Client Search input */}
                <View style={styles.catalogSearchWrapper}>
                  <Search size={18} color="#64748b" style={styles.catalogSearchIcon} />
                  <TextInput
                    placeholder="Buscar por nome ou CPF..."
                    placeholderTextColor="#475569"
                    value={clientSearch}
                    onChangeText={setClientSearch}
                    style={styles.catalogSearchInput}
                  />
                  {clientSearch !== '' && (
                    <TouchableOpacity onPress={() => setClientSearch('')}>
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Client selection picker */}
                <View style={[styles.pickerFake, { maxHeight: 220 }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {(() => {
                      const filtered = clients.filter(c => 
                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                        (c.cpfCnpj && c.cpfCnpj.includes(clientSearch))
                      );

                      if (filtered.length === 0) {
                        return (
                          <View style={{ padding: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#64748b' }}>Nenhum cliente encontrado</Text>
                          </View>
                        );
                      }

                      return filtered.map(c => {
                        const isSelected = osForm.clientId === c.id;
                        return (
                          <TouchableOpacity 
                            key={c.id} 
                            onPress={() => {
                              const clientCars = vehicles.filter(v => v.clientId === c.id);
                              setOsForm(prev => ({ 
                                ...prev, 
                                clientId: c.id,
                                vehicleId: clientCars.length === 1 ? clientCars[0].id : ''
                              }));
                            }}
                            style={[styles.pickerItem, { padding: 16 }, isSelected ? styles.pickerItemActive : null]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View>
                                <Text style={{ fontSize: 16, color: isSelected ? '#3b66ff' : '#cbd5e1', fontWeight: 'bold' }}>
                                  {c.name}
                                </Text>
                                {c.cpfCnpj ? (
                                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>CPF/CNPJ: {c.cpfCnpj}</Text>
                                ) : null}
                              </View>
                              {isSelected && <Check size={16} color="#3b66ff" />}
                            </View>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>

                {/* Vehicle Selection Section */}
                {osForm.clientId ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>2. Selecionar Veículo *</Text>
                    
                    {(() => {
                      const selectionVehicles = vehicles.filter(v => v.clientId === osForm.clientId);
                      
                      if (selectionVehicles.length === 0) {
                        return (
                          <View style={{ padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', borderStyle: 'dashed', alignItems: 'center', marginVertical: 6 }}>
                            <Text style={{ fontSize: 9, color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}>
                              Nenhum veículo cadastrado para este cliente. Vá no menu "Clientes" e adicione um veículo primeiro.
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 6 }}>
                          {selectionVehicles.map(v => {
                            const isSelected = osForm.vehicleId === v.id;
                            return (
                              <TouchableOpacity 
                                key={v.id} 
                                onPress={() => setOsForm(prev => ({ ...prev, vehicleId: v.id }))}
                                style={{
                                  backgroundColor: isSelected ? 'rgba(59, 102, 255, 0.1)' : '#0a0c10',
                                  borderColor: isSelected ? '#3b66ff' : '#334155',
                                  borderWidth: 1.5,
                                  borderRadius: 12,
                                  padding: 16,
                                  minWidth: '46%',
                                  flexGrow: 1,
                                }}
                              >
                                <Text style={{ fontSize: 14, color: isSelected ? '#3b66ff' : '#cbd5e1', fontWeight: 'bold' }}>
                                  {v.brand} {v.model}
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                  <View style={{ backgroundColor: isSelected ? '#3b66ff' : '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>{v.plate}</Text>
                                  </View>
                                  {isSelected && <Check size={14} color="#3b66ff" />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>
                ) : null}

                {/* Navigation Button */}
                <TouchableOpacity 
                  disabled={!osForm.clientId || !osForm.vehicleId}
                  style={[
                    styles.submitButton, 
                    (!osForm.clientId || !osForm.vehicleId) ? { backgroundColor: '#1e293b', opacity: 0.5 } : null,
                    { marginTop: 0 }
                  ]} 
                  onPress={() => setWizardStep(2)}
                >
                  <Text style={styles.submitButtonText}>Avançar Serviços</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* STEP 2: ADD SERVICES */}
            {wizardStep === 2 && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                <Text style={styles.inputLabel}>Adicionar Serviços ao Orçamento</Text>

                {/* Service Search Input */}
                <View style={styles.catalogSearchWrapper}>
                  <Search size={18} color="#64748b" style={styles.catalogSearchIcon} />
                  <TextInput
                    placeholder="Filtrar serviços do catálogo..."
                    placeholderTextColor="#475569"
                    value={serviceSearch}
                    onChangeText={setServiceSearch}
                    style={styles.catalogSearchInput}
                  />
                  {serviceSearch !== '' && (
                    <TouchableOpacity onPress={() => setServiceSearch('')}>
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Services Catalog List */}
                <View style={[styles.pickerFake, { maxHeight: 320, padding: 0 }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {(() => {
                      const filteredServices = services.filter(s => 
                        s.name.toLowerCase().includes(serviceSearch.toLowerCase())
                      );

                      if (filteredServices.length === 0) {
                        return (
                          <View style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#64748b' }}>Nenhum serviço disponível</Text>
                          </View>
                        );
                      }

                      return filteredServices.map(s => {
                        const addedItem = osForm.selectedServices.find(item => item.id === s.id);
                        const qty = addedItem ? addedItem.quantity : 0;
                        const isSelected = qty > 0;

                        return (
                          <View 
                            key={s.id} 
                            style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              minHeight: 72,
                              paddingVertical: 16,
                              paddingHorizontal: 16,
                              backgroundColor: isSelected ? 'rgba(59, 102, 255, 0.05)' : 'transparent',
                              borderBottomWidth: 1,
                              borderBottomColor: '#1e293b'
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 16, color: isSelected ? '#3b66ff' : '#f8fafc', fontWeight: 'bold' }}>
                                {s.name}
                              </Text>
                              {s.code ? (
                                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>CÓD: {s.code}</Text>
                              ) : null}
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{formatCurrency(s.price)}</Text>
                                {qty > 1 && (
                                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{qty}x {formatCurrency(s.price)}</Text>
                                )}
                              </View>

                              {/* Qty controller buttons */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity 
                                  onPress={() => handleUpdateServiceQty(s, qty - 1)}
                                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#181c24', borderRadius: 12, borderWidth: 1.5, borderColor: '#334155' }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>-</Text>
                                </TouchableOpacity>
                                <Text style={{ minWidth: 24, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' }}>{qty}</Text>
                                <TouchableOpacity 
                                  onPress={() => handleUpdateServiceQty(s, qty + 1)}
                                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#181c24', borderRadius: 12, borderWidth: 1.5, borderColor: '#334155' }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>

                {/* Subtotal Display */}
                <View style={{ backgroundColor: '#0a0c10', borderWidth: 1.5, borderColor: '#1e293b', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>Total em Serviços:</Text>
                  <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                    {formatCurrency(osForm.selectedServices.reduce((acc, s) => acc + (s.price * s.quantity), 0))}
                  </Text>
                </View>

                {/* Navigation Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, backgroundColor: '#1e293b', marginTop: 0 }]} 
                    onPress={() => setWizardStep(1)}
                  >
                    <Text style={styles.submitButtonText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, marginTop: 0 }]} 
                    onPress={() => setWizardStep(3)}
                  >
                    <Text style={styles.submitButtonText}>Avançar Peças</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* STEP 3: ADD PARTS */}
            {wizardStep === 3 && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                <Text style={styles.inputLabel}>Adicionar Peças ao Orçamento</Text>

                {/* Parts Search Input */}
                <View style={styles.catalogSearchWrapper}>
                  <Search size={18} color="#64748b" style={styles.catalogSearchIcon} />
                  <TextInput
                    placeholder="Filtrar peças do catálogo..."
                    placeholderTextColor="#475569"
                    value={partSearch}
                    onChangeText={setPartSearch}
                    style={styles.catalogSearchInput}
                  />
                  {partSearch !== '' && (
                    <TouchableOpacity onPress={() => setPartSearch('')}>
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Parts Catalog List */}
                <View style={[styles.pickerFake, { maxHeight: 320, padding: 0 }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {(() => {
                      const filteredParts = parts.filter(p => 
                        p.name.toLowerCase().includes(partSearch.toLowerCase())
                      );

                      if (filteredParts.length === 0) {
                        return (
                          <View style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: '#64748b' }}>Nenhuma peça disponível</Text>
                          </View>
                        );
                      }

                      return filteredParts.map(p => {
                        const addedItem = osForm.selectedParts.find(item => item.id === p.id);
                        const qty = addedItem ? addedItem.quantity : 0;
                        const isSelected = qty > 0;

                        return (
                          <View 
                            key={p.id} 
                            style={{ 
                              flexDirection: 'row', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              minHeight: 72,
                              paddingVertical: 16,
                              paddingHorizontal: 16,
                              backgroundColor: isSelected ? 'rgba(59, 102, 255, 0.05)' : 'transparent',
                              borderBottomWidth: 1,
                              borderBottomColor: '#1e293b'
                            }}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 16, color: isSelected ? '#3b66ff' : '#f8fafc', fontWeight: 'bold' }}>
                                {p.name}
                              </Text>
                              {p.code ? (
                                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, fontFamily: 'monospace' }}>SKU: {p.code} {p.stock !== undefined ? `• Est: ${p.stock}` : ''}</Text>
                              ) : null}
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{formatCurrency(p.salePrice)}</Text>
                                {qty > 1 && (
                                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{qty}x {formatCurrency(p.salePrice)}</Text>
                                )}
                              </View>

                              {/* Qty controller buttons */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity 
                                  onPress={() => handleUpdatePartQty(p, qty - 1)}
                                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#181c24', borderRadius: 12, borderWidth: 1.5, borderColor: '#334155' }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>-</Text>
                                </TouchableOpacity>
                                <Text style={{ minWidth: 24, textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' }}>{qty}</Text>
                                <TouchableOpacity 
                                  onPress={() => handleUpdatePartQty(p, qty + 1)}
                                  style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#181c24', borderRadius: 12, borderWidth: 1.5, borderColor: '#334155' }}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </ScrollView>
                </View>

                {/* Subtotal Display */}
                <View style={{ backgroundColor: '#0a0c10', borderWidth: 1.5, borderColor: '#1e293b', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 'bold' }}>Total em Peças:</Text>
                  <Text style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>
                    {formatCurrency(osForm.selectedParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0))}
                  </Text>
                </View>

                {/* Navigation Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, backgroundColor: '#1e293b', marginTop: 0 }]} 
                    onPress={() => setWizardStep(2)}
                  >
                    <Text style={styles.submitButtonText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, marginTop: 0 }]} 
                    onPress={() => setWizardStep(4)}
                  >
                    <Text style={styles.submitButtonText}>Avançar Revisão</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* STEP 4: REVISION & OBSERVATIONS */}
            {wizardStep === 4 && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                <Text style={styles.inputLabel}>Observações / Diagnóstico Técnico</Text>
                <TextInput 
                  placeholder="Escreva problemas observados ou detalhes adicionais..." 
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={4}
                  value={osForm.notes} 
                  onChangeText={t => setOsForm(prev => ({ ...prev, notes: t }))}
                  style={[styles.modalInput, { height: 100, textAlignVertical: 'top', padding: 16 }]} 
                />

                <Text style={styles.inputLabel}>Status da Ordem de Serviço</Text>
                <View style={styles.pickerFakeRow}>
                  {['Aberta', 'Em andamento', 'Concluída', 'Entregue'].map(st => (
                    <TouchableOpacity 
                      key={st}
                      onPress={() => setOsForm(prev => ({ ...prev, status: st as any }))}
                      style={[styles.pickerTag, osForm.status === st ? styles.pickerTagActive : null]}
                    >
                      <Text style={[styles.pickerTagText, osForm.status === st ? styles.pickerTagActiveText : null]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Totals & Costs Review Card */}
                <Text style={styles.inputLabel}>Revisão de Custos e Totais</Text>
                <View style={[styles.card, { padding: 16, backgroundColor: '#0a0c10', gap: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 1 }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>Soma de Serviços:</Text>
                    <Text style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 'bold' }}>
                      {formatCurrency(osForm.selectedServices.reduce((acc, s) => acc + (s.price * s.quantity), 0))}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 1 }}>
                    <Text style={{ fontSize: 13, color: '#64748b' }}>Soma de Peças:</Text>
                    <Text style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 'bold' }}>
                      {formatCurrency(osForm.selectedParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0))}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#3b66ff' }}>TOTAL GERAL:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#22c55e' }}>
                      {formatCurrency(
                        osForm.selectedServices.reduce((acc, s) => acc + (s.price * s.quantity), 0) +
                        osForm.selectedParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0)
                      )}
                    </Text>
                  </View>
                </View>

                {/* Navigation Row */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, backgroundColor: '#1e293b', marginTop: 0 }]} 
                    onPress={() => setWizardStep(3)}
                  >
                    <Text style={styles.submitButtonText}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.submitButton, { flex: 1, backgroundColor: '#10b981', marginTop: 0 }]} 
                    onPress={handleCreateOS}
                  >
                    <Text style={styles.submitButtonText}>
                      {editingOSId ? 'Salvar Alterações' : 'Criar Ordem'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: ADD EXPENSE --- */}
      <Modal visible={isAddingExpense} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lançar Despesa de Caixa</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingExpense(false);
                setExpenseForm({ description: '', amount: '', category: 'Operacional', date: new Date().toISOString().split('T')[0] });
              }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Descrição da Despesa *</Text>
            <TextInput 
              placeholder="Ex: Compra de Óleo de freio ou Energia Elétrica" 
              placeholderTextColor="#475569"
              value={expenseForm.description} 
              onChangeText={t => setExpenseForm(prev => ({ ...prev, description: t }))}
              style={styles.modalInput} 
            />

            <Text style={styles.inputLabel}>Valor Pago (R$) *</Text>
            <TextInput 
              placeholder="Ex: 150.00" 
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={expenseForm.amount} 
              onChangeText={t => setExpenseForm(prev => ({ ...prev, amount: t }))}
              style={styles.modalInput} 
            />

            <Text style={styles.inputLabel}>Data do Pagamento (AAAA-MM-DD) *</Text>
            <TextInput 
              placeholder="Ex: 2026-06-03" 
              placeholderTextColor="#475569"
              value={expenseForm.date} 
              onChangeText={t => setExpenseForm(prev => ({ ...prev, date: t }))}
              style={styles.modalInput} 
            />

            <Text style={styles.inputLabel}>Categoria da Despesa</Text>
            <View style={styles.pickerFakeRow}>
              {['Compra Peças', 'Salário', 'Operacional', 'Outros'].map(cat => (
                <TouchableOpacity 
                  key={cat}
                  onPress={() => setExpenseForm(prev => ({ ...prev, category: cat as any }))}
                  style={[styles.pickerTag, expenseForm.category === cat ? styles.pickerTagActive : null]}
                >
                  <Text style={[styles.pickerTagText, expenseForm.category === cat ? styles.pickerTagActiveText : null]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateExpense}>
              <Text style={styles.submitButtonText}>Registrar Saída</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- FORM MODAL: ADD CATALOG SERVICE --- */}
      <Modal visible={isAddingCatalogService} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingServiceId ? 'Editar Mão de Obra' : 'Adicionar Mão de Obra'}</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingCatalogService(false);
                setEditingServiceId(null);
                setServiceForm({ name: '', code: '', description: '', price: '' });
              }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome do Serviço *</Text>
              <TextInput 
                placeholder="Ex: Regulagem de Freio" 
                placeholderTextColor="#475569"
                value={serviceForm.name} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Código de Referência</Text>
              <TextInput 
                placeholder="Ex: SRV-FREIO" 
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                value={serviceForm.code} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, code: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor Cobrado (R$) *</Text>
              <TextInput 
                placeholder="Ex: 80.00" 
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={serviceForm.price} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, price: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput 
                placeholder="Explicativo do serviço..." 
                placeholderTextColor="#475569"
                value={serviceForm.description} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, description: t }))}
                style={styles.modalInput} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveCatalogService}>
                <Text style={styles.submitButtonText}>{editingServiceId ? 'Salvar Alterações' : 'Salvar Serviço'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: ADD CATALOG PART --- */}
      <Modal visible={isAddingCatalogPart} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingPartId ? 'Editar Peça' : 'Adicionar Peça ao Catálogo'}</Text>
              <TouchableOpacity onPress={() => {
                setIsAddingCatalogPart(false);
                setEditingPartId(null);
                setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
              }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome da Peça *</Text>
              <TextInput 
                placeholder="Ex: Filtro de Óleo Volvo" 
                placeholderTextColor="#475569"
                value={partForm.name} 
                onChangeText={t => setPartForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Código / Referência SKU *</Text>
              <TextInput 
                placeholder="Ex: 20565617" 
                placeholderTextColor="#475569"
                autoCapitalize="characters"
                value={partForm.code} 
                onChangeText={t => setPartForm(prev => ({ ...prev, code: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Fabricante / Fornecedor</Text>
              <TextInput 
                placeholder="Ex: Volvo Parts" 
                placeholderTextColor="#475569"
                value={partForm.supplier} 
                onChangeText={t => setPartForm(prev => ({ ...prev, supplier: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor de Compra (R$)</Text>
              <TextInput 
                placeholder="Ex: 120.00" 
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={partForm.purchasePrice} 
                onChangeText={t => setPartForm(prev => ({ ...prev, purchasePrice: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor de Venda (R$) *</Text>
              <TextInput 
                placeholder="Ex: 210.00" 
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={partForm.salePrice} 
                onChangeText={t => setPartForm(prev => ({ ...prev, salePrice: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Quantidade em Estoque *</Text>
              <TextInput 
                placeholder="Ex: 15" 
                placeholderTextColor="#475569"
                keyboardType="numeric"
                value={partForm.stock} 
                onChangeText={t => setPartForm(prev => ({ ...prev, stock: t }))}
                style={styles.modalInput} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveCatalogPart}>
                <Text style={styles.submitButtonText}>{editingPartId ? 'Salvar Alterações' : 'Salvar no Estoque'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// --- ROOT APP CONTENT CONTROLLER ---

function AppContent() {
  const { session, loading } = useDatabase();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b66ff" />
        <Text style={styles.loadingText}>Carregando OficinaPro...</Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <MainWorkshopApp />;
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

// --- MODERN PREMIUM DARK DESIGN STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b0f', // Deep pitch black background
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
  screenContainer: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b66ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#181c24',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  // Dynamic status borders & glows
  cardOpen: {
    borderColor: 'rgba(59, 102, 255, 0.4)',
    shadowColor: '#3b66ff',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardProgress: {
    borderColor: 'rgba(234, 179, 8, 0.4)',
    shadowColor: '#eab308',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDone: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDelivered: {
    borderColor: '#272e3f',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cardInflow: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardOutflow: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: '#ef4444',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Structured card components
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  cardValueText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: 'normal',
    marginTop: 2,
  },
  cardMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardSubtitleText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#272e3f',
    paddingTop: 10,
    marginTop: 10,
  },
  osStatusBadge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  heroCard: {
    backgroundColor: '#3b66ff',
    borderColor: '#2563eb',
    paddingVertical: 24,
    shadowColor: '#3b66ff',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroCardLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#bfdbfe',
    letterSpacing: 1.5,
  },
  heroCardValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginTop: 6,
  },
  heroCardSub: {
    fontSize: 13,
    color: '#dbeafe',
    marginTop: 8,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 14,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181c24',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  osNum: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  osDetails: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 4,
  },
  osTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  osStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 14,
  },
  clientCard: {
    padding: 18,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  clientDetails: {
    fontSize: 13,
    color: '#cbd5e1',
    marginTop: 4,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#090b0f',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  carText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  osCard: {
    padding: 18,
  },
  osHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  osNumberLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3b66ff',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  statusOpen: {
    backgroundColor: '#3b66ff1a',
    color: '#3b66ff',
  },
  statusProgress: {
    backgroundColor: '#eab3081a',
    color: '#eab308',
  },
  statusDone: {
    backgroundColor: '#22c55e1a',
    color: '#22c55e',
  },
  osLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '700',
  },
  osValue: {
    color: '#cbd5e1',
    fontWeight: 'normal',
  },
  osDate: {
    fontSize: 13,
    color: '#475569',
  },
  osTotalVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  balanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 14,
  },
  balanceSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textGreen: {
    color: '#22c55e',
  },
  textRed: {
    color: '#ef4444',
  },
  tDesc: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  tDate: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  tAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  formInput: {
    backgroundColor: '#090b0f',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f1f5f9',
  },
  saveSettingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b66ff',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  tabBar: {
    height: 64,
    backgroundColor: '#090b0f',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#3b66ff',
  },
  // Modal & Loaders
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 14,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalContent: {
    backgroundColor: '#181c24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#090b0f',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#3b66ff',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerFake: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#090b0f',
    marginBottom: 12,
    maxHeight: 150,
  },
  pickerItem: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1e293b33',
  },
  pickerItemActive: {
    backgroundColor: '#3b66ff10',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  pickerItemActiveText: {
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  pickerFakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  pickerTag: {
    backgroundColor: '#090b0f',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  pickerTagActive: {
    backgroundColor: '#3b66ff10',
    borderColor: '#3b66ff',
  },
  pickerTagText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  pickerTagActiveText: {
    color: '#3b66ff',
  },
  // More options menu & catalog
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    backgroundColor: '#3b66ff10',
    padding: 10,
    borderRadius: 10,
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  menuCardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginLeft: 6,
  },
  catalogSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#090b0f',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 16,
    marginTop: 14,
  },
  catalogSegmentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  catalogSegmentTabActive: {
    backgroundColor: '#3b66ff',
  },
  catalogSegmentTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  catalogSegmentTabTextActive: {
    color: '#fff',
  },
  catalogSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090b0f',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  catalogSearchIcon: {
    marginRight: 10,
  },
  catalogSearchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#f1f5f9',
  },
  catalogListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181c24',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  catalogItemCodeBadge: {
    fontSize: 10,
    backgroundColor: '#090b0f',
    borderWidth: 0.5,
    borderColor: '#1e293b',
    color: '#64748b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  catalogItemPriceVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  catalogActionButton: {
    padding: 8,
    backgroundColor: '#090b0f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  suggestionBadge: {
    backgroundColor: '#3b66ff10',
    borderColor: '#3b66ff33',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  suggestionBadgeText: {
    fontSize: 12,
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  // Auth Layout styles
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
