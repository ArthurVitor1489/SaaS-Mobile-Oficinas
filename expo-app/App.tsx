import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, 
  SafeAreaView, StatusBar, Alert, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { 
  Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, Calendar, 
  Wallet, DollarSign, PiggyBank, Users, ClipboardList, Settings, Menu,
  CheckCircle, Clock, Play, ChevronRight, UserPlus, Car, Check, X,
  Tag, Package, Edit2, AlertTriangle, ArrowLeft, MoreHorizontal
} from 'lucide-react-native';

// --- TYPES & INTERFACES ---
interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
}

interface WorkOrder {
  id: string;
  osNumber: string;
  clientId: string;
  vehicleId: string;
  serviceName: string;
  servicePrice: number;
  partName: string;
  partPrice: number;
  status: 'Aberta' | 'Em andamento' | 'Concluída' | 'Entregue';
  grandTotal: number;
  date: string;
}

interface Transaction {
  id: string;
  type: 'Entrada' | 'Saída';
  description: string;
  amount: number;
  date: string;
}

interface ServiceItem {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
}

interface PartItem {
  id: string;
  name: string;
  code: string;
  supplier: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
}

export default function App() {
  // --- DATABASE STATE ---
  const [settings, setSettings] = useState({
    name: 'Minha Oficina Mecânica',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    nextOSNumber: 1
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Catalog State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [parts, setParts] = useState<PartItem[]>([]);

  // Navigation: 'dashboard' | 'clients' | 'os' | 'finance' | 'more'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'clients' | 'os' | 'finance' | 'more'>('dashboard');
  const [moreSubScreen, setMoreSubScreen] = useState<'menu' | 'catalog' | 'settings'>('menu');

  // Interactive Period Selector ('diario' | 'semanal' | 'mensal')
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // --- CATALOG SCREEN STATE ---
  const [catalogSegment, setCatalogSegment] = useState<'services' | 'parts'>('services');
  const [catalogSearch, setCatalogSearch] = useState('');
  
  // Modals for catalog items
  const [isAddingCatalogService, setIsAddingCatalogService] = useState(false);
  const [isAddingCatalogPart, setIsAddingCatalogPart] = useState(false);
  const [editingCatalogItemId, setEditingCatalogItemId] = useState<string | null>(null);

  // Forms for catalog items
  const [serviceForm, setServiceForm] = useState({ name: '', code: '', description: '', price: '' });
  const [partForm, setPartForm] = useState({
    name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: ''
  });

  // --- MODAL FORMS STATE ---
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', address: '', plate: '', brand: '', model: '', year: '' });

  const [isAddingOS, setIsAddingOS] = useState(false);
  const [osForm, setOsForm] = useState({ clientId: '', vehicleId: '', serviceName: '', servicePrice: '', partName: '', partPrice: '', status: 'Aberta' as any });

  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });

  // --- HELPER FUNCTIONS ---
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- ACTIONS ---
  const handleAddClient = () => {
    if (!clientForm.name || !clientForm.phone) {
      Alert.alert('Erro', 'Por favor, preencha o nome e telefone do cliente!');
      return;
    }

    const clientId = `c-${Date.now()}`;
    const newClient: Client = {
      id: clientId,
      name: clientForm.name,
      phone: clientForm.phone,
      email: clientForm.email,
      address: clientForm.address
    };

    let newVehicle: Vehicle | null = null;
    if (clientForm.plate && clientForm.model) {
      newVehicle = {
        id: `v-${Date.now()}`,
        clientId,
        plate: clientForm.plate.toUpperCase(),
        brand: clientForm.brand,
        model: clientForm.model,
        year: clientForm.year || new Date().getFullYear().toString()
      };
    }

    setClients(prev => [...prev, newClient]);
    if (newVehicle) {
      setVehicles(prev => [...prev, newVehicle!]);
    }

    setIsAddingClient(false);
    setClientForm({ name: '', phone: '', email: '', address: '', plate: '', brand: '', model: '', year: '' });
    Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
  };

  const handleAddOS = () => {
    if (!osForm.clientId || !osForm.serviceName) {
      Alert.alert('Erro', 'Selecione o cliente e informe o serviço!');
      return;
    }

    const osId = `os-${Date.now()}`;
    const sPrice = parseFloat(osForm.servicePrice) || 0;
    const pPrice = parseFloat(osForm.partPrice) || 0;
    const grandTotal = sPrice + pPrice;

    const osNumber = `OS-${String(settings.nextOSNumber).padStart(4, '0')}`;
    const date = new Date().toISOString().split('T')[0];

    const newOS: WorkOrder = {
      id: osId,
      osNumber,
      clientId: osForm.clientId,
      vehicleId: osForm.vehicleId || '',
      serviceName: osForm.serviceName,
      servicePrice: sPrice,
      partName: osForm.partName,
      partPrice: pPrice,
      status: osForm.status,
      grandTotal,
      date
    };

    setWorkOrders(prev => [...prev, newOS]);
    setSettings(prev => ({ ...prev, nextOSNumber: prev.nextOSNumber + 1 }));

    // Auto-create Inflow transaction if the OS is already marked as 'Entregue' or 'Concluída'
    if (osForm.status === 'Entregue' || osForm.status === 'Concluída') {
      const client = clients.find(c => c.id === osForm.clientId);
      const vehicle = vehicles.find(v => v.id === osForm.vehicleId);
      setTransactions(prev => [
        ...prev,
        {
          id: `t-${Date.now()}`,
          type: 'Entrada',
          description: `Pagamento ${osNumber} - ${client?.name}${vehicle ? ` (${vehicle.model})` : ''}`,
          amount: grandTotal,
          date
        }
      ]);
    }

    setIsAddingOS(false);
    setOsForm({ clientId: '', vehicleId: '', serviceName: '', servicePrice: '', partName: '', partPrice: '', status: 'Aberta' });
    Alert.alert('Sucesso', 'Ordem de Serviço criada com sucesso!');
  };

  const handleAddExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) {
      Alert.alert('Erro', 'Por favor, informe a descrição e o valor da despesa!');
      return;
    }

    const newExpense: Transaction = {
      id: `t-${Date.now()}`,
      type: 'Saída',
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount) || 0,
      date: expenseForm.date
    };

    setTransactions(prev => [...prev, newExpense]);
    setIsAddingExpense(false);
    setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    Alert.alert('Sucesso', 'Despesa lançada com sucesso!');
  };

  // --- CATALOG CRUD ACTIONS ---
  const handleSaveCatalogService = () => {
    if (!serviceForm.name || !serviceForm.price) {
      Alert.alert('Erro', 'Por favor, preencha o nome e o preço do serviço!');
      return;
    }

    const priceNum = parseFloat(serviceForm.price) || 0;
    if (editingCatalogItemId) {
      setServices(prev => prev.map(item => item.id === editingCatalogItemId ? {
        ...item,
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
        price: priceNum
      } : item));
      Alert.alert('Sucesso', 'Serviço atualizado com sucesso!');
    } else {
      const newService: ServiceItem = {
        id: `s-${Date.now()}`,
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase() || `SRV-${Date.now().toString().slice(-4)}`,
        description: serviceForm.description,
        price: priceNum
      };
      setServices(prev => [...prev, newService]);
      Alert.alert('Sucesso', 'Serviço adicionado ao catálogo!');
    }

    setIsAddingCatalogService(false);
    setEditingCatalogItemId(null);
    setServiceForm({ name: '', code: '', description: '', price: '' });
  };

  const handleSaveCatalogPart = () => {
    if (!partForm.name || !partForm.code || !partForm.salePrice || !partForm.stock) {
      Alert.alert('Erro', 'Por favor, preencha nome, código, preço de venda e estoque!');
      return;
    }

    const purchasePriceNum = parseFloat(partForm.purchasePrice) || 0;
    const salePriceNum = parseFloat(partForm.salePrice) || 0;
    const stockNum = parseInt(partForm.stock) || 0;

    if (editingCatalogItemId) {
      setParts(prev => prev.map(item => item.id === editingCatalogItemId ? {
        ...item,
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || 'Fornecedor avulso',
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        stock: stockNum
      } : item));
      Alert.alert('Sucesso', 'Peça atualizada com sucesso!');
    } else {
      const newPart: PartItem = {
        id: `p-${Date.now()}`,
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || 'Fornecedor avulso',
        purchasePrice: purchasePriceNum,
        salePrice: salePriceNum,
        stock: stockNum
      };
      setParts(prev => [...prev, newPart]);
      Alert.alert('Sucesso', 'Peça adicionada ao estoque!');
    }

    setIsAddingCatalogPart(false);
    setEditingCatalogItemId(null);
    setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
  };

  const handleDeleteCatalogService = (id: string) => {
    Alert.alert(
      'Excluir Serviço',
      'Deseja realmente excluir este serviço do catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            setServices(prev => prev.filter(item => item.id !== id));
            Alert.alert('Sucesso', 'Serviço excluído!');
          }
        }
      ]
    );
  };

  const handleDeleteCatalogPart = (id: string) => {
    Alert.alert(
      'Excluir Peça',
      'Deseja realmente excluir esta peça do estoque?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: () => {
            setParts(prev => prev.filter(item => item.id !== id));
            Alert.alert('Sucesso', 'Peça excluída!');
          }
        }
      ]
    );
  };

  // --- STATS CALCULATIONS ---
  const totalRecebido = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalDespesas = transactions.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoCaixa = totalRecebido - totalDespesas;

  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const faturamentoMes = workOrders.reduce((acc, o) => acc + o.grandTotal, 0);

  const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;
  const osAndamento = workOrders.filter(o => o.status === 'Em andamento').length;
  const osConcluidas = workOrders.filter(o => o.status === 'Concluída').length;

  // --- PERIOD SUMMARY CALCULATIONS ---
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Daily Stats (Hoje)
  const transactionsHoje = transactions.filter(t => t.date === todayStr);
  const entradasHoje = transactionsHoje.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasHoje = transactionsHoje.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoHoje = entradasHoje - saidasHoje;

  // 2. Weekly Stats (Esta Semana Calendar)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
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

  // 3. Monthly Stats (Este Mês Calendar)
  const transactionsMes = transactions.filter(t => t.date.startsWith(currentMonthStr));
  const entradasMes = transactionsMes.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasMes = transactionsMes.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoMes = entradasMes - saidasMes;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0c10" />
      
      {/* HEADER BAR */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{settings.name.toUpperCase()}</Text>
        <Text style={styles.headerSubtitle}>Módulo Móvel de Gestão</Text>
      </View>

      {/* MAIN SCREEN RENDER */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <View style={styles.screenContainer}>
            <View style={[styles.card, styles.heroCard]}>
              <Text style={styles.heroCardLabel}>FATURAMENTO TOTAL</Text>
              <Text style={styles.heroCardValue}>{formatCurrency(faturamentoMes)}</Text>
              <Text style={styles.heroCardSub}>Consolidado de todas as OS geradas</Text>
            </View>

            {/* Metrics cards grid */}
            <View style={styles.grid}>
              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>ABERTAS</Text>
                  <ClipboardList size={16} color="#3b66ff" />
                </View>
                <Text style={styles.metricValue}>{osAbertas}</Text>
              </View>

              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>EM CURSO</Text>
                  <Play size={16} color="#eab308" />
                </View>
                <Text style={styles.metricValue}>{osAndamento}</Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>CONCLUÍDAS</Text>
                  <CheckCircle size={16} color="#22c55e" />
                </View>
                <Text style={styles.metricValue}>{osConcluidas}</Text>
              </View>

              <View style={[styles.gridCol, styles.card]}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>CLIENTES</Text>
                  <Users size={16} color="#3b66ff" />
                </View>
                <Text style={styles.metricValue}>{clients.length}</Text>
              </View>
            </View>

            {/* Recent OS List */}
            <Text style={styles.sectionTitle}>ORDENS DE SERVIÇO RECENTES</Text>
            {workOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma Ordem de Serviço cadastrada</Text>
              </View>
            ) : (
              workOrders.slice(0, 5).map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const vehicle = vehicles.find(v => v.id === os.vehicleId);
                return (
                  <View key={os.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <Text style={styles.osNum}>{os.osNumber}</Text>
                      <Text style={styles.osDetails}>{client?.name}{vehicle ? ` • ${vehicle.brand} ${vehicle.model}` : ''}</Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={styles.osTotal}>{formatCurrency(os.grandTotal)}</Text>
                      <Text style={styles.osStatus}>{os.status}</Text>
                    </View>
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

            {clients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum cliente cadastrado no momento.</Text>
                <Text style={styles.emptySubText}>Toque no botão acima para registrar o primeiro cliente.</Text>
              </View>
            ) : (
              clients.map(client => {
                const clientCars = vehicles.filter(v => v.clientId === client.id);
                return (
                  <View key={client.id} style={[styles.card, styles.clientCard]}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientDetails}>Telefone: {client.phone}</Text>
                    {client.email ? <Text style={styles.clientDetails}>E-mail: {client.email}</Text> : null}
                    
                    <View style={styles.divider} />
                    <Text style={styles.carsHeader}>VEÍCULOS REGISTRADOS:</Text>
                    {clientCars.length === 0 ? (
                      <Text style={styles.noCarsText}>Nenhum veículo vinculado.</Text>
                    ) : (
                      clientCars.map(car => (
                        <View key={car.id} style={styles.carRow}>
                          <Car size={12} color="#3b66ff" />
                          <Text style={styles.carText}>{car.brand} {car.model} ({car.plate})</Text>
                        </View>
                      ))
                    )}
                  </View>
                );
              })
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
                <Text style={styles.emptyText}>Nenhuma Ordem de Serviço cadastrada.</Text>
                <Text style={styles.emptySubText}>Abra uma OS de conserto tocando no botão acima.</Text>
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
                    {vehicle ? (
                      <Text style={styles.osLabel}>Veículo: <Text style={styles.osValue}>{vehicle.brand} {vehicle.model} ({vehicle.plate})</Text></Text>
                    ) : null}
                    <Text style={styles.osLabel}>Serviço: <Text style={styles.osValue}>{os.serviceName} ({formatCurrency(os.servicePrice)})</Text></Text>
                    {os.partName ? <Text style={styles.osLabel}>Peça: <Text style={styles.osValue}>{os.partName} ({formatCurrency(os.partPrice)})</Text></Text> : null}
                    
                    <View style={styles.divider} />
                    <View style={styles.osFooterRow}>
                      <Text style={styles.osDate}>{os.date.split('-').reverse().join('/')}</Text>
                      <Text style={styles.osTotalVal}>{formatCurrency(os.grandTotal)}</Text>
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
              <Text style={styles.tabTitle}>Fluxo de Caixa</Text>
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#ef4444' }]} onPress={() => setIsAddingExpense(true)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Despesa</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Balance Grid */}
            <View style={[styles.card, styles.balanceCard]}>
              <Text style={styles.balanceLabel}>SALDO ATUAL DE CAIXA</Text>
              <Text style={[styles.balanceValue, saldoCaixa >= 0 ? styles.textGreen : styles.textRed]}>
                {formatCurrency(saldoCaixa)}
              </Text>
              <View style={styles.balanceSummary}>
                <Text style={styles.balanceSubText}>Total Entradas: <Text style={styles.textGreen}>{formatCurrency(totalRecebido)}</Text></Text>
                <Text style={styles.balanceSubText}>Total Saídas: <Text style={styles.textRed}>{formatCurrency(totalDespesas)}</Text></Text>
              </View>
            </View>

            {/* INTERACTIVE PERIOD SUMMARY CARD DECK */}
            <View style={[styles.card, styles.periodDeck]}>
              <View style={styles.periodHeader}>
                <View>
                  <Text style={styles.periodDeckTitle}>RESUMO POR PERÍODO</Text>
                  <Text style={styles.periodDeckSub}>Entradas, saídas e resultado líquido</Text>
                </View>
                
                {/* Switcher tabs */}
                <View style={styles.periodSwitcher}>
                  {(['diario', 'semanal', 'mensal'] as const).map(p => (
                    <TouchableOpacity 
                      key={p} 
                      onPress={() => setSummaryPeriod(p)}
                      style={[styles.periodTab, summaryPeriod === p ? styles.periodTabActive : null]}
                    >
                      <Text style={[styles.periodTabText, summaryPeriod === p ? styles.periodTabActiveText : null]}>
                        {p === 'diario' ? 'Dia' : p === 'semanal' ? 'Sem' : 'Mês'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dynamic calculations columns */}
              <View style={styles.periodGrid}>
                <View style={styles.periodCol}>
                  <Text style={[styles.periodColLabel, styles.textGreen]}>ENTRADAS</Text>
                  <Text style={styles.periodColVal} numberOfLines={1}>
                    {formatCurrency(
                      summaryPeriod === 'diario' ? entradasHoje :
                      summaryPeriod === 'semanal' ? entradasSemana :
                      entradasMes
                    )}
                  </Text>
                </View>

                <View style={styles.periodCol}>
                  <Text style={[styles.periodColLabel, styles.textRed]}>SAÍDAS</Text>
                  <Text style={styles.periodColVal} numberOfLines={1}>
                    {formatCurrency(
                      summaryPeriod === 'diario' ? saidasHoje :
                      summaryPeriod === 'semanal' ? saidasSemana :
                      saidasMes
                    )}
                  </Text>
                </View>

                <View style={styles.periodCol}>
                  <Text style={[styles.periodColLabel, { color: '#3b66ff' }]}>LÍQUIDO</Text>
                  <Text style={[styles.periodColVal, 
                    (summaryPeriod === 'diario' ? saldoHoje :
                     summaryPeriod === 'semanal' ? saldoSemana :
                     saldoMes) >= 0 ? styles.textGreen : styles.textRed
                  ]} numberOfLines={1}>
                    {formatCurrency(
                      summaryPeriod === 'diario' ? saldoHoje :
                      summaryPeriod === 'semanal' ? saldoSemana :
                      saldoMes
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Transactions feed */}
            <Text style={styles.sectionTitle}>EXTRATO DE LANÇAMENTOS</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma movimentação no caixa.</Text>
              </View>
            ) : (
              transactions.map(t => (
                <View key={t.id} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.tDesc}>{t.description}</Text>
                    <Text style={styles.tDate}>{t.date.split('-').reverse().join('/')}</Text>
                  </View>
                  <Text style={[styles.tAmount, t.type === 'Entrada' ? styles.textGreen : styles.textRed]}>
                    {t.type === 'Entrada' ? '+' : '-'}{formatCurrency(t.amount)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: MORE (MENU, CATALOG, SETTINGS) */}
        {currentTab === 'more' && moreSubScreen === 'menu' && (
          <View style={styles.screenContainer}>
            <Text style={styles.tabTitle}>Mais Opções</Text>
            <Text style={[styles.menuCardSub, { marginBottom: 15 }]}>Acesse ferramentas extras de gerenciamento</Text>
            
            <TouchableOpacity 
              style={[styles.card, styles.menuCard]} 
              onPress={() => {
                setMoreSubScreen('catalog');
                setCatalogSegment('services');
                setCatalogSearch('');
              }}
            >
              <View style={styles.menuCardLeft}>
                <View style={styles.menuIconContainer}>
                  <Package size={18} color="#3b66ff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuCardTitle}>Catálogo de Serviços e Peças</Text>
                  <Text style={styles.menuCardSub}>Cadastre serviços, peças e controle seu estoque.</Text>
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
                  <Text style={styles.menuCardTitle}>Configurações da Oficina</Text>
                  <Text style={styles.menuCardSub}>Gerencie nome, CNPJ, telefone, e-mail e dados locais.</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        {currentTab === 'more' && moreSubScreen === 'catalog' && (
          <View style={styles.screenContainer}>
            {/* Header back & new */}
            <View style={styles.screenHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setMoreSubScreen('menu')}>
                <ArrowLeft size={16} color="#f8fafc" />
                <Text style={styles.backButtonText}>Voltar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => {
                  setEditingCatalogItemId(null);
                  if (catalogSegment === 'services') {
                    setServiceForm({ name: '', code: '', description: '', price: '' });
                    setIsAddingCatalogService(true);
                  } else {
                    setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
                    setIsAddingCatalogPart(true);
                  }
                }}
              >
                <Plus size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Novo</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.tabTitle}>Catálogo da Oficina</Text>
            <Text style={[styles.menuCardSub, { marginBottom: 12 }]}>Gerencie os itens oferecidos por sua oficina</Text>

            {/* Sliding segment controller */}
            <View style={styles.catalogSegmentContainer}>
              <TouchableOpacity
                onPress={() => {
                  setCatalogSegment('services');
                  setCatalogSearch('');
                }}
                style={[styles.catalogSegmentTab, catalogSegment === 'services' ? styles.catalogSegmentTabActive : null]}
              >
                <Tag size={12} color={catalogSegment === 'services' ? '#fff' : '#64748b'} />
                <Text style={[styles.catalogSegmentTabText, catalogSegment === 'services' ? styles.catalogSegmentTabTextActive : null]}>
                  Serviços ({services.length})
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setCatalogSegment('parts');
                  setCatalogSearch('');
                }}
                style={[styles.catalogSegmentTab, catalogSegment === 'parts' ? styles.catalogSegmentTabActive : null]}
              >
                <Package size={12} color={catalogSegment === 'parts' ? '#fff' : '#64748b'} />
                <Text style={[styles.catalogSegmentTabText, catalogSegment === 'parts' ? styles.catalogSegmentTabTextActive : null]}>
                  Peças ({parts.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.catalogSearchWrapper}>
              <Search size={14} color="#64748b" style={styles.catalogSearchIcon} />
              <TextInput
                placeholder={catalogSegment === 'services' ? "Buscar serviços..." : "Buscar peças..."}
                placeholderTextColor="#475569"
                value={catalogSearch}
                onChangeText={t => setCatalogSearch(t)}
                style={styles.catalogSearchInput}
              />
              {catalogSearch ? (
                <TouchableOpacity onPress={() => setCatalogSearch('')} style={styles.catalogSearchClear}>
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Lists content */}
            <View style={{ marginTop: 10 }}>
              {catalogSegment === 'services' ? (
                services.filter(s => 
                  (s.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) || 
                  (s.description || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (s.code || '').toLowerCase().includes(catalogSearch.toLowerCase())
                ).length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhum serviço catalogado</Text>
                  </View>
                ) : (
                  services.filter(s => 
                    (s.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) || 
                    (s.description || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    (s.code || '').toLowerCase().includes(catalogSearch.toLowerCase())
                  ).map(item => (
                    <View key={item.id} style={styles.catalogListItem}>
                      <View style={styles.catalogListItemLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={styles.catalogItemName}>{item.name}</Text>
                          {item.code ? (
                            <Text style={styles.catalogItemCodeBadge}>{item.code}</Text>
                          ) : null}
                        </View>
                        {item.description ? (
                          <Text style={styles.catalogItemDesc}>{item.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.catalogListItemRight}>
                        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                          <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.price)}</Text>
                          <Text style={styles.catalogItemPriceLabel}>MÃO DE OBRA</Text>
                        </View>
                        <View style={styles.catalogActionsContainer}>
                          <TouchableOpacity 
                            onPress={() => {
                              setEditingCatalogItemId(item.id);
                              setServiceForm({
                                name: item.name,
                                code: item.code || '',
                                description: item.description || '',
                                price: item.price.toString()
                              });
                              setIsAddingCatalogService(true);
                            }}
                            style={styles.catalogActionButton}
                          >
                            <Edit2 size={13} color="#3b66ff" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleDeleteCatalogService(item.id)}
                            style={styles.catalogActionButton}
                          >
                            <Trash2 size={13} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )
              ) : (
                parts.filter(p => 
                  (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (p.code || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                  (p.supplier || '').toLowerCase().includes(catalogSearch.toLowerCase())
                ).length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Nenhuma peça no estoque</Text>
                  </View>
                ) : (
                  parts.filter(p => 
                    (p.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    (p.code || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
                    (p.supplier || '').toLowerCase().includes(catalogSearch.toLowerCase())
                  ).map(item => {
                    let stockColor = '#22c55e';
                    let stockLabel = `Estoque: ${item.stock}`;
                    if (item.stock === 0) {
                      stockColor = '#ef4444';
                      stockLabel = 'Sem estoque';
                    } else if (item.stock <= 5) {
                      stockColor = '#eab308';
                      stockLabel = `Estoque Baixo: ${item.stock}`;
                    }

                    return (
                      <View key={item.id} style={[styles.catalogListItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                              <Text style={styles.catalogItemName}>{item.name}</Text>
                              <Text style={styles.catalogItemCodeBadge}>{item.code}</Text>
                            </View>
                            {item.supplier ? (
                              <Text style={styles.catalogItemDesc}>Forn: {item.supplier}</Text>
                            ) : null}
                          </View>
                          <View style={[styles.stockBadge, { borderColor: stockColor + '33', backgroundColor: stockColor + '11' }]}>
                            {item.stock <= 5 && <AlertTriangle size={9} color={stockColor} style={{ marginRight: 3 }} />}
                            <Text style={[styles.stockBadgeText, { color: stockColor }]}>{stockLabel}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.catalogPartFooter}>
                          <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View>
                              <Text style={styles.catalogItemPriceLabel}>COMPRA</Text>
                              <Text style={[styles.catalogItemPriceVal, { fontSize: 10, color: '#94a3b8' }]}>{formatCurrency(item.purchasePrice)}</Text>
                            </View>
                            <View>
                              <Text style={[styles.catalogItemPriceLabel, { color: '#3b66ff' }]}>VENDA</Text>
                              <Text style={[styles.catalogItemPriceVal, { fontSize: 10, color: '#3b66ff' }]}>{formatCurrency(item.salePrice)}</Text>
                            </View>
                            <View>
                              <Text style={[styles.catalogItemPriceLabel, { color: '#22c55e' }]}>LUCRO</Text>
                              <Text style={[styles.catalogItemPriceVal, { fontSize: 10, color: '#22c55e' }]}>{formatCurrency(item.salePrice - item.purchasePrice)}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.catalogActionsContainer}>
                            <TouchableOpacity 
                              onPress={() => {
                                setEditingCatalogItemId(item.id);
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
                              style={styles.catalogActionButton}
                            >
                              <Edit2 size={13} color="#3b66ff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleDeleteCatalogPart(item.id)}
                              style={styles.catalogActionButton}
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )
              )}
            </View>
          </View>
        )}

        {currentTab === 'more' && moreSubScreen === 'settings' && (
          <View style={styles.screenContainer}>
            <View style={styles.screenHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setMoreSubScreen('menu')}>
                <ArrowLeft size={16} color="#f8fafc" />
                <Text style={styles.backButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.tabTitle}>Configurações da Oficina</Text>
            <Text style={[styles.menuCardSub, { marginBottom: 12 }]}>Gerencie as informações comerciais e locais</Text>
            
            <View style={[styles.card, { marginTop: 10 }]}>
              <Text style={styles.formLabel}>Nome da Oficina / Razão Social</Text>
              <TextInput 
                value={settings.name} 
                onChangeText={t => setSettings(prev => ({ ...prev, name: t }))}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>CNPJ</Text>
              <TextInput 
                value={settings.cnpj} 
                onChangeText={t => setSettings(prev => ({ ...prev, cnpj: t }))}
                placeholder="Ex: 00.000.000/0001-00" 
                placeholderTextColor="#555"
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>Endereço Comercial</Text>
              <TextInput 
                value={settings.address} 
                onChangeText={t => setSettings(prev => ({ ...prev, address: t }))}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>WhatsApp / Telefone</Text>
              <TextInput 
                value={settings.phone} 
                onChangeText={t => setSettings(prev => ({ ...prev, phone: t }))}
                style={styles.formInput} 
              />

              <Text style={styles.formLabel}>E-mail</Text>
              <TextInput 
                value={settings.email} 
                onChangeText={t => setSettings(prev => ({ ...prev, email: t }))}
                style={styles.formInput} 
              />
              
              <TouchableOpacity style={styles.saveSettingsButton} onPress={() => Alert.alert('Sucesso', 'Configurações salvas localmente!')}>
                <Check size={16} color="#fff" />
                <Text style={styles.saveSettingsText}>Salvar Dados</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* FOOTER TAB NAVIGATION BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('dashboard')}>
          <Menu size={20} color={currentTab === 'dashboard' ? '#3b66ff' : '#64748b'} />
          <Text style={[styles.tabLabel, currentTab === 'dashboard' ? styles.tabLabelActive : null]}>Painel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('clients')}>
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

      {/* --- FORM MODAL: ADD CLIENT & VEHICLE --- */}
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
              <Text style={styles.modalSection}>DADOS DO CLIENTE</Text>
              
              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <TextInput 
                placeholder="Ex: João Silva" 
                placeholderTextColor="#555"
                value={clientForm.name} 
                onChangeText={t => setClientForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Telefone *</Text>
              <TextInput 
                placeholder="Ex: (11) 99999-9999" 
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                value={clientForm.phone} 
                onChangeText={t => setClientForm(prev => ({ ...prev, phone: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Endereço</Text>
              <TextInput 
                placeholder="Ex: Rua das Flores, 123" 
                placeholderTextColor="#555"
                value={clientForm.address} 
                onChangeText={t => setClientForm(prev => ({ ...prev, address: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.modalSection}>VEÍCULO VINCULADO</Text>
              
              <Text style={styles.inputLabel}>Placa</Text>
              <TextInput 
                placeholder="Ex: ABC1D23" 
                placeholderTextColor="#555"
                autoCapitalize="characters"
                value={clientForm.plate} 
                onChangeText={t => setClientForm(prev => ({ ...prev, plate: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Marca e Modelo</Text>
              <View style={styles.grid}>
                <TextInput 
                  placeholder="Ex: Toyota" 
                  placeholderTextColor="#555"
                  value={clientForm.brand} 
                  onChangeText={t => setClientForm(prev => ({ ...prev, brand: t }))}
                  style={[styles.modalInput, { flex: 1, marginRight: 5 }]} 
                />
                <TextInput 
                  placeholder="Ex: Corolla" 
                  placeholderTextColor="#555"
                  value={clientForm.model} 
                  onChangeText={t => setClientForm(prev => ({ ...prev, model: t }))}
                  style={[styles.modalInput, { flex: 1, marginLeft: 5 }]} 
                />
              </View>
              
              <TouchableOpacity style={styles.submitButton} onPress={handleAddClient}>
                <Text style={styles.submitButtonText}>Salvar Cliente</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: ADD WORK ORDER --- */}
      <Modal visible={isAddingOS} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Ordem de Serviço</Text>
              <TouchableOpacity onPress={() => setIsAddingOS(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Selecionar Cliente *</Text>
              <View style={styles.pickerFake}>
                {clients.length === 0 ? (
                  <Text style={styles.pickerFakeText}>Nenhum cliente cadastrado ainda!</Text>
                ) : (
                  clients.map(c => (
                    <TouchableOpacity 
                      key={c.id} 
                      onPress={() => {
                        const clientVehicles = vehicles.filter(v => v.clientId === c.id);
                        setOsForm(prev => ({ 
                          ...prev, 
                          clientId: c.id,
                          vehicleId: clientVehicles.length === 1 ? clientVehicles[0].id : ''
                        }));
                      }}
                      style={[styles.pickerItem, osForm.clientId === c.id ? styles.pickerItemActive : null]}
                    >
                      <Text style={[styles.pickerItemText, osForm.clientId === c.id ? styles.pickerItemActiveText : null]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              <Text style={styles.inputLabel}>Selecionar Veículo *</Text>
              <View style={styles.pickerFake}>
                {vehicles.filter(v => v.clientId === osForm.clientId).length === 0 ? (
                  <Text style={styles.pickerFakeText}>Nenhum veículo vinculado ao cliente.</Text>
                ) : (
                  vehicles.filter(v => v.clientId === osForm.clientId).map(v => (
                    <TouchableOpacity 
                      key={v.id} 
                      onPress={() => setOsForm(prev => ({ ...prev, vehicleId: v.id }))}
                      style={[styles.pickerItem, osForm.vehicleId === v.id ? styles.pickerItemActive : null]}
                    >
                      <Text style={[styles.pickerItemText, osForm.vehicleId === v.id ? styles.pickerItemActiveText : null]}>{v.brand} {v.model} ({v.plate})</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {services.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Selecionar Serviço do Catálogo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScrollContent}>
                    {services.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setOsForm(prev => ({ ...prev, serviceName: s.name, servicePrice: s.price.toString() }))}
                        style={styles.suggestionBadge}
                      >
                        <Text style={styles.suggestionBadgeText}>{s.name} ({formatCurrency(s.price)})</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Nome do Serviço Mecânico *</Text>
              <TextInput 
                placeholder="Ex: Troca de Pastilhas de Freio" 
                placeholderTextColor="#555"
                value={osForm.serviceName} 
                onChangeText={t => setOsForm(prev => ({ ...prev, serviceName: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Mão de Obra (R$) *</Text>
              <TextInput 
                placeholder="Ex: 120.00" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={osForm.servicePrice} 
                onChangeText={t => setOsForm(prev => ({ ...prev, servicePrice: t }))}
                style={styles.modalInput} 
              />

              {parts.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Selecionar Peça do Catálogo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScrollContent}>
                    {parts.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => setOsForm(prev => ({ ...prev, partName: p.name, partPrice: p.salePrice.toString() }))}
                        style={styles.suggestionBadge}
                      >
                        <Text style={styles.suggestionBadgeText}>{p.name} ({formatCurrency(p.salePrice)})</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.inputLabel}>Peça Aplicada (Opcional)</Text>
              <TextInput 
                placeholder="Ex: Pastilha de Freio Cobreq" 
                placeholderTextColor="#555"
                value={osForm.partName} 
                onChangeText={t => setOsForm(prev => ({ ...prev, partName: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor das Peças (R$)</Text>
              <TextInput 
                placeholder="Ex: 150.00" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={osForm.partPrice} 
                onChangeText={t => setOsForm(prev => ({ ...prev, partPrice: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Status da OS</Text>
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

              <TouchableOpacity style={styles.submitButton} onPress={handleAddOS}>
                <Text style={styles.submitButtonText}>Criar Ordem de Serviço</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- FORM MODAL: LAÇAR DESPESA --- */}
      <Modal visible={isAddingExpense} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lançar Nova Despesa</Text>
              <TouchableOpacity onPress={() => setIsAddingExpense(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Descrição da Despesa *</Text>
            <TextInput 
              placeholder="Ex: Conta de Energia Elétrica ou Conta de Água" 
              placeholderTextColor="#555"
              value={expenseForm.description} 
              onChangeText={t => setExpenseForm(prev => ({ ...prev, description: t }))}
              style={styles.modalInput} 
            />

            <Text style={styles.inputLabel}>Valor Pago (R$) *</Text>
            <TextInput 
              placeholder="Ex: 350.00" 
              placeholderTextColor="#555"
              keyboardType="numeric"
              value={expenseForm.amount} 
              onChangeText={t => setExpenseForm(prev => ({ ...prev, amount: t }))}
              style={styles.modalInput} 
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleAddExpense}>
              <Text style={styles.submitButtonText}>Salvar Despesa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- FORM MODAL: ADD CATALOG SERVICE --- */}
      <Modal visible={isAddingCatalogService} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCatalogItemId ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}</Text>
              <TouchableOpacity onPress={() => setIsAddingCatalogService(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome do Serviço *</Text>
              <TextInput 
                placeholder="Ex: Alinhamento de Direção 3D" 
                placeholderTextColor="#555"
                value={serviceForm.name} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Código / Referência</Text>
              <TextInput 
                placeholder="Ex: SRV-ALIN" 
                placeholderTextColor="#555"
                autoCapitalize="characters"
                value={serviceForm.code} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, code: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor Cobrado (R$) *</Text>
              <TextInput 
                placeholder="Ex: 120.00" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={serviceForm.price} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, price: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Descrição do Serviço</Text>
              <TextInput 
                placeholder="Descreva o que é executado..." 
                placeholderTextColor="#555"
                multiline
                numberOfLines={3}
                value={serviceForm.description} 
                onChangeText={t => setServiceForm(prev => ({ ...prev, description: t }))}
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveCatalogService}>
                <Text style={styles.submitButtonText}>{editingCatalogItemId ? 'Atualizar Serviço' : 'Salvar Serviço'}</Text>
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
              <Text style={styles.modalTitle}>{editingCatalogItemId ? 'Editar Peça' : 'Cadastrar Nova Peça'}</Text>
              <TouchableOpacity onPress={() => setIsAddingCatalogPart(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome da Peça *</Text>
              <TextInput 
                placeholder="Ex: Pastilha de Freio Cobreq" 
                placeholderTextColor="#555"
                value={partForm.name} 
                onChangeText={t => setPartForm(prev => ({ ...prev, name: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Código SKU/Peça *</Text>
              <TextInput 
                placeholder="Ex: PAS-COB150" 
                placeholderTextColor="#555"
                autoCapitalize="characters"
                value={partForm.code} 
                onChangeText={t => setPartForm(prev => ({ ...prev, code: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Fornecedor</Text>
              <TextInput 
                placeholder="Ex: Distribuidora Real de AutoPeças" 
                placeholderTextColor="#555"
                value={partForm.supplier} 
                onChangeText={t => setPartForm(prev => ({ ...prev, supplier: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor de Compra (R$)</Text>
              <TextInput 
                placeholder="Ex: 65.00" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={partForm.purchasePrice} 
                onChangeText={t => setPartForm(prev => ({ ...prev, purchasePrice: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Valor de Venda (R$) *</Text>
              <TextInput 
                placeholder="Ex: 130.00" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={partForm.salePrice} 
                onChangeText={t => setPartForm(prev => ({ ...prev, salePrice: t }))}
                style={styles.modalInput} 
              />

              <Text style={styles.inputLabel}>Estoque Inicial *</Text>
              <TextInput 
                placeholder="Ex: 10" 
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={partForm.stock} 
                onChangeText={t => setPartForm(prev => ({ ...prev, stock: t }))}
                style={styles.modalInput} 
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSaveCatalogPart}>
                <Text style={styles.submitButtonText}>{editingCatalogItemId ? 'Atualizar Peça' : 'Salvar Peça'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// --- PREMIUM DESIGN STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0c10', // Pitch black modern theme
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#0f1115',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
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
    marginTop: 2,
    letterSpacing: 0.5,
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
  emptySubText: {
    fontSize: 9,
    color: '#334155',
    marginTop: 4,
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
    color: '#64748b',
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
    marginTop: 2,
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
  carsHeader: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noCarsText: {
    fontSize: 9,
    color: '#334155',
    fontStyle: 'italic',
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  carText: {
    fontSize: 10,
    color: '#cbd5e1',
    marginLeft: 6,
    fontWeight: '500',
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
  osFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  periodDeck: {
    padding: 12,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
    marginBottom: 8,
  },
  periodDeckTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  periodDeckSub: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 2,
  },
  periodSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0a0c10',
    borderRadius: 6,
    padding: 1.5,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  periodTab: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  periodTabActive: {
    backgroundColor: '#3b66ff',
  },
  periodTabText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#64748b',
  },
  periodTabActiveText: {
    color: '#fff',
  },
  periodGrid: {
    flexDirection: 'row',
  },
  periodCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  periodColLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  periodColVal: {
    fontSize: 9,
    fontWeight: '900',
    color: '#f1f5f9',
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b66ff',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  saveSettingsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
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
  // Modal styles
  modalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  modalSection: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 10,
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
    marginBottom: 15,
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
    padding: 8,
    backgroundColor: '#0a0c10',
    marginBottom: 10,
  },
  pickerFakeText: {
    fontSize: 9,
    color: '#475569',
    fontStyle: 'italic',
  },
  pickerItem: {
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1e293b',
  },
  pickerItemActive: {
    backgroundColor: '#3b66ff1a',
    borderRadius: 6,
  },
  pickerItemText: {
    fontSize: 11,
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
    backgroundColor: '#3b66ff1a',
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
  // Catalog and More Tab styling
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
    backgroundColor: '#3b66ff11',
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
  },
  catalogSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
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
  catalogSearchClear: {
    padding: 4,
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
  catalogListItemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  catalogListItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  catalogItemName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  catalogItemCodeBadge: {
    fontSize: 7,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#0a0c10',
    borderWidth: 0.5,
    borderColor: '#1e293b',
    color: '#64748b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  catalogItemDesc: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  catalogItemPriceVal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  catalogItemPriceLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  catalogActionsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  catalogActionButton: {
    padding: 6,
    backgroundColor: '#0a0c10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stockBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  catalogPartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b33',
    paddingTop: 8,
    marginTop: 8,
  },
  suggestionScrollContent: {
    paddingVertical: 4,
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
  }
});
