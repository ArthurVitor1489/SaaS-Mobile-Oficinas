import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { X, Crown, Check, ShieldCheck, RefreshCw, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../styles/theme';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../context/ToastContext';
import {
  buyMonthlySubscription,
  restoreGooglePurchases,
  PLAN_PRICE_DISPLAY
} from '../services/purchaseService';
import TermsPrivacyModal from './TermsPrivacyModal';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const { isSubscribed, setSubscription } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await buyMonthlySubscription();
      if (res.success) {
        setSubscription(true, 'pro');
        showToast('Parabéns! Sua assinatura Oficina Pro foi ativada!');
        onClose();
      } else if (!res.cancelled && res.error) {
        Alert.alert('Google Play Billing', res.error);
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao processar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await restoreGooglePurchases();
      if (res.isSubscribed) {
        setSubscription(true, 'pro');
        showToast('Assinatura restaurada com sucesso!');
        onClose();
      } else {
        Alert.alert('Restaurar Compras', 'Nenhuma assinatura ativa encontrada para esta conta Google Play.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao restaurar assinatura.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.crownBadge}>
                <Crown size={18} color="#eab308" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>MecânicaPro Premium</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Destaque do Plano */}
            <View style={[styles.planCard, { borderColor: '#3b66ff', backgroundColor: 'rgba(59, 102, 255, 0.08)' }]}>
              <View style={styles.planBadgeRow}>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>PLANO RECOMENDADO</Text>
                </View>
                <View style={styles.googleBadge}>
                  <ShieldCheck size={12} color="#22c55e" />
                  <Text style={styles.googleBadgeText}>Google Play</Text>
                </View>
              </View>

              <Text style={[styles.planName, { color: colors.text }]}>Oficina Pro Completa</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceValue}>R$ 49,90</Text>
                <Text style={[styles.pricePeriod, { color: colors.textMuted }]}> / mês</Text>
              </View>
              <Text style={[styles.cancelNotice, { color: colors.textMuted }]}>
                Cancele facilmente a qualquer momento na sua conta Google Play
              </Text>
            </View>

            {/* Lista de Vantagens */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>O QUE ESTÁ INCLUSO NO SEU PLANO:</Text>

            <View style={styles.featuresList}>
              {[
                { title: 'Ordens de Serviço (OS) Ilimitadas', desc: 'Emita quantas OS e orçamentos precisar sem restrições' },
                { title: 'Cobranças e Orçamentos via WhatsApp', desc: 'Envio imediato em 1 clique formatado para o cliente' },
                { title: 'Histórico Completo por Veículo', desc: 'Registro por placa de manutenções e peças aplicadas' },
                { title: 'Fluxo de Caixa em Tempo Real', desc: 'Controle diário, semanal e mensal de faturamento e despesas' },
                { title: 'Sincronização Segura em Nuvem', desc: 'Seus dados salvos e protegidos contra perdas ou trocas de aparelho' },
                { title: 'Suporte Técnico Prioritário', desc: 'Atendimento direto via WhatsApp com nossa equipe' }
              ].map((feat, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.checkCircle}>
                    <Check size={14} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>{feat.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feat.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Botão de Assinatura Principal */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSubscribe}
              disabled={loading}
              style={[styles.subscribeBtn, { backgroundColor: '#3b66ff' }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Zap size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.subscribeBtnText}>Assinar por R$ 49,90 / mês</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Restaurar Compras */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRestore}
              disabled={loading}
              style={styles.restoreBtn}
            >
              <RefreshCw size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.restoreBtnText, { color: colors.textMuted }]}>Já é assinante? Restaurar compras</Text>
            </TouchableOpacity>

            {/* Links legais obrigatórios do Google Play */}
            <View style={styles.legalFooter}>
              <TouchableOpacity onPress={() => setShowTerms(true)}>
                <Text style={[styles.legalLink, { color: colors.textMuted }]}>Termos de Uso</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textMuted }}> • </Text>
              <TouchableOpacity onPress={() => setShowTerms(true)}>
                <Text style={[styles.legalLink, { color: colors.textMuted }]}>Política de Privacidade</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <TermsPrivacyModal visible={showTerms} onClose={() => setShowTerms(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  crownBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  planCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  planBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularBadge: {
    backgroundColor: '#3b66ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  googleBadgeText: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
  },
  planName: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  pricePeriod: {
    fontSize: 14,
  },
  cancelNotice: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  subscribeBtn: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  legalLink: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
