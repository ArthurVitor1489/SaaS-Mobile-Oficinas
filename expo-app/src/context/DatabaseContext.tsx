import React, { createContext, useContext } from 'react';
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

  const addBilling = async (billingData: any) => {
    // Billings are automatically created by backend on OS closure.
    // Return mock or custom object for local compatibility.
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
    
    // CRUD wraps linked to Zustand store actions
    addClient: store.addClient,
    updateClient: store.updateClient,
    deleteClient: store.deleteClient,

    addVehicle: store.addVehicle,
    updateVehicle: store.updateVehicle,
    deleteVehicle: store.deleteVehicle,

    addService: store.addService,
    updateService: store.updateService,
    deleteService: store.deleteService,

    addPart: store.addPart,
    updatePart: store.updatePart,
    deletePart: store.deletePart,

    addWorkOrder: store.addWorkOrder,
    updateWorkOrder: store.updateWorkOrder,
    updateWorkOrderStatus: store.updateWorkOrderStatus,
    saveWorkOrderSignature: store.saveWorkOrderSignature,
    deleteWorkOrder: store.deleteWorkOrder,

    addBilling,
    payInstallment: store.payInstallment,

    addTransaction: store.addTransaction,
    deleteTransaction: store.deleteTransaction,

    updateSettings: store.updateSettings,

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
