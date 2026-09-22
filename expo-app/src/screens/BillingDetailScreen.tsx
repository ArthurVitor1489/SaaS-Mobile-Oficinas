import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Car,
  FileText,
  Calendar,
  DollarSign,
  User,
  Clock,
  Phone,
  Edit3,
  CalendarDays,
  X
} from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Billing } from '../types';

export default function BillingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const billingId = route.params?.billingId;

  const { billings, workOrders, clients, vehicles, settings, payInstallment, updateInstallmentDueDate } = useDatabase();
  const [localBillingState, setLocalBillingState] = useState<Billing | null>(null);

  // Modal for changing installment due date
  const [editingModalVisible, setEditingModalVisible] = useState(false);
  const [editingInstallmentNum, setEditingInstallmentNum] = useState<number>(1);
  const [editDueDateStr, setEditDueDateStr] = useState<string>('');
  const [updatingDate, setUpdatingDate] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const osMap = useMemo(() => new Map(workOrders.map(o => [o.id, o])), [workOrders]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);

  const billing = useMemo(() => {
    if (localBillingState) return localBillingState;
    if (!billingId) return null;
    return billings.find(b => b.id === billingId) || null;
  }, [billings, billingId, localBillingState]);

  if (!billing) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.textMuted }}>Cobrança não encontrada.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { marginTop: 12 }]}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const os = billing.osId ? osMap.get(billing.osId) : null;
  const client = os ? clientMap.get(os.clientId) : null;
  const vehicle = os ? vehicleMap.get(os.vehicleId) : null;

  const handlePayInstallmentClick = (instNum: number) => {
    Alert.alert(
      'Confirmar Recebimento',
      `Deseja registrar o pagamento da parcela ${instNum}? Uma entrada será adicionada ao fluxo de caixa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Baixa',
          onPress: async () => {
            const success = await payInstallment(billing.id, instNum);
            if (success) {
              const freshBilling = billings.find(b => b.id === billing.id);
              if (freshBilling) {
                const updatedInstallments = freshBilling.installments.map(i =>
                  i.number === instNum ? { ...i, status: 'Pago' as const, paidAt: new Date().toISOString() } : i
                );
                const paidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
                const newStatus = paidCount === updatedInstallments.length ? 'Pago' as const : 'Parcialmente pago' as const;
                setLocalBillingState({
                  ...freshBilling,
                  status: newStatus,
                  installments: updatedInstallments
                });
              }
              Alert.alert('Sucesso', 'Baixa registrada e entrada no caixa confirmada!');
            }
          }
        }
      ]
    );
  };

  const addDaysToCurrentDate = (days: number) => {
    try {
      const parts = (editDueDateStr || new Date().toISOString().split('T')[0]).split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setDate(d.getDate() + days);
        setEditDueDateStr(d.toISOString().split('T')[0]);
        return;
      }
    } catch (e) {}
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEditDueDateStr(d.toISOString().split('T')[0]);
  };

  const handleOpenEditDueDate = (installmentNumber: number, currentDueDate: string) => {
    setEditingInstallmentNum(installmentNumber);
    setEditDueDateStr(currentDueDate);
    setEditingModalVisible(true);
  };

  const handleConfirmUpdateDueDate = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDueDateStr)) {
      Alert.alert('Data Inválida', 'Informe a data no formato AAAA-MM-DD (ex: 2026-11-20).');
      return;
    }

    setUpdatingDate(true);
    const success = await updateInstallmentDueDate(billing.id, editingInstallmentNum, editDueDateStr);
    setUpdatingDate(false);

    if (success) {
      const updatedInstallments = billing.installments.map(i =>
        i.number === editingInstallmentNum ? { ...i, dueDate: editDueDateStr } : i
      );
      const newMainDueDate = editingInstallmentNum === 1 ? editDueDateStr : billing.dueDate;
      setLocalBillingState({
        ...billing,
        dueDate: newMainDueDate,
        installments: updatedInstallments,
      });
      setEditingModalVisible(false);
      Alert.alert('Sucesso', `Data de vencimento da parcela ${editingInstallmentNum} atualizada para ${formatDate(editDueDateStr)}!`);
    } else {
      Alert.alert('Erro', 'Não foi possível atualizar o vencimento.');
    }
  };

  const handleShareReceiptWhatsApp = (targetInstallmentNumber?: number) => {
    const phone = client?.phone?.replace(/\D/g, '') || '';
    const workshopName = settings?.name || 'MecânicaPro';
    const isBoleto = billing.paymentMethod === 'Boleto';

    let msg = `*${workshopName.toUpperCase()} - RECIBO DE PAGAMENTO*\n`;
    msg += `------------------------------------\n`;
    if (os) {
      msg += `*Ordem de Serviço:* ${os.osNumber}\n`;
    }
    msg += `*Cliente:* ${client?.name || billing.customClientName || 'Consumidor'}\n`;
    if (vehicle) {
      msg += `*Veículo:* ${vehicle.brand} ${vehicle.model} (${vehicle.plate})\n`;
    }
    if (billing.customDescription) {
      msg += `*Descrição:* ${billing.customDescription}\n`;
    }
    msg += `*Forma de Pagamento:* ${billing.paymentMethod}\n`;
    msg += `*Valor Total:* ${formatCurrency(billing.amount)}\n`;
    msg += `------------------------------------\n`;

    if (targetInstallmentNumber) {
      const inst = billing.installments.find(i => i.number === targetInstallmentNumber);
      if (inst) {
        const itemLabel = isBoleto ? 'BOLETO' : 'PARCELA';
        msg += `*COMPROVANTE DO ${itemLabel} ${inst.number}/${billing.installments.length}*\n`;
        msg += `*Valor:* ${formatCurrency(inst.amount)}\n`;
        msg += `*Situação:* ${inst.status === 'Pago' ? 'QUITADO' : 'A VENCER'}\n`;
        msg += `*Vencimento:* ${formatDate(inst.dueDate)}\n`;
        if (inst.paidAt) {
          msg += `*Pago em:* ${formatDate(inst.paidAt)}\n`;
        }
      }
    } else {
      msg += `*CRONOGRAMA DE PAGAMENTOS:*\n`;
      billing.installments.forEach(inst => {
        const isPaid = inst.status === 'Pago';
        const itemLabel = isBoleto ? 'Boleto' : 'Parcela';
        msg += `• ${itemLabel} ${inst.number}/${billing.installments.length}: ${formatCurrency(inst.amount)} - ${isPaid ? `[PAGO em ${formatDate(inst.paidAt!)}]` : `[Venc: ${formatDate(inst.dueDate)}]`}\n`;
      });
    }

    msg += `------------------------------------\n`;
    msg += `Obrigado pela preferência e confiança!`;

    const url = `whatsapp://send?text=${encodeURIComponent(msg)}${phone ? `&phone=55${phone}` : ''}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const webUrl = `https://wa.me/${phone ? `55${phone}` : ''}?text=${encodeURIComponent(msg)}`;
        Linking.openURL(webUrl);
      }
    }).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp no seu dispositivo.');
    });
  };

  const paidCount = billing.installments.filter(i => i.status === 'Pago').length;
  const totalCount = billing.installments.length;
  const totalPaidAmount = billing.installments.filter(i => i.status === 'Pago').reduce((acc, i) => acc + i.amount, 0);
  const totalPendingAmount = billing.amount - totalPaidAmount;

  let statusBadgeColor = theme.colors.primary;
  let statusBadgeBg = 'rgba(59, 102, 255, 0.12)';
  if (billing.status === 'Pago') {
    statusBadgeColor = theme.colors.success;
    statusBadgeBg = 'rgba(34, 197, 94, 0.12)';
  } else if (billing.status === 'Parcialmente pago') {
    statusBadgeColor = theme.colors.warning;
    statusBadgeBg = 'rgba(234, 179, 8, 0.12)';
  }

  return (
    <View style={styles.screenContainer}>
      {/* Back button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <ArrowLeft size={20} color={theme.colors.primary} />
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardLabelText}>DETALHES DA COBRANÇA</Text>
              <Text style={styles.detailedOSNum}>
                {os ? os.osNumber : 'VENDA AVULSA'}
              </Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg, borderColor: statusBadgeColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusBadgeColor }]}>
                {billing.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          {/* Client & Vehicle */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoLabelRow}>
                <User size={12} color="#94a3b8" />
                <Text style={styles.infoLabel}>CLIENTE</Text>
              </View>
              <Text style={styles.infoValue}>{client?.name || billing.customClientName || 'Cliente Balcão'}</Text>
              {client?.phone ? (
                <Text style={styles.infoSubValue}>{client.phone}</Text>
              ) : billing.customDescription ? (
                <Text style={styles.infoSubValue}>{billing.customDescription}</Text>
              ) : null}
            </View>

            {vehicle && (
              <View style={styles.infoItem}>
                <View style={styles.infoLabelRow}>
                  <Car size={12} color="#94a3b8" />
                  <Text style={styles.infoLabel}>VEÍCULO</Text>
                </View>
                <Text style={styles.infoValue}>{vehicle.brand} {vehicle.model}</Text>
                <Text style={styles.infoSubValue}>Placa: {vehicle.plate}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoDivider} />

          {/* Payment Method & Totals */}
          <View style={styles.totalsRow}>
            <View>
              <Text style={styles.infoLabel}>FORMA DE PAGAMENTO</Text>
              <Text style={styles.infoValue}>{billing.paymentMethod}</Text>
              <Text style={styles.infoSubValue}>{totalCount}x parcela{totalCount > 1 ? 's' : ''}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.infoLabel}>VALOR TOTAL</Text>
              <Text style={styles.totalAmount}>{formatCurrency(billing.amount)}</Text>
            </View>
          </View>

          {/* Quick Balance Breakdown */}
          <View style={styles.balanceBox}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Já Recebido:</Text>
              <Text style={[styles.balanceValue, { color: theme.colors.success }]}>
                {formatCurrency(totalPaidAmount)} ({paidCount}/{totalCount})
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Saldo Restante:</Text>
              <Text style={[styles.balanceValue, { color: totalPendingAmount > 0 ? theme.colors.warning : theme.colors.textMuted }]}>
                {formatCurrency(totalPendingAmount)}
              </Text>
            </View>
          </View>

          {/* WhatsApp Share Full Receipt Button */}
          <TouchableOpacity
            style={styles.whatsAppFullButton}
            onPress={() => handleShareReceiptWhatsApp()}
          >
            <MessageCircle size={18} color="#fff" />
            <Text style={styles.whatsAppFullButtonText}>Enviar Demonstrativo no WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Section title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            CRONOGRAMA DE PARCELAS ({paidCount}/{totalCount} PAGAS)
          </Text>
        </View>

        {/* Installment cards */}
        {billing.installments.map((inst, index) => {
          const isPaid = inst.status === 'Pago';
          const isOverdue = !isPaid && inst.dueDate < new Date().toISOString().split('T')[0];
          const isBoleto = billing.paymentMethod === 'Boleto';

          return (
            <View
              key={index}
              style={[
                styles.installmentCard,
                isPaid ? styles.cardPaid : isOverdue ? styles.cardOverdue : styles.cardPending
              ]}
            >
              <View style={{ flex: 1, paddingRight: 8, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={styles.installmentTitle}>
                    {isBoleto ? `Boleto ${inst.number} de ${totalCount}` : `Parcela ${inst.number} de ${totalCount}`}
                  </Text>
                  <View style={[
                    styles.instBadge,
                    {
                      backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.15)' : isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)'
                    }
                  ]}>
                    <Text style={{
                      fontSize: 9,
                      fontWeight: 'bold',
                      color: isPaid ? theme.colors.success : isOverdue ? theme.colors.error : theme.colors.warning
                    }}>
                      {isPaid ? 'PAGO' : isOverdue ? 'ATRASADO' : 'PENDENTE'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color="#94a3b8" />
                    <Text style={styles.installmentDate}>
                      Vencimento: {formatDate(inst.dueDate)}
                    </Text>
                  </View>

                  {!isPaid && (
                    <TouchableOpacity
                      onPress={() => handleOpenEditDueDate(inst.number, inst.dueDate)}
                      style={styles.editDateBtn}
                    >
                      <Edit3 size={11} color="#3b66ff" />
                      <Text style={styles.editDateBtnText}>Alterar Data</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isPaid && inst.paidAt && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Check size={12} color={theme.colors.success} />
                    <Text style={[styles.installmentDate, { color: theme.colors.success }]}>
                      Pago em: {formatDate(inst.paidAt)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <Text style={styles.installmentAmount}>{formatCurrency(inst.amount)}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleShareReceiptWhatsApp(inst.number)}
                    style={styles.instShareBtn}
                  >
                    <MessageCircle size={14} color="#22c55e" />
                  </TouchableOpacity>

                  {!isPaid ? (
                    <TouchableOpacity
                      onPress={() => handlePayInstallmentClick(inst.number)}
                      style={styles.payInstallmentButton}
                    >
                      <Text style={styles.payInstallmentText}>BAIXAR</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.paidCheckIconBg}>
                      <Check size={16} color={theme.colors.success} />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL DE ALTERAÇÃO / PRORROGAÇÃO DE VENCIMENTO */}
      <Modal
        visible={editingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.editModalOverlay}
        >
          <View style={styles.editModalSheet}>
            <View style={styles.editModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CalendarDays size={18} color="#3b66ff" />
                <Text style={styles.editModalTitle}>
                  Alterar Vencimento ({billing.paymentMethod === 'Boleto' ? 'Boleto' : 'Parcela'} {editingInstallmentNum})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingModalVisible(false)} style={styles.editModalCloseBtn}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.editModalBody}>
              <Text style={styles.editModalLabel}>Novo Vencimento (AAAA-MM-DD):</Text>
              <TextInput
                value={editDueDateStr}
                onChangeText={setEditDueDateStr}
                placeholder="2026-11-20"
                placeholderTextColor="#64748b"
                style={styles.editModalInput}
              />

              {/* Atalhos Rápidos */}
              <Text style={styles.editModalSubLabel}>Atalhos rápidos de prorrogação:</Text>
              <View style={styles.editQuickChipsRow}>
                <TouchableOpacity
                  style={styles.editQuickChip}
                  onPress={() => addDaysToCurrentDate(7)}
                >
                  <Text style={styles.editQuickChipText}>+7 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editQuickChip}
                  onPress={() => addDaysToCurrentDate(15)}
                >
                  <Text style={styles.editQuickChipText}>+15 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editQuickChip}
                  onPress={() => addDaysToCurrentDate(30)}
                >
                  <Text style={styles.editQuickChipText}>+30 dias</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editQuickChip}
                  onPress={() => setEditDueDateStr(new Date().toISOString().split('T')[0])}
                >
                  <Text style={styles.editQuickChipText}>Hoje</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editModalFooter}>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => setEditingModalVisible(false)}
                >
                  <Text style={styles.cancelEditBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveEditBtn, updatingDate && { opacity: 0.6 }]}
                  onPress={handleConfirmUpdateDueDate}
                  disabled={updatingDate}
                >
                  <Text style={styles.saveEditBtnText}>
                    {updatingDate ? 'SALVANDO...' : 'CONFIRMAR DATA'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#090b0f',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  mainCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#272e3f',
    marginBottom: 20,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabelText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailedOSNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#272e3f',
  },
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    gap: 2,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  infoSubValue: {
    fontSize: 12,
    color: '#94a3b8',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmount: {
    fontSize: 20,
    color: theme.colors.success,
    fontWeight: '900',
  },
  balanceBox: {
    backgroundColor: '#0f1218',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  whatsAppFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  whatsAppFullButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  installmentCard: {
    backgroundColor: '#161922',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardPaid: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  cardPending: {
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  cardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  installmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  instBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  installmentDate: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  installmentAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  instShareBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    padding: 8,
    borderRadius: 8,
  },
  payInstallmentButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payInstallmentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  paidCheckIconBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    padding: 6,
    borderRadius: 8,
  },
  editDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59, 102, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 102, 255, 0.3)',
    marginLeft: 4,
  },
  editDateBtnText: {
    fontSize: 10,
    color: '#3b66ff',
    fontWeight: 'bold',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#11151f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#242e42',
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#161c28',
  },
  editModalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  editModalCloseBtn: {
    padding: 4,
  },
  editModalBody: {
    padding: 16,
  },
  editModalLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '600',
  },
  editModalSubLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 10,
    marginBottom: 6,
  },
  editModalInput: {
    backgroundColor: '#0c0f17',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#29374f',
    color: '#fff',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    fontWeight: 'bold',
  },
  editQuickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editQuickChip: {
    backgroundColor: '#1a2233',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a3750',
  },
  editQuickChipText: {
    fontSize: 11,
    color: '#93c5fd',
    fontWeight: 'bold',
  },
  editModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#181e2b',
  },
  cancelEditBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  saveEditBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3b66ff',
  },
  saveEditBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});
