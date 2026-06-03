import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Plus, Search, X, ArrowUpRight, ArrowDownRight, Trash2, ArrowLeft, Check } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Billing, BillingStatus } from '../types';

interface FinanceScreenProps {
  summaryPeriod: 'diario' | 'semanal' | 'mensal';
  setSummaryPeriod: (period: 'diario' | 'semanal' | 'mensal') => void;
  activeFinanceFilter: 'Todos' | 'Entradas' | 'Saídas';
  setActiveFinanceFilter: (filter: 'Todos' | 'Entradas' | 'Saídas') => void;
  billingSearch: string;
  setBillingSearch: (search: string) => void;
  billingStatusFilter: BillingStatus | 'Todos';
  setBillingStatusFilter: (filter: BillingStatus | 'Todos') => void;
  selectedBillingDetail: Billing | null;
  setSelectedBillingDetail: (billing: Billing | null) => void;
  onAddExpense: () => void;
}

export default function FinanceScreen({
  summaryPeriod,
  setSummaryPeriod,
  activeFinanceFilter,
  setActiveFinanceFilter,
  billingSearch,
  setBillingSearch,
  billingStatusFilter,
  setBillingStatusFilter,
  selectedBillingDetail,
  setSelectedBillingDetail,
  onAddExpense,
}: FinanceScreenProps) {
  const { transactions, billings, workOrders, clients, deleteTransaction, payInstallment } = useDatabase();
  const [activeFinanceTab, setActiveFinanceTab] = useState<'flow' | 'billings'>('flow');

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const osMap = useMemo(() => new Map(workOrders.map(o => [o.id, o])), [workOrders]);

  // All financial metric calculations optimized with useMemo
  const financeMetrics = useMemo(() => {
    const totalRecebido = transactions.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const totalDespesas = transactions.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoAtual = totalRecebido - totalDespesas;

    const totalAReceber = billings.reduce((acc, b) => {
      if (b.status === 'Cancelado') return acc;
      return acc + b.installments.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.amount, 0);
    }, 0);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const faturamentoMes = workOrders
      .filter(o => o.date.startsWith(currentMonthStr))
      .reduce((acc, o) => acc + o.grandTotal, 0);

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Daily Stats (Hoje)
    const transactionsHoje = transactions.filter(t => t.date === todayStr);
    const entradasHoje = transactionsHoje.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
    const saidasHoje = transactionsHoje.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
    const saldoHoje = entradasHoje - saidasHoje;

    // 2. Weekly Stats (Esta Semana)
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

    // 3. Monthly Stats (Este Mês)
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

  const handlePayInstallmentClick = async (billingId: string, instNum: number) => {
    const success = await payInstallment(billingId, instNum);
    if (success) {
      setSelectedBillingDetail(null); // Force reload or local state update
      // Como setSelectedBillingDetail é passado do pai, o fluxo normal seria atualizar o pai,
      // mas como o databasecontext se encarrega de atualizar, basta atualizar a seleção.
      const freshBilling = billings.find(b => b.id === billingId);
      if (freshBilling) {
        const updatedInstallments = freshBilling.installments.map(i =>
          i.number === instNum ? { ...i, status: 'Pago' as const, paidAt: new Date().toISOString() } : i
        );
        const paidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
        const newStatus = paidCount === updatedInstallments.length ? 'Pago' as const : 'Parcialmente pago' as const;
        setSelectedBillingDetail({
          ...freshBilling,
          status: newStatus,
          installments: updatedInstallments
        });
      }
      Alert.alert('Sucesso', 'Baixa realizada com sucesso!');
    }
  };

  const handleRemoveTransaction = (id: string) => {
    Alert.alert(
      'Excluir Transação',
      'Deseja excluir este lançamento financeiro? O saldo será recalculado.',
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

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Financeiro</Text>
        {activeFinanceTab === 'flow' && (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.error }]} onPress={onAddExpense}>
            <Plus size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Despesa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segment Tabs Control */}
      {!selectedBillingDetail && (
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            onPress={() => setActiveFinanceTab('flow')}
            style={[styles.segmentTab, activeFinanceTab === 'flow' ? styles.segmentTabActive : null]}
          >
            <Text style={[styles.segmentTabText, activeFinanceTab === 'flow' ? styles.segmentTabTextActive : null]}>
              Fluxo de Caixa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveFinanceTab('billings')}
            style={[styles.segmentTab, activeFinanceTab === 'billings' ? styles.segmentTabActive : null]}
          >
            <Text style={[styles.segmentTabText, activeFinanceTab === 'billings' ? styles.segmentTabTextActive : null]}>
              Cobranças
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FLUXO DE CAIXA SUB TAB */}
      {activeFinanceTab === 'flow' && !selectedBillingDetail && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Balanço Geral */}
          <View style={[styles.card, styles.balanceCard]}>
            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceLabel}>SALDO EM CAIXA (ATUAL)</Text>
                <Text style={[styles.balanceValue, financeMetrics.saldoAtual >= 0 ? styles.textGreen : styles.textRed]}>
                  {formatCurrency(financeMetrics.saldoAtual)}
                </Text>
              </View>
              <View style={styles.balanceQuickMeta}>
                <Text style={styles.balanceMetaText}>
                  Faturamento: <Text style={{ color: '#f1f5f9' }}>{formatCurrency(financeMetrics.faturamentoMes)}</Text>
                </Text>
                <Text style={styles.balanceMetaText}>
                  A Receber: <Text style={{ color: theme.colors.primary }}>{formatCurrency(financeMetrics.totalAReceber)}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.balanceTotalsDividerRow}>
              <Text style={styles.balanceSubText}>Total Entradas: <Text style={styles.textGreen}>{formatCurrency(financeMetrics.totalRecebido)}</Text></Text>
              <Text style={styles.balanceSubText}>Total Saídas: <Text style={styles.textRed}>{formatCurrency(financeMetrics.totalDespesas)}</Text></Text>
            </View>
          </View>

          {/* Resumo por Período */}
          <View style={[styles.card, { padding: 16, marginBottom: 14 }]}>
            <View style={styles.periodHeaderRow}>
              <View>
                <Text style={styles.periodCardTitle}>RESUMO POR PERÍODO</Text>
                <Text style={styles.periodCardSubtitle}>Entradas, saídas e resultado líquido</Text>
              </View>
              
              {/* Seletores de Período */}
              <View style={styles.periodSelectWrapper}>
                {(['diario', 'semanal', 'mensal'] as const).map(period => (
                  <TouchableOpacity
                    key={period}
                    onPress={() => setSummaryPeriod(period)}
                    style={[styles.periodTab, summaryPeriod === period ? styles.periodTabActive : null]}
                  >
                    <Text style={[styles.periodTabText, summaryPeriod === period ? styles.periodTabTextActive : null]}>
                      {period === 'diario' ? 'Diário' : period === 'semanal' ? 'Semanal' : 'Mensal'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Grid de Período */}
            <View style={styles.periodGrid}>
              <View style={styles.periodGridCol}>
                <Text style={[styles.periodGridLabel, { color: theme.colors.success }]}>ENTRADAS</Text>
                <Text style={styles.periodGridVal}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? financeMetrics.entradasHoje :
                    summaryPeriod === 'semanal' ? financeMetrics.entradasSemana :
                    financeMetrics.entradasMes
                  )}
                </Text>
              </View>
              <View style={styles.periodGridCol}>
                <Text style={[styles.periodGridLabel, { color: theme.colors.error }]}>SAÍDAS</Text>
                <Text style={styles.periodGridVal}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? financeMetrics.saidasHoje :
                    summaryPeriod === 'semanal' ? financeMetrics.saidasSemana :
                    financeMetrics.saidasMes
                  )}
                </Text>
              </View>
              <View style={styles.periodGridCol}>
                <Text style={[styles.periodGridLabel, { color: theme.colors.primary }]}>LÍQUIDO</Text>
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

          {/* Listagem de Transações com Filtro */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>TRANSAÇÕES</Text>
            
            <View style={styles.filterChipsRow}>
              {(['Todos', 'Entradas', 'Saídas'] as const).map(fl => (
                <TouchableOpacity
                  key={fl}
                  onPress={() => setActiveFinanceFilter(fl)}
                  style={[styles.filterChip, activeFinanceFilter === fl ? styles.filterChipActive : null]}
                >
                  <Text style={[styles.filterChipText, activeFinanceFilter === fl ? styles.filterChipTextActive : null]}>
                    {fl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Lista de Transações */}
          {filteredTransactions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum lançamento encontrado.</Text>
          ) : (
            filteredTransactions.map(t => {
              const isInflow = t.type === 'Entrada';
              const transStyle = isInflow ? styles.cardInflow : styles.cardOutflow;
              return (
                <View key={t.id} style={[styles.listItem, transStyle]}>
                  <View style={styles.transMainInfo}>
                    <View style={[
                      styles.transIconBg,
                      { backgroundColor: isInflow ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
                    ]}>
                      {isInflow ? (
                        <ArrowUpRight size={16} color={theme.colors.success} />
                      ) : (
                        <ArrowDownRight size={16} color={theme.colors.error} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.tDesc} numberOfLines={1}>
                        {t.description}
                      </Text>
                      <Text style={styles.tMeta}>
                        {t.category} • {formatDate(t.date)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={[styles.tAmount, { color: isInflow ? theme.colors.success : theme.colors.error }]}>
                      {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteTransBtn}
                      onPress={() => handleRemoveTransaction(t.id)}
                    >
                      <Trash2 size={12} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* COBRANÇAS SUB TAB */}
      {activeFinanceTab === 'billings' && !selectedBillingDetail && (
        <View style={{ flex: 1 }}>
          {/* Busca */}
          <View style={styles.searchBarWrapper}>
            <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar por OS ou cliente..."
              placeholderTextColor="#475569"
              value={billingSearch}
              onChangeText={setBillingSearch}
              style={styles.searchBarInput}
            />
            {billingSearch !== '' && (
              <TouchableOpacity onPress={() => setBillingSearch('')}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtro de Status horizontal */}
          <View style={{ height: 38, marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFiltersWrapper}>
              {(['Todos', 'Pendente', 'Parcialmente pago', 'Pago', 'Cancelado'] as const).map(st => {
                const isActive = billingStatusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setBillingStatusFilter(st)}
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

          {/* Lista de Cobranças */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {filteredBillings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma cobrança encontrada.</Text>
              </View>
            ) : (
              filteredBillings.map(b => {
                const os = osMap.get(b.osId);
                const client = os ? clientMap.get(os.clientId) : null;
                const paidCount = b.installments.filter(i => i.status === 'Pago').length;
                
                let badgeColor = 'rgba(59, 102, 255, 0.1)';
                let badgeTextColor = theme.colors.primary;
                let cardBorderColor = 'rgba(59, 102, 255, 0.2)';
                if (b.status === 'Pago') {
                  badgeColor = 'rgba(34, 197, 94, 0.1)';
                  badgeTextColor = theme.colors.success;
                  cardBorderColor = 'rgba(34, 197, 94, 0.3)';
                } else if (b.status === 'Parcialmente pago') {
                  badgeColor = 'rgba(234, 179, 8, 0.1)';
                  badgeTextColor = theme.colors.warning;
                  cardBorderColor = 'rgba(234, 179, 8, 0.3)';
                } else if (b.status === 'Cancelado') {
                  badgeColor = 'rgba(100, 116, 139, 0.1)';
                  badgeTextColor = '#64748b';
                  cardBorderColor = '#272e3f';
                }

                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setSelectedBillingDetail(b)}
                    style={[styles.billingCard, { borderColor: cardBorderColor }]}
                  >
                    <View style={{ flex: 1, paddingRight: 10, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Text style={styles.billingCardOS}>OS-{os?.osNumber || 'S/N'}</Text>
                        <View style={[styles.billingStatusBadge, { backgroundColor: badgeColor }]}>
                          <Text style={[styles.billingStatusBadgeText, { color: badgeTextColor }]}>{b.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={styles.billingCardClientName} numberOfLines={1}>{client?.name}</Text>
                      <Text style={styles.billingCardMeta}>
                        Método: {b.paymentMethod} • Parcelas: <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{paidCount}/{b.installments.length}</Text>
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <Text style={styles.billingCardAmt}>{formatCurrency(b.amount)}</Text>
                      <Text style={styles.billingCardDate}>Venc: {formatDate(b.dueDate)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* COBRANÇA DETAILED PROFILE */}
      {selectedBillingDetail && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => setSelectedBillingDetail(null)}
            style={styles.backButton}
          >
            <ArrowLeft size={20} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>

          {/* Detalhes Cabeçalho */}
          <View style={[styles.card, { padding: 18, marginBottom: 16 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={styles.cardLabelText}>COBRANÇA DA ORDEM</Text>
                <Text style={styles.detailedOSNum}>
                  OS-{osMap.get(selectedBillingDetail.osId)?.osNumber || 'S/N'}
                </Text>
              </View>
              <View style={[
                styles.billingStatusBadge,
                {
                  backgroundColor: selectedBillingDetail.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : selectedBillingDetail.status === 'Parcialmente pago' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 102, 255, 0.1)',
                  paddingHorizontal: 8,
                  paddingVertical: 4
                }
              ]}>
                <Text style={{
                  fontSize: 9,
                  fontWeight: 'bold',
                  color: selectedBillingDetail.status === 'Pago' ? theme.colors.success : selectedBillingDetail.status === 'Parcialmente pago' ? theme.colors.warning : theme.colors.primary
                }}>{selectedBillingDetail.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#272e3f', paddingTop: 10, gap: 6 }}>
              <View>
                <Text style={styles.cardLabelText}>Cliente</Text>
                <Text style={styles.detailedClientName}>
                  {(() => {
                    const os = osMap.get(selectedBillingDetail.osId);
                    const client = os ? clientMap.get(os.clientId) : null;
                    return client ? client.name : 'Cliente';
                  })()}
                </Text>
              </View>
              <View>
                <Text style={styles.cardLabelText}>Forma de Recebimento</Text>
                <Text style={styles.detailedClientName}>{selectedBillingDetail.paymentMethod}</Text>
              </View>
              <View>
                <Text style={styles.cardLabelText}>Valor Total</Text>
                <Text style={{ fontSize: 16, color: theme.colors.success, fontWeight: '900', marginTop: 2 }}>{formatCurrency(selectedBillingDetail.amount)}</Text>
              </View>
            </View>
          </View>

          {/* Lista de Parcelas */}
          <Text style={[styles.cardLabelText, { marginBottom: 10 }]}>
            LISTA CRONOLÓGICA DE PARCELAS
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {selectedBillingDetail.installments.map((inst, index) => {
              const isPaid = inst.status === 'Pago';
              return (
                <View
                  key={index}
                  style={[
                    styles.card,
                    {
                      padding: 16,
                      marginBottom: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: isPaid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)',
                      borderWidth: 1.5,
                    }
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={styles.installmentTitle}>Parcela {inst.number} de {selectedBillingDetail.installments.length}</Text>
                      <View style={{ backgroundColor: isPaid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: isPaid ? theme.colors.success : theme.colors.warning }}>{inst.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.installmentDate}>
                      Vencimento: {formatDate(inst.dueDate)}
                      {isPaid && inst.paidAt && ` • Pago em: ${formatDate(inst.paidAt)}`}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <Text style={styles.installmentAmount}>{formatCurrency(inst.amount)}</Text>
                    {!isPaid ? (
                      <TouchableOpacity
                        onPress={() => handlePayInstallmentClick(selectedBillingDetail.id, inst.number)}
                        style={styles.payInstallmentButton}
                      >
                        <Text style={styles.payInstallmentText}>BAIXAR</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.paidCheckIconBg}>
                        <Check size={14} color={theme.colors.success} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  cardLabelText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailedOSNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 2,
  },
  detailedClientName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  installmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  installmentDate: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  payInstallmentButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 40,
    justifyContent: 'center',
  },
  payInstallmentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  paidCheckIconBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
});
