import React, { useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, Alert, StyleSheet, Platform } from 'react-native';
import { Search, X, Plus, Edit2, ArrowLeft, PenTool, FileText, DollarSign, Check } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { WorkOrder, OSStatus, PaymentMethod } from '../types';

interface OSScreenProps {
  selectedOS: WorkOrder | null;
  setSelectedOS: (os: WorkOrder | null) => void;
  osSearch: string;
  setOsSearch: (search: string) => void;
  osStatusFilter: OSStatus | 'Todos';
  setOsStatusFilter: (filter: OSStatus | 'Todos') => void;
  showBillingPanel: boolean;
  setShowBillingPanel: (visible: boolean) => void;
  billingForm: { paymentMethod: PaymentMethod; installmentsCount: string };
  setBillingForm: (form: any) => void;
  onStartNewOS: () => void;
  onStartEditOS: (os: WorkOrder) => void;
  handleShareOS: (os: WorkOrder) => void;
  setSigningOSId: (osId: string | null) => void;
}

export default function OSScreen({
  selectedOS,
  setSelectedOS,
  osSearch,
  setOsSearch,
  osStatusFilter,
  setOsStatusFilter,
  showBillingPanel,
  setShowBillingPanel,
  billingForm,
  setBillingForm,
  onStartNewOS,
  onStartEditOS,
  handleShareOS,
  setSigningOSId,
}: OSScreenProps) {
  const { workOrders, clients, vehicles, billings, updateWorkOrderStatus, addBilling } = useDatabase();

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

  const handleFaturarOS = async () => {
    if (!selectedOS) return;

    const amount = selectedOS.grandTotal;
    const installmentsCount = parseInt(billingForm.installmentsCount);
    
    // Generate installments array
    const installments = [];
    const baseVal = Math.floor((amount / installmentsCount) * 100) / 100;
    let diff = Math.round((amount - (baseVal * installmentsCount)) * 100) / 100;

    for (let i = 1; i <= installmentsCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (30 * (i - 1)));
      
      // Pad exact cents diff to last installment
      const instAmount = i === installmentsCount ? (baseVal + diff) : baseVal;

      installments.push({
        number: i,
        amount: instAmount,
        dueDate: d.toISOString().split('T')[0],
        status: 'Pendente' as const
      });
    }

    const success = await addBilling({
      osId: selectedOS.id,
      amount,
      paymentMethod: billingForm.paymentMethod,
      status: 'Pendente',
      installments,
      dueDate: installments[0].dueDate
    });

    if (success) {
      setShowBillingPanel(false);
      Alert.alert('Sucesso', 'Ordem de serviço faturada com sucesso!');
    } else {
      Alert.alert('Erro', 'Não foi possível faturar esta ordem.');
    }
  };

  const selectedOSBilling = selectedOS ? billingMap.get(selectedOS.id) : null;
  const selectedOSClient = selectedOS ? clientMap.get(selectedOS.clientId) : null;
  const selectedOSVehicle = selectedOS ? vehicleMap.get(selectedOS.vehicleId) : null;

  return (
    <View style={styles.screenContainer}>
      {!selectedOS ? (
        // 1. OS LIST VIEW
        <View style={{ flex: 1 }}>
          <View style={styles.screenHeader}>
            <Text style={styles.tabTitle}>Ordens de Serviço</Text>
            <TouchableOpacity style={styles.actionButton} onPress={onStartNewOS}>
              <Plus size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Nova OS</Text>
            </TouchableOpacity>
          </View>

          {/* OS Search Bar */}
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

          {/* OS Status Filter */}
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
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* OS List */}
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
                    onPress={() => setSelectedOS(os)}
                    style={[styles.card, osStatusStyle, { padding: 18, marginBottom: 12 }]}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.osNum}>{os.osNumber}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: badgeColor, borderColor: badgeBorderColor }]}>
                          <Text style={[styles.statusBadgeText, { color: badgeTextColor }]}>
                            {os.status}
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
      ) : (
        // 2. OS DETAILED VIEW
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={[styles.screenHeader, { marginBottom: 16 }]}>
            <TouchableOpacity
              onPress={() => setSelectedOS(null)}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => onStartEditOS(selectedOS)}
              style={styles.editOSButton}
            >
              <Edit2 size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.editOSButtonText}>Editar</Text>
            </TouchableOpacity>
          </View>

          {/* Status selector badges */}
          <Text style={styles.cardLabelText}>Status da Ordem</Text>
          <View style={styles.statusButtonsContainer}>
            {(['Aberta', 'Em andamento', 'Concluída', 'Entregue'] as OSStatus[]).map(st => {
              const isActive = selectedOS.status === st;
              let activeColor = theme.colors.primary;
              if (st === 'Em andamento') activeColor = theme.colors.warning;
              else if (st === 'Concluída') activeColor = theme.colors.success;
              else if (st === 'Entregue') activeColor = theme.colors.textMuted;

              return (
                <TouchableOpacity
                  key={st}
                  onPress={async () => {
                    const success = await updateWorkOrderStatus(selectedOS.id, st);
                    if (success) {
                      setSelectedOS({ ...selectedOS, status: st });
                    }
                  }}
                  style={[
                    styles.statusBadgeButton,
                    isActive ? { backgroundColor: activeColor, borderColor: activeColor } : null
                  ]}
                >
                  <Text style={[styles.statusBadgeButtonText, isActive ? { color: '#fff' } : null]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info Card */}
          <View style={[styles.card, { padding: 18, marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.detailedOSNum}>{selectedOS.osNumber}</Text>
              <Text style={styles.detailedOSDate}>Data: {formatDate(selectedOS.date)}</Text>
            </View>
            <View style={styles.detailedOSClientInfo}>
              <View>
                <Text style={styles.cardLabelText}>Cliente</Text>
                <Text style={styles.detailedClientName}>{selectedOSClient?.name}</Text>
              </View>
              <View>
                <Text style={styles.cardLabelText}>Veículo</Text>
                <Text style={styles.detailedClientVehicle}>
                  {selectedOSVehicle ? `${selectedOSVehicle.brand} ${selectedOSVehicle.model} (${selectedOSVehicle.plate})` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Services details */}
          {selectedOS.services.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.cardLabelText}>Serviços Executados</Text>
              <View style={styles.itemsWrapperCard}>
                {selectedOS.services.map((s, idx) => (
                  <View key={idx} style={[styles.detailItemRow, idx === selectedOS.services.length - 1 ? { borderBottomWidth: 0 } : null]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.detailItemName}>{s.name}</Text>
                      {s.code ? <Text style={styles.detailItemCode}>CÓD: {s.code}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailItemPrice}>{formatCurrency(s.price * s.quantity)}</Text>
                      {s.quantity > 1 ? (
                        <Text style={styles.detailItemQtyMeta}>{s.quantity}x {formatCurrency(s.price)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Parts details */}
          {selectedOS.parts.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.cardLabelText}>Peças Substituídas</Text>
              <View style={styles.itemsWrapperCard}>
                {selectedOS.parts.map((p, idx) => (
                  <View key={idx} style={[styles.detailItemRow, idx === selectedOS.parts.length - 1 ? { borderBottomWidth: 0 } : null]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.detailItemName}>{p.name}</Text>
                      {p.code ? <Text style={styles.detailItemCode}>SKU: {p.code}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailItemPrice}>{formatCurrency(p.salePrice * p.quantity)}</Text>
                      {p.quantity > 1 ? (
                        <Text style={styles.detailItemQtyMeta}>{p.quantity}x {formatCurrency(p.salePrice)}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Summary totals */}
          <View style={[styles.card, { padding: 16, gap: 6, marginBottom: 16 }]}>
            <View style={styles.summaryTotalsRow}>
              <Text style={styles.summaryTotalsLabel}>Mão de Obra:</Text>
              <Text style={styles.summaryTotalsVal}>{formatCurrency(selectedOS.servicesTotal)}</Text>
            </View>
            <View style={styles.summaryTotalsRow}>
              <Text style={styles.summaryTotalsLabel}>Peças:</Text>
              <Text style={styles.summaryTotalsVal}>{formatCurrency(selectedOS.partsTotal)}</Text>
            </View>
            <View style={styles.summaryTotalsDivider} />
            <View style={[styles.summaryTotalsRow, { marginTop: 4 }]}>
              <Text style={styles.summaryTotalsGrandLabel}>TOTAL GERAL:</Text>
              <Text style={styles.summaryTotalsGrandValue}>{formatCurrency(selectedOS.grandTotal)}</Text>
            </View>
          </View>

          {/* Observations */}
          {selectedOS.notes ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.cardLabelText}>Observações</Text>
              <View style={styles.detailedNotesBox}>
                <Text style={styles.detailedNotesText}>{selectedOS.notes}</Text>
              </View>
            </View>
          ) : null}

          {/* Client Signature display */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.cardLabelText}>Assinatura Digital do Cliente</Text>
            <View style={{ marginTop: 6 }}>
              {selectedOS.signature ? (
                <View style={styles.signatureDisplayCard}>
                  <SvgXml xml={selectedOS.signature} width="220" height="90" />
                  <Text style={styles.signatureDisplayLabel}>ASSINADO DIGITALMENTE</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setSigningOSId(selectedOS.id)}
                  style={styles.signatureCollectButton}
                >
                  <PenTool size={16} color="#64748b" />
                  <Text style={styles.signatureCollectText}>Coletar Assinatura do Cliente</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Actions Panel */}
          <View style={styles.actionsPanelRow}>
            <TouchableOpacity
              onPress={() => handleShareOS(selectedOS)}
              style={styles.shareOSButton}
            >
              <FileText size={16} color="#fff" />
              <Text style={styles.shareOSButtonText}>Imprimir / PDF</Text>
            </TouchableOpacity>

            {selectedOSBilling ? (
              <View style={styles.billedIndicatorBadge}>
                <Text style={styles.billedIndicatorText}>💰 FATURADA ({selectedOSBilling.status.toUpperCase()})</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowBillingPanel(true)}
                style={styles.billOSButton}
              >
                <DollarSign size={16} color="#fff" />
                <Text style={styles.billOSButtonText}>Faturar OS</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* MODAL: BILLING PANEL */}
      <Modal visible={showBillingPanel && !!selectedOS} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Faturamento da OS</Text>
              <TouchableOpacity onPress={() => setShowBillingPanel(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalBillingValueLabel}>VALOR TOTAL A FATURAR</Text>
                <Text style={styles.modalBillingValueText}>
                  {selectedOS ? formatCurrency(selectedOS.grandTotal) : ''}
                </Text>
              </View>

              <Text style={styles.inputLabel}>Forma de Pagamento</Text>
              <View style={styles.pickerFakeRow}>
                {(['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto'] as PaymentMethod[]).map(method => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setBillingForm({ ...billingForm, paymentMethod: method })}
                    style={[styles.pickerTag, billingForm.paymentMethod === method ? styles.pickerTagActive : null]}
                  >
                    <Text style={[styles.pickerTagText, billingForm.paymentMethod === method ? styles.pickerTagActiveText : null]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Número de Parcelas</Text>
              <View style={styles.installmentsPickerList}>
                {['1', '2', '3', '4', '6', '12'].map(count => {
                  const label = count === '1' ? 'À vista (1x)' : `${count} parcelas`;
                  return (
                    <TouchableOpacity
                      key={count}
                      onPress={() => setBillingForm({ ...billingForm, installmentsCount: count })}
                      style={[styles.installmentsPickerItem, billingForm.installmentsCount === count ? styles.installmentsPickerItemActive : null]}
                    >
                      <Text style={[styles.installmentsPickerText, billingForm.installmentsCount === count ? styles.installmentsPickerTextActive : null]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Preview of installments */}
              <Text style={styles.inputLabel}>Prévia das Parcelas</Text>
              <View style={styles.installmentsPreviewCard}>
                {(() => {
                  if (!selectedOS) return null;
                  const arr = [];
                  const count = parseInt(billingForm.installmentsCount);
                  const baseVal = Math.floor((selectedOS.grandTotal / count) * 100) / 100;
                  const lastDiff = Math.round((selectedOS.grandTotal - (baseVal * count)) * 100) / 100;
                  
                  for (let i = 1; i <= count; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + (30 * (i - 1)));
                    const instAmt = i === count ? (baseVal + lastDiff) : baseVal;
                    arr.push(
                      <View key={i} style={styles.installmentPreviewRow}>
                        <Text style={styles.installmentPreviewNum}>Parcela {i}:</Text>
                        <Text style={styles.installmentPreviewDetails}>
                          {formatCurrency(instAmt)} • Venc: {d.toLocaleDateString('pt-BR')}
                        </Text>
                      </View>
                    );
                  }
                  return arr;
                })()}
              </View>

              <TouchableOpacity style={styles.confirmBillingButton} onPress={handleFaturarOS}>
                <Text style={styles.confirmBillingText}>Confirmar e Faturar OS</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editOSButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  editOSButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    marginTop: 6,
  },
  statusBadgeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#181c24',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  statusBadgeButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  detailedOSNum: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  detailedOSDate: {
    fontSize: 13,
    color: theme.colors.textDim,
  },
  detailedOSClientInfo: {
    borderTopWidth: 1,
    borderTopColor: '#272e3f',
    paddingTop: 10,
    gap: 8,
  },
  detailedClientName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  detailedClientVehicle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemsWrapperCard: {
    backgroundColor: '#181c24',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginTop: 6,
  },
  detailItemRow: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailItemCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  detailItemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  detailItemQtyMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryTotalsLabel: {
    fontSize: 13,
    color: theme.colors.textDim,
  },
  summaryTotalsVal: {
    fontSize: 13,
    color: '#f1f5f9',
    fontWeight: 'bold',
  },
  summaryTotalsDivider: {
    borderTopWidth: 1,
    borderTopColor: '#272e3f',
    paddingTop: 8,
    marginTop: 6,
  },
  summaryTotalsGrandLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryTotalsGrandValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  detailedNotesBox: {
    backgroundColor: '#181c24',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginTop: 6,
  },
  detailedNotesText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  signatureDisplayCard: {
    backgroundColor: '#181c24',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureDisplayLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  signatureCollectButton: {
    backgroundColor: '#181c24',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 56,
  },
  signatureCollectText: {
    fontSize: 13,
    color: theme.colors.textDim,
    fontWeight: 'bold',
  },
  actionsPanelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  shareOSButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  shareOSButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  billedIndicatorBadge: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    minHeight: 48,
  },
  billedIndicatorText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.success,
    textTransform: 'uppercase',
  },
  billOSButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
  },
  billOSButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.lg,
    borderTopRightRadius: theme.roundness.lg,
    padding: theme.spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalBillingValueLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  modalBillingValueText: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.success,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerFakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.xl,
  },
  pickerTag: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerTagText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    fontSize: 13,
  },
  pickerTagActiveText: {
    color: theme.colors.white,
  },
  installmentsPickerList: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
  },
  installmentsPickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  installmentsPickerItemActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
  },
  installmentsPickerText: {
    color: theme.colors.textDim,
    fontSize: 14,
  },
  installmentsPickerTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  installmentsPreviewCard: {
    backgroundColor: '#0a0c10',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 15,
    gap: 4,
  },
  installmentPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  installmentPreviewNum: {
    fontSize: 9,
    color: theme.colors.textDim,
    fontFamily: 'monospace',
  },
  installmentPreviewDetails: {
    fontSize: 9,
    color: '#f1f5f9',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  confirmBillingButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  confirmBillingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
});
