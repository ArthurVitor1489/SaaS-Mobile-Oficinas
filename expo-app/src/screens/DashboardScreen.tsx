import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ClipboardList, Play, CheckCircle, Wallet, ArrowUpRight, ArrowDownRight, Clock, Sparkles, ChevronRight } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { WorkOrder } from '../types';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList } from '../types/navigation';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const { clients, vehicles, workOrders, billings, transactions } = useDatabase();

  // Metrics using useMemo to optimize re-renders
  const metrics = useMemo(() => {
    const totalOrdens = workOrders.length;
    const aFaturar = workOrders.filter(o => !billings.some(b => b.osId === o.id)).length;
    const faturadas = workOrders.filter(o => billings.some(b => b.osId === o.id)).length;

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
      totalOrdens,
      aFaturar,
      faturadas,
      totalAReceber,
    };
  }, [workOrders, billings, transactions]);

  // Lookup maps for quick O(1) searches (resolving lookup inefficiency H1)
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billingMap = useMemo(() => new Map(billings.map(b => [b.osId, b])), [billings]);

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
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
          <View style={[styles.gridCol, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricTitle, { color: colors.textMuted }]}>TOTAL ORDENS</Text>
              <ClipboardList size={14} color={colors.primary} />
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metrics.totalOrdens}</Text>
          </View>

          <View style={[styles.gridCol, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricTitle, { color: colors.textMuted }]}>A FATURAR</Text>
              <Clock size={14} color="#f59e0b" />
            </View>
            <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{metrics.aFaturar}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={[styles.gridCol, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricTitle, { color: colors.textMuted }]}>FATURADAS</Text>
              <CheckCircle size={14} color={colors.success} />
            </View>
            <Text style={[styles.metricValue, { color: colors.success }]}>{metrics.faturadas}</Text>
          </View>

          <View style={[styles.gridCol, styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricTitle, { color: colors.textMuted }]}>A RECEBER</Text>
              <Wallet size={14} color={colors.primary} />
            </View>
            <Text style={[styles.metricValuePrimary, { color: colors.primary }]} numberOfLines={1}>
              {formatCurrency(metrics.totalAReceber)}
            </Text>
          </View>
        </View>

        {/* Onboarding Checklist for New Workshops */}
        {workOrders.length === 0 && clients.length === 0 && (
          <View style={[styles.onboardingCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#cbd5e1' }]}>
            <View style={[styles.onboardingHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
              <View style={styles.onboardingIconBadge}>
                <Sparkles size={18} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.onboardingTitle, { color: colors.text }]}>Primeiros Passos</Text>
                <Text style={[styles.onboardingSubtitle, { color: colors.textMuted }]}>Configure sua oficina para começar a operar:</Text>
              </View>
            </View>

            <View style={styles.onboardingStepsList}>
              <TouchableOpacity 
                style={[styles.onboardingStepItem, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' }]}
                onPress={() => navigation.navigate('MoreTab', { screen: 'Settings' })}
                activeOpacity={0.7}
              >
                <View style={styles.onboardingStepNumBadge}>
                  <Text style={styles.onboardingStepNumText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.onboardingStepTitle, { color: colors.text }]}>Dados da Oficina</Text>
                  <Text style={[styles.onboardingStepDesc, { color: colors.textMuted }]}>Defina nome, CNPJ, telefone e logo para os comprovantes.</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.onboardingStepItem, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)' }]}
                onPress={() => navigation.navigate('ClientsTab', { screen: 'ClientsList' })}
                activeOpacity={0.7}
              >
                <View style={styles.onboardingStepNumBadge}>
                  <Text style={styles.onboardingStepNumText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.onboardingStepTitle, { color: colors.text }]}>Cadastrar Cliente & Veículo</Text>
                  <Text style={[styles.onboardingStepDesc, { color: colors.textMuted }]}>Adicione o primeiro cliente e veículo da oficina.</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.onboardingStepItem, { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('OSTab', { screen: 'OSList' })}
                activeOpacity={0.7}
              >
                <View style={styles.onboardingStepNumBadge}>
                  <Text style={styles.onboardingStepNumText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.onboardingStepTitle, { color: colors.text }]}>Abrir Ordem de Serviço</Text>
                  <Text style={[styles.onboardingStepDesc, { color: colors.textMuted }]}>Lance serviços, peças e compartilhe o comprovante via WhatsApp.</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent OS List */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ORDENS DE SERVIÇO RECENTES</Text>
        {workOrders.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma Ordem de Serviço cadastrada.</Text>
          </View>
        ) : (
          workOrders.slice(0, 3).map(os => {
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
                style={[styles.listItem, cardStyle, styles.listItemCol, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  navigation.navigate('OSTab', {
                    screen: 'OSDetail',
                    params: { osId: os.id }
                  });
                }}
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

                <View style={styles.marginVerticalSm}>
                  <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Cliente</Text>
                  <Text style={[styles.cardValueTextBold, { color: colors.text }]}>{client?.name}</Text>
                  
                  {vehicle && (
                    <>
                      <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Veículo</Text>
                      <Text style={[styles.cardValueText, { color: colors.textDim }]}>
                        {vehicle.brand} {vehicle.model} • Placa: <Text style={[styles.plateBold, { color: colors.text }]}>{vehicle.plate}</Text>
                      </Text>
                    </>
                  )}
                </View>

                <View style={[styles.cardFooterRow, { borderTopColor: colors.border }]}>
                  <View style={styles.footerBadgeRow}>
                    {billing ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: 'bold' }}>
                        💳 {billing.paymentMethod.toUpperCase()} {billing.installments.length > 1 ? `(${billing.installments.length}x)` : ''}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'bold' }}>
                        ⚙️ EM EXECUÇÃO
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.osTotal, { color: colors.text }]}>
                    {formatCurrency(os.grandTotal)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Recent Finance Transactions Feed */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ÚLTIMOS LANÇAMENTOS</Text>
        {transactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhum lançamento financeiro cadastrado.</Text>
          </View>
        ) : (
          transactions.slice(0, 4).map(t => {
            const isInflow = t.type === 'Entrada';
            const transStyle = isInflow ? styles.cardInflow : styles.cardOutflow;
            return (
              <View key={t.id} style={[styles.listItem, transStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.transMainInfo}>
                  <View style={[
                    styles.transIconBg,
                    isInflow ? styles.badgeSuccessBg : styles.badgeErrorBg
                  ]}>
                    {isInflow ? (
                      <ArrowUpRight size={16} color={colors.success} />
                    ) : (
                      <ArrowDownRight size={16} color={colors.error} />
                    )}
                  </View>
                  <View style={styles.transTextWrapper}>
                    <Text style={[styles.tDesc, { color: colors.text }]} numberOfLines={1}>
                      {t.description}
                    </Text>
                    <Text style={[styles.tMeta, { color: colors.textMuted }]}>
                      {t.category} • {formatDate(t.date)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tAmount, isInflow ? styles.textGreen : styles.textRed]}>
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
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    includeFontPadding: false,
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
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    includeFontPadding: false,
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
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  osTotal: {
    fontSize: 15,
    color: theme.colors.white,
    fontWeight: 'bold',
    includeFontPadding: false,
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  metricValuePrimary: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    includeFontPadding: false,
  },
  listItemCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  marginVerticalSm: {
    marginVertical: 4,
  },
  footerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeSuccessBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  badgeWarningBg: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  badgeErrorBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  textGreen: {
    color: theme.colors.success,
  },
  textRed: {
    color: theme.colors.error,
  },
  textYellow: {
    color: theme.colors.warning,
  },
  transTextWrapper: {
    flex: 1,
    paddingRight: 6,
  },
  onboardingCard: {
    backgroundColor: '#111827',
    borderRadius: theme.roundness.md,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    marginBottom: theme.spacing.lg,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  onboardingIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  onboardingSubtitle: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  onboardingStepsList: {
    gap: 4,
  },
  onboardingStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 12,
  },
  onboardingStepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingStepNumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  onboardingStepTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  onboardingStepDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
