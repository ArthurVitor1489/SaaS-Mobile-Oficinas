import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import api from '../services/api';
import { 
  Client, Vehicle, ServiceItem, PartItem, 
  OSStatus, WorkOrder, Billing, FinancialTransaction, 
  CompanySettings, BillingStatus, TransactionType, TransactionCategory
} from '../types';

export interface OfflineQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'clients' | 'vehicles' | 'services' | 'parts' | 'workOrders' | 'billings' | 'transactions';
  payload: any;
  timestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: string;
  workshop: {
    id: string;
    name: string;
  };
}

interface AppState {
  // Auth
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  
  // Network
  isOnline: boolean;
  offlineQueue: OfflineQueueItem[];

  // Database Cache
  clients: Client[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  parts: PartItem[];
  workOrders: WorkOrder[];
  billings: Billing[];
  transactions: FinancialTransaction[];
  settings: CompanySettings;
  subscription: {
    status: string;
    dueDate: string;
    paymentId?: string;
    invoiceUrl?: string;
  } | null;

  // Actions
  setAccessToken: (token: string | null) => void;
  setOnlineStatus: (status: boolean) => void;
  clearQueue: () => void;
  popQueueItem: (id: string) => void;
  
  // Auth Actions
  login: (dto: any) => Promise<boolean>;
  signup: (dto: any) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Data Fetching
  pullAll: () => Promise<void>;

  // Client Actions
  addClient: (dto: Omit<Client, 'id' | 'createdAt'>) => Promise<Client | null>;
  updateClient: (id: string, dto: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;

  // Vehicle Actions
  addVehicle: (dto: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<Vehicle | null>;
  updateVehicle: (id: string, dto: Partial<Vehicle>) => Promise<boolean>;
  deleteVehicle: (id: string) => Promise<boolean>;

  // Service Catalog Actions
  addService: (dto: Omit<ServiceItem, 'id'>) => Promise<ServiceItem | null>;
  updateService: (id: string, service: Partial<ServiceItem>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;

  // Part Catalog Actions
  addPart: (dto: Omit<PartItem, 'id'>) => Promise<PartItem | null>;
  updatePart: (id: string, part: Partial<PartItem>) => Promise<boolean>;
  deletePart: (id: string) => Promise<boolean>;

  // WorkOrder Actions
  addWorkOrder: (dto: Omit<WorkOrder, 'id' | 'osNumber' | 'grandTotal' | 'servicesTotal' | 'partsTotal' | 'createdAt'>) => Promise<WorkOrder | null>;
  updateWorkOrder: (id: string, dto: Partial<WorkOrder>) => Promise<boolean>;
  updateWorkOrderStatus: (id: string, status: OSStatus) => Promise<boolean>;
  saveWorkOrderSignature: (id: string, signatureBase64: string) => Promise<boolean>;
  deleteWorkOrder: (id: string) => Promise<boolean>;

  // Billing Actions
  payInstallment: (billingId: string, installmentNumber: number) => Promise<boolean>;

  // Financial Transaction Actions
  addTransaction: (dto: Omit<FinancialTransaction, 'id' | 'createdAt'>) => Promise<FinancialTransaction | null>;
  deleteTransaction: (id: string) => Promise<boolean>;

  // Settings Actions
  updateSettings: (dto: Partial<CompanySettings>) => Promise<boolean>;
}

// Mapping helpers from Local to API

// RFC4122 v4 resilient UUID generator for offline/non-secure web environments
const generateUUID = (): string => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const mapOSStatusLocalToApi = (status: OSStatus): string => {
  switch (status) {
    case 'Aberta': return 'ABERTA';
    case 'Em andamento': return 'EM_ANDAMENTO';
    case 'Concluída': return 'CONCLUIDA';
    case 'Entregue': return 'ENTREGUE';
    default: return 'ABERTA';
  }
};

const mapOSStatusApiToLocal = (status: string): OSStatus => {
  switch (status) {
    case 'ABERTA': return 'Aberta';
    case 'EM_ANDAMENTO': return 'Em andamento';
    case 'CONCLUIDA': return 'Concluída';
    case 'ENTREGUE': return 'Entregue';
    default: return 'Aberta';
  }
};

const mapBillingStatusApiToLocal = (status: string): BillingStatus => {
  switch (status) {
    case 'PENDENTE': return 'Pendente';
    case 'PARCIALMENTE_PAGO': return 'Parcialmente pago';
    case 'PAGO': return 'Pago';
    default: return 'Pendente';
  }
};

const mapTransactionTypeLocalToApi = (type: TransactionType): string => {
  switch (type) {
    case 'Entrada': return 'ENTRADA';
    case 'Saída': return 'SAIDA';
    default: return 'ENTRADA';
  }
};

const mapTransactionTypeApiToLocal = (type: string): TransactionType => {
  switch (type) {
    case 'ENTRADA': return 'Entrada';
    case 'SAIDA': return 'Saída';
    default: return 'Entrada';
  }
};

const defaultSettings: CompanySettings = {
  name: 'Minha Oficina',
  cnpj: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  logoUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=200&auto=format&fit=crop',
  autoSequence: true,
  nextOSNumber: 1,
  pdfNotes: 'Garantia de 90 dias para serviços e peças aplicadas.'
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
      isOnline: false,
      offlineQueue: [],

      clients: [],
      vehicles: [],
      services: [],
      parts: [],
      workOrders: [],
      billings: [],
      transactions: [],
      settings: defaultSettings,
      subscription: null,

      setAccessToken: (accessToken) => set({ accessToken }),
      setOnlineStatus: (isOnline) => set({ isOnline }),
      clearQueue: () => set({ offlineQueue: [] }),
      popQueueItem: (id) => set((state) => ({
        offlineQueue: state.offlineQueue.filter((item) => item.id !== id)
      })),

      // AUTH ACTIONS
      login: async (dto) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/login', dto);
          const { accessToken, refreshToken, user: profile } = res.data;
          
          set({
            accessToken,
            refreshToken,
            user: profile,
            settings: {
              ...get().settings,
              name: profile.workshop.name || get().settings.name,
            },
            loading: false,
          });
          
          // Pull latest cloud data
          await get().pullAll();
          return true;
        } catch (e) {
          console.error('Login failed', e);
          set({ loading: false });
          return false;
        }
      },

      signup: async (dto) => {
        set({ loading: true });
        try {
          await api.post('/auth/signup', dto);
          set({ loading: false });
          return true;
        } catch (e) {
          console.error('Signup failed', e);
          set({ loading: false });
          return false;
        }
      },

      logout: async () => {
        const { user } = get();
        if (user) {
          try {
            await api.post('/auth/logout');
          } catch (e) {
            console.log('Logout API call failed', e);
          }
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          clients: [],
          vehicles: [],
          services: [],
          parts: [],
          workOrders: [],
          billings: [],
          transactions: [],
          offlineQueue: [],
          settings: defaultSettings,
          subscription: null,
        });
      },

      // DATA FETCHING
      pullAll: async () => {
        if (!get().isOnline || !get().accessToken) return;
        try {
          const [
            clientsRes, vehiclesRes, servicesRes, partsRes, 
            ordersRes, billingsRes, transactionsRes, settingsRes, subscriptionRes
          ] = await Promise.all([
            api.get('/clients'),
            api.get('/vehicles'),
            api.get('/services'),
            api.get('/parts'),
            api.get('/orders'),
            api.get('/finance/billings'),
            api.get('/finance/transactions'),
            api.get('/tenant/settings'),
            api.get('/subscription'),
          ]);

          // Normalize prices and types
          const services = servicesRes.data.map((s: any) => ({ ...s, price: parseFloat(s.price) }));
          const parts = partsRes.data.map((p: any) => ({
            ...p,
            purchasePrice: parseFloat(p.purchasePrice),
            salePrice: parseFloat(p.salePrice),
          }));
          const workOrders = ordersRes.data.map((o: any) => ({
            ...o,
            status: mapOSStatusApiToLocal(o.status),
            servicesTotal: parseFloat(o.servicesTotal),
            partsTotal: parseFloat(o.partsTotal),
            grandTotal: parseFloat(o.grandTotal),
            services: o.services.map((s: any) => ({ ...s, price: parseFloat(s.price) })),
            parts: o.parts.map((p: any) => ({ ...p, salePrice: parseFloat(p.salePrice) })),
          }));
          const billings = billingsRes.data.map((b: any) => ({
            ...b,
            amount: parseFloat(b.amount),
            status: mapBillingStatusApiToLocal(b.status),
            installments: b.installments.map((i: any) => ({ 
              ...i, 
              amount: parseFloat(i.amount),
              status: i.status === 'PAGO' ? 'Pago' : 'Pendente'
            })),
          }));
          const transactions = transactionsRes.data.map((t: any) => ({ 
            ...t, 
            type: mapTransactionTypeApiToLocal(t.type),
            amount: parseFloat(t.amount) 
          }));

          set({
            clients: clientsRes.data,
            vehicles: vehiclesRes.data,
            services,
            parts,
            workOrders,
            billings,
            transactions,
            settings: settingsRes.data || get().settings,
            subscription: subscriptionRes.data || null,
          });
        } catch (e) {
          console.error('Failed to pull remote database', e);
        }
      },

      // CLIENT ACTIONS
      addClient: async (dto) => {
        const newId = generateUUID();
        const newClient: Client = {
          id: newId,
          ...dto,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ clients: [newClient, ...state.clients] }));

