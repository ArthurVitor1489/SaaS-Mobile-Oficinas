import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

// --- TYPES & INTERFACES ---

export interface Client {
  id: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  model: string;
  brand: string;
  year: string;
  chassis: string;
  odometer: string;
  createdAt: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  code?: string;
}

export interface PartItem {
  id: string;
  name: string;
  code: string;
  supplier: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
}

export interface OSItemService {
  id: string;
  name: string;
  price: number;
  quantity: number;
  code?: string;
}

export interface OSItemPart {
  id: string;
  name: string;
  code: string;
  salePrice: number;
  quantity: number;
}

export type OSStatus = 'Aberta' | 'Em andamento' | 'Concluída' | 'Entregue';

export interface WorkOrder {
  id: string;
  osNumber: string;
  date: string;
  clientId: string;
  vehicleId: string;
  services: OSItemService[];
  parts: OSItemPart[];
  notes: string;
  status: OSStatus;
  servicesTotal: number;
  partsTotal: number;
  grandTotal: number;
  signature?: string; // Base64 signature SVG/Drawing
  createdAt: string;
}

export type PaymentMethod = 'PIX' | 'Dinheiro' | 'Débito' | 'Crédito' | 'Boleto';
export type BillingStatus = 'Pendente' | 'Parcialmente pago' | 'Pago' | 'Cancelado';

export interface Installment {
  number: number;
  amount: number;
  dueDate: string;
  status: 'Pendente' | 'Pago';
  paidAt?: string;
}

export interface Billing {
  id: string;
  osId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: BillingStatus;
  installments: Installment[];
  dueDate: string;
  createdAt: string;
}

export type TransactionType = 'Entrada' | 'Saída';
export type TransactionCategory = 'Pagamento OS' | 'Compra Peças' | 'Salário' | 'Operacional' | 'Outros';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string;
  description: string;
  createdAt: string;
}

