import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X, Plus } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import OSWizardModal from '../components/OSWizardModal';
import { OSStatus } from '../types';

export default function OSListScreen() {
  const navigation = useNavigation<any>();
  const { workOrders, clients, vehicles, billings, addWorkOrder, services, parts } = useDatabase();

  const [osSearch, setOsSearch] = useState('');
  const [osStatusFilter, setOsStatusFilter] = useState<OSStatus | 'Todos'>('Todos');
  const [osWizardModalVisible, setOsWizardModalVisible] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billingMap = useMemo(() => new Map(billings.map(b => [b.osId, b])), [billings]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(os => {
      const client = clientMap.get(os.clientId);
      const vehicle = vehicleMap.get(os.vehicleId);
      
      const matchesSearch =
        os.osNumber.toLowerCase().includes(osSearch.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(osSearch.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(osSearch.toLowerCase());

      const matchesStatus = osStatusFilter === 'Todos' || os.status === osStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [workOrders, osSearch, osStatusFilter, clientMap, vehicleMap]);

  const handleOpenOSWizardForCreate = () => {
    setOsWizardModalVisible(true);
  };

  const handleOSWizardSubmit = async (form: any) => {
    const servicesTotal = form.selectedServices.reduce((acc: number, s: any) => acc + (s.price * s.quantity), 0);
    const partsTotal = form.selectedParts.reduce((acc: number, p: any) => acc + (p.salePrice * p.quantity), 0);
    const grandTotal = servicesTotal + partsTotal;

    const dataToSave = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      notes: form.notes,
      status: form.status,
      services: form.selectedServices,
      parts: form.selectedParts,
      servicesTotal,
      partsTotal,
      grandTotal,
    };

    const res = await addWorkOrder({
      ...dataToSave,
      date: new Date().toISOString().split('T')[0],
    });
    return !!res;
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Ordens de Serviço</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenOSWizardForCreate}>
          <Plus size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Nova OS</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.searchBarWrapper}>
          <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Buscar por OS, cliente, placa..."
            placeholderTextColor="#475569"
            value={osSearch}
            onChangeText={setOsSearch}
            style={styles.searchBarInput}
          />
          {osSearch !== '' && (
            <TouchableOpacity onPress={() => setOsSearch('')}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 38, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersWrapper}>
            {(['Todos', 'Aberta', 'Em andamento', 'Concluída', 'Entregue'] as const).map(st => {
              const isActive = osStatusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setOsStatusFilter(st)}
                  style={[styles.statusFilterTab, isActive ? styles.statusFilterTabActive : null]}
                >
                  <Text style={[styles.statusFilterTabText, isActive ? styles.statusFilterTabTextActive : null]}>
                    {st === 'Em andamento' ? 'Andamento' : st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredWorkOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma OS encontrada.</Text>
            </View>
          ) : (
            filteredWorkOrders.map(os => {
              const client = clientMap.get(os.clientId);
              const vehicle = vehicleMap.get(os.vehicleId);
              const billing = billingMap.get(os.id);
              
              let osStatusStyle = styles.cardOpen;
              let badgeColor = 'rgba(59, 102, 255, 0.1)';
              let badgeTextColor = theme.colors.primary;
              let badgeBorderColor = 'rgba(59, 102, 255, 0.3)';
              if (os.status === 'Em andamento') {
                osStatusStyle = styles.cardProgress;
                badgeColor = 'rgba(234, 179, 8, 0.1)';
                badgeTextColor = theme.colors.warning;
                badgeBorderColor = 'rgba(234, 179, 8, 0.3)';
              } else if (os.status === 'Concluída') {
                osStatusStyle = styles.cardDone;
                badgeColor = 'rgba(34, 197, 94, 0.1)';
                badgeTextColor = theme.colors.success;
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
                  onPress={() => {
                    navigation.navigate('OSDetail', { osId: os.id });
                  }}
                  style={[styles.card, osStatusStyle, { padding: 18, marginBottom: 12 }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.osNum}>{os.osNumber}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badgeColor, borderColor: badgeBorderColor }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeTextColor }]}>
                          {os.status === 'Em andamento' ? 'Andamento' : os.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.osDate}>{formatDate(os.date)}</Text>
                  </View>
                  
                  <View style={{ marginVertical: 4 }}>
                    <Text style={styles.cardLabelText}>Cliente</Text>
                    <Text style={styles.cardValueTextBold}>{client?.name}</Text>
                    
                    {vehicle && (
                      <>
                        <Text style={styles.cardLabelText}>Veículo</Text>
                        <Text style={styles.cardValueText}>
                          {vehicle.brand} {vehicle.model} • Placa: <Text style={styles.plateText}>{vehicle.plate}</Text>
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.cardFooterRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {billing ? (
                        <View style={[
                          styles.billingStatusBadge,
                          { backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)' }
                        ]}>
                          <Text style={[
                            styles.billingStatusBadgeText,
                            { color: billing.status === 'Pago' ? theme.colors.success : theme.colors.warning }
                          ]}>
                            💰 {billing.status.toUpperCase()}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.billingStatusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                          <Text style={[styles.billingStatusBadgeText, { color: theme.colors.error }]}>
                            💸 NÃO FATURADA
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.osTotalVal}>{formatCurrency(os.grandTotal)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      <OSWizardModal 
        visible={osWizardModalVisible}
        editingOSId={null}
        initialForm={null}
        clients={clients}
        vehicles={vehicles}
        services={services}
        parts={parts}
        onClose={() => setOsWizardModalVisible(false)}
        onSubmit={handleOSWizardSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#090b0f',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.roundness.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: theme.spacing.md,
  },
  searchBarInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  statusFiltersWrapper: {
    gap: 6,
    alignItems: 'center',
  },
  statusFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.roundness.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#0f172a',
    marginRight: 6,
    minHeight: 34,
    justifyContent: 'center',
  },
  statusFilterTabActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  statusFilterTabText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
  },
  statusFilterTabTextActive: {
    color: theme.colors.white,
  },
  emptyContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardOpen: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  cardProgress: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  cardDone: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  cardDelivered: {
    borderLeftWidth: 4,
    borderLeftColor: '#475569',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  osNum: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  osDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  cardLabelText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  cardValueTextBold: {
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginTop: 1,
  },
  cardValueText: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 1,
  },
  plateText: {
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  billingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  billingStatusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  osTotalVal: {
    fontSize: 15,
    color: theme.colors.white,
    fontWeight: '900',
  },
});
