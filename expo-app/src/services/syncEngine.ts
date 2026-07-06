import axios from 'axios';
import api, { getBaseUrl } from './api';
import { useAppStore, OfflineQueueItem } from '../store/useAppStore';

let isSyncing = false;
let checkInterval: NodeJS.Timeout | null = null;

export const checkConnection = async (): Promise<boolean> => {
  const store = useAppStore.getState();
  try {
    // A simple HEAD or small GET request to verify server reachability
    await axios.get(`${getBaseUrl()}/auth/logout`, { timeout: 3000 });
    // If it throws anything other than a network error, the server is up (e.g. 401 is fine, it means the server responded!)
    store.setOnlineStatus(true);
    return true;
  } catch (error: any) {
    if (error.response) {
      // Server responded with some code (e.g. 401, 404), so server is ONLINE!
      store.setOnlineStatus(true);
      return true;
    }
    // Network error or timeout: server is OFFLINE
    store.setOnlineStatus(false);
    return false;
  }
};

export const processOfflineQueue = async () => {
  if (isSyncing) return;
  
  const isOnline = await checkConnection();
  if (!isOnline) return;

  const store = useAppStore.getState();
  const queue = [...store.offlineQueue];
  
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`Starting synchronization of ${queue.length} offline actions...`);

  // Sort queue by timestamp to process oldest actions first
  queue.sort((a, b) => a.timestamp - b.timestamp);

  for (const item of queue) {
    try {
      await processQueueItem(item);
      // Remove successfully processed item from the queue
      store.popQueueItem(item.id);
      console.log(`Action ${item.action} on ${item.entity} synced successfully.`);
    } catch (error: any) {
      if (!error.response) {
        // Network error during sync: pause queue execution
        console.log('Network connection lost during sync. Pausing queue processing.');
        store.setOnlineStatus(false);
        break;
      } else {
        // Server side validation or client-error (400, 404, etc.): 
        // Pop it to avoid blocking the queue indefinitely, as retrying will always fail.
        console.error(`Fatal sync error for item ${item.id} (${item.entity}:${item.action}). Skipping.`, error.response.data);
        store.popQueueItem(item.id);
      }
    }
  }

  // Fetch updated database to reconcile state
  await store.pullAll();
  isSyncing = false;
};

const processQueueItem = async (item: OfflineQueueItem) => {
  const { entity, action, payload } = item;

  switch (entity) {
    case 'clients':
      if (action === 'CREATE') {
        await api.post('/clients', payload);
      } else if (action === 'UPDATE') {
        await api.patch(`/clients/${payload.id}`, payload.dto);
      } else if (action === 'DELETE') {
        await api.delete(`/clients/${payload.id}`);
      }
      break;

    case 'vehicles':
      if (action === 'CREATE') {
        await api.post('/vehicles', payload);
      } else if (action === 'UPDATE') {
        await api.patch(`/vehicles/${payload.id}`, payload.dto);
      } else if (action === 'DELETE') {
        await api.delete(`/vehicles/${payload.id}`);
      }
      break;

    case 'services':
      if (action === 'CREATE') {
        await api.post('/services', payload);
      } else if (action === 'UPDATE') {
        await api.patch(`/services/${payload.id}`, payload.dto);
      } else if (action === 'DELETE') {
        await api.delete(`/services/${payload.id}`);
      }
      break;

    case 'parts':
      if (action === 'CREATE') {
        await api.post('/parts', payload);
      } else if (action === 'UPDATE') {
        await api.patch(`/parts/${payload.id}`, payload.dto);
      } else if (action === 'DELETE') {
        await api.delete(`/parts/${payload.id}`);
      }
      break;

    case 'workOrders':
      if (action === 'CREATE') {
        await api.post('/orders', payload);
      } else if (action === 'UPDATE') {
        await api.patch(`/orders/${payload.id}`, payload.dto);
      } else if (action === 'DELETE') {
        await api.delete(`/orders/${payload.id}`);
      }
      break;

    case 'billings':
      if (action === 'UPDATE') {
        await api.post(`/finance/billings/${payload.id}/pay`, { 
          installmentNumber: payload.installmentNumber 
        });
      }
      break;

    case 'transactions':
      if (action === 'CREATE') {
        await api.post('/finance/transactions', payload);
      } else if (action === 'DELETE') {
        await api.delete(`/finance/transactions/${payload.id}`);
      }
      break;

    default:
      throw new Error(`Unknown entity type in sync engine: ${entity}`);
  }
};

export const startSyncEngine = () => {
  if (checkInterval) return;

  // Run initial check and sync immediately
  processOfflineQueue();

  // Poll connection and process queue every 25 seconds
  checkInterval = setInterval(() => {
    processOfflineQueue();
  }, 25000);
};

export const stopSyncEngine = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
};