export interface CompanySettings {
  id?: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  logoUrl: string;
  autoSequence: boolean;
  nextOSNumber: number;
  pdfNotes: string;
}

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
  user: User | null;
  session: Session | null;
  loading: boolean;
  online: boolean;
  
  // Auth Operations
  signUp: (email: string, password: string, companyName: string, cnpj: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
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
  
  // Cache sync
  syncWithSupabase: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

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
        }
      } catch (e) {
        console.error('Failed to load local cache', e);
      }
    };
    loadCache();
  }, []);

  // Listen to Supabase Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        syncData(session.user);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.warn('Supabase getSession failed, using local offline mode:', err);
      setSession(null);
      setUser(null);
      setOnline(false);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        syncData(session.user);
      } else {
        // Clear state on logout
        setState({
          clients: [],
          vehicles: [],
          services: [],
          parts: [],
          workOrders: [],
          billings: [],
          transactions: [],
          settings: defaultSettings
        });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Write changes to cache
  const updateCache = async (newState: DatabaseState) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save to local cache', e);
    }
  };

  // Helper to fetch data from Supabase
  const syncData = async (currentUser: User) => {
    setLoading(true);
    try {
      const workshopId = currentUser.user_metadata.workshop_id;
      if (!workshopId) {
        setLoading(false);
        return;
      }

      // Fetch workshop details
      const { data: workshopData, error: wsError } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', workshopId)
        .single();

      if (wsError) throw wsError;

      // Parallel fetch remaining tables
      const [
        clientsRes,
        vehiclesRes,
        servicesRes,
        partsRes,
        workOrdersRes,
        billingsRes,
        transactionsRes
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('workshop_id', workshopId).order('name'),
        supabase.from('vehicles').select('*, clients!inner(workshop_id)').eq('clients.workshop_id', workshopId),
        supabase.from('catalog_services').select('*').eq('workshop_id', workshopId).order('name'),
        supabase.from('catalog_parts').select('*').eq('workshop_id', workshopId).order('name'),
        supabase.from('work_orders').select('*').eq('workshop_id', workshopId).order('created_at', { ascending: false }),
        supabase.from('billings').select('*').eq('workshop_id', workshopId),
        supabase.from('financial_transactions').select('*').eq('workshop_id', workshopId).order('date', { ascending: false })
      ]);

      // Resolve relational joins manually for details
      const fetchedClients: Client[] = (clientsRes.data || []).map(c => ({
        id: c.id,
        name: c.name,
        cpfCnpj: c.cpf_cnpj || '',
        phone: c.phone,
        whatsapp: c.whatsapp || '',
        email: c.email || '',
        address: c.address || '',
        notes: c.notes || '',
        createdAt: c.created_at
      }));

      const fetchedVehicles: Vehicle[] = (vehiclesRes.data || []).map(v => ({
        id: v.id,
        clientId: v.client_id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        chassis: v.chassis || '',
        odometer: v.odometer || '0',
        createdAt: v.created_at
      }));

      const fetchedServices: ServiceItem[] = (servicesRes.data || []).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        price: parseFloat(s.price),
        code: s.code || ''
      }));

      const fetchedParts: PartItem[] = (partsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        supplier: p.supplier || '',
        purchasePrice: parseFloat(p.purchase_price),
        salePrice: parseFloat(p.sale_price),
        stock: p.stock
      }));

      // Workorders need sub-item services and parts
      const rawWOs = workOrdersRes.data || [];
      const fetchedWOs: WorkOrder[] = [];

      for (const wo of rawWOs) {
        const [srvsRes, prtsRes] = await Promise.all([
          supabase.from('work_order_services').select('*').eq('os_id', wo.id),
          supabase.from('work_order_parts').select('*').eq('os_id', wo.id)
        ]);

        fetchedWOs.push({
          id: wo.id,
          osNumber: wo.os_number,
          date: wo.date,
          clientId: wo.client_id,
          vehicleId: wo.vehicle_id,
          services: (srvsRes.data || []).map(s => ({
            id: s.id,
            name: s.name,
            price: parseFloat(s.price),
            quantity: s.quantity,
            code: s.code
          })),
          parts: (prtsRes.data || []).map(p => ({
            id: p.id,
            name: p.name,
            code: p.code,
            salePrice: parseFloat(p.sale_price),
            quantity: p.quantity
          })),
          notes: wo.notes || '',
          status: wo.status,
          servicesTotal: parseFloat(wo.services_total),
          partsTotal: parseFloat(wo.parts_total),
          grandTotal: parseFloat(wo.grand_total),
          signature: wo.signature || '',
          createdAt: wo.created_at
        });
      }

      // Billings need installments
      const rawBillings = billingsRes.data || [];
      const fetchedBillings: Billing[] = [];

      for (const b of rawBillings) {
        const instsRes = await supabase.from('billing_installments').select('*').eq('billing_id', b.id).order('number');
        fetchedBillings.push({
          id: b.id,
          osId: b.os_id,
          amount: parseFloat(b.amount),
          paymentMethod: b.payment_method as PaymentMethod,
          status: b.status as BillingStatus,
          dueDate: b.due_date,
          createdAt: b.created_at,
          installments: (instsRes.data || []).map(i => ({
            number: i.number,
            amount: parseFloat(i.amount),
            dueDate: i.due_date,
            status: i.status as 'Pendente' | 'Pago',
            paidAt: i.paid_at
          }))
        });
      }

      const fetchedTransactions: FinancialTransaction[] = (transactionsRes.data || []).map(t => ({
        id: t.id,
        type: t.type as TransactionType,
        category: t.category as TransactionCategory,
        amount: parseFloat(t.amount),
        date: t.date,
        description: t.description || '',
        createdAt: t.created_at
      }));

      const newSettings: CompanySettings = {
        id: workshopData.id,
        name: workshopData.name,
        cnpj: workshopData.cnpj || '',
        address: workshopData.address || '',
        phone: workshopData.phone || '',
        whatsapp: workshopData.whatsapp || '',
        email: workshopData.email || '',
        logoUrl: workshopData.logo_url || defaultSettings.logoUrl,
        autoSequence: workshopData.auto_sequence,
        nextOSNumber: workshopData.next_os_number,
        pdfNotes: workshopData.pdf_notes || ''
      };

      const newState: DatabaseState = {
        clients: fetchedClients,
        vehicles: fetchedVehicles,
        services: fetchedServices,
        parts: fetchedParts,
        workOrders: fetchedWOs,
        billings: fetchedBillings,
        transactions: fetchedTransactions,
        settings: newSettings
      };

      setState(newState);
      updateCache(newState);
      setOnline(true);
    } catch (e) {
      console.error('Failed to sync from Supabase', e);
      setOnline(false);
      Alert.alert('Modo Offline', 'Não foi possível sincronizar os dados com o servidor. Exibindo informações em cache.');
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkError = () => {
    Alert.alert('Erro de Rede', 'Você parece estar offline ou sem comunicação com o servidor. Verifique a sua internet para salvar modificações.');
  };

  // --- AUTHENTICATION FLOWS ---

  const signUp = async (email: string, password: string, companyName: string, cnpj: string) => {
    try {
      const isPlaceholder = !supabase || !supabase.auth || (supabase as any).supabaseUrl?.includes('your-project-id');
      if (isPlaceholder || !online) {
        // Local simulation of sign up
        const customUser: User = {
          id: 'mock-user-id-' + Math.random().toString(36).substr(2, 9),
          app_metadata: {},
          user_metadata: {
            workshop_id: 'mock-workshop-id',
            workshop_name: companyName
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: email,
          role: 'authenticated'
        };

        const customSession: Session = {
          access_token: 'mock-access-token-' + Math.random().toString(36).substr(2, 9),
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: customUser
        };

        const customSettings: CompanySettings = {
          ...defaultSettings,
          name: companyName,
          cnpj: cnpj || '',
          email: email
        };

        const localState: DatabaseState = {
          clients: seedClients,
          vehicles: seedVehicles,
          services: seedServices,
          parts: seedParts,
          workOrders: seedWorkOrders,
          billings: seedBillings,
          transactions: seedTransactions,
          settings: customSettings
        };

        setState(localState);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(localState));
        setSession(customSession);
        setUser(customUser);

        Alert.alert('Modo Demonstração', `Oficina "${companyName}" criada localmente com dados de teste!`);
        return true;
      }

      // 1. Create a Workshop placeholder entry (using service_role bypass or RPC, but we can do a standard insert after user registers)
      // Actually, we sign up the user, which auto-triggers the user profile. But to bypass RLS, we can do it after sign up.
      // Better: we call Supabase signUp, and in the metadata we send the workshop properties.
      // Let's do:
      // A. SignUp user.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            workshop_name: companyName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao registrar usuário.');

      // B. Create the Workshop (authenticated now)
      const { data: wsData, error: wsError } = await supabase
        .from('workshops')
        .insert({
          name: companyName,
          cnpj: cnpj,
          email: email
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // C. Update User Metadata with the workshop_id so that future RLS works!
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          workshop_id: wsData.id
        }
      });

      if (updateError) throw updateError;

      // Force refresh the session to update the JWT access token immediately with the new metadata
      await supabase.auth.refreshSession().catch(err => {
        console.log('Failed to refresh session JWT automatically:', err);
      });

      Alert.alert('Sucesso', 'Oficina cadastrada e conta criada! Faça login para começar.');
      return true;
    } catch (e: any) {
      console.log('Cadastro erro:', e.message || e);
      // Fallback in case of net/Supabase failure after standard signup try
      if (e.message === 'Network request failed' || e.message?.includes('Fetch')) {
        Alert.alert('Modo Demonstração', 'Sem conexão. Criando oficina em modo local...');
        const customUser: User = {
          id: 'mock-user-id',
          app_metadata: {},
          user_metadata: {
            workshop_id: 'mock-workshop-id',
            workshop_name: companyName
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: email,
          role: 'authenticated'
        };

        const customSession: Session = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: customUser
        };

        const customSettings: CompanySettings = {
          ...defaultSettings,
          name: companyName,
          cnpj: cnpj || '',
          email: email
        };

        const localState: DatabaseState = {
          clients: seedClients,
          vehicles: seedVehicles,
          services: seedServices,
          parts: seedParts,
          workOrders: seedWorkOrders,
          billings: seedBillings,
          transactions: seedTransactions,
          settings: customSettings
        };

        setState(localState);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(localState));
        setSession(customSession);
        setUser(customUser);
        return true;
      }
      Alert.alert('Erro ao Cadastrar', e.message || 'Erro desconhecido.');
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const isPlaceholder = !supabase || !supabase.auth || (supabase as any).supabaseUrl?.includes('your-project-id');
      if (isPlaceholder || !online) {
        // Local sign in bypass
        const customUser: User = {
          id: 'mock-user-id',
          app_metadata: {},
          user_metadata: {
            workshop_id: 'mock-workshop-id',
            workshop_name: 'Minha Oficina'
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: email,
          role: 'authenticated'
        };

        const customSession: Session = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: customUser
        };

        const cached = await AsyncStorage.getItem(CACHE_KEY);
        let localState: DatabaseState;
        if (cached) {
          localState = JSON.parse(cached);
        } else {
          localState = {
            clients: seedClients,
            vehicles: seedVehicles,
            services: seedServices,
            parts: seedParts,
            workOrders: seedWorkOrders,
            billings: seedBillings,
            transactions: seedTransactions,
            settings: {
              ...defaultSettings,
              email: email
            }
          };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(localState));
        }

        setState(localState);
        setSession(customSession);
        setUser(customUser);
        Alert.alert('Modo Demonstração', 'Acesso efetuado no painel local offline!');
        return true;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return true;
    } catch (e: any) {
      console.log('Login erro:', e.message || e);
      if (e.message === 'Network request failed' || e.message?.includes('Fetch')) {
        Alert.alert('Modo Demonstração', 'Sem conexão. Entrando no modo local...');
        const customUser: User = {
          id: 'mock-user-id',
          app_metadata: {},
          user_metadata: {
            workshop_id: 'mock-workshop-id',
            workshop_name: 'Minha Oficina'
          },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: email,
          role: 'authenticated'
        };

        const customSession: Session = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: customUser
        };

        const cached = await AsyncStorage.getItem(CACHE_KEY);
        let localState: DatabaseState;
        if (cached) {
          localState = JSON.parse(cached);
        } else {
          localState = {
            clients: seedClients,
            vehicles: seedVehicles,
            services: seedServices,
            parts: seedParts,
            workOrders: seedWorkOrders,
            billings: seedBillings,
            transactions: seedTransactions,
            settings: {
              ...defaultSettings,
              email: email
            }
          };
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(localState));
        }

        setState(localState);
        setSession(customSession);
        setUser(customUser);
        return true;
      }

      let userMsg = 'E-mail ou senha incorretos.';
      if (e.message === 'Email not confirmed') {
        userMsg = 'E-mail não verificado. Por favor, confirme o e-mail na sua caixa de entrada ou desative a confirmação de e-mail no painel do Supabase.';
      } else if (e.message?.includes('security purposes')) {
        userMsg = 'Por motivos de segurança, aguarde alguns segundos antes de tentar novamente.';
      } else if (e.message && e.message !== 'Invalid login credentials') {
        userMsg = e.message;
      }
      Alert.alert('Erro de Acesso', userMsg);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Failed to sign out from Supabase server, clearing session locally:', e);
      setSession(null);
      setUser(null);
    }
  };

  // --- CRUD OPERATIONS WITH SUPABASE ---

  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { data, error } = await supabase
        .from('clients')
        .insert({
          workshop_id: workshopId,
          name: clientData.name,
          cpf_cnpj: clientData.cpfCnpj,
          phone: clientData.phone,
          whatsapp: clientData.whatsapp,
          email: clientData.email,
          address: clientData.address,
          notes: clientData.notes
        })
        .select()
        .single();

      if (error) throw error;

      const newClient: Client = {
        id: data.id,
        name: data.name,
        cpfCnpj: data.cpf_cnpj || '',
        phone: data.phone,
        whatsapp: data.whatsapp || '',
        email: data.email || '',
        address: data.address || '',
        notes: data.notes || '',
        createdAt: data.created_at
      };

      const newState = {
        ...state,
        clients: [newClient, ...state.clients]
      };
      setState(newState);
      updateCache(newState);
      return newClient;
    } catch (e) {
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: clientData.name,
          cpf_cnpj: clientData.cpfCnpj,
          phone: clientData.phone,
          whatsapp: clientData.whatsapp,
          email: clientData.email,
          address: clientData.address,
          notes: clientData.notes
        })
        .eq('id', id);

      if (error) throw error;

      const newState = {
        ...state,
        clients: state.clients.map(c => c.id === id ? { ...c, ...clientData } : c)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;

      const newState = {
        ...state,
        clients: state.clients.filter(c => c.id !== id),
        vehicles: state.vehicles.filter(v => v.clientId !== id) // cascade local
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          client_id: vehicleData.clientId,
          plate: vehicleData.plate.toUpperCase(),
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          chassis: vehicleData.chassis,
          odometer: vehicleData.odometer
        })
        .select()
        .single();

      if (error) throw error;

      const newVehicle: Vehicle = {
        id: data.id,
        clientId: data.client_id,
        plate: data.plate,
        brand: data.brand,
        model: data.model,
        year: data.year,
        chassis: data.chassis || '',
        odometer: data.odometer || '0',
        createdAt: data.created_at
      };

      const newState = {
        ...state,
        vehicles: [newVehicle, ...state.vehicles]
      };
      setState(newState);
      updateCache(newState);
      return newVehicle;
    } catch (e) {
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          plate: vehicleData.plate?.toUpperCase(),
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          chassis: vehicleData.chassis,
          odometer: vehicleData.odometer
        })
        .eq('id', id);

      if (error) throw error;

      const newState = {
        ...state,
        vehicles: state.vehicles.map(v => v.id === id ? { ...v, ...vehicleData } : v)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;

      const newState = {
        ...state,
        vehicles: state.vehicles.filter(v => v.id !== id)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const addService = async (serviceData: Omit<ServiceItem, 'id'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { data, error } = await supabase
        .from('catalog_services')
        .insert({
          workshop_id: workshopId,
          name: serviceData.name,
          code: serviceData.code,
          description: serviceData.description,
          price: serviceData.price
        })
        .select()
        .single();

      if (error) throw error;

      const newService: ServiceItem = {
        id: data.id,
        name: data.name,
        code: data.code || '',
        description: data.description || '',
        price: parseFloat(data.price)
      };

      const newState = {
        ...state,
        services: [...state.services, newService]
      };
      setState(newState);
      updateCache(newState);
      return newService;
    } catch (e) {
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const updateService = async (id: string, serviceData: Partial<ServiceItem>) => {
    try {
      const { error } = await supabase
        .from('catalog_services')
        .update({
          name: serviceData.name,
          code: serviceData.code,
          description: serviceData.description,
          price: serviceData.price
        })
        .eq('id', id);

      if (error) throw error;

      const newState = {
        ...state,
        services: state.services.map(s => s.id === id ? { ...s, ...serviceData } : s)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase.from('catalog_services').delete().eq('id', id);
      if (error) throw error;

      const newState = {
        ...state,
        services: state.services.filter(s => s.id !== id)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const addPart = async (partData: Omit<PartItem, 'id'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { data, error } = await supabase
        .from('catalog_parts')
        .insert({
          workshop_id: workshopId,
          name: partData.name,
          code: partData.code,
          supplier: partData.supplier,
          purchase_price: partData.purchasePrice,
          sale_price: partData.salePrice,
          stock: partData.stock
        })
        .select()
        .single();

      if (error) throw error;

      const newPart: PartItem = {
        id: data.id,
        name: data.name,
        code: data.code,
        supplier: data.supplier || '',
        purchasePrice: parseFloat(data.purchase_price),
        salePrice: parseFloat(data.sale_price),
        stock: data.stock
      };

      const newState = {
        ...state,
        parts: [...state.parts, newPart]
      };
      setState(newState);
      updateCache(newState);
      return newPart;
    } catch (e) {
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const updatePart = async (id: string, partData: Partial<PartItem>) => {
    try {
      const { error } = await supabase
        .from('catalog_parts')
        .update({
          name: partData.name,
          code: partData.code,
          supplier: partData.supplier,
          purchase_price: partData.purchasePrice,
          sale_price: partData.salePrice,
          stock: partData.stock
        })
        .eq('id', id);

      if (error) throw error;

      const newState = {
        ...state,
        parts: state.parts.map(p => p.id === id ? { ...p, ...partData } : p)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  const deletePart = async (id: string) => {
    try {
      const { error } = await supabase.from('catalog_parts').delete().eq('id', id);
      if (error) throw error;

      const newState = {
        ...state,
        parts: state.parts.filter(p => p.id !== id)
      };
      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  // --- WORK ORDERS CRUD ---

  const addWorkOrder = async (osData: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;

      // 1. Calculate totals
      const servicesTotal = osData.services.reduce((acc, s) => acc + (s.price * s.quantity), 0);
      const partsTotal = osData.parts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
      const grandTotal = servicesTotal + partsTotal;

      // 2. Increment auto sequence on settings
      const currentNext = state.settings.nextOSNumber;
      const osNumber = `OS-${String(currentNext).padStart(4, '0')}`;

      // 3. Save OS to Supabase
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .insert({
          workshop_id: workshopId,
          client_id: osData.clientId,
          vehicle_id: osData.vehicleId,
          os_number: osNumber,
          date: osData.date,
          status: osData.status,
          services_total: servicesTotal,
          parts_total: partsTotal,
          grand_total: grandTotal,
          notes: osData.notes,
          signature: osData.signature || ''
        })
        .select()
        .single();

      if (woError) throw woError;

      // 4. Save items (services & parts) in batch
      if (osData.services.length > 0) {
        const srvsInsert = osData.services.map(s => ({
          os_id: woData.id,
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          code: s.code || null
        }));
        const { error: srvError } = await supabase.from('work_order_services').insert(srvsInsert);
        if (srvError) throw srvError;
      }

      if (osData.parts.length > 0) {
        const prtsInsert = osData.parts.map(p => ({
          os_id: woData.id,
          name: p.name,
          code: p.code || null,
          sale_price: p.salePrice,
          quantity: p.quantity
        }));
        const { error: prtError } = await supabase.from('work_order_parts').insert(prtsInsert);
        if (prtError) throw prtError;

        // Update local and remote inventory levels
        for (const pt of osData.parts) {
          const original = state.parts.find(p => p.code === pt.code || p.name === pt.name);
          if (original) {
            const newStock = Math.max(0, original.stock - pt.quantity);
            await supabase.from('catalog_parts').update({ stock: newStock }).eq('id', original.id);
          }
        }
      }

      // 5. Update workshop next_os_number
      await supabase.from('workshops').update({ next_os_number: currentNext + 1 }).eq('id', workshopId);

      const newWO: WorkOrder = {
        id: woData.id,
        osNumber,
        date: woData.date,
        clientId: woData.client_id,
        vehicleId: woData.vehicle_id,
        services: osData.services,
        parts: osData.parts,
        notes: woData.notes,
        status: woData.status,
        servicesTotal,
        partsTotal,
        grandTotal,
        signature: woData.signature || '',
        createdAt: woData.created_at
      };

      // Refresh catalog parts locally with updated stock
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
      updateCache(newState);

      // Trigger automatic billing if OS is completed/delivered
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
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
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

      const { error: woError } = await supabase
        .from('work_orders')
        .update({
          status: osData.status,
          notes: osData.notes,
          services_total: servicesTotal,
          parts_total: partsTotal,
          grand_total: grandTotal,
          signature: osData.signature
        })
        .eq('id', id);

      if (woError) throw woError;

      // Re-write services/parts if changed
      if (osData.services) {
        await supabase.from('work_order_services').delete().eq('os_id', id);
        const srvsInsert = osData.services.map(s => ({
          os_id: id,
          name: s.name,
          price: s.price,
          quantity: s.quantity,
          code: s.code || null
        }));
        await supabase.from('work_order_services').insert(srvsInsert);
      }

      if (osData.parts) {
        await supabase.from('work_order_parts').delete().eq('os_id', id);
        const prtsInsert = osData.parts.map(p => ({
          os_id: id,
          name: p.name,
          code: p.code || null,
          sale_price: p.salePrice,
          quantity: p.quantity
        }));
        await supabase.from('work_order_parts').insert(prtsInsert);
      }

      const updatedOS: WorkOrder = {
        ...original,
        ...osData,
        servicesTotal,
        partsTotal,
        grandTotal
      };

      const newState = {
        ...state,
        workOrders: state.workOrders.map(o => o.id === id ? updatedOS : o)
      };

      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
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
      const { error } = await supabase.from('work_orders').delete().eq('id', id);
      if (error) throw error;

      const newState = {
        ...state,
        workOrders: state.workOrders.filter(o => o.id !== id),
        billings: state.billings.filter(b => b.osId !== id)
      };

      setState(newState);
      updateCache(newState);
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  // --- BILLING AND INSTALLMENTS ---

  const addBilling = async (billingData: Omit<Billing, 'id' | 'createdAt'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { data: bData, error: bError } = await supabase
        .from('billings')
        .insert({
          workshop_id: workshopId,
          os_id: billingData.osId,
          amount: billingData.amount,
          payment_method: billingData.paymentMethod,
          status: billingData.status,
          due_date: billingData.dueDate,
          installments: billingData.installments
        })
        .select()
        .single();

      if (bError) throw bError;

      // Installments saving
      const instsInsert = billingData.installments.map(i => ({
        billing_id: bData.id,
        number: i.number,
        amount: i.amount,
        due_date: i.dueDate,
        status: i.status,
        paid_at: i.paidAt || null
      }));

      const { error: instError } = await supabase.from('billing_installments').insert(instsInsert);
      if (instError) throw instError;

      const newBilling: Billing = {
        id: bData.id,
        osId: billingData.osId,
        amount: billingData.amount,
        paymentMethod: billingData.paymentMethod,
        status: billingData.status as BillingStatus,
        dueDate: billingData.dueDate,
        createdAt: bData.created_at,
        installments: billingData.installments
      };

      // Trigger automatic finance entries for installments marked as paid
      for (const inst of billingData.installments) {
        if (inst.status === 'Pago') {
          const os = state.workOrders.find(o => o.id === billingData.osId);
          const client = state.clients.find(c => c.id === os?.clientId);
          await addTransaction({
            type: 'Entrada',
            category: 'Pagamento OS',
            amount: inst.amount,
            date: inst.paidAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
            description: `Parcela ${inst.number}/${billingData.installments.length} da ${os?.osNumber || 'OS'}`
          });
        }
      }

      setState(prev => {
        const newState = {
          ...prev,
          billings: [newBilling, ...prev.billings]
        };
        updateCache(newState);
        return newState;
      });
      return newBilling;
    } catch (e) {
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const payInstallment = async (billingId: string, installmentNumber: number) => {
    try {
      // Fetch installment reference
      const { data: insts, error: fError } = await supabase
        .from('billing_installments')
        .select('*')
        .eq('billing_id', billingId)
        .eq('number', installmentNumber);

      if (fError || insts.length === 0) throw fError || new Error('Parcela não encontrada.');
      const instRow = insts[0];

      const paidAtStr = new Date().toISOString();
      const { error: uError } = await supabase
        .from('billing_installments')
        .update({
          status: 'Pago',
          paid_at: paidAtStr
        })
        .eq('id', instRow.id);

      if (uError) throw uError;

      // Check billing overall status
      const { data: allInsts } = await supabase
        .from('billing_installments')
        .select('*')
        .eq('billing_id', billingId);

      const paidCount = (allInsts || []).filter(i => i.status === 'Pago').length;
      let newStatus: BillingStatus = 'Pendente';
      if (paidCount === allInsts?.length) {
        newStatus = 'Pago';
      } else if (paidCount > 0) {
        newStatus = 'Parcialmente pago';
      }

      await supabase.from('billings').update({ status: newStatus }).eq('id', billingId);

      // Create local and remote transactions
      const billing = state.billings.find(b => b.id === billingId);
      const os = state.workOrders.find(o => o.id === billing?.osId);
      const client = state.clients.find(c => c.id === os?.clientId);

      const transactionDescription = `Parcela ${installmentNumber}/${allInsts?.length} da ${os?.osNumber || 'OS'}`;
      
      const newTrans = await addTransaction({
        type: 'Entrada',
        category: 'Pagamento OS',
        amount: parseFloat(instRow.amount),
        date: paidAtStr.split('T')[0],
        description: transactionDescription
      });

      const updatedBillings = state.billings.map(b => {
        if (b.id === billingId) {
          const updatedInstallments = b.installments.map(i => {
            if (i.number === installmentNumber) {
              return { ...i, status: 'Pago' as const, paidAt: paidAtStr };
            }
            return i;
          });
          return { ...b, status: newStatus, installments: updatedInstallments };
        }
        return b;
      });

      setState(prev => {
        const newState = {
          ...prev,
          billings: updatedBillings
        };
        updateCache(newState);
        return newState;
      });
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  // --- FINANCIAL OPERATIONS ---

  const addTransaction = async (transData: Omit<FinancialTransaction, 'id' | 'createdAt'>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          workshop_id: workshopId,
          type: transData.type,
          category: transData.category,
          amount: transData.amount,
          date: transData.date,
          description: transData.description
        })
        .select()
        .single();

      if (error) throw error;

      const newTrans: FinancialTransaction = {
        id: data.id,
        type: data.type as TransactionType,
        category: data.category as TransactionCategory,
        amount: parseFloat(data.amount),
        date: data.date,
        description: data.description || '',
        createdAt: data.created_at
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
      console.log('Database operation failed (returned null):', e);
      handleNetworkError();
      return null;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
      if (error) throw error;

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
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  // --- SETTINGS OPERATIONS ---

  const updateSettings = async (settingsData: Partial<CompanySettings>) => {
    try {
      const workshopId = user?.user_metadata.workshop_id;
      const { error } = await supabase
        .from('workshops')
        .update({
          name: settingsData.name,
          cnpj: settingsData.cnpj,
          address: settingsData.address,
          phone: settingsData.phone,
          whatsapp: settingsData.whatsapp,
          email: settingsData.email,
          logo_url: settingsData.logoUrl,
          auto_sequence: settingsData.autoSequence,
          next_os_number: settingsData.nextOSNumber,
          pdf_notes: settingsData.pdfNotes
        })
        .eq('id', workshopId);

      if (error) throw error;

      const newSettings = {
        ...state.settings,
        ...settingsData
      };

      const newState = {
        ...state,
        settings: newSettings
      };
      setState(newState);
      updateCache(newState);
      Alert.alert('Sucesso', 'Configurações atualizadas com sucesso!');
      return true;
    } catch (e) {
      console.log('Database operation failed (returned false):', e);
      handleNetworkError();
      return false;
    }
  };

  // Cache Sync Trigger manually
  const syncWithSupabase = async () => {
    if (user) {
      await syncData(user);
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
      user,
      session,
      loading,
      online,
      signUp,
      signIn,
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
      syncWithSupabase,
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
