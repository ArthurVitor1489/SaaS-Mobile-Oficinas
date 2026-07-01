import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { 
  Client, Vehicle, ServiceItem, PartItem, OSItemService, OSItemPart, 
  OSStatus, WorkOrder, PaymentMethod, BillingStatus, Installment, 
  Billing, TransactionType, TransactionCategory, FinancialTransaction, 
  CompanySettings 
} from '../types';

interface DatabaseState {
  clients: Client[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  parts: PartItem[];
  workOrders: WorkOrder[];
  billings: Billing[];
  transactions: FinancialTransaction[];
  settings: CompanySettings;
}

interface DatabaseContextProps extends DatabaseState {
  loading: boolean;
  online: boolean;
  signOut: () => Promise<void>;

  // Client CRUD
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<Client | null>;
  updateClient: (id: string, client: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
  
  // Vehicle CRUD
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;
  
  // Service CRUD
  addService: (service: Omit<ServiceItem, 'id'>) => Promise<ServiceItem | null>;
  updateService: (id: string, service: Partial<ServiceItem>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  
  // Part CRUD
  addPart: (part: Omit<PartItem, 'id'>) => Promise<PartItem | null>;
  updatePart: (id: string, part: Partial<PartItem>) => Promise<boolean>;
  deletePart: (id: string) => Promise<boolean>;
  
  // OS operations
  addWorkOrder: (os: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => Promise<WorkOrder | null>;
  updateWorkOrder: (id: string, os: Partial<WorkOrder>) => Promise<boolean>;
  updateWorkOrderStatus: (id: string, status: OSStatus) => Promise<boolean>;
  saveWorkOrderSignature: (id: string, signatureBase64: string) => Promise<boolean>;
  deleteWorkOrder: (id: string) => Promise<boolean>;
  
  // Billing Operations
  addBilling: (billing: Omit<Billing, 'id' | 'createdAt'>) => Promise<Billing | null>;
  payInstallment: (billingId: string, installmentNumber: number) => Promise<boolean>;
  
  // Financial Operations
  addTransaction: (transaction: Omit<FinancialTransaction, 'id' | 'createdAt'>) => Promise<FinancialTransaction | null>;
  deleteTransaction: (id: string) => Promise<boolean>;
  
  // Settings operations
  updateSettings: (settings: Partial<CompanySettings>) => Promise<boolean>;
  
  // Backup / local operations
  exportDatabaseJson: () => string;
  resetDatabase: () => Promise<void>;
  restoreBackup: (jsonStr: string) => Promise<boolean>;
}

const DatabaseContext = createContext<DatabaseContextProps | undefined>(undefined);

const CACHE_KEY = '@oficina_saas_cache';

const defaultSettings: CompanySettings = {
  name: 'Nova Oficina Mecânica',
  cnpj: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  logoUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=200&auto=format&fit=crop',
  autoSequence: true,
  nextOSNumber: 1,
  pdfNotes: 'Garantia de 90 dias para serviços e peças aplicadas. Obrigado pela preferência!'
};

const seedClients: Client[] = [
  {
    id: 'c-1',
    name: 'Cláudio Abreu',
    cpfCnpj: '123.456.789-00',
    phone: '(11) 98765-4321',
    whatsapp: '(11) 98765-4321',
    email: 'claudio.abreu@gmail.com',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    notes: 'Cliente muito cuidadoso com o carro. Solicita sempre peças originais.',
    createdAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 'c-2',
    name: 'Lojas Santos Comércio Ltda',
    cpfCnpj: '12.345.678/0001-99',
    phone: '(11) 3211-4040',
    whatsapp: '(11) 97654-3210',
    email: 'frota@lojassantos.com.br',
    address: 'Rua das Indústrias, 84 - Tamboré, Barueri - SP',
    notes: 'Frota comercial de entregas. Exige faturamento em boleto para 15 dias.',
    createdAt: '2026-05-05T14:30:00Z'
  },
  {
    id: 'c-3',
    name: 'Ricardo Oliveira',
    cpfCnpj: '987.654.321-11',
    phone: '(19) 99876-5432',
    whatsapp: '(19) 99876-5432',
    email: 'ricardo.oliver@outlook.com',
    address: 'Rua General Osório, 300 - Centro, Campinas - SP',
    notes: 'Colecionador de carros antigos. Cuidado redobrado ao manobrar.',
    createdAt: '2026-05-12T09:15:00Z'
  }
];

const seedVehicles: Vehicle[] = [
  {
    id: 'v-1',
    clientId: 'c-1',
    plate: 'QWE-1B23',
    brand: 'Toyota',
    model: 'Corolla XEi 2.0',
    year: '2021',
    chassis: '9BR1234567890ABCD',
    odometer: '42350',
    createdAt: '2026-05-01T10:15:00Z'
  },
  {
    id: 'v-2',
    clientId: 'c-2',
    plate: 'ABC-9A88',
    brand: 'Chevrolet',
    model: 'Onix Hatch 1.0 Turbo',
    year: '2020',
    chassis: '9BR876543210EDCBA',
    odometer: '65800',
    createdAt: '2026-05-05T14:45:00Z'
  },
  {
    id: 'v-3',
    clientId: 'c-2',
    plate: 'FIO-0F99',
    brand: 'Fiat',
    model: 'Fiorino 1.4 Hard Working',
    year: '2018',
    chassis: '9BR789012345XYZAB',
    odometer: '112400',
    createdAt: '2026-05-05T14:50:00Z'
  },
  {
    id: 'v-4',
    clientId: 'c-3',
    plate: 'OPA-1978',
    brand: 'Chevrolet',
    model: 'Opala Comodoro 4.1 Coupe',
    year: '1978',
    chassis: '9BR444555666ZZZZZ',
    odometer: '154100',
    createdAt: '2026-05-12T09:30:00Z'
  }
];

const seedServices: ServiceItem[] = [
  { id: 's-1', name: 'Troca de Óleo e Filtro', code: 'SRV-OLEO', description: 'Substituição do óleo lubrificante do motor 5W30 sintético e filtro de óleo original', price: 180.00 },
  { id: 's-2', name: 'Revisão Geral Preventiva', code: 'SRV-REVISAO', description: 'Inspeção mecânica geral de 40 itens, alinhamento de direção 3D e balanceamento das 4 rodas', price: 350.00 },
  { id: 's-3', name: 'Substituição de Pastilhas de Freio', code: 'SRV-FREIO', description: 'Troca das pastilhas de freio do eixo dianteiro com higienização do sistema e teste de frenagem', price: 120.00 },
  { id: 's-4', name: 'Serviço de Suspensão Avançada', code: 'SRV-SUSPENSAO', description: 'Troca de amortecedores, buchas de bandeja, pivôs e regulagem final', price: 450.00 },
  { id: 's-5', name: 'Troca de Kit de Embreagem', code: 'SRV-EMBREAGEM', description: 'Remoção do câmbio, substituição do disco, platô, rolamento e óleo de transmissão', price: 800.00 }
];

const seedParts: PartItem[] = [
  { id: 'p-1', name: 'Óleo Motor 5W30 Sintético 1L', code: 'OLE-5W30', supplier: 'LubriMax Distribuidora', purchasePrice: 32.00, salePrice: 55.00, stock: 24 },
  { id: 'p-2', name: 'Filtro de Óleo Corolla', code: 'FIL-COR2.0', supplier: 'AutoPeças Central', purchasePrice: 20.00, salePrice: 45.00, stock: 8 },
  { id: 'p-3', name: 'Pastilhas de Freio Cobreq', code: 'PAS-COB150', supplier: 'Real Distribuidora', purchasePrice: 65.00, salePrice: 130.00, stock: 12 },
  { id: 'p-4', name: 'Amortecedor Dianteiro Cofap Corolla', code: 'AMO-COF201', supplier: 'Real Distribuidora', purchasePrice: 180.00, salePrice: 340.00, stock: 4 },
  { id: 'p-5', name: 'Kit Embreagem Sachs Opala 4.1', code: 'EMB-SAC78', supplier: 'Sachs Peças do Brasil', purchasePrice: 380.00, salePrice: 680.00, stock: 2 }
];

const seedWorkOrders: WorkOrder[] = [
  {
    id: 'os-1',
    osNumber: 'OS-0001',
    date: '2026-05-10',
    clientId: 'c-1',
    vehicleId: 'v-1',
    services: [
      { id: 's-1', name: 'Troca de Óleo e Filtro', price: 180.00, quantity: 1 }
    ],
    parts: [
      { id: 'p-1', name: 'Óleo Motor 5W30 Sintético 1L', code: 'OLE-5W30', salePrice: 55.00, quantity: 4 },
      { id: 'p-2', name: 'Filtro de Óleo Corolla', code: 'FIL-COR2.0', salePrice: 45.00, quantity: 1 }
    ],
    notes: 'Troca de óleo de rotina efetuada conforme manual. Nível verificado e luz de óleo no painel reiniciada.',
    status: 'Entregue',
    servicesTotal: 180.00,
    partsTotal: 265.00,
    grandTotal: 445.00,
    createdAt: '2026-05-10T11:00:00Z'
  },
  {
    id: 'os-2',
    osNumber: 'OS-0002',
    date: '2026-05-18',
    clientId: 'c-2',
    vehicleId: 'v-3',
    services: [
      { id: 's-2', name: 'Revisão Geral Preventiva', price: 350.00, quantity: 1 },
      { id: 's-3', name: 'Substituição de Pastilhas de Freio', price: 120.00, quantity: 1 }
    ],
    parts: [
      { id: 'p-3', name: 'Pastilhas de Freio Cobreq', code: 'PAS-COB150', salePrice: 130.00, quantity: 1 }
    ],
    notes: 'Freios emitindo ruído metálico. Substituído pastilhas. Suspensão dianteira revisada, reaperto efetuado. Pneus alinhados e balanceados.',
    status: 'Concluída',
    servicesTotal: 470.00,
    partsTotal: 130.00,
    grandTotal: 600.00,
    createdAt: '2026-05-18T13:20:00Z'
  },
  {
    id: 'os-3',
    osNumber: 'OS-0003',
    date: '2026-05-28',
    clientId: 'c-3',
    vehicleId: 'v-4',
    services: [
      { id: 's-5', name: 'Troca de Kit de Embreagem', price: 800.00, quantity: 1 }
    ],
    parts: [
      { id: 'p-5', name: 'Kit Embreagem Sachs Opala 4.1', code: 'EMB-SAC78', salePrice: 680.00, quantity: 1 }
    ],
    notes: 'Pedal de embreagem excessivamente rígido e marchas arranhando para engatar. Embreagem patinando em aclives. Desmontagem iniciada.',
    status: 'Em andamento',
    servicesTotal: 800.00,
    partsTotal: 680.00,
    grandTotal: 1480.00,
    createdAt: '2026-05-28T09:40:00Z'
  }
];

const seedBillings: Billing[] = [
  {
    id: 'b-1',
    osId: 'os-1',
    amount: 445.00,
    paymentMethod: 'PIX',
    status: 'Pago',
    dueDate: '2026-05-10',
    installments: [
      { number: 1, amount: 445.00, dueDate: '2026-05-10', status: 'Pago', paidAt: '2026-05-10T11:45:00Z' }
    ],
    createdAt: '2026-05-10T11:40:00Z'
  },
  {
    id: 'b-2',
    osId: 'os-2',
    amount: 600.00,
    paymentMethod: 'Crédito',
    status: 'Parcialmente pago',
    dueDate: '2026-05-18',
    installments: [
      { number: 1, amount: 300.00, dueDate: '2026-05-18', status: 'Pago', paidAt: '2026-05-18T16:00:00Z' },
      { number: 2, amount: 300.00, dueDate: '2026-06-18', status: 'Pendente' }
    ],
    createdAt: '2026-05-18T15:40:00Z'
  },
  {
    id: 'b-3',
    osId: 'os-3',
    amount: 1480.00,
    paymentMethod: 'Crédito',
    status: 'Pendente',
    dueDate: '2026-06-28',
    installments: [
      { number: 1, amount: 493.33, dueDate: '2026-06-28', status: 'Pendente' },
      { number: 2, amount: 493.33, dueDate: '2026-07-28', status: 'Pendente' },
      { number: 3, amount: 493.34, dueDate: '2026-08-28', status: 'Pendente' }
    ],
    createdAt: '2026-05-28T10:10:00Z'
  }
];

const seedTransactions: FinancialTransaction[] = [
  {
    id: 't-1',
    type: 'Entrada',
    category: 'Pagamento OS',
    amount: 445.00,
    date: '2026-05-10',
    description: 'Recebimento integral OS-0001 via PIX (Cláudio Abreu)',
    createdAt: '2026-05-10T11:45:00Z'
  },
  {
    id: 't-2',
    type: 'Entrada',
    category: 'Pagamento OS',
    amount: 300.00,
    date: '2026-05-18',
    description: 'Recebimento Parcela 1/2 OS-0002 via Crédito (Lojas Santos)',
    createdAt: '2026-05-18T16:00:00Z'
  },
  {
    id: 't-3',
    type: 'Saída',
    category: 'Compra Peças',
    amount: 640.00,
    date: '2026-05-05',
    description: 'Compra de 20 litros de óleo sintético 5W30 e 5 filtros Corolla',
    createdAt: '2026-05-05T10:00:00Z'
  },
  {
    id: 't-4',
    type: 'Saída',
    category: 'Operacional',
    amount: 280.00,
    date: '2026-05-08',
    description: 'Pagamento de conta de energia e internet da oficina',
    createdAt: '2026-05-08T16:45:00Z'
  },
  {
    id: 't-5',
    type: 'Saída',
    category: 'Salário',
    amount: 1500.00,
    date: '2026-05-25',
    description: 'Salário mensal do Ajudante Mecânico (Lucas)',
    createdAt: '2026-05-25T18:00:00Z'
  }
];

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false); // 100% local, no server status required

  const [state, setState] = useState<DatabaseState>({
    clients: [],
    vehicles: [],
    services: [],
    parts: [],
    workOrders: [],
    billings: [],
    transactions: [],
    settings: defaultSettings
  });

  // Load cache from AsyncStorage on boot
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setState(JSON.parse(cached));
        } else {
          // If no cache, populate with seed data!
          const seedState: DatabaseState = {
            clients: seedClients,
            vehicles: seedVehicles,
            services: seedServices,
            parts: seedParts,
            workOrders: seedWorkOrders,
            billings: seedBillings,
            transactions: seedTransactions,
            settings: defaultSettings
          };
          setState(seedState);
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(seedState));
        }
      } catch (e) {
        console.error('Failed to load local cache', e);
      } finally {
        setLoading(false);
      }
    };
    loadCache();
  }, []);

  // Write changes to cache
  const updateCache = async (newState: DatabaseState) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save to local cache', e);
    }
  };

  const signOut = async () => {
    Alert.alert('Modo Offline', 'Você está usando o painel 100% local. Não há conta online para sair.');
  };

  // --- CLIENT CRUD ---
  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const newClient: Client = {
        id: 'c-' + Math.random().toString(36).substr(2, 9),
        name: clientData.name,
        cpfCnpj: clientData.cpfCnpj,
        phone: clientData.phone,
        whatsapp: clientData.whatsapp || '',
        email: clientData.email || '',
        address: clientData.address || '',
        notes: clientData.notes || '',
        createdAt: new Date().toISOString()
      };

      const newState = {
        ...state,
        clients: [newClient, ...state.clients]
      };
      setState(newState);
      await updateCache(newState);
      return newClient;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const newState = {
        ...state,
        clients: state.clients.map(c => c.id === id ? { ...c, ...clientData } : c)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const newState = {
        ...state,
        clients: state.clients.filter(c => c.id !== id),
        vehicles: state.vehicles.filter(v => v.clientId !== id) // cascade local
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- VEHICLE CRUD ---
  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    try {
      const newVehicle: Vehicle = {
        id: 'v-' + Math.random().toString(36).substr(2, 9),
        clientId: vehicleData.clientId,
        plate: vehicleData.plate.toUpperCase(),
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        chassis: vehicleData.chassis || '',
        odometer: vehicleData.odometer || '0',
        createdAt: new Date().toISOString()
      };

      const newState = {
        ...state,
        vehicles: [newVehicle, ...state.vehicles]
      };
      setState(newState);
      await updateCache(newState);
      return newVehicle;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    try {
      const newState = {
        ...state,
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...vehicleData } : v)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const newState = {
        ...state,
        vehicles: state.vehicles.filter(v => v.id !== id)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- SERVICE CRUD ---
  const addService = async (serviceData: Omit<ServiceItem, 'id'>) => {
    try {
      const newService: ServiceItem = {
        id: 's-' + Math.random().toString(36).substr(2, 9),
        name: serviceData.name,
        code: serviceData.code || '',
        description: serviceData.description || '',
        price: serviceData.price
      };

      const newState = {
        ...state,
        services: [newService, ...state.services]
      };
      setState(newState);
      await updateCache(newState);
      return newService;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const updateService = async (id: string, serviceData: Partial<ServiceItem>) => {
    try {
      const newState = {
        ...state,
        services: state.services.map(s => s.id === id ? { ...s, ...serviceData } : s)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const deleteService = async (id: string) => {
    try {
      const newState = {
        ...state,
        services: state.services.filter(s => s.id !== id)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- PART CRUD ---
  const addPart = async (partData: Omit<PartItem, 'id'>) => {
    try {
      const newPart: PartItem = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name: partData.name,
        code: partData.code || '',
        supplier: partData.supplier || '',
        purchasePrice: partData.purchasePrice,
        salePrice: partData.salePrice,
        stock: partData.stock
      };

      const newState = {
        ...state,
        parts: [newPart, ...state.parts]
      };
      setState(newState);
      await updateCache(newState);
      return newPart;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const updatePart = async (id: string, partData: Partial<PartItem>) => {
    try {
      const newState = {
        ...state,
        parts: state.parts.map(p => p.id === id ? { ...p, ...partData } : p)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const deletePart = async (id: string) => {
    try {
      const newState = {
        ...state,
        parts: state.parts.filter(p => p.id !== id)
      };
      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- WORK ORDERS CRUD ---
  const addWorkOrder = async (osData: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => {
    try {
      const servicesTotal = osData.services.reduce((acc, s) => acc + (s.price * s.quantity), 0);
      const partsTotal = osData.parts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
      const grandTotal = servicesTotal + partsTotal;

      const currentNext = state.settings.nextOSNumber;
      const osNumber = `OS-${String(currentNext).padStart(4, '0')}`;
      const newWOId = 'os-' + Math.random().toString(36).substr(2, 9);

      const newWO: WorkOrder = {
        id: newWOId,
        osNumber,
        date: osData.date,
        clientId: osData.clientId,
        vehicleId: osData.vehicleId,
        services: osData.services,
        parts: osData.parts,
        notes: osData.notes || '',
        status: osData.status,
        servicesTotal,
        partsTotal,
        grandTotal,
        signature: osData.signature || '',
        createdAt: new Date().toISOString()
      };

      const updatedParts = state.parts.map(p => {
        const consumed = osData.parts.find(pt => pt.code === p.code || pt.name === p.name);
        return consumed ? { ...p, stock: Math.max(0, p.stock - consumed.quantity) } : p;
      });

      const newState = {
        ...state,
        workOrders: [newWO, ...state.workOrders],
        parts: updatedParts,
        settings: {
          ...state.settings,
          nextOSNumber: currentNext + 1
        }
      };

      setState(newState);
      await updateCache(newState);

      if (osData.status === 'Concluída' || osData.status === 'Entregue') {
        await addBilling({
          osId: newWO.id,
          amount: grandTotal,
          paymentMethod: 'PIX',
          status: 'Pendente',
          dueDate: new Date().toISOString().split('T')[0],
          installments: [{ number: 1, amount: grandTotal, dueDate: new Date().toISOString().split('T')[0], status: 'Pendente' }]
        });
      }

      return newWO;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const updateWorkOrder = async (id: string, osData: Partial<WorkOrder>) => {
    try {
      const original = state.workOrders.find(o => o.id === id);
      if (!original) return false;

      const services = osData.services ?? original.services;
      const parts = osData.parts ?? original.parts;
      const servicesTotal = services.reduce((acc, s) => acc + (s.price * s.quantity), 0);
      const partsTotal = parts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
      const grandTotal = servicesTotal + partsTotal;

      const updatedOS: WorkOrder = {
        ...original,
        ...osData,
        services,
        parts,
        servicesTotal,
        partsTotal,
        grandTotal
      };

      const newState = {
        ...state,
        workOrders: state.workOrders.map(o => o.id === id ? updatedOS : o)
      };

      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const updateWorkOrderStatus = async (id: string, status: OSStatus) => {
    return updateWorkOrder(id, { status });
  };

  const saveWorkOrderSignature = async (id: string, signatureBase64: string) => {
    return updateWorkOrder(id, { signature: signatureBase64 });
  };

  const deleteWorkOrder = async (id: string) => {
    try {
      const newState = {
        ...state,
        workOrders: state.workOrders.filter(o => o.id !== id),
        billings: state.billings.filter(b => b.osId !== id)
      };

      setState(newState);
      await updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- BILLINGS CRUD ---
  const addBilling = async (billingData: Omit<Billing, 'id' | 'createdAt'>) => {
    try {
      const newBillingId = 'b-' + Math.random().toString(36).substr(2, 9);
      const newBilling: Billing = {
        ...billingData,
        id: newBillingId,
        createdAt: new Date().toISOString()
      };

      let newTransactions: FinancialTransaction[] = [];
      const os = state.workOrders.find(o => o.id === billingData.osId);
      const osNum = os ? os.osNumber : 'S/N';

      billingData.installments.forEach((inst, index) => {
        if (inst.status === 'Pago') {
          newTransactions.push({
            id: 't-' + Math.random().toString(36).substr(2, 9) + '-' + index,
            type: 'Entrada',
            category: 'Pagamento OS',
            amount: inst.amount,
            date: inst.dueDate,
            description: `Parcela ${inst.number}/${billingData.installments.length} da ${osNum}`,
            createdAt: new Date().toISOString()
          });
        }
      });

      setState(prev => {
        const filteredBillings = prev.billings.filter(b => b.osId !== billingData.osId);
        const newState = {
          ...prev,
          billings: [newBilling, ...filteredBillings],
          transactions: [...newTransactions, ...prev.transactions]
        };
        updateCache(newState);
        return newState;
      });

      return newBilling;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const payInstallment = async (billingId: string, installmentNumber: number) => {
    try {
      const paidAtStr = new Date().toISOString();
      const billing = state.billings.find(b => b.id === billingId);
      if (!billing) return false;
      
      const os = state.workOrders.find(o => o.id === billing.osId);
      const totalInsts = billing.installments.length;
      const transactionDescription = `Parcela ${installmentNumber}/${totalInsts} da ${os?.osNumber || 'OS'}`;

      let paidAmount = 0;
      const updatedInstallments = billing.installments.map(i => {
        if (i.number === installmentNumber) {
          paidAmount = i.amount;
          return { ...i, status: 'Pago' as const, paidAt: paidAtStr };
        }
        return i;
      });

      const totalPaidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
      let newStatus: BillingStatus = 'Pendente';
      if (totalPaidCount === totalInsts) {
        newStatus = 'Pago';
      } else if (totalPaidCount > 0) {
        newStatus = 'Parcialmente pago';
      }

      const newTransId = 't-' + Math.random().toString(36).substr(2, 9);
      const newTrans: FinancialTransaction = {
        id: newTransId,
        type: 'Entrada',
        category: 'Pagamento OS',
        amount: paidAmount,
        date: paidAtStr.split('T')[0],
        description: transactionDescription,
        createdAt: paidAtStr
      };

      const updatedBillings = state.billings.map(b => {
        if (b.id === billingId) {
          return { ...b, status: newStatus, installments: updatedInstallments };
        }
        return b;
      });

      setState(prev => {
        const newState = {
          ...prev,
          billings: updatedBillings,
          transactions: [newTrans, ...prev.transactions]
        };
        updateCache(newState);
        return newState;
      });

      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- FINANCIAL CRUD ---
  const addTransaction = async (transData: Omit<FinancialTransaction, 'id' | 'createdAt'>) => {
    try {
      const newTrans: FinancialTransaction = {
        id: 't-' + Math.random().toString(36).substr(2, 9),
        type: transData.type,
        category: transData.category,
        amount: transData.amount,
        date: transData.date,
        description: transData.description || '',
        createdAt: new Date().toISOString()
      };

      setState(prev => {
        const newState = {
          ...prev,
          transactions: [newTrans, ...prev.transactions]
        };
        updateCache(newState);
        return newState;
      });
      return newTrans;
    } catch (e) {
      console.log('Database operation failed:', e);
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      setState(prev => {
        const newState = {
          ...prev,
          transactions: prev.transactions.filter(t => t.id !== id)
        };
        updateCache(newState);
        return newState;
      });
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  // --- SETTINGS CRUD ---
  const updateSettings = async (settingsData: Partial<CompanySettings>) => {
    try {
      const newSettings = {
        ...state.settings,
        ...settingsData
      };

      const newState = {
        ...state,
        settings: newSettings
      };
      setState(newState);
      await updateCache(newState);
      Alert.alert('Sucesso', 'Configurações atualizadas com sucesso!');
      return true;
    } catch (e) {
      console.log('Database operation failed:', e);
      return false;
    }
  };

  const exportDatabaseJson = () => {
    return JSON.stringify(state, null, 2);
  };

  const resetDatabase = async () => {
    try {
      const cleanState: DatabaseState = {
        clients: seedClients,
        vehicles: seedVehicles,
        services: seedServices,
        parts: seedParts,
        workOrders: seedWorkOrders,
        billings: seedBillings,
        transactions: seedTransactions,
        settings: defaultSettings
      };
      setState(cleanState);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cleanState));
      Alert.alert('Sucesso', 'Base de dados resetada com sucesso para os dados de demonstração!');
    } catch (e) {
      console.error('Failed to reset database', e);
      Alert.alert('Erro', 'Não foi possível resetar a base de dados.');
    }
  };

  const restoreBackup = async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (
        parsed &&
        Array.isArray(parsed.clients) &&
        Array.isArray(parsed.vehicles) &&
        Array.isArray(parsed.services) &&
        Array.isArray(parsed.parts) &&
        Array.isArray(parsed.workOrders) &&
        Array.isArray(parsed.billings) &&
        Array.isArray(parsed.transactions) &&
        parsed.settings
      ) {
        setState(parsed);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
        Alert.alert('Sucesso', 'Backup restaurado com sucesso!');
        return true;
      }
      throw new Error('Formato de backup inválido.');
    } catch (e: any) {
      console.error('Failed to restore backup', e);
      Alert.alert('Erro ao Restaurar', e.message || 'Verifique se o arquivo JSON é válido.');
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      ...state,
      loading,
      online,
      signOut,
      addClient,
      updateClient,
      deleteClient,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      addService,
      updateService,
      deleteService,
      addPart,
      updatePart,
      deletePart,
      addWorkOrder,
      updateWorkOrder,
      updateWorkOrderStatus,
      saveWorkOrderSignature,
      deleteWorkOrder,
      addBilling,
      payInstallment,
      addTransaction,
      deleteTransaction,
      updateSettings,
      exportDatabaseJson,
      resetDatabase,
      restoreBackup
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