        if (get().isOnline) {
          try {
            await api.post('/clients', { id: newId, ...dto });
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'clients',
              payload: { id: newId, ...dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'clients',
                payload: { id: newId, ...dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newClient;
      },

      updateClient: async (id, dto) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...dto } : c)),
        }));

        if (get().isOnline) {
          try {
            await api.patch(`/clients/${id}`, dto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'clients',
              payload: { id, dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'clients',
                payload: { id, dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      deleteClient: async (id) => {
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          vehicles: state.vehicles.filter((v) => v.clientId !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/clients/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'clients',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'clients',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // VEHICLE ACTIONS
      addVehicle: async (dto) => {
        const newId = generateUUID();
        const newVehicle: Vehicle = {
          id: newId,
          ...dto,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ vehicles: [newVehicle, ...state.vehicles] }));

        if (get().isOnline) {
          try {
            await api.post('/vehicles', { id: newId, ...dto });
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'vehicles',
              payload: { id: newId, ...dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'vehicles',
                payload: { id: newId, ...dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newVehicle;
      },

      updateVehicle: async (id, dto) => {
        set((state) => ({
          vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...dto } : v)),
        }));

        if (get().isOnline) {
          try {
            await api.patch(`/vehicles/${id}`, dto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'vehicles',
              payload: { id, dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'vehicles',
                payload: { id, dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      deleteVehicle: async (id) => {
        set((state) => ({
          vehicles: state.vehicles.filter((v) => v.id !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/vehicles/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'vehicles',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'vehicles',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // SERVICE ACTIONS
      addService: async (dto) => {
        const newId = generateUUID();
        const newService: ServiceItem = {
          id: newId,
          ...dto,
        };

        set((state) => ({ services: [newService, ...state.services] }));

        if (get().isOnline) {
          try {
            await api.post('/services', { id: newId, ...dto });
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'services',
              payload: { id: newId, ...dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'services',
                payload: { id: newId, ...dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newService;
      },

      updateService: async (id, dto) => {
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...dto } : s)),
        }));

        if (get().isOnline) {
          try {
            await api.patch(`/services/${id}`, dto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'services',
              payload: { id, dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'services',
                payload: { id, dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      deleteService: async (id) => {
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/services/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'services',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'services',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // PART ACTIONS
      addPart: async (dto) => {
        const newId = generateUUID();
        const newPart: PartItem = {
          id: newId,
          ...dto,
        };

        set((state) => ({ parts: [newPart, ...state.parts] }));

        if (get().isOnline) {
          try {
            await api.post('/parts', { id: newId, ...dto });
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'parts',
              payload: { id: newId, ...dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'parts',
                payload: { id: newId, ...dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newPart;
      },

      updatePart: async (id, dto) => {
        set((state) => ({
          parts: state.parts.map((p) => (p.id === id ? { ...p, ...dto } : p)),
        }));

        if (get().isOnline) {
          try {
            await api.patch(`/parts/${id}`, dto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'parts',
              payload: { id, dto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'parts',
                payload: { id, dto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      deletePart: async (id) => {
        set((state) => ({
          parts: state.parts.filter((p) => p.id !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/parts/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'parts',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'parts',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // WORK ORDER ACTIONS
      addWorkOrder: async (dto) => {
        const newId = generateUUID();
        const servicesTotal = dto.services.reduce((acc, s) => acc + s.price * s.quantity, 0);
        const partsTotal = dto.parts.reduce((acc, p) => acc + p.salePrice * p.quantity, 0);
        const grandTotal = servicesTotal + partsTotal;

        const currentNext = get().settings.nextOSNumber;
        const osNumber = `OS-${String(currentNext).padStart(4, '0')}`;

        const newWO: WorkOrder = {
          id: newId,
          osNumber,
          servicesTotal,
          partsTotal,
          grandTotal,
          createdAt: new Date().toISOString(),
          ...dto,
        };

        const updatedParts = get().parts.map((part) => {
          const consumed = dto.parts.find((pt) => pt.code === part.code || pt.name === part.name);
          return consumed ? { ...part, stock: Math.max(0, part.stock - consumed.quantity) } : part;
        });

        let newBillings = [...get().billings];
        if (dto.status === 'Concluída' || dto.status === 'Entregue') {
          const billingId = 'b-' + generateUUID().substring(0, 8);
          const todayStr = new Date().toISOString().split('T')[0];
          const newBilling: Billing = {
            id: billingId,
            osId: newId,
            amount: grandTotal,
            paymentMethod: 'PIX',
            status: 'Pendente',
            dueDate: todayStr,
            createdAt: new Date().toISOString(),
            installments: [
              {
                number: 1,
                amount: grandTotal,
                dueDate: todayStr,
                status: 'Pendente',
              },
            ],
          };
          newBillings = [newBilling, ...newBillings];
        }

        set((state) => ({
          workOrders: [newWO, ...state.workOrders],
          parts: updatedParts,
          billings: newBillings,
          settings: {
            ...state.settings,
            nextOSNumber: currentNext + 1,
          },
        }));

        const mappedPayload = {
          id: newId,
          ...dto,
          status: mapOSStatusLocalToApi(dto.status),
        };

        if (get().isOnline) {
          try {
            await api.post('/orders', mappedPayload);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'workOrders',
              payload: mappedPayload,
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'workOrders',
                payload: mappedPayload,
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newWO;
      },

      updateWorkOrder: async (id, dto) => {
        const original = get().workOrders.find((w) => w.id === id);
        if (!original) return false;

        const services = dto.services ?? original.services;
        const parts = dto.parts ?? original.parts;

        const servicesTotal = services.reduce((acc, s) => acc + s.price * s.quantity, 0);
        const partsTotal = parts.reduce((acc, p) => acc + p.salePrice * p.quantity, 0);
        const grandTotal = servicesTotal + partsTotal;

        const updatedWO = {
          ...original,
          ...dto,
          services,
          parts,
          servicesTotal,
          partsTotal,
          grandTotal,
        };

        let newBillings = [...get().billings];
        if (dto.status && (dto.status === 'Concluída' || dto.status === 'Entregue')) {
          const hasBilling = get().billings.some((b) => b.osId === id);
          if (!hasBilling) {
            const billingId = 'b-' + generateUUID().substring(0, 8);
            const todayStr = new Date().toISOString().split('T')[0];
            const newBilling: Billing = {
              id: billingId,
              osId: id,
              amount: grandTotal,
              paymentMethod: 'PIX',
              status: 'Pendente',
              dueDate: todayStr,
              createdAt: new Date().toISOString(),
              installments: [
                {
                  number: 1,
                  amount: grandTotal,
                  dueDate: todayStr,
                  status: 'Pendente',
                },
              ],
            };
            newBillings = [newBilling, ...newBillings];
          }
        }

        set((state) => ({
          workOrders: state.workOrders.map((w) => (w.id === id ? updatedWO : w)),
          billings: newBillings,
        }));

        const mappedDto = {
          ...dto,
          status: dto.status ? mapOSStatusLocalToApi(dto.status) : undefined,
        };

        if (get().isOnline) {
          try {
            await api.patch(`/orders/${id}`, mappedDto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'workOrders',
              payload: { id, dto: mappedDto },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'workOrders',
                payload: { id, dto: mappedDto },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      updateWorkOrderStatus: async (id, status) => {
        return get().updateWorkOrder(id, { status });
      },

      saveWorkOrderSignature: async (id, signature) => {
        return get().updateWorkOrder(id, { signature });
      },

      deleteWorkOrder: async (id) => {
        set((state) => ({
          workOrders: state.workOrders.filter((w) => w.id !== id),
          billings: state.billings.filter((b) => b.osId !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/orders/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'workOrders',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'workOrders',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // BILLING ACTIONS
      payInstallment: async (billingId, installmentNumber) => {
        const paidAtStr = new Date().toISOString();
        const billing = get().billings.find((b) => b.id === billingId);
        if (!billing) return false;

        const os = get().workOrders.find((w) => w.id === billing.osId);
        const totalInsts = billing.installments.length;
        const transactionDescription = `Parcela ${installmentNumber}/${totalInsts} da ${os?.osNumber || 'OS'}`;

        let paidAmount = 0;
        const updatedInstallments = billing.installments.map((inst) => {
          if (inst.number === installmentNumber) {
            paidAmount = inst.amount;
            return { ...inst, status: 'Pago' as const, paidAt: paidAtStr };
          }
          return inst;
        });

        const totalPaidCount = updatedInstallments.filter((inst) => inst.status === 'Pago').length;
        let newStatus: BillingStatus = 'Pendente';
        if (totalPaidCount === totalInsts) {
          newStatus = 'Pago';
        } else if (totalPaidCount > 0) {
          newStatus = 'Parcialmente pago';
        }

        const newTransId = 't-' + generateUUID().substring(0, 8);
        const newTrans: FinancialTransaction = {
          id: newTransId,
          type: 'Entrada',
          category: 'Pagamento OS',
          amount: paidAmount,
          date: paidAtStr.split('T')[0],
          description: transactionDescription,
          createdAt: paidAtStr,
        };

        set((state) => ({
          billings: state.billings.map((b) => (b.id === billingId ? { ...b, status: newStatus, installments: updatedInstallments } : b)),
          transactions: [newTrans, ...state.transactions],
        }));

        if (get().isOnline) {
          try {
            await api.post(`/finance/billings/${billingId}/pay`, { installmentNumber });
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'billings',
              payload: { id: billingId, installmentNumber },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'UPDATE',
                entity: 'billings',
                payload: { id: billingId, installmentNumber },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // FINANCIAL TRANSACTION ACTIONS
      addTransaction: async (dto) => {
        const newId = generateUUID();
        const newTrans: FinancialTransaction = {
          id: newId,
          ...dto,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ transactions: [newTrans, ...state.transactions] }));

        const mappedPayload = {
          id: newId,
          ...dto,
          type: mapTransactionTypeLocalToApi(dto.type),
        };

        if (get().isOnline) {
          try {
            await api.post('/finance/transactions', mappedPayload);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'CREATE',
              entity: 'transactions',
              payload: mappedPayload,
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'CREATE',
                entity: 'transactions',
                payload: mappedPayload,
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return newTrans;
      },

      deleteTransaction: async (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));

        if (get().isOnline) {
          try {
            await api.delete(`/finance/transactions/${id}`);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'DELETE',
              entity: 'transactions',
              payload: { id },
              timestamp: Date.now(),
            });
            }
          }
        } else {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              {
                id: generateUUID(),
                action: 'DELETE',
                entity: 'transactions',
                payload: { id },
                timestamp: Date.now(),
              },
            ],
          }));
        }
        return true;
      },

      // SETTINGS ACTIONS
      updateSettings: async (dto) => {
        set((state) => ({ settings: { ...state.settings, ...dto } }));

        if (get().isOnline) {
          try {
            await api.patch('/tenant/settings', dto);
          } catch (e: any) {
            if (!e.response) {
              get().offlineQueue.push({
              id: generateUUID(),
              action: 'UPDATE',
              entity: 'parts', // Mock entity wrapper since settings belongs to tenant
              payload: { settings: dto },
              timestamp: Date.now(),
            });
            }
          }
        }
        return true;
      },
    }),
    {
      name: 'voltruck-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        clients: state.clients,
        vehicles: state.vehicles,
        services: state.services,
        parts: state.parts,
        workOrders: state.workOrders,
        billings: state.billings,
        transactions: state.transactions,
        settings: state.settings,
        offlineQueue: state.offlineQueue,
      }),
    }
  )
);
