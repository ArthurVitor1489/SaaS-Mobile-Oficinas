import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { ChevronRight, Tag, Settings, Wifi, LogOut, TrendingUp, MessageCircle, Shield } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { settings, signOut, online } = useDatabase();
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleOpenSupport = () => {
    const text = encodeURIComponent('Olá! Preciso de ajuda com o aplicativo MecânicaPro.');
    Linking.openURL(`https://wa.me/5583999999999?text=${text}`);
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Mais Opções</Text>
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

      <View style={styles.menuContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('CashFlow')}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <TrendingUp size={18} color="#22c55e" />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Fluxo de Caixa & Despesas</Text>
              <Text style={styles.menuItemSubtitle}>Entradas, saídas e lançamentos</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Catalog')}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 102, 255, 0.1)' }]}>
              <Tag size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Catálogo da Oficina</Text>
              <Text style={styles.menuItemSubtitle}>Serviços e peças cadastrados</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
              <Settings size={18} color="#94a3b8" />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Configurações da Oficina</Text>
              <Text style={styles.menuItemSubtitle}>Ajustes e exportação de backups</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenSupport}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <MessageCircle size={18} color="#22c55e" />
            </View>
            <View>
              <Text style={[styles.menuItemTitle, { color: '#22c55e' }]}>Suporte via WhatsApp</Text>
              <Text style={styles.menuItemSubtitle}>Atendimento direto e suporte técnico</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#22c55e" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowTermsModal(true)}
          style={styles.menuItem}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(59, 102, 255, 0.1)' }]}>
              <Shield size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Termos & Privacidade</Text>
              <Text style={styles.menuItemSubtitle}>Políticas de uso e proteção de dados</Text>
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
            <View>
              <Text style={[styles.menuItemTitle, { color: '#ef4444' }]}>Sair da Conta</Text>
              <Text style={styles.menuItemSubtitle}>Desconectar do painel da oficina</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>MecânicaPro v1.0.0 • Gestão de Oficinas</Text>

      <TermsPrivacyModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
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
  },
  iconBg: {
    padding: 10,
    borderRadius: 12,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 24,
  },
});
