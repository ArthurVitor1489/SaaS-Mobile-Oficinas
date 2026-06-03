import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Billing } from '../types';

export default function BillingDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { billingId } = route.params;

  const { billings, workOrders, clients, payInstallment } = useDatabase();
  const [localBillingState, setLocalBillingState] = useState<Billing | null>(null);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const osMap = useMemo(() => new Map(workOrders.map(o => [o.id, o])), [workOrders]);

  const billing = useMemo(() => {
    if (localBillingState) return localBillingState;
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

  const handlePayInstallmentClick = async (instNum: number) => {
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
      Alert.alert('Sucesso', 'Baixa realizada com sucesso!');
    }
  };

  return (
    <View style={styles.screenContainer}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <ArrowLeft size={20} color={theme.colors.primary} />
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>

      <View style={[styles.card, { padding: 18, marginBottom: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={styles.cardLabelText}>COBRANÇA DA ORDEM</Text>
            <Text style={styles.detailedOSNum}>
              {osMap.get(billing.osId)?.osNumber || 'S/N'}
            </Text>
          </View>
          <View style={[
            styles.billingStatusBadge,
            {
              backgroundColor: billing.status === 'Pago' ? 'rgba(34, 197, 94, 0.1)' : billing.status === 'Parcialmente pago' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(59, 102, 255, 0.1)',
              paddingHorizontal: 8,
              paddingVertical: 4
            }
          ]}>
            <Text style={{
              fontSize: 9,
              fontWeight: 'bold',
              color: billing.status === 'Pago' ? theme.colors.success : billing.status === 'Parcialmente pago' ? theme.colors.warning : theme.colors.primary
            }}>{billing.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: '#272e3f', paddingTop: 10, gap: 6 }}>
          <View>
            <Text style={styles.cardLabelText}>Cliente</Text>
            <Text style={styles.detailedClientName}>
              {(() => {
                const os = osMap.get(billing.osId);
                const client = os ? clientMap.get(os.clientId) : null;
                return client ? client.name : 'Cliente';
              })()}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabelText}>Forma de Recebimento</Text>
            <Text style={styles.detailedClientName}>{billing.paymentMethod}</Text>
          </View>
          <View>
            <Text style={styles.cardLabelText}>Valor Total</Text>
            <Text style={{ fontSize: 16, color: theme.colors.success, fontWeight: '900', marginTop: 2 }}>{formatCurrency(billing.amount)}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.cardLabelText, { marginBottom: 10 }]}>
        LISTA CRONOLÓGICA DE PARCELAS
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {billing.installments.map((inst, index) => {
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
                  <Text style={styles.installmentTitle}>Parcela {inst.number} de {billing.installments.length}</Text>
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
                    onPress={() => handlePayInstallmentClick(inst.number)}
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
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#090b0f',
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
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
  billingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
