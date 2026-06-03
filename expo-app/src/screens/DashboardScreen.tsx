import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ClipboardList, Play, CheckCircle, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { WorkOrder } from '../types';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList } from '../types/navigation';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { clients, vehicles, workOrders, billings, transactions } = useDatabase();

  // Metrics using useMemo to optimize re-renders
  const metrics = useMemo(() => {
    const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;
    const osAndamento = workOrders.filter(o => o.status === 'Em andamento').length;
    const osConcluidas = workOrders.filter(o => o.status === 'Concluída' || o.status === 'Entregue').length;

    const totalAReceber = billings.reduce((acc, b) => {
      if (b.status === 'Cancelado') return acc;
      return acc + b.installments.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.amount, 0);
    }, 0);

    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const faturamentoMes = workOrders
      .filter(o => o.date.startsWith(currentMonthStr))
      .reduce((acc, o) => acc + o.grandTotal, 0);

    // Monthly transactions for entries sum
    const transactionsMes = transactions.filter(t => t.date.startsWith(currentMonthStr));
    const entradasMes = transactionsMes.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);

    return {
      faturamentoMes,
      entradasMes,
      osAbertas,
      osAndamento,
      osConcluidas,
      totalAReceber,
    };
  }, [workOrders, billings, transactions]);

  // Lookup maps for quick O(1) searches (resolving lookup inefficiency H1)
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billingMap = useMemo(() => new Map(billings.map(b => [b.osId, b])), [billings]);

  return (
    <View style={styles.screenContainer}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={[styles.card, styles.heroCard]}>
        <Text style={styles.heroCardLabel}>FATURAMENTO DO MÊS</Text>
        <Text style={styles.heroCardValue}>{formatCurrency(metrics.faturamentoMes)}</Text>
        <View style={styles.heroSubRow}>
          <Text style={styles.heroSubTextVal}>{formatCurrency(metrics.entradasMes)}</Text>
          <Text style={styles.heroSubText}>recebido à vista/parcelas</Text>
        </View>
      </View>

      {/* Metrics cards grid */}
      <View style={styles.grid}>
        <View style={[styles.gridCol, styles.card]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>ABERTAS</Text>
            <ClipboardList size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.metricValue}>{metrics.osAbertas}</Text>
        </View>

        <View style={[styles.gridCol, styles.card]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>EM CURSO</Text>
            <Play size={14} color={theme.colors.warning} />
          </View>
          <Text style={styles.metricValue}>{metrics.osAndamento}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={[styles.gridCol, styles.card]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>CONCLUÍDAS</Text>
            <CheckCircle size={14} color={theme.colors.success} />
          </View>
          <Text style={styles.metricValue}>{metrics.osConcluidas}</Text>
        </View>

        <View style={[styles.gridCol, styles.card]}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricTitle}>A RECEBER</Text>
            <Wallet size={14} color={theme.colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]} numberOfLines={1}>
            {formatCurrency(metrics.totalAReceber)}
          </Text>
        </View>
      </View>



      {/* Recent OS List */}
      <Text style={styles.sectionTitle}>ORDENS DE SERVIÇO RECENTES</Text>
      {workOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhuma Ordem de Serviço cadastrada.</Text>
        </View>
      ) : (
        workOrders.slice(0, 3).map(os => {
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
              style={[styles.listItem, osStatusStyle, { flexDirection: 'column', alignItems: 'stretch' }]}
              onPress={() => {
                navigation.navigate('OSTab', {
                  screen: 'OSDetail',
                  params: { osId: os.id }
                });
              }}
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
                      {vehicle.brand} {vehicle.model} • Placa: <Text style={styles.plateBold}>{vehicle.plate}</Text>
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
                <Text style={styles.osTotal}>
                  {formatCurrency(os.grandTotal)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Recent Finance Transactions Feed */}
      <Text style={styles.sectionTitle}>ÚLTIMOS LANÇAMENTOS</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum lançamento financeiro cadastrado.</Text>
        </View>
      ) : (
        transactions.slice(0, 4).map(t => {
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
              <Text style={[styles.tAmount, { color: isInflow ? theme.colors.success : theme.colors.error }]}>
                {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#090b0f',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  heroCard: {
    backgroundColor: '#3b66ff',
    borderColor: '#3b66ff',
  },
  heroCardLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.8,
  },
  heroCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.colors.white,
    marginTop: 2,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.roundness.sm,
  },
  heroSubTextVal: {
    fontSize: 9,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  heroSubText: {
    fontSize: 9,
    color: '#dbeafe',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCol: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
  quickCountsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickCountCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCountIconBg: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    borderRadius: 8,
    padding: 6,
  },
  quickCountValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  quickCountLabel: {
    fontSize: 7,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartPreTitle: {
    fontSize: 7,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginTop: 1,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendText: {
    fontSize: 8,
    color: theme.colors.textDim,
    fontWeight: 'bold',
  },
  chartContainer: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    marginTop: 4,
  },
  chartDayLabel: {
    fontSize: 7,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
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
    fontSize: 12,
    textAlign: 'center',
  },
  listItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
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
    fontSize: 7,
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
  plateBold: {
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
  osTotal: {
    fontSize: 15,
    color: theme.colors.white,
    fontWeight: '900',
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
});
