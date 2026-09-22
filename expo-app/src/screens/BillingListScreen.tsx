import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert
} from 'react-native';
import {
  Search,
  X,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  ChevronRight,
  MessageCircle,
  Car
} from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Billing } from '../types';
import CreateBillingModal from '../components/CreateBillingModal';

export default function BillingListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const { billings, workOrders, clients, vehicles } = useDatabase();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todas' | 'Pendentes' | 'Pagas' | 'Parciais' | 'Atrasadas'>('Todas');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [preselectedOsId, setPreselectedOsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (route.params?.preselectedOsId) {
      setPreselectedOsId(route.params.preselectedOsId);
      setCreateModalVisible(true);
    }
  }, [route.params?.preselectedOsId]);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const osMap = useMemo(() => new Map(workOrders.map(o => [o.id, o])), [workOrders]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // Metrics calculation
  const metrics = useMemo(() => {
    let aReceberHoje = 0;
    let aReceberMes = 0;
    let recebidoMes = 0;
    let atrasadoTotal = 0;

    billings.forEach(b => {
      if (b.status === 'Cancelado') return;

      b.installments.forEach(inst => {
        if (inst.status === 'Pago') {
          if (inst.paidAt && inst.paidAt.startsWith(currentMonthStr)) {
            recebidoMes += inst.amount;
          }
        } else {
          // Pendente
          if (inst.dueDate === todayStr) {
            aReceberHoje += inst.amount;
          }
          if (inst.dueDate.startsWith(currentMonthStr)) {
            aReceberMes += inst.amount;
          }
          if (inst.dueDate < todayStr) {
            atrasadoTotal += inst.amount;
          }
        }
      });
    });

    return {
      aReceberHoje,
      aReceberMes,
      recebidoMes,
      atrasadoTotal
    };
  }, [billings, todayStr, currentMonthStr]);

  // Filter billings
  const filteredBillings = useMemo(() => {
    return billings.filter(b => {
      const os = b.osId ? osMap.get(b.osId) : null;
      const client = os ? clientMap.get(os.clientId) : null;
      const vehicle = os ? vehicleMap.get(os.vehicleId) : null;

      // Status filter
      const hasOverdue = b.installments.some(i => i.status === 'Pendente' && i.dueDate < todayStr);

      if (statusFilter === 'Pendentes' && b.status !== 'Pendente') return false;
      if (statusFilter === 'Pagas' && b.status !== 'Pago') return false;
      if (statusFilter === 'Parciais' && b.status !== 'Parcialmente pago') return false;
      if (statusFilter === 'Atrasadas' && (!hasOverdue || b.status === 'Pago' || b.status === 'Cancelado')) return false;

      // Search filter
      if (!search.trim()) return true;
      const term = search.toLowerCase();

      const osNum = os?.osNumber ? os.osNumber.toLowerCase() : '';
      const clientName = (client?.name || b.customClientName || '').toLowerCase();
      const customDesc = (b.customDescription || '').toLowerCase();
      const vehiclePlate = vehicle?.plate ? vehicle.plate.toLowerCase() : '';
      const vehicleModel = vehicle?.model ? vehicle.model.toLowerCase() : '';
      const paymentMethod = b.paymentMethod.toLowerCase();

      return (
        osNum.includes(term) ||
        clientName.includes(term) ||
        customDesc.includes(term) ||
        vehiclePlate.includes(term) ||
        vehicleModel.includes(term) ||
        paymentMethod.includes(term)
      );
    });
  }, [billings, osMap, clientMap, vehicleMap, statusFilter, search, todayStr]);

  const handleOpenWhatsApp = (billing: Billing) => {
    const os = billing.osId ? osMap.get(billing.osId) : null;
    const client = os ? clientMap.get(os.clientId) : null;
    const phone = client?.phone?.replace(/\D/g, '') || '';

    const pendingInstallments = billing.installments.filter(i => i.status === 'Pendente');
    const paidInstallments = billing.installments.filter(i => i.status === 'Pago');

    let msg = `*Olá ${client?.name || 'Cliente'}!*\n\nSegue o demonstrativo de cobrança da sua oficina:\n*Valor Total:* ${formatCurrency(billing.amount)}\n*Condição:* ${billing.paymentMethod} (${billing.installments.length}x)\n*Status:* ${billing.status}`;

    if (os) {
      msg += `\n*OS Vinculada:* ${os.osNumber}`;
    }

    if (pendingInstallments.length > 0) {
      msg += `\n\n*Parcelas a Vencer:*\n` +
        pendingInstallments.map(i => `• Parcela ${i.number}: ${formatCurrency(i.amount)} - Venc: ${formatDate(i.dueDate)}`).join('\n');
    }

    if (paidInstallments.length > 0) {
      msg += `\n\n*Parcelas Pagas:*\n` +
        paidInstallments.map(i => `• Parcela ${i.number}: ${formatCurrency(i.amount)} (Quitada)`).join('\n');
    }

    msg += `\n\nAgradecemos a preferência!`;

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

  const renderBillingCard = (item: Billing) => {
    const os = item.osId ? osMap.get(item.osId) : null;
    const client = os ? clientMap.get(os.clientId) : null;
    const vehicle = os ? vehicleMap.get(os.vehicleId) : null;

    const paidCount = item.installments.filter(i => i.status === 'Pago').length;
    const totalInstallments = item.installments.length;
    const isOverdue = item.installments.some(i => i.status === 'Pendente' && i.dueDate < todayStr);

    let statusBadgeColor = colors.primary;
    let statusBadgeBg = 'rgba(59, 102, 255, 0.12)';
    let statusLabel: string = item.status;

    if (item.status === 'Pago') {
      statusBadgeColor = colors.success;
      statusBadgeBg = 'rgba(34, 197, 94, 0.12)';
    } else if (item.status === 'Parcialmente pago') {
      statusBadgeColor = colors.warning;
      statusBadgeBg = 'rgba(234, 179, 8, 0.12)';
    } else if (isOverdue) {
      statusBadgeColor = colors.error;
      statusBadgeBg = 'rgba(239, 68, 68, 0.12)';
      statusLabel = 'Atrasado';
    }

    const nextPending = item.installments.find(i => i.status === 'Pendente');

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.billingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BillingDetail', { billingId: item.id })}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.osBadgeWrapper}>
            <View style={styles.osIconBg}>
              <FileText size={12} color={colors.primary} />
            </View>
            <Text style={[styles.osBadgeText, { color: colors.primary }]}>
              {os ? os.osNumber : 'VENDA AVULSA'}
            </Text>
            {item.createdAt && (
              <Text style={[styles.cardDateText, { color: colors.textMuted }]}>• {formatDate(item.createdAt)}</Text>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg, borderColor: statusBadgeColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadgeColor }]}>
              {statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Client & Vehicle */}
        <View style={styles.clientSection}>
          <Text style={[styles.clientNameText, { color: colors.text }]} numberOfLines={1}>
            {client?.name || item.customClientName || 'Cliente Balcão'}
          </Text>
          {vehicle ? (
            <View style={styles.vehicleRow}>
              <Car size={13} color={colors.textMuted} />
              <Text style={[styles.vehicleText, { color: colors.textDim }]} numberOfLines={1}>
                {vehicle.brand} {vehicle.model} • {vehicle.plate}
              </Text>
            </View>
          ) : item.customDescription ? (
            <Text style={[styles.vehicleText, { color: colors.textDim }]} numberOfLines={1}>
              {item.customDescription}
            </Text>
          ) : null}
        </View>

        {/* Payment & Installments Info */}
        <View style={[styles.billingDetailsRow, { backgroundColor: isDark ? '#0f1218' : '#f1f5f9' }]}>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>FORMA DE PAGAMENTO</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {item.paymentMethod} {totalInstallments > 1 ? `(${totalInstallments}x)` : 'à vista'}
            </Text>
          </View>

          <View style={[styles.detailBlock, { alignItems: 'flex-end' }]}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>VALOR TOTAL</Text>
            <Text style={[styles.amountValue, { color: colors.success }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        </View>

        {/* Installments Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
              Progresso: {paidCount} de {totalInstallments} parcelas quitadas
            </Text>
            {nextPending && (
              <Text style={[styles.nextDueLabel, { color: colors.textDim }, isOverdue ? { color: colors.error } : null]}>
                Próx: {formatDate(nextPending.dueDate)}
              </Text>
            )}
          </View>
          <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${(paidCount / totalInstallments) * 100}%`,
                  backgroundColor: paidCount === totalInstallments ? colors.success : colors.primary
                }
              ]}
            />
          </View>
        </View>

        {/* Action Buttons Footer */}
        <View style={[styles.cardActionsRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.whatsAppButton}
            onPress={() => handleOpenWhatsApp(item)}
          >
            <MessageCircle size={14} color="#22c55e" />
            <Text style={styles.whatsAppButtonText}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.detailsButton, { backgroundColor: isDark ? '#272e3f' : '#e2e8f0' }]}
            onPress={() => navigation.navigate('BillingDetail', { billingId: item.id })}
          >
            <Text style={[styles.detailsButtonText, { color: colors.text }]}>Ver Parcelas</Text>
            <ChevronRight size={14} color={colors.text} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Cobranças</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>Gestão de faturamento e parcelas</Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setPreselectedOsId(undefined);
            setCreateModalVisible(true);
          }}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.createButtonText}>Nova Cobrança</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* KPI Cards Row */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>A RECEBER HOJE</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>
              {formatCurrency(metrics.aReceberHoje)}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <Calendar size={14} color={colors.warning} />
              <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>A RECEBER NO MÊS</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.warning }]}>
              {formatCurrency(metrics.aReceberMes)}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <CheckCircle2 size={14} color={colors.success} />
              <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>RECEBIDO NO MÊS</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.success }]}>
              {formatCurrency(metrics.recebidoMes)}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiHeaderRow}>
              <AlertTriangle size={14} color={colors.error} />
              <Text style={[styles.kpiTitle, { color: colors.textMuted }]}>TOTAL EM ATRASO</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.error }]}>
              {formatCurrency(metrics.atrasadoTotal)}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Buscar por OS, cliente, placa ou forma..."
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsScroll} contentContainerStyle={styles.filterPillsContainer}>
          {(['Todas', 'Pendentes', 'Parciais', 'Pagas', 'Atrasadas'] as const).map(pill => {
            const isActive = statusFilter === pill;
            return (
              <TouchableOpacity
                key={pill}
                onPress={() => setStatusFilter(pill)}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
              >
                <Text style={[
                  styles.filterPillText,
                  { color: colors.textMuted },
                  isActive && { color: '#fff', fontWeight: 'bold' }
                ]}>
                  {pill}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Billings List */}
        <View style={styles.listSection}>
          {filteredBillings.length > 0 ? (
            filteredBillings.map(item => renderBillingCard(item))
          ) : (
            <View style={styles.emptyStateContainer}>
              <DollarSign size={40} color={colors.textMuted} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>Nenhuma cobrança encontrada</Text>
              <Text style={[styles.emptyStateSubtitle, { color: colors.textMuted }]}>
                {search ? 'Tente buscar com outros termos.' : 'Crie sua primeira cobrança clicando no botão abaixo.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setPreselectedOsId(undefined);
                  setCreateModalVisible(true);
                }}
              >
                <Plus size={16} color="#fff" />
                <Text style={styles.emptyStateButtonText}>Criar Cobrança Agora</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Creation Modal */}
      <CreateBillingModal
        visible={createModalVisible}
        preselectedOsId={preselectedOsId}
        onClose={() => {
          setCreateModalVisible(false);
          setPreselectedOsId(undefined);
        }}
        onSuccess={(billingId?: string) => {
          setCreateModalVisible(false);
          setPreselectedOsId(undefined);
          if (billingId) {
            navigation.navigate('BillingDetail', { billingId });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#161922',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  kpiTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#272e3f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    padding: 0,
  },
  filterPillsScroll: {
    marginBottom: 14,
  },
  filterPillsContainer: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#161922',
    borderWidth: 1,
    borderColor: '#272e3f',
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listSection: {
    paddingBottom: 24,
  },
  billingCard: {
    backgroundColor: '#161922',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#272e3f',
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  osBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  osIconBg: {
    backgroundColor: 'rgba(59, 102, 255, 0.15)',
    padding: 5,
    borderRadius: 6,
  },
  osBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDateText: {
    color: '#64748b',
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientSection: {
    gap: 3,
  },
  clientNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  vehicleText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  billingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f1218',
    padding: 10,
    borderRadius: 8,
  },
  detailBlock: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.success,
  },
  progressContainer: {
    gap: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  nextDueLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 5,
    backgroundColor: '#272e3f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#272e3f',
    paddingTop: 10,
    marginTop: 2,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  whatsAppButtonText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#272e3f',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
