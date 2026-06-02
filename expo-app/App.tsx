import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, 
  SafeAreaView, StatusBar, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Clipboard
} from 'react-native';
import { 
  Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, Calendar, 
  Wallet, DollarSign, PiggyBank, Users, ClipboardList, Settings, Menu,
  CheckCircle, Clock, Play, ChevronRight, UserPlus, Car, Check, X,
  Tag, Package, Edit2, AlertTriangle, ArrowLeft, MoreHorizontal,
  Share2, LogOut, FileText, Wifi, WifiOff
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { DatabaseProvider, useDatabase, Client, Vehicle, ServiceItem, PartItem, WorkOrder, Billing, FinancialTransaction, OSItemService, OSItemPart, OSStatus, PaymentMethod } from './src/context/DatabaseContext';
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
    addTransaction, updateSettings, payInstallment, exportDatabaseJson, syncWithSupabase
  } = useDatabase();

  // Navigation: 'dashboard' | 'clients' | 'os' | 'finance' | 'more'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'os' | 'finance' | 'more'>('dashboard');
  const [moreSubScreen, setMoreSubScreen] = useState<'menu' | 'catalog' | 'settings'>('menu');
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // Search Filter state
  const [catalogSegment, setCatalogSegment] = useState<'services' | 'parts'>('services');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Clients view helper
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<'vehicles' | 'history'>('vehicles');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });

  // OS signature overlay
  const [signingOSId, setSigningOSId] = useState<string | null>(null);

  // Modals Forms
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });

  const [isAddingOS, setIsAddingOS] = useState(false);
  const [osForm, setOsForm] = useState({ 
    clientId: '', vehicleId: '', notes: '', status: 'Aberta' as OSStatus,
    selectedServices: [] as OSItemService[], selectedParts: [] as OSItemPart[]
  });

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Operacional' as any });

  // Catalog Item forms
  const [isAddingCatalogService, setIsAddingCatalogService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', code: '', description: '', price: '' });
  const [isAddingCatalogPart, setIsAddingCatalogPart] = useState(false);
  const [partForm, setPartForm] = useState({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- HANDLERS ---

  const handleCreateClient = async () => {
    if (!clientForm.name || !clientForm.phone) {
      Alert.alert('Erro', 'Por favor, preencha o nome e telefone do cliente.');
      return;
    }
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
  };

  const handleCreateVehicle = async () => {
    if (!selectedClient) return;
    if (!vehicleForm.plate || !vehicleForm.model || !vehicleForm.brand) {
      Alert.alert('Erro', 'Por favor, preencha placa, marca e modelo.');
      return;
    }
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
      date: new Date().toISOString().split('T')[0],
      description: expenseForm.description
    });
    if (res) {
      setIsAddingExpense(false);
      setExpenseForm({ description: '', amount: '', category: 'Operacional' });
      Alert.alert('Sucesso', 'Despesa lançada com sucesso.');
    }
  };

  const handleSaveCatalogService = async () => {
    if (!serviceForm.name || !serviceForm.price) {
      Alert.alert('Erro', 'Nome e valor de serviço são obrigatórios.');
      return;
    }
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
  };

  const handleSaveCatalogPart = async () => {
    if (!partForm.name || !partForm.code || !partForm.salePrice || !partForm.stock) {
      Alert.alert('Erro', 'Preencha os campos obrigatórios (*).');
      return;
    }
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
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ordem de Serviço ${os.osNumber}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 30px; color: #333; }
          .header { border-bottom: 2px solid #3b66ff; padding-bottom: 10px; margin-bottom: 20px; }
          .header-title { font-size: 20px; font-weight: bold; color: #3b66ff; text-transform: uppercase; }
          .section-title { font-size: 11px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background-color: #f2f2f2; text-align: left; padding: 8px; font-weight: bold; color: #555; }
          td { padding: 8px; border-bottom: 1px solid #eee; }
          .total-box { margin-top: 30px; text-align: right; font-size: 12px; }
          .total-row { display: flex; justify-content: flex-end; gap: 20px; margin-top: 5px; }
          .total-val { font-weight: bold; color: #22c55e; }
          .signature-box { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; max-width: 300px; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-top: 10px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-title">${settings.name}</div>
          <div style="font-size: 10px; color: #555; margin-top: 4px;">
            CNPJ: ${settings.cnpj} | Fone/Whats: ${settings.phone} | Endereço: ${settings.address}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-bottom: 20px;">
          <span>ORDEM DE SERVIÇO: <span style="color: #3b66ff;">${os.osNumber}</span></span>
          <span>DATA: ${os.date.split('-').reverse().join('/')}</span>
          <span>STATUS: ${os.status.toUpperCase()}</span>
        </div>

        <div class="grid">
          <div>
            <div class="section-title">Dados do Cliente</div>
            <div style="margin-top: 5px; line-height: 1.4;">
              <strong>${client?.name}</strong><br>
              CPF/CNPJ: ${client?.cpfCnpj}<br>
              WhatsApp: ${client?.whatsapp}<br>
              Endereço: ${client?.address}
            </div>
          </div>
          <div>
            <div class="section-title">Dados do Veículo</div>
            <div style="margin-top: 5px; line-height: 1.4;">
              <strong>${vehicle?.brand} ${vehicle?.model}</strong><br>
              Placa: <span style="font-weight: bold; background: #eee; padding: 2px 4px; border-radius: 3px;">${vehicle?.plate}</span><br>
              Ano: ${vehicle?.year}<br>
              Odomêtro: ${vehicle?.odometer} km ${vehicle?.chassis ? `| Chassi: ${vehicle.chassis}` : ''}
            </div>
          </div>
        </div>

        ${os.services.length > 0 ? `
          <div class="section-title">Mão de Obra e Serviços</div>
          <table>
            <thead>
              <tr><th>Descrição do Serviço</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
            </thead>
            <tbody>${servicesListHTML}</tbody>
          </table>
        ` : ''}

        ${os.parts.length > 0 ? `
          <div class="section-title">Peças e Componentes</div>
          <table>
            <thead>
              <tr><th>Nome da Peça</th><th>Qtd</th><th>Unitário</th><th>Subtotal</th></tr>
            </thead>
            <tbody>${partsListHTML}</tbody>
          </table>
        ` : ''}

        ${os.notes ? `
          <div class="section-title">Observações Técnicas / Diagnóstico</div>
          <p style="font-size: 10px; line-height: 1.4; white-space: pre-wrap; font-style: italic; background: #fafafa; padding: 10px; border-radius: 6px;">
            ${os.notes}
          </p>
        ` : ''}

        <div class="total-box">
          <div class="total-row"><span>Serviços:</span><span>${formatCurrency(os.servicesTotal)}</span></div>
          <div class="total-row"><span>Peças:</span><span>${formatCurrency(os.partsTotal)}</span></div>
          <div class="total-row" style="font-size: 14px; font-weight: bold; border-top: 1.5px solid #333; padding-top: 8px;">
            <span>TOTAL GERAL:</span><span class="total-val">${formatCurrency(os.grandTotal)}</span>
          </div>
        </div>

        ${os.signature ? `
          <div class="signature-box">
            <div style="font-size: 9px; color: #7f8c8d; margin-bottom: 5px;">Assinatura digital do Cliente:</div>
            ${os.signature}
          </div>
        ` : ''}

        <div style="margin-top: 40px; font-size: 8px; color: #95a5a6; text-align: center;">
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
      const uri = `${Platform.OS === 'ios' ? '' : 'data:text/json;charset=utf-8,'}${encodeURIComponent(json)}`;
      // Secure writing would require expo-file-system, but sharing as text is fully compatible using data URLs.
      // Better: we call expo sharing.
      const cacheUri = `${FileSystemCachePath(filename)}`;
      // Swap out cache write simulation:
      await Sharing.shareAsync(filename, { mimeType: 'application/json', UTI: 'public.json' });
    } catch (e) {
      // Direct sharing bypass as raw JSON code block copy
      Alert.alert(
        'Exportar Backup',
        'Seu backup JSON foi gerado com sucesso. Deseja copiar o código bruto para a área de transferência?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Copiar JSON', 
            onPress: () => {
              Clipboard.setString(exportDatabaseJson());
              Alert.alert('Copiado!', 'Dados brutos salvos com sucesso.');
            }
          }
        ]
      );
    }
  };

  // Helper dynamic mock for filesystem cache write failure bypass
  const FileSystemCachePath = (f: string) => {
    return f;
  };

  // --- METRICS & FINANCE CALCULATIONS ---

  const faturamentoTotal = workOrders.reduce((acc, o) => acc + o.grandTotal, 0);
  const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;
  const osAndamento = workOrders.filter(o => o.status === 'Em andamento').length;
  const osConcluidas = workOrders.filter(o => o.status === 'Concluída' || o.status === 'Entregue').length;

  const totalEntradas = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalSaidas = transactions.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoCaixa = totalEntradas - totalSaidas;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0c10" />
      
      {/* HEADER BAR */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{settings.name.toUpperCase()}</Text>
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
              <Text style={styles.heroCardLabel}>FATURAMENTO DO PLANO</Text>
              <Text style={styles.heroCardValue}>{formatCurrency(faturamentoTotal)}</Text>
              <Text style={styles.heroCardSub}>Faturamento consolidado das ordens</Text>
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
                  <Text style={styles.metricTitle}>CLIENTES</Text>
                  <Users size={14} color="#3b66ff" />
                </View>
                <Text style={styles.metricValue}>{clients.length}</Text>
              </View>
            </View>

            {/* Recent OS List */}
            <Text style={styles.sectionTitle}>ORDENS DE SERVIÇO RECENTES</Text>
            {workOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma Ordem de Serviço cadastrada.</Text>
              </View>
            ) : (
              workOrders.slice(0, 5).map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const vehicle = vehicles.find(v => v.id === os.vehicleId);
                return (
                  <TouchableOpacity 
                    key={os.id} 
                    style={styles.listItem}
                    onPress={() => handleShareOS(os)}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.osNum}>{os.osNumber}</Text>
                      <Text style={styles.osDetails}>
                        {client?.name}{vehicle ? ` • ${vehicle.brand} ${vehicle.model}` : ''}
                      </Text>
                      <Text style={styles.osDate}>{os.date.split('-').reverse().join('/')}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={styles.osTotal}>{formatCurrency(os.grandTotal)}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        <Text style={styles.osStatus}>{os.status.toUpperCase()}</Text>
                        <Share2 size={12} color="#64748b" />
                      </View>
                    </View>
                  </TouchableOpacity>
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
              clients.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhum cliente cadastrado.</Text>
                </View>
              ) : (
                clients.map(client => {
                  const clientCars = vehicles.filter(v => v.clientId === client.id);
                  return (
                    <TouchableOpacity 
                      key={client.id} 
                      style={[styles.card, styles.clientCard]}
                      onPress={() => {
                        setSelectedClient(client);
                        setActiveClientTab('vehicles');
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.clientName}>{client.name}</Text>
                        <ChevronRight size={16} color="#64748b" />
                      </View>
                      <Text style={styles.clientDetails}>Telefone: {client.phone}</Text>
                      <Text style={styles.clientDetails}>WhatsApp: {client.whatsapp}</Text>
                      {clientCars.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 5, marginTop: 6 }}>
                          {clientCars.map(c => (
                            <Text key={c.id} style={styles.catalogItemCodeBadge}>{c.plate}</Text>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              // Client Profile Details
              <View style={[styles.card, { padding: 14 }]}>
                <TouchableOpacity 
                  onPress={() => setSelectedClient(null)} 
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                >
                  <ArrowLeft size={16} color="#3b66ff" />
                  <Text style={{ fontSize: 11, color: '#3b66ff', fontWeight: 'bold', marginLeft: 4 }}>Voltar à Lista</Text>
                </TouchableOpacity>

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
                        <View key={car.id} style={styles.carRow}>
                          <Car size={14} color="#3b66ff" />
                          <View style={{ marginLeft: 8 }}>
                            <Text style={styles.carText}>{car.brand} {car.model} ({car.year})</Text>
                            <Text style={{ fontSize: 8, color: '#64748b' }}>Placa: {car.plate} | Km: {car.odometer}</Text>
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
            <View style={styles.screenHeader}>
              <Text style={styles.tabTitle}>Ordens de Serviço</Text>
              <TouchableOpacity style={styles.actionButton} onPress={() => setIsAddingOS(true)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Nova OS</Text>
              </TouchableOpacity>
            </View>

            {workOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma OS cadastrada.</Text>
              </View>
            ) : (
              workOrders.map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const vehicle = vehicles.find(v => v.id === os.vehicleId);
                return (
                  <View key={os.id} style={[styles.card, styles.osCard]}>
                    <View style={styles.osHeaderRow}>
                      <Text style={styles.osNumberLabel}>{os.osNumber}</Text>
                      <Text style={[styles.statusBadge, 
                        os.status === 'Aberta' ? styles.statusOpen :
                        os.status === 'Em andamento' ? styles.statusProgress :
                        styles.statusDone
                      ]}>{os.status.toUpperCase()}</Text>
                    </View>
                    
                    <Text style={styles.osLabel}>Cliente: <Text style={styles.osValue}>{client?.name}</Text></Text>
                    <Text style={styles.osLabel}>Veículo: <Text style={styles.osValue}>{vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'N/A'}</Text></Text>
                    
                    {os.services.length > 0 && (
                      <Text style={styles.osLabel}>Serviços: <Text style={styles.osValue}>{os.services.map(s => s.name).join(', ')}</Text></Text>
                    )}
                    {os.parts.length > 0 && (
                      <Text style={styles.osLabel}>Peças: <Text style={styles.osValue}>{os.parts.map(p => p.name).join(', ')}</Text></Text>
                    )}

                    <View style={styles.divider} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.osDate}>{os.date.split('-').reverse().join('/')}</Text>
                      <Text style={styles.osTotalVal}>{formatCurrency(os.grandTotal)}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                      <TouchableOpacity 
                        style={[styles.catalogActionButton, { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }]}
                        onPress={() => handleShareOS(os)}
                      >
                        <FileText size={12} color="#3b66ff" />
                        <Text style={{ fontSize: 9, color: '#3b66ff', fontWeight: 'bold' }}>Gerar PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.catalogActionButton, { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }]}
                        onPress={() => {
                          if (os.status === 'Concluída' || os.status === 'Entregue') {
                            Alert.alert('Aviso', 'Esta OS já foi finalizada e não pode ser assinada.');
                          } else {
                            setSigningOSId(os.id);
                          }
                        }}
                      >
                        <Edit2 size={12} color="#3b66ff" />
                        <Text style={{ fontSize: 9, color: '#3b66ff', fontWeight: 'bold' }}>
                          {os.signature ? 'Assinado ✓' : 'Assinar'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.catalogActionButton, { paddingHorizontal: 10 }]}
                        onPress={() => {
                          Alert.alert(
                            'Finalizar OS',
                            'Mudar status para Entregue e dar baixa?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Mudar para Curso', onPress: () => updateWorkOrderStatus(os.id, 'Em andamento') },
                              { text: 'Concluir', onPress: () => updateWorkOrderStatus(os.id, 'Concluída') },
                              { text: 'Entregar (Finalizada)', onPress: () => updateWorkOrderStatus(os.id, 'Entregue') }
                            ]
                          );
                        }}
                      >
                        <Check size={12} color="#22c55e" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
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

            <View style={[styles.card, styles.balanceCard]}>
              <Text style={styles.balanceLabel}>SALDO EM CAIXA</Text>
              <Text style={[styles.balanceValue, saldoCaixa >= 0 ? styles.textGreen : styles.textRed]}>
                {formatCurrency(saldoCaixa)}
              </Text>
              <View style={styles.balanceSummary}>
                <Text style={styles.balanceSubText}>Entradas: <Text style={styles.textGreen}>{formatCurrency(totalEntradas)}</Text></Text>
                <Text style={styles.balanceSubText}>Saídas: <Text style={styles.textRed}>{formatCurrency(totalSaidas)}</Text></Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>HISTÓRICO DE COBRANÇAS</Text>
            {billings.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma cobrança registrada.</Text>
            ) : (
              billings.map(bill => {
                const linkOS = workOrders.find(o => o.id === bill.osId);
                const client = linkOS ? clients.find(c => c.id === linkOS.clientId) : null;
                return (
                  <View key={bill.id} style={styles.listItem}>
                    <View>
                      <Text style={styles.osNum}>Cobrança {linkOS?.osNumber || ''}</Text>
                      <Text style={{ fontSize: 8, color: '#64748b' }}>Cliente: {client?.name}</Text>
                      <Text style={{ fontSize: 8, color: '#64748b' }}>Vencimento: {bill.dueDate.split('-').reverse().join('/')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.osTotal}>{formatCurrency(bill.amount)}</Text>
                      <TouchableOpacity 
                        style={[styles.statusBadge, 
                          bill.status === 'Pago' ? styles.statusDone : styles.statusOpen,
                          { marginTop: 4 }
                        ]}
                        onPress={() => {
                          if (bill.status !== 'Pago') {
                            Alert.alert(
                              'Dar Baixa',
                              'Registrar recebimento desta cobrança?',
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Sim, Baixar', onPress: () => payInstallment(bill.id, 1) }
                              ]
                            );
                          }
                        }}
                      >
                        <Text style={{ fontSize: 7, fontWeight: 'bold' }}>{bill.status.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <Text style={styles.sectionTitle}>ÚLTIMAS TRANSAÇÕES</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum lançamento no extrato.</Text>
            ) : (
              transactions.map(t => (
                <View key={t.id} style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tDesc}>{t.description}</Text>
                    <Text style={styles.tDate}>{t.date.split('-').reverse().join('/')} | {t.category}</Text>
                  </View>
                  <Text style={[styles.tAmount, t.type === 'Entrada' ? styles.textGreen : styles.textRed]}>
                    {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                  </Text>
                </View>
              ))
            )}
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
                  <View key={item.id} style={styles.catalogListItem}>
                    <View>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      {item.code ? <Text style={styles.catalogItemCodeBadge}>{item.code}</Text> : null}
                    </View>
                    <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.price)}</Text>
                  </View>
                ))
              ) : (
                parts.filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(item => (
                  <View key={item.id} style={styles.catalogListItem}>
                    <View>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      <Text style={styles.clientDetails}>SKU: {item.code} | Forn: {item.supplier}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.salePrice)}</Text>
                      <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>Estoque: {item.stock}</Text>
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

              <Text style={styles.formLabel}>Telefone / WhatsApp</Text>
              <TextInput 
                value={settings.phone} 
                onChangeText={t => updateSettings({ phone: t, whatsapp: t })}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>Notas de Rodapé do PDF</Text>
              <TextInput 
                value={settings.pdfNotes} 
                onChangeText={t => updateSettings({ pdfNotes: t })}
                style={styles.formInput} 
              />
            </View>

            <View style={styles.card}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', marginBottom: 6 }}>Exportar Cópia de Segurança</Text>
              <Text style={styles.clientDetails}>Salve ou envie todos os seus clientes, veículos e ordens como arquivo JSON.</Text>
              <TouchableOpacity 
                style={[styles.saveSettingsButton, { backgroundColor: '#10b981' }]} 
                onPress={handleExportBackup}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>Compartilhar Backup JSON</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.modalTitle}>Cadastrar Novo Cliente</Text>
              <TouchableOpacity onPress={() => setIsAddingClient(false)}>
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
                <Text style={styles.submitButtonText}>Salvar Cadastro</Text>
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
              <Text style={styles.modalTitle}>Novo Veículo</Text>
              <TouchableOpacity onPress={() => setIsAddingVehicle(false)}>
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
                <Text style={styles.submitButtonText}>Salvar Veículo</Text>
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
              <Text style={styles.modalTitle}>Gerar Nova OS</Text>
              <TouchableOpacity onPress={() => setIsAddingOS(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Selecione o Cliente *</Text>
              <View style={styles.pickerFake}>
                {clients.map(c => (
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
                    style={[styles.pickerItem, osForm.clientId === c.id ? styles.pickerItemActive : null]}
                  >
                    <Text style={[styles.pickerItemText, osForm.clientId === c.id ? styles.pickerItemActiveText : null]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {osForm.clientId ? (
                <>
                  <Text style={styles.inputLabel}>Selecione o Veículo *</Text>
                  <View style={styles.pickerFake}>
                    {vehicles.filter(v => v.clientId === osForm.clientId).map(v => (
                      <TouchableOpacity 
                        key={v.id} 
                        onPress={() => setOsForm(prev => ({ ...prev, vehicleId: v.id }))}
                        style={[styles.pickerItem, osForm.vehicleId === v.id ? styles.pickerItemActive : null]}
                      >
                        <Text style={[styles.pickerItemText, osForm.vehicleId === v.id ? styles.pickerItemActiveText : null]}>
                          {v.brand} {v.model} ({v.plate})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              {services.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputLabel}>Adicionar Serviços Mão de Obra</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {services.map(s => {
                      const isAdded = osForm.selectedServices.some(i => i.name === s.name);
                      return (
                        <TouchableOpacity 
                          key={s.id} 
                          style={[styles.suggestionBadge, isAdded ? { borderColor: '#22c55e' } : null]}
                          onPress={() => {
                            if (isAdded) {
                              setOsForm(prev => ({ ...prev, selectedServices: prev.selectedServices.filter(i => i.name !== s.name) }));
                            } else {
                              setOsForm(prev => ({ ...prev, selectedServices: [...prev.selectedServices, { id: s.id, name: s.name, price: s.price, quantity: 1, code: s.code }] }));
                            }
                          }}
                        >
                          <Text style={[styles.suggestionBadgeText, isAdded ? { color: '#22c55e' } : null]}>{s.name} ({formatCurrency(s.price)})</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {parts.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.inputLabel}>Adicionar Peças do Catálogo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {parts.map(p => {
                      const isAdded = osForm.selectedParts.some(i => i.name === p.name);
                      return (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.suggestionBadge, isAdded ? { borderColor: '#22c55e' } : null]}
                          onPress={() => {
                            if (isAdded) {
                              setOsForm(prev => ({ ...prev, selectedParts: prev.selectedParts.filter(i => i.name !== p.name) }));
                            } else {
                              setOsForm(prev => ({ ...prev, selectedParts: [...prev.selectedParts, { id: p.id, name: p.name, code: p.code, salePrice: p.salePrice, quantity: 1 }] }));
                            }
                          }}
                        >
                          <Text style={[styles.suggestionBadgeText, isAdded ? { color: '#22c55e' } : null]}>{p.name} ({formatCurrency(p.salePrice)})</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Observações / Sintomas / Diagnóstico</Text>
              <TextInput 
                placeholder="Descreva problemas observados ou detalhes adicionais..." 
                placeholderTextColor="#475569"
                multiline
                numberOfLines={3}
                value={osForm.notes} 
                onChangeText={t => setOsForm(prev => ({ ...prev, notes: t }))}
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]} 
              />

              <Text style={styles.inputLabel}>Status Inicial</Text>
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

              <TouchableOpacity style={styles.submitButton} onPress={handleCreateOS}>
                <Text style={styles.submitButtonText}>Criar Ordem de Serviço</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: ADD EXPENSE --- */}
      <Modal visible={isAddingExpense} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lançar Despesa de Caixa</Text>
              <TouchableOpacity onPress={() => setIsAddingExpense(false)}>
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
              <Text style={styles.modalTitle}>Adicionar Mão de Obra</Text>
              <TouchableOpacity onPress={() => setIsAddingCatalogService(false)}>
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
                <Text style={styles.submitButtonText}>Salvar Serviço</Text>
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
              <Text style={styles.modalTitle}>Adicionar Peça ao Catálogo</Text>
              <TouchableOpacity onPress={() => setIsAddingCatalogPart(false)}>
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
                <Text style={styles.submitButtonText}>Salvar no Estoque</Text>
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
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}

// --- MODERN PREMIUM DARK DESIGN STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10', // Deep pitch black background
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0f1115',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  logoutButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ef444410',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  screenContainer: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b66ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 5,
  },
  card: {
    backgroundColor: '#0f1115',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: '#3b66ff',
    borderColor: '#2563eb',
    paddingVertical: 20,
    shadowColor: '#3b66ff',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroCardLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#bfdbfe',
    letterSpacing: 1.5,
  },
  heroCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  heroCardSub: {
    fontSize: 9,
    color: '#dbeafe',
    marginTop: 6,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 3,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f1f5f9',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 1,
    marginTop: 15,
    marginBottom: 10,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 'bold',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1115',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  listItemLeft: {
    flex: 1,
  },
  listItemRight: {
    alignItems: 'flex-end',
  },
  osNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  osDetails: {
    fontSize: 9,
    color: '#cbd5e1',
    marginTop: 2,
  },
  osTotal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  osStatus: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  clientCard: {
    padding: 14,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  clientDetails: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#0a0c10',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  carText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  osCard: {
    padding: 14,
  },
  osHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  osNumberLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3b66ff',
  },
  statusBadge: {
    fontSize: 7,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '700',
  },
  osValue: {
    color: '#cbd5e1',
    fontWeight: 'normal',
  },
  osDate: {
    fontSize: 9,
    color: '#475569',
  },
  osTotalVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  balanceCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  balanceLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  balanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  balanceSubText: {
    fontSize: 8,
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
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  tDate: {
    fontSize: 8,
    color: '#475569',
    marginTop: 2,
  },
  tAmount: {
    fontSize: 10,
    fontWeight: '900',
  },
  formLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
  },
  formInput: {
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: '#f1f5f9',
  },
  saveSettingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b66ff',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  tabBar: {
    height: 52,
    backgroundColor: '#0f1115',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#3b66ff',
  },
  // Modal & Loaders
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0c10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 12,
    fontWeight: 'bold',
  },
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalContent: {
    backgroundColor: '#0f1115',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    color: '#f8fafc',
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: '#3b66ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pickerFake: {
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 6,
    backgroundColor: '#0a0c10',
    marginBottom: 10,
    maxHeight: 120,
  },
  pickerItem: {
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1e293b33',
  },
  pickerItemActive: {
    backgroundColor: '#3b66ff10',
    borderRadius: 6,
  },
  pickerItemText: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  pickerItemActiveText: {
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  pickerFakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  pickerTag: {
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  pickerTagActive: {
    backgroundColor: '#3b66ff10',
    borderColor: '#3b66ff',
  },
  pickerTagText: {
    fontSize: 9,
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
    padding: 14,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    backgroundColor: '#3b66ff10',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  menuCardSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginLeft: 5,
  },
  catalogSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 12,
    marginTop: 10,
  },
  catalogSegmentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  catalogSegmentTabActive: {
    backgroundColor: '#3b66ff',
  },
  catalogSegmentTabText: {
    fontSize: 9,
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
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  catalogSearchIcon: {
    marginRight: 8,
  },
  catalogSearchInput: {
    flex: 1,
    height: 36,
    fontSize: 11,
    color: '#f1f5f9',
  },
  catalogListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1115',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  catalogItemName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  catalogItemCodeBadge: {
    fontSize: 7,
    backgroundColor: '#0a0c10',
    borderWidth: 0.5,
    borderColor: '#1e293b',
    color: '#64748b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  catalogItemPriceVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  catalogActionButton: {
    padding: 6,
    backgroundColor: '#0a0c10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  suggestionBadge: {
    backgroundColor: '#3b66ff10',
    borderColor: '#3b66ff33',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
  },
  suggestionBadgeText: {
    fontSize: 9,
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  // Auth Layout styles
  authContainer: {
    flex: 1,
    backgroundColor: '#0a0c10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authCard: {
    backgroundColor: '#0f1115',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  authSubtitle: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  switchAuthMode: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchAuthText: {
    fontSize: 10,
    color: '#3b66ff',
    fontWeight: 'bold',
  }
});
