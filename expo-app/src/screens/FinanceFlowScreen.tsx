import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Plus, Search, X, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import ExpenseModal from '../components/ExpenseModal';
import { Billing, BillingStatus } from '../types';

export default function FinanceFlowScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { transactions, billings, workOrders, clients, deleteTransaction, addTransaction } = useDatabase();
  const [activeFinanceTab, setActiveFinanceTab] = useState<'flow' | 'billings'>('flow');
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');
  const [activeFinanceFilter, setActiveFinanceFilter] = useState<'Todos' | 'Entradas' | 'Saídas'>('Todos');
  const [billingSearch, setBillingSearch] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState<BillingStatus | 'Todos'>('Todos');
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const osMap = useMemo(() => new Map(workOrders.map(o => [o.id, o])), [workOrders]);

  const financeMetrics = useMemo(() => {
    const totalRecebido = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const totalDespesas = transactions.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoAtual = totalRecebido - totalDespesas;

    const totalAReceber = billings.reduce((acc, b) => {
      if (b.status === 'Cancelado') return acc;
      return acc + b.installments.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.amount, 0);
    }, 0);

    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const faturamentoMes = workOrders
      .filter(o => o.date.startsWith(currentMonthStr))
      .reduce((acc, o) => acc + o.grandTotal, 0);

    const todayStr = new Date().toISOString().split('T')[0];

    const transactionsHoje = transactions.filter(t => t.date === todayStr);
    const entradasHoje = transactionsHoje.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const saidasHoje = transactionsHoje.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoHoje = entradasHoje - saidasHoje;

    const today = new Date();
    const startOfWeek = new Date(today);
    const dayIndex = today.getDay();
    startOfWeek.setDate(today.getDate() - dayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const isThisWeek = (dateStr: string) => {
      const tDate = new Date(dateStr + 'T00:00:00');
      return tDate >= startOfWeek && tDate <= endOfWeek;
    };

    const transactionsSemana = transactions.filter(t => isThisWeek(t.date));
    const entradasSemana = transactionsSemana.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const saidasSemana = transactionsSemana.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoSemana = entradasSemana - saidasSemana;

    const transactionsMes = transactions.filter(t => t.date.startsWith(currentMonthStr));
    const entradasMes = transactionsMes.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const saidasMes = transactionsMes.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoMes = entradasMes - saidasMes;

    return {
      saldoAtual,
      faturamentoMes,
      totalAReceber,
      totalRecebido,
      totalDespesas,
      entradasHoje,
      saidasHoje,
      saldoHoje,
      entradasSemana,
      saidasSemana,
      saldoSemana,
      entradasMes,
      saidasMes,
      saldoMes
    };
  }, [transactions, billings, workOrders]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (activeFinanceFilter === 'Todos') return true;
      return activeFinanceFilter === 'Entradas' ? t.type === 'Entrada' : t.type === 'Saída';
    });
  }, [transactions, activeFinanceFilter]);

  const filteredBillings = useMemo(() => {
    return billings.filter(b => {
      const os = osMap.get(b.osId);
      const client = os ? clientMap.get(os.clientId) : null;
      const matchesSearch =
        (os?.osNumber || '').toLowerCase().includes(billingSearch.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(billingSearch.toLowerCase());
      const matchesStatus = billingStatusFilter === 'Todos' || b.status === billingStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [billings, billingSearch, billingStatusFilter, clientMap, osMap]);

  const handleRemoveTransaction = (id: string) => {
    Alert.alert(
      'Excluir Lançamento',
      'Deseja excluir esta transação? O saldo será recalculado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
          }
        }
      ]
    );
  };

  const handleExpenseSubmit = async (form: any) => {
    const res = await addTransaction({
      type: 'Saída',
      category: form.category,
      amount: parseFloat(form.amount) || 0,
      date: form.date,
      description: form.description
    });
    return !!res;
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <View style={styles.screenHeader}>
        <Text style={[styles.tabTitle, { color: colors.text }]}>Financeiro</Text>
        {activeFinanceTab === 'flow' && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.error }]} onPress={() => setExpenseModalVisible(true)}>
            <Plus size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Despesa</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.segmentContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setActiveFinanceTab('flow')}
          style={[styles.segmentTab, activeFinanceTab === 'flow' ? [styles.segmentTabActive, { backgroundColor: colors.card }] : null]}
        >
          <Text style={[styles.segmentTabText, { color: activeFinanceTab === 'flow' ? colors.primary : colors.textMuted }]}>
            Fluxo de Caixa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveFinanceTab('billings')}
          style={[styles.segmentTab, activeFinanceTab === 'billings' ? [styles.segmentTabActive, { backgroundColor: colors.card }] : null]}
        >
          <Text style={[styles.segmentTabText, { color: activeFinanceTab === 'billings' ? colors.primary : colors.textMuted }]}>
            Cobranças
          </Text>
        </TouchableOpacity>
      </View>

      {activeFinanceTab === 'flow' ? (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={[styles.card, styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.balanceHeader}>
              <View>
                <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>SALDO EM CAIXA (ATUAL)</Text>
                <Text style={[styles.balanceValue, financeMetrics.saldoAtual >= 0 ? styles.textGreen : styles.textRed]}>
                  {formatCurrency(financeMetrics.saldoAtual)}
                </Text>
              </View>
              <View style={styles.balanceQuickMeta}>
                <Text style={[styles.balanceMetaText, { color: colors.textDim }]}>
                  Faturamento: <Text style={{ color: colors.text }}>{formatCurrency(financeMetrics.faturamentoMes)}</Text>
                </Text>
                <Text style={[styles.balanceMetaText, { color: colors.textDim }]}>
                  A Receber: <Text style={{ color: colors.primary }}>{formatCurrency(financeMetrics.totalAReceber)}</Text>
                </Text>
              </View>
            </View>
            <View style={[styles.balanceTotalsDividerRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.balanceSubText, { color: colors.textDim }]}>Total Entradas: <Text style={styles.textGreen}>{formatCurrency(financeMetrics.totalRecebido)}</Text></Text>
              <Text style={[styles.balanceSubText, { color: colors.textDim }]}>Total Saídas: <Text style={styles.textRed}>{formatCurrency(financeMetrics.totalDespesas)}</Text></Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 16, marginBottom: 14 }]}>
            <View style={styles.periodHeaderRow}>
              <View>
                <Text style={[styles.periodCardTitle, { color: colors.text }]}>RESUMO POR PERÍODO</Text>
                <Text style={[styles.periodCardSubtitle, { color: colors.textMuted }]}>Entradas, saídas e resultado líquido</Text>
              </View>
              
              <View style={[styles.periodSelectWrapper, { backgroundColor: colors.surface }]}>
                {(['diario', 'semanal', 'mensal'] as const).map(period => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSummaryPeriod(period)}
                    style={[styles.periodTab, summaryPeriod === period ? [styles.periodTabActive, { backgroundColor: colors.primary }] : null]}
                  >
                    <Text style={[styles.periodTabText, { color: summaryPeriod === period ? '#fff' : colors.textMuted }]}>
                      {period === 'diario' ? 'Diário' : period === 'semanal' ? 'Semanal' : 'Mensal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.periodGrid}>
              <View style={[styles.periodGridCol, { backgroundColor: colors.surface }]}>
                <Text style={[styles.periodGridLabel, { color: colors.success }]}>ENTRADAS</Text>
                <Text style={[styles.periodGridVal, { color: colors.text }]}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? financeMetrics.entradasHoje :
                    summaryPeriod === 'semanal' ? financeMetrics.entradasSemana :
                    financeMetrics.entradasMes
                  )}
                </Text>
              </View>
              <View style={[styles.periodGridCol, { backgroundColor: colors.surface }]}>
                <Text style={[styles.periodGridLabel, { color: colors.error }]}>SAÍDAS</Text>
                <Text style={[styles.periodGridVal, { color: colors.text }]}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? financeMetrics.saidasHoje :
                    summaryPeriod === 'semanal' ? financeMetrics.saidasSemana :
                    financeMetrics.saidasMes
                  )}
                </Text>
              </View>
              <View style={[styles.periodGridCol, { backgroundColor: colors.surface }]}>
                <Text style={[styles.periodGridLabel, { color: colors.primary }]}>LÍQUIDO</Text>
                <Text style={[
                  styles.periodGridVal,
                  (summaryPeriod === 'diario' ? financeMetrics.saldoHoje : summaryPeriod === 'semanal' ? financeMetrics.saldoSemana : financeMetrics.saldoMes) >= 0
                    ? styles.textGreen
                    : styles.textRed
                ]}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? financeMetrics.saldoHoje :
                    summaryPeriod === 'semanal' ? financeMetrics.saldoSemana :
                    financeMetrics.saldoMes
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TRANSAÇÕES</Text>
            
            <View style={[styles.filterChipsRow, { backgroundColor: colors.border }]}>
              {(['Todos', 'Entradas', 'Saídas'] as const).map(fl => (
                <TouchableOpacity
                  key={fl}
                  onPress={() => setActiveFinanceFilter(fl)}
                  style={[styles.filterChip, activeFinanceFilter === fl ? [styles.filterChipActive, { backgroundColor: colors.primary }] : null]}
                >
                  <Text style={[styles.filterChipText, { color: activeFinanceFilter === fl ? '#fff' : colors.textDim }]}>
                    {fl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {filteredTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum lançamento encontrado.</Text>
          ) : (
            filteredTransactions.map(t => {
              const isInflow = t.type === 'Entrada';
              const transStyle = isInflow ? styles.cardInflow : styles.cardOutflow;
              return (
                <View key={t.id} style={[styles.listItem, transStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.transMainInfo}>
                    <View style={[
                      styles.transIconBg,
                      { backgroundColor: isInflow ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                    ]}>
                      {isInflow ? (
                        <ArrowUpRight size={16} color={colors.success} />
                      ) : (
                        <ArrowDownRight size={16} color={colors.error} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={[styles.tDesc, { color: colors.text }]} numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Text style={[styles.tMeta, { color: colors.textMuted }]}>
                        {t.category} • {formatDate(t.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={[styles.tAmount, { color: isInflow ? colors.success : colors.error }]}>
                      {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteTransBtn}
                      onPress={() => handleRemoveTransaction(t.id)}
                    >
                      <Trash2 size={12} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchBarWrapper, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar por OS ou cliente..."
              placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
              value={billingSearch}
              onChangeText={setBillingSearch}
              style={[styles.searchBarInput, { color: colors.text }]}
            />
            {billingSearch !== '' && (
              <TouchableOpacity onPress={() => setBillingSearch('')}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 38, marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersWrapper}>
              {(['Todos', 'Pendente', 'Parcialmente pago', 'Pago', 'Cancelado'] as const).map(st => {
                const isActive = billingStatusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setBillingStatusFilter(st)}
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
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {filteredBillings.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma cobrança encontrada.</Text>
              </View>
            ) : (
              filteredBillings.map(b => {
                const os = osMap.get(b.osId);
                const client = os ? clientMap.get(os.clientId) : null;
                const paidCount = b.installments.filter(i => i.status === 'Pago').length;
                
                let badgeColor = 'rgba(59, 102, 255, 0.1)';
                let badgeTextColor = colors.primary;
                let cardBorderColor = colors.border;
                if (b.status === 'Pago') {
                  badgeColor = 'rgba(34, 197, 94, 0.1)';
                  badgeTextColor = colors.success;
                  cardBorderColor = 'rgba(34, 197, 94, 0.3)';
                } else if (b.status === 'Parcialmente pago') {
                  badgeColor = 'rgba(234, 179, 8, 0.1)';
                  badgeTextColor = colors.warning;
                  cardBorderColor = 'rgba(234, 179, 8, 0.3)';
                } else if (b.status === 'Cancelado') {
                  badgeColor = 'rgba(100, 116, 139, 0.1)';
                  badgeTextColor = colors.textMuted;
                  cardBorderColor = colors.border;
                }

                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      navigation.navigate('BillingDetail', { billingId: b.id });
                    }}
                    style={[styles.billingCard, { backgroundColor: colors.card, borderColor: cardBorderColor }]}
                  >
                    <View style={{ flex: 1, paddingRight: 10, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Text style={[styles.billingCardOS, { color: colors.text }]}>{os?.osNumber || 'S/N'}</Text>
                        <View style={[styles.billingStatusBadge, { backgroundColor: badgeColor }]}>
                          <Text style={[styles.billingStatusBadgeText, { color: badgeTextColor }]}>{b.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={[styles.billingCardClientName, { color: colors.text }]} numberOfLines={1}>{client?.name}</Text>
                      <Text style={[styles.billingCardMeta, { color: colors.textDim }]}>
                        Método: {b.paymentMethod} • Parcelas: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{paidCount}/{b.installments.length}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <Text style={[styles.billingCardAmt, { color: colors.text }]}>{formatCurrency(b.amount)}</Text>
                      <Text style={[styles.billingCardDate, { color: colors.textMuted }]}>Venc: {formatDate(b.dueDate)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      <ExpenseModal 
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSubmit={handleExpenseSubmit}
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
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.roundness.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.roundness.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: theme.colors.card,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  segmentTabTextActive: {
    color: theme.colors.primary,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  balanceCard: {
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  balanceQuickMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  balanceMetaText: {
    fontSize: 11,
    color: theme.colors.textDim,
    fontWeight: 'bold',
  },
  balanceTotalsDividerRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 10,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceSubText: {
    fontSize: 11,
    color: theme.colors.textDim,
    fontWeight: 'bold',
  },
  textGreen: {
    color: theme.colors.success,
  },
  textRed: {
    color: theme.colors.error,
  },
  periodHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodCardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  periodCardSubtitle: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  periodSelectWrapper: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 26,
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: theme.colors.primary,
  },
  periodTabText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  periodTabTextActive: {
    color: theme.colors.white,
  },
  periodGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  periodGridCol: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
  },
  periodGridLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  periodGridVal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  filterChipsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    padding: 2,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minHeight: 20,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: theme.colors.textDim,
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  listItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardInflow: {
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  cardOutflow: {
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  transMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transIconBg: {
    padding: 8,
    borderRadius: 12,
  },
  tDesc: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteTransBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
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
  billingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  billingCardOS: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  billingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  billingStatusBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  billingCardClientName: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  billingCardMeta: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  billingCardAmt: {
    fontSize: 15,
    fontWeight: 'black',
    color: '#fff',
  },
  billingCardDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
