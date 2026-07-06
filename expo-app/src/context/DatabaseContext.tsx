import React, { createContext, useContext } from 'react';
import { Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { 
  Client, Vehicle, ServiceItem, PartItem, 
  OSStatus, WorkOrder, Billing, FinancialTransaction, 
  CompanySettings 
} from '../types';

interface DatabaseContextProps {
  clients: Client[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  parts: PartItem[];
  workOrders: WorkOrder[];
  billings: Billing[];
  transactions: FinancialTransaction[];
  settings: CompanySettings;
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

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const store = useAppStore();

  const signOut = async () => {
    await store.logout();
  };

  const isSubscriptionBlocked = () => {
    const subscription = useAppStore.getState().subscription;
    if (!subscription) return false;

    const { status, dueDate } = subscription;
    const now = new Date();
    const dueDateObj = new Date(dueDate);

    if (status === 'TRIAL') {
      return now > dueDateObj;
    }

    if (status === 'OVERDUE' || status === 'PENDING') {
      const diffTime = now.getTime() - dueDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 7;
    }

    return false;
  };

  const showBlockedAlert = () => {
    Alert.alert(
      'Acesso Bloqueado',
      'Sua oficina está em Modo Leitura devido ao atraso no pagamento da assinatura (carência de 7 dias expirada). Por favor, regularize seu pagamento para liberar cadastros e edições.',
      [{ text: 'OK' }]
    );
  };

  const addBilling = async (billingData: any) => {
    return {
      id: 'mock-bill-' + Math.random().toString(36).substr(2, 9),
      ...billingData,
      createdAt: new Date().toISOString()
    };
  };

  const exportDatabaseJson = () => {
    const state = useAppStore.getState();
    return JSON.stringify({
      clients: state.clients,
      vehicles: state.vehicles,
      services: state.services,
      parts: state.parts,
      workOrders: state.workOrders,
      billings: state.billings,
      transactions: state.transactions,
      settings: state.settings,
    });
  };

  const resetDatabase = async () => {
    await store.logout();
  };

  const restoreBackup = async (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      useAppStore.setState({
        clients: data.clients || [],
        vehicles: data.vehicles || [],
        services: data.services || [],
        parts: data.parts || [],
        workOrders: data.workOrders || [],
        billings: data.billings || [],
        transactions: data.transactions || [],
        settings: data.settings || store.settings,
      });
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  };

  const contextValue: DatabaseContextProps = {
    clients: store.clients,
    vehicles: store.vehicles,
    services: store.services,
    parts: store.parts,
    workOrders: store.workOrders,
    billings: store.billings,
    transactions: store.transactions,
    settings: store.settings,
    loading: store.loading,
    online: store.isOnline,

    signOut,
    
    // CRUD wraps with subscription locks
    addClient: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addClient(dto);
    },
    updateClient: async (id, dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateClient(id, dto);
    },
    deleteClient: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deleteClient(id);
    },

    addVehicle: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addVehicle(dto);
    },
    updateVehicle: async (id, dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateVehicle(id, dto);
    },
    deleteVehicle: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deleteVehicle(id);
    },

    addService: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addService(dto);
    },
    updateService: async (id, dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateService(id, dto);
    },
    deleteService: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deleteService(id);
    },

    addPart: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addPart(dto);
    },
    updatePart: async (id, dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updatePart(id, dto);
    },
    deletePart: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deletePart(id);
    },

    addWorkOrder: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addWorkOrder(dto);
    },
    updateWorkOrder: async (id, dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateWorkOrder(id, dto);
    },
    updateWorkOrderStatus: async (id, status) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateWorkOrderStatus(id, status);
    },
    saveWorkOrderSignature: async (id, sig) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.saveWorkOrderSignature(id, sig);
    },
    deleteWorkOrder: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deleteWorkOrder(id);
    },

    addBilling,
    payInstallment: async (billingId, installmentNumber) => {
      // Payment of OS bills remains unlocked so they can register money inflows
      return store.payInstallment(billingId, installmentNumber);
    },

    addTransaction: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return null;
      }
      return store.addTransaction(dto);
    },
    deleteTransaction: async (id) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.deleteTransaction(id);
    },

    updateSettings: async (dto) => {
      if (isSubscriptionBlocked()) {
        showBlockedAlert();
        return false;
      }
      return store.updateSettings(dto);
    },

    exportDatabaseJson,
    resetDatabase,
    restoreBackup
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
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
