import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X, Plus } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import OSWizardModal from '../components/OSWizardModal';
import { OSStatus } from '../types';

export default function OSListScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { workOrders, clients, vehicles, billings, addWorkOrder, services, parts } = useDatabase();

  const [osSearch, setOsSearch] = useState('');
  const [osBillingFilter, setOsBillingFilter] = useState<'Todas' | 'A Faturar' | 'Faturadas' | 'Pagas'>('Todas');
  const [osWizardModalVisible, setOsWizardModalVisible] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billingMap = useMemo(() => new Map(billings.map(b => [b.osId, b])), [billings]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(os => {
      const client = clientMap.get(os.clientId);
      const vehicle = vehicleMap.get(os.vehicleId);
      const billing = billingMap.get(os.id);
      
      const matchesSearch =
        os.osNumber.toLowerCase().includes(osSearch.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(osSearch.toLowerCase()) ||
        (vehicle?.plate || '').toLowerCase().includes(osSearch.toLowerCase());

      let matchesBilling = true;
      if (osBillingFilter === 'A Faturar') {
        matchesBilling = !billing;
      } else if (osBillingFilter === 'Faturadas') {
        matchesBilling = !!billing;
      } else if (osBillingFilter === 'Pagas') {
        matchesBilling = billing?.status === 'Pago';
      }

      return matchesSearch && matchesBilling;
    });
  }, [workOrders, osSearch, osBillingFilter, clientMap, vehicleMap, billingMap]);

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
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <View style={styles.screenHeader}>
        <Text style={[styles.tabTitle, { color: colors.text }]}>Ordens de Serviço</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenOSWizardForCreate}>
          <Plus size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Nova OS</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <View style={[styles.searchBarWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Buscar por OS, cliente, placa..."
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            value={osSearch}
            onChangeText={setOsSearch}
            style={[styles.searchBarInput, { color: colors.text }]}
          />
          {osSearch !== '' && (
            <TouchableOpacity onPress={() => setOsSearch('')}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 38, marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersWrapper}>
            {(['Todas', 'A Faturar', 'Faturadas', 'Pagas'] as const).map(tab => {
              const isActive = osBillingFilter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setOsBillingFilter(tab)}
                  style={[
                    styles.statusFilterTab,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.statusFilterTabText,
                    { color: colors.textMuted },
                    isActive && { color: '#fff' }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredWorkOrders.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma OS encontrada.</Text>
            </View>
          ) : (
            filteredWorkOrders.map(os => {
              const client = clientMap.get(os.clientId);
              const vehicle = vehicleMap.get(os.vehicleId);
              const billing = billingMap.get(os.id);
              
              let cardStyle = styles.cardProgress;
              if (billing?.status === 'Pago') {
                cardStyle = styles.cardDone;
              } else if (!billing) {
                cardStyle = styles.cardOpen;
              }

              return (
                <TouchableOpacity
                  key={os.id}
                  onPress={() => {
                    navigation.navigate('OSDetail', { osId: os.id });
                  }}
                  style={[styles.card, cardStyle, { backgroundColor: colors.card, borderColor: colors.border, padding: 18, marginBottom: 12 }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={[styles.osNum, { color: colors.primary }]}>{os.osNumber}</Text>
                      {billing ? (
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                            borderColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                          }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: billing.status === 'Pago' ? colors.success : colors.warning }
                          ]}>
                            {billing.status === 'Pago' ? 'PAGO' : 'FATURADA'}
                          </Text>
                        </View>
                      ) : (
                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderColor: 'rgba(245, 158, 11, 0.3)'
                          }
                        ]}>
                          <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>
                            A FATURAR
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.osDate, { color: colors.textMuted }]}>{formatDate(os.date)}</Text>
                  </View>
                  
                  <View style={{ marginVertical: 4 }}>
                    <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Cliente</Text>
                    <Text style={[styles.cardValueTextBold, { color: colors.text }]}>{client?.name}</Text>
                    
                    {vehicle && (
                      <>
                        <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Veículo</Text>
                        <Text style={[styles.cardValueText, { color: colors.textDim }]}>
                          {vehicle.brand} {vehicle.model} • Placa: <Text style={[styles.plateText, { color: colors.text }]}>{vehicle.plate}</Text>
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={[styles.cardFooterRow, { borderTopColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {billing ? (
                        <View style={[
                          styles.billingStatusBadge,
                          { backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)' }
                        ]}>
                          <Text style={[
                            styles.billingStatusBadgeText,
                            { color: billing.status === 'Pago' ? colors.success : colors.warning }
                          ]}>
                            💳 {billing.paymentMethod.toUpperCase()} {billing.installments.length > 1 ? `(${billing.installments.length}x)` : '• À VISTA'}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.billingStatusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                          <Text style={[styles.billingStatusBadgeText, { color: '#f59e0b' }]}>
                            ⚙️ EM EXECUÇÃO
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.osTotalVal, { color: colors.text }]}>{formatCurrency(os.grandTotal)}</Text>
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
