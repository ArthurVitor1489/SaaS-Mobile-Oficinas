import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ChevronRight, Tag, Settings, Wifi, LogOut, TrendingUp, MessageCircle, Shield, Crown, ShieldAlert } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useDatabase } from '../context/DatabaseContext';
import { useAppStore } from '../store/useAppStore';
import { theme, useTheme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import TermsPrivacyModal from '../components/TermsPrivacyModal';
import PaywallModal from '../components/PaywallModal';
import AdminPanelModal from '../components/AdminPanelModal';

const SUPPORT_PHONE = '5583996448504';
const SUPPORT_PHONE_DISPLAY = '+55 (83) 99644-8504';

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { settings, signOut, online } = useDatabase();
  const { isSubscribed, subscriptionPlan, user } = useAppStore();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isLifetime = subscriptionPlan === 'lifetime' || isSuperAdmin;

  // 5-tap secret trigger on version text
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVersionTap = () => {
    tapCountRef.current += 1;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowAdminModal(true);
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  };

  const handleOpenSupport = () => {
    const text = encodeURIComponent('Olá! Preciso de suporte com o aplicativo MecânicaPro.');
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${text}`);
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <View style={styles.screenHeader}>
        <Text style={[styles.tabTitle, { color: colors.text }]}>Mais Opções</Text>
        <View style={[
          styles.networkBadge,
          { backgroundColor: online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          <Wifi size={12} color={online ? '#22c55e' : '#ef4444'} />
          <Text style={[styles.networkText, { color: online ? '#22c55e' : '#ef4444' }]}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Painel do Administrador (Exclusivo Super Admin) */}
        {isSuperAdmin && (
          <TouchableOpacity
            onPress={() => setShowAdminModal(true)}
            style={[styles.menuItem, { borderBottomColor: colors.border, backgroundColor: 'rgba(234, 179, 8, 0.05)' }]}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconBg, { backgroundColor: 'rgba(234, 179, 8, 0.18)' }]}>
                <ShieldAlert size={18} color="#eab308" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.menuItemTitle, { color: '#eab308' }]}>Painel do Administrador</Text>
                  <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#eab308' }}>MASTER</Text>
                  </View>
                </View>
                <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                  Gerenciar oficinas e liberar acesso vitalício
                </Text>
              </View>
            </View>
            <ChevronRight size={18} color="#eab308" />
          </TouchableOpacity>
        )}

        {/* Assinatura / Plano Pro */}
        <TouchableOpacity
          onPress={() => setShowPaywallModal(true)}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Crown size={18} color="#eab308" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Plano Oficina Pro</Text>
                <View style={{ backgroundColor: (isSubscribed || isLifetime) ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: (isSubscribed || isLifetime) ? '#22c55e' : '#eab308' }}>
                    {isLifetime ? 'VITALÍCIO' : isSubscribed ? 'ATIVO' : '7 DIAS GRÁTIS'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>
                {isLifetime
                  ? 'Acesso Vitalício Liberado • Sem mensalidades'
                  : isSubscribed
                  ? 'Assinatura ativa no Google Play'
                  : 'Teste grátis por 7 dias • depois R$ 49,90/mês'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#eab308" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('CashFlow')}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <TrendingUp size={18} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Fluxo de Caixa & Despesas</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Entradas, saídas e lançamentos</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Catalog')}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 102, 255, 0.1)' }]}>
              <Tag size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Catálogo da Oficina</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Serviços e peças cadastrados</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
              <Settings size={18} color="#94a3b8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Configurações da Oficina</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Ajustes e exportação de backups</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenSupport}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <MessageCircle size={18} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: '#22c55e' }]}>Suporte via WhatsApp</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>{SUPPORT_PHONE_DISPLAY} • Atendimento direto</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#22c55e" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowTermsModal(true)}
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 102, 255, 0.1)' }]}>
              <Shield size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.text }]}>Termos & Privacidade</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Políticas de uso e proteção de dados</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={signOut}
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <LogOut size={18} color="#ef4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: '#ef4444' }]}>Sair da Conta</Text>
              <Text style={[styles.menuItemSubtitle, { color: colors.textMuted }]}>Desconectar do painel da oficina</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={handleVersionTap}>
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          MecânicaPro v{Constants.expoConfig?.version || '1.0.9'} • Gestão de Oficinas
        </Text>
      </TouchableOpacity>

      <TermsPrivacyModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      <PaywallModal
        visible={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
      />

      <AdminPanelModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
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
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  networkText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  menuContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    marginRight: 8,
  },
  iconBg: {
    padding: 10,
    borderRadius: 12,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    includeFontPadding: false,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 24,
    includeFontPadding: false,
  },
});
