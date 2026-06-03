import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ChevronRight, Tag, Settings, LogOut, Wifi, WifiOff } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { signOut, online, settings } = useDatabase();

  const handleSignOutClick = () => {
    Alert.alert(
      'Sair da Conta',
      'Deseja realmente desconectar-se e sair do painel?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Mais Opções</Text>
        <View style={[
          styles.networkBadge,
          { backgroundColor: online ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          {online ? (
            <>
              <Wifi size={12} color="#22c55e" />
              <Text style={[styles.networkText, { color: '#22c55e' }]}>Online</Text>
            </>
          ) : (
            <>
              <WifiOff size={12} color="#ef4444" />
              <Text style={[styles.networkText, { color: '#ef4444' }]}>Offline</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.menuContainer}>
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
          onPress={handleSignOutClick}
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.iconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <LogOut size={18} color={theme.colors.error} />
            </View>
            <View>
              <Text style={[styles.menuItemTitle, { color: theme.colors.error }]}>Desconectar Oficina</Text>
              <Text style={styles.menuItemSubtitle}>Sair do painel atual</Text>
            </View>
          </View>
          <ChevronRight size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>OficinaPro v1.0.0 • SaaS Mobile</Text>
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
