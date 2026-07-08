import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { ArrowLeft, CreditCard, Calendar, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';

export default function SubscriptionDetailsScreen() {
  const navigation = useNavigation();
  const subscription = useAppStore((state) => state.subscription);

  const getStatusDetails = () => {
    if (!subscription) return { label: 'Inativa', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
    const { status } = subscription;

    switch (status) {
      case 'ACTIVE':
        return { label: 'Ativa / Paga', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
      case 'TRIAL':
        return { label: 'Período de Testes', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' };
      case 'OVERDUE':
      case 'PENDING':
        return { label: 'Assinatura Pendente', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
      case 'CANCELED':
        return { label: 'Cancelada', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
      default:
        return { label: status, color: '#3b66ff', bg: 'rgba(59, 102, 255, 0.1)' };
    }
  };

  const statusInfo = getStatusDetails();
  const formattedDate = subscription?.dueDate 
    ? new Date(subscription.dueDate).toLocaleDateString('pt-BR') 
    : 'N/A';

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minha Assinatura</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CARD PRINCIPAL */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planTitle}>Plano Básico Voltruck</Text>
              <Text style={styles.planPrice}>R$ 99,90<Text style={styles.planPeriod}> / mês</Text></Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* DETALHES */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Calendar size={18} color="#94a3b8" />
            </View>
            <View>
              <Text style={styles.detailLabel}>Próximo Vencimento</Text>
              <Text style={styles.detailValue}>{formattedDate}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <CreditCard size={18} color="#94a3b8" />
            </View>
            <View>
              <Text style={styles.detailLabel}>Meio de Faturamento</Text>
              <Text style={styles.detailValue}>PIX / Boleto / Cartão de Crédito</Text>
            </View>
          </View>

          {/* BOTÃO DE PAGAMENTO */}
          {subscription?.invoiceUrl ? (
            <TouchableOpacity 
              style={styles.payButton}
              onPress={() => Linking.openURL(subscription.invoiceUrl!)}
            >
              <Text style={styles.payButtonText}>Ir para Tela de Pagamento</Text>
              <ExternalLink size={16} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.noInvoiceContainer}>
              <ShieldCheck size={18} color="#22c55e" />
              <Text style={styles.noInvoiceText}>Nenhuma fatura pendente de pagamento.</Text>
            </View>
          )}
        </View>

        {/* SEÇÃO INFORMATIVA / FAQ */}
        <Text style={styles.sectionTitle}>Como funcionam as assinaturas?</Text>
        
        <View style={styles.faqCard}>
          <View style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <HelpCircle size={16} color={theme.colors.primary} />
              <Text style={styles.faqQuestion}>O que acontece se eu atrasar o pagamento?</Text>
            </View>
            <Text style={styles.faqAnswer}>
              Seu painel entra em carência de 7 dias com banners de aviso laranja. Durante a carência, você pode usar o app normalmente.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <HelpCircle size={16} color={theme.colors.primary} />
              <Text style={styles.faqQuestion}>O que é o Modo Leitura?</Text>
            </View>
            <Text style={styles.faqAnswer}>
              Passados os 7 dias de atraso, o cadastro de novos clientes, veículos e ordens de serviço é bloqueado. Você ainda poderá ver históricos e exportar backups normalmente.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <HelpCircle size={16} color={theme.colors.primary} />
              <Text style={styles.faqQuestion}>Como é feita a liberação?</Text>
            </View>
            <Text style={styles.faqAnswer}>
              A liberação é automática! Assim que o pagamento for liquidado no Asaas (geralmente poucos minutos via Pix), seu app voltará a funcionar sem restrições.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  planCard: {
    backgroundColor: '#0f1115',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 'normal',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#181c24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  payButton: {
    backgroundColor: '#3b66ff',
    borderRadius: 10,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  noInvoiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  noInvoiceText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: 'bold',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 14,
  },
  faqCard: {
    backgroundColor: '#0f1115',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 18,
  },
  faqItem: {
    gap: 6,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  faqAnswer: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    paddingLeft: 24,
  },
});
