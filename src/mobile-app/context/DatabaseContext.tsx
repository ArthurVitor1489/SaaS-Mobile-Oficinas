import React, { createContext, useContext, useState, useEffect } from 'react';

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
  signature?: string; // Base64 dataURL drawing
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
  // Client CRUD
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  
  // Vehicle CRUD
  addVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  
  // Service CRUD
  addService: (service: Omit<ServiceItem, 'id'>) => ServiceItem;
  updateService: (id: string, service: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;
  
  // Part CRUD
  addPart: (part: Omit<PartItem, 'id'>) => PartItem;
  updatePart: (id: string, part: Partial<PartItem>) => void;
  deletePart: (id: string) => void;
  
  // OS operations
  addWorkOrder: (os: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => WorkOrder;
  updateWorkOrder: (id: string, os: Partial<WorkOrder>) => void;
  updateWorkOrderStatus: (id: string, status: OSStatus) => void;
  saveWorkOrderSignature: (id: string, signatureBase64: string) => void;
  deleteWorkOrder: (id: string) => void;
  
  // Billing Operations
  addBilling: (billing: Omit<Billing, 'id' | 'createdAt'>) => Billing;
  payInstallment: (billingId: string, installmentNumber: number) => void;
  refundBilling: (billingId: string) => void;
  
  // Financial Operations
  addTransaction: (transaction: Omit<FinancialTransaction, 'id' | 'createdAt'>) => FinancialTransaction;
  deleteTransaction: (id: string) => void;
  
  // Settings operations
  updateSettings: (settings: Partial<CompanySettings>) => void;
  
  // System Tools
  resetDatabase: () => void;
  restoreBackup: (jsonData: string) => boolean;
  exportDatabaseJson: () => string;
}

const DatabaseContext = createContext<DatabaseContextProps | undefined>(undefined);

// --- MOCK SEED DATA ---

const defaultSettings: CompanySettings = {
  name: 'Minha Oficina Mecânica',
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

// --- PROVIDER COMPONENT ---

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DatabaseState>(() => {
    const saved = localStorage.getItem('oficina_saas_database');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
          if (parsed.settings.name === 'AutoTech Mecânica Premium') {
            console.log('Transitioning old demo database to clean blank state');
            localStorage.removeItem('oficina_saas_database');
          } else {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse saved database state, initializing seeds');
      }
    }
    return {
      clients: [],
      vehicles: [],
      services: [],
      parts: [],
      workOrders: [],
      billings: [],
      transactions: [],
      settings: defaultSettings
    };
  });

  useEffect(() => {
    localStorage.setItem('oficina_saas_database', JSON.stringify(state));
  }, [state]);

  // --- CLIENT CRUD ---
  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: `c-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      clients: [newClient, ...prev.clients]
    }));
    return newClient;
  };

  const updateClient = (id: string, clientData: Partial<Client>) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.map(c => c.id === id ? { ...c, ...clientData } : c)
    }));
  };

  const deleteClient = (id: string) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
      // Cascades deleting their vehicles too
      vehicles: prev.vehicles.filter(v => v.clientId !== id)
    }));
  };

  // --- VEHICLE CRUD ---
  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `v-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      vehicles: [newVehicle, ...prev.vehicles]
    }));
    return newVehicle;
  };

  const updateVehicle = (id: string, vehicleData: Partial<Vehicle>) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.map(v => v.id === id ? { ...v, ...vehicleData } : v)
    }));
  };

  const deleteVehicle = (id: string) => {
    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(v => v.id !== id)
    }));
  };

  // --- SERVICE CRUD ---
  const addService = (serviceData: Omit<ServiceItem, 'id'>) => {
    const newService: ServiceItem = {
      ...serviceData,
      id: `s-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
    return newService;
  };

  const updateService = (id: string, serviceData: Partial<ServiceItem>) => {
    setState(prev => ({
      ...prev,
      services: prev.services.map(s => s.id === id ? { ...s, ...serviceData } : s)
    }));
  };

  const deleteService = (id: string) => {
    setState(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id)
    }));
  };

  // --- PART CRUD ---
  const addPart = (partData: Omit<PartItem, 'id'>) => {
    const newPart: PartItem = {
      ...partData,
      id: `p-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      parts: [...prev.parts, newPart]
    }));
    return newPart;
  };

  const updatePart = (id: string, partData: Partial<PartItem>) => {
    setState(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === id ? { ...p, ...partData } : p)
    }));
  };

  const deletePart = (id: string) => {
    setState(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.id !== id)
    }));
  };

  // --- WORK ORDERS & DYNAMIC INVENTORY / BILLING TRIGGERS ---
  const addWorkOrder = (osData: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => {
    const id = `os-${Date.now()}`;
    const servicesTotal = osData.services.reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
    const partsTotal = osData.parts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
    const grandTotal = servicesTotal + partsTotal;
    
    // Generate OS Number
    let osNumber = `OS-${String(state.settings.nextOSNumber).padStart(4, '0')}`;
    
    const newOS: WorkOrder = {
      ...osData,
      id,
      osNumber,
      servicesTotal,
      partsTotal,
      grandTotal,
      createdAt: new Date().toISOString()
    };

    setState(prev => {
      // 1. Decrement Stock Levels for each part added to the OS
      const updatedParts = prev.parts.map(originalPart => {
        const usedPart = osData.parts.find(p => p.id === originalPart.id);
        if (usedPart) {
          return {
            ...originalPart,
            stock: Math.max(0, originalPart.stock - usedPart.quantity)
          };
        }
        return originalPart;
      });

      // 2. Increment Auto OS Number sequence
      const updatedSettings = {
        ...prev.settings,
        nextOSNumber: prev.settings.nextOSNumber + 1
      };

      return {
        ...prev,
        workOrders: [newOS, ...prev.workOrders],
        parts: updatedParts,
        settings: updatedSettings
      };
    });

    return newOS;
  };

  const updateWorkOrder = (id: string, osData: Partial<WorkOrder>) => {
    setState(prev => {
      const originalOS = prev.workOrders.find(o => o.id === id);
      if (!originalOS) return prev;

      const services = osData.services ?? originalOS.services;
      const parts = osData.parts ?? originalOS.parts;
      
      const servicesTotal = services.reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
      const partsTotal = parts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
      const grandTotal = servicesTotal + partsTotal;

      return {
        ...prev,
        workOrders: prev.workOrders.map(o => o.id === id ? {
          ...o,
          ...osData,
          servicesTotal,
          partsTotal,
          grandTotal
        } : o)
      };
    });
  };

  const updateWorkOrderStatus = (id: string, status: OSStatus) => {
    setState(prev => ({
      ...prev,
      workOrders: prev.workOrders.map(o => o.id === id ? { ...o, status } : o)
    }));
  };

  const saveWorkOrderSignature = (id: string, signatureBase64: string) => {
    setState(prev => ({
      ...prev,
      workOrders: prev.workOrders.map(o => o.id === id ? { ...o, signature: signatureBase64 } : o)
    }));
  };

  const deleteWorkOrder = (id: string) => {
    setState(prev => ({
      ...prev,
      workOrders: prev.workOrders.filter(o => o.id !== id),
      // Cascades deleting linked billing
      billings: prev.billings.filter(b => b.osId !== id)
    }));
  };

  // --- BILLING & INSTALLMENTS TRIGGERS ---
  const addBilling = (billingData: Omit<Billing, 'id' | 'createdAt'>) => {
    const newBilling: Billing = {
      ...billingData,
      id: `b-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      billings: [newBilling, ...prev.billings]
    }));

    // Trigger: if there is an installment paid on creation, register transaction
    billingData.installments.forEach(inst => {
      if (inst.status === 'Pago') {
        const os = state.workOrders.find(o => o.id === billingData.osId);
        const osNum = os ? os.osNumber : 'S/N';
        const client = state.clients.find(c => c.id === os?.clientId);
        const clientName = client ? client.name : 'Cliente';
        
        const newTrans: FinancialTransaction = {
          id: `t-${Date.now()}-${inst.number}`,
          type: 'Entrada',
          category: 'Pagamento OS',
          amount: inst.amount,
          date: inst.paidAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
          description: `Parcela ${inst.number}/${billingData.installments.length} da ${osNum}`,
          createdAt: new Date().toISOString()
        };

        setState(p => ({
          ...p,
          transactions: [newTrans, ...p.transactions]
        }));
      }
    });

    return newBilling;
  };

  const payInstallment = (billingId: string, installmentNumber: number) => {
    const nowStr = new Date().toISOString();
    const todayDate = nowStr.split('T')[0];
    
    setState(prev => {
      const billing = prev.billings.find(b => b.id === billingId);
      if (!billing) return prev;

      const os = prev.workOrders.find(o => o.id === billing.osId);
      const osNum = os ? os.osNumber : 'S/N';
      const client = prev.clients.find(c => c.id === os?.clientId);
      const clientName = client ? client.name : 'Cliente';

      // Update installments list
      let amountPaid = 0;
      const updatedInstallments = billing.installments.map(inst => {
        if (inst.number === installmentNumber && inst.status === 'Pendente') {
          amountPaid = inst.amount;
          return {
            ...inst,
            status: 'Pago' as const,
            paidAt: nowStr
          };
        }
        return inst;
      });

      // Recalculate Billing Status
      const paidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
      let newStatus: BillingStatus = 'Pendente';
      if (paidCount === updatedInstallments.length) {
        newStatus = 'Pago';
      } else if (paidCount > 0) {
        newStatus = 'Parcialmente pago';
      }

      const updatedBillings = prev.billings.map(b => b.id === billingId ? {
        ...b,
        status: newStatus,
        installments: updatedInstallments
      } : b);

      // Trigger: If paid, generate Entrada in Finance
      if (amountPaid > 0) {
        const newTrans: FinancialTransaction = {
          id: `t-${Date.now()}`,
          type: 'Entrada',
          category: 'Pagamento OS',
          amount: amountPaid,
          date: todayDate,
          description: `Parcela ${installmentNumber}/${billing.installments.length} da ${osNum}`,
          createdAt: nowStr
        };

        return {
          ...prev,
          billings: updatedBillings,
          transactions: [newTrans, ...prev.transactions]
        };
      }

      return {
        ...prev,
        billings: updatedBillings
      };
    });
  };

  const refundBilling = (billingId: string) => {
    setState(prev => {
      const billing = prev.billings.find(b => b.id === billingId);
      if (!billing) return prev;

      const updatedBillings = prev.billings.map(b => b.id === billingId ? {
        ...b,
        status: 'Cancelado' as const,
        installments: b.installments.map(i => ({ ...i, status: 'Pendente' as const }))
      } : b);

      // (Optional) Here you could delete the linked financial inflows if required.
      return {
        ...prev,
        billings: updatedBillings
      };
    });
  };

  // --- MANUAL FINANCIAL OPERATIONS ---
  const addTransaction = (transData: Omit<FinancialTransaction, 'id' | 'createdAt'>) => {
    const newTrans: FinancialTransaction = {
      ...transData,
      id: `t-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    setState(prev => {
      // Trigger: If it is an Outflow (Saída) for parts purchase, optionally we could increase parts stock,
      // but let's keep it simple and register just the financial flow.
      return {
        ...prev,
        transactions: [newTrans, ...prev.transactions]
      };
    });

    return newTrans;
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  // --- COMPANY SETTINGS ---
  const updateSettings = (settingsData: Partial<CompanySettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settingsData }
    }));
  };

  // --- SYSTEM TOOLS ---
  const resetDatabase = () => {
    localStorage.removeItem('oficina_saas_database');
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
  };

  const exportDatabaseJson = () => {
    return JSON.stringify(state, null, 2);
  };

  const restoreBackup = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (
        parsed.clients && 
        parsed.vehicles && 
        parsed.services && 
        parsed.parts && 
        parsed.workOrders && 
        parsed.billings && 
        parsed.transactions && 
        parsed.settings
      ) {
        setState(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return false;
    }
  };

  return (
    <DatabaseContext.Provider value={{
      ...state,
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
      refundBilling,
      addTransaction,
      deleteTransaction,
      updateSettings,
      resetDatabase,
      restoreBackup,
      exportDatabaseJson
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
