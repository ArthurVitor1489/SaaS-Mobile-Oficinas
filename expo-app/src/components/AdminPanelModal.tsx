import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  X,
  ShieldAlert,
  Crown,
  Search,
  RefreshCw,
  Calendar,
  Ban,
  CheckCircle2,
  Clock,
  Lock,
  Mail,
  Users,
  ClipboardList
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../styles/theme';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../context/ToastContext';
import { formatDate, matchesSearch } from '../utils/formatters';
import api from '../services/api';

interface AdminPanelModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminPanelModal({ visible, onClose }: AdminPanelModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const user = useAppStore((s) => s.user);
  const pullAll = useAppStore((s) => s.pullAll);

  const isEmailSuperAdmin = useMemo(() => user?.role === 'SUPER_ADMIN', [user?.role]);

  const [unlocked, setUnlocked] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [activeMasterKey, setActiveMasterKey] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickEmail, setQuickEmail] = useState('');

  useEffect(() => {
    if (visible) {
      if (isEmailSuperAdmin) {
        setUnlocked(true);
        fetchWorkshops('');
      } else {
        setUnlocked(false);
        setMasterPasswordInput('');
      }
    }
  }, [visible, isEmailSuperAdmin]);

  const handleUnlock = async () => {
    const key = masterPasswordInput.trim();
    if (!key) {
      Alert.alert('Atenção', 'Digite a senha mestra.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/subscription/admin/tenants', {
        headers: { 'x-admin-key': key }
      });
      setActiveMasterKey(key);
      setWorkshops(res.data || []);
      setUnlocked(true);
    } catch (e: any) {
      Alert.alert('Acesso Negado', 'Senha mestra incorreta ou sem conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkshops = async (keyToUse = activeMasterKey) => {
    setLoading(true);
    try {
      const res = await api.get('/subscription/admin/tenants', {
        headers: keyToUse ? { 'x-admin-key': keyToUse } : undefined
      });
      setWorkshops(res.data || []);
    } catch (e: any) {
      Alert.alert(
        'Erro ao carregar oficinas',
        e.response?.data?.message || 'Verifique sua conexão com a internet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAction = async (
    action: 'LIFETIME' | 'ACTIVE_30D' | 'TRIAL_7D' | 'BLOCK',
    target: { tenantId?: string; email?: string; name?: string }
  ) => {
    const labelMap = {
      LIFETIME: 'Acesso Vitalício (Para Sempre)',
      ACTIVE_30D: 'Plano Pro por +30 Dias',
      TRIAL_7D: 'Período Grátis por +7 Dias',
      BLOCK: 'Bloqueio Imediato de Escrita'
    };

    const targetLabel = target.name || target.email || 'esta oficina';

    Alert.alert(
      'Confirmar Alteração',
      `Deseja aplicar "${labelMap[action]}" para ${targetLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: action === 'BLOCK' ? 'destructive' : 'default',
          onPress: async () => {
            const loadingKey = target.tenantId || target.email || 'quick';
            setActionLoadingId(loadingKey);
            try {
              const res = await api.post(
                '/subscription/admin/grant',
                {
                  tenantId: target.tenantId,
                  email: target.email,
                  action
                },
                {
                  headers: { 'x-admin-key': activeMasterKey }
                }
              );
              showToast(`Plano atualizado para ${res.data?.workshopName || targetLabel}!`);
              setQuickEmail('');
              await fetchWorkshops(activeMasterKey);
              await pullAll();
            } catch (e: any) {
              Alert.alert(
                'Erro',
                e.response?.data?.message || 'Não foi possível alterar a assinatura desta oficina.'
              );
            } finally {
              setActionLoadingId(null);
            }
          }
        }
      ]
    );
  };

  const filteredWorkshops = useMemo(() => {
    if (!searchQuery.trim()) return workshops;
    return workshops.filter((w) =>
      matchesSearch([w.workshopName, w.ownerName, w.ownerEmail, w.phone, w.cnpj], searchQuery)
    );
  }, [workshops, searchQuery]);

  const stats = useMemo(() => {
    let lifetime = 0;
    let active = 0;
    let trial = 0;
    workshops.forEach((w) => {
      const sub = w.subscription;
      if (sub?.plan === 'LIFETIME') lifetime++;
      else if (sub?.status === 'ACTIVE') active++;
      else if (sub?.status === 'TRIAL') trial++;
    });
    return { total: workshops.length, lifetime, active, trial };
  }, [workshops]);

  const renderBadge = (sub: any) => {
    if (sub?.plan === 'LIFETIME') {
      return (
        <View style={[styles.badge, { backgroundColor: 'rgba(234, 179, 8, 0.18)', borderColor: '#eab308' }]}>
          <Crown size={11} color="#eab308" />
          <Text style={[styles.badgeText, { color: '#eab308' }]}>VITALÍCIO</Text>
        </View>
      );
    }
    if (sub?.status === 'ACTIVE') {
      return (
        <View style={[styles.badge, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: '#22c55e' }]}>
          <CheckCircle2 size={11} color="#22c55e" />
          <Text style={[styles.badgeText, { color: '#22c55e' }]}>PRO ATIVO</Text>
        </View>
      );
    }
    if (sub?.status === 'TRIAL') {
      const expired = sub?.dueDate && new Date(sub.dueDate).getTime() < Date.now();
      return (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: expired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 102, 255, 0.15)',
              borderColor: expired ? '#ef4444' : '#3b66ff'
            }
          ]}
        >
          <Clock size={11} color={expired ? '#ef4444' : '#3b66ff'} />
          <Text style={[styles.badgeText, { color: expired ? '#ef4444' : '#3b66ff' }]}>
            {expired ? 'TRIAL VENCIDO' : '7 DIAS GRÁTIS'}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444' }]}>
        <Ban size={11} color="#ef4444" />
        <Text style={[styles.badgeText, { color: '#ef4444' }]}>BLOQUEADO</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 20)
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.adminIconBg}>
                <ShieldAlert size={18} color="#eab308" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Painel do Administrador</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Controle Master de Licenças e Oficinas
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!unlocked ? (
            <View style={styles.lockBox}>
              <Lock size={36} color="#eab308" style={{ marginBottom: 12 }} />
              <Text style={[styles.lockTitle, { color: colors.text }]}>Autenticação Master</Text>
              <Text style={[styles.lockSub, { color: colors.textMuted }]}>
                Digite sua senha mestra de administrador para gerenciar as oficinas e liberar acessos vitalícios.
              </Text>
              <TextInput
                value={masterPasswordInput}
                onChangeText={setMasterPasswordInput}
                placeholder="Senha mestra..."
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                    width: '100%',
                    marginBottom: 14
                  }
                ]}
              />
              <TouchableOpacity
                onPress={handleUnlock}
                style={[styles.primaryBtn, { backgroundColor: '#eab308', width: '100%' }]}
              >
                <Text style={[styles.primaryBtnText, { color: '#000' }]}>Desbloquear Painel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 28 }}
            >
              {/* KPIs */}
              <View style={styles.kpiRow}>
                <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.kpiNum, { color: colors.text }]}>{stats.total}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Oficinas</Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.kpiNum, { color: '#eab308' }]}>{stats.lifetime}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Vitalícias</Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.kpiNum, { color: '#22c55e' }]}>{stats.active}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Pro Mensal</Text>
                </View>
                <View style={[styles.kpiBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.kpiNum, { color: '#3b66ff' }]}>{stats.trial}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Em Trial</Text>
                </View>
              </View>

              {/* Liberação Rápida por E-mail */}
              <View style={[styles.quickGrantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Mail size={14} color="#eab308" />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>
                    LIBERAR ACESSO POR E-MAIL DA CONTA
                  </Text>
                </View>
                <TextInput
                  value={quickEmail}
                  onChangeText={setQuickEmail}
                  placeholder="Ex: cliente@oficina.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                      marginBottom: 10
                    }
                  ]}
                />
                <View style={styles.quickBtnRow}>
                  <TouchableOpacity
                    disabled={!quickEmail.trim() || actionLoadingId === 'quick'}
                    onPress={() => handleGrantAction('LIFETIME', { email: quickEmail.trim() })}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: '#eab308', flex: 1, opacity: quickEmail.trim() ? 1 : 0.5 }
                    ]}
                  >
                    <Crown size={13} color="#000" />
                    <Text style={[styles.actionBtnText, { color: '#000' }]}>Liberar Vitalício</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!quickEmail.trim() || actionLoadingId === 'quick'}
                    onPress={() => handleGrantAction('ACTIVE_30D', { email: quickEmail.trim() })}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: '#22c55e', flex: 1, opacity: quickEmail.trim() ? 1 : 0.5 }
                    ]}
                  >
                    <Calendar size={13} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: '#fff' }]}>+30 Dias Pro</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Barra de Busca e Atualizar */}
              <View style={styles.listHeaderRow}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textMuted }}>
                  TODAS AS OFICINAS CADASTRADAS ({filteredWorkshops.length})
                </Text>
                <TouchableOpacity
                  onPress={() => fetchWorkshops(activeMasterKey)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={13} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>Atualizar</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Search size={15} color={colors.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Buscar oficina por nome, e-mail ou telefone..."
                  placeholderTextColor={colors.textMuted}
                  style={{ flex: 1, color: colors.text, fontSize: 13, paddingVertical: 8 }}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={15} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {loading ? (
                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#eab308" />
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>
                    Carregando oficinas da nuvem...
                  </Text>
                </View>
              ) : filteredWorkshops.length === 0 ? (
                <Text style={{ textAlign: 'center', color: colors.textMuted, paddingVertical: 24 }}>
                  Nenhuma oficina encontrada.
                </Text>
              ) : (
                filteredWorkshops.map((w) => {
                  const sub = w.subscription;
                  const isLifetime = sub?.plan === 'LIFETIME';
                  const isBusy = actionLoadingId === w.tenantId;

                  return (
                    <View
                      key={w.tenantId}
                      style={[
                        styles.workshopCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isLifetime ? 'rgba(234, 179, 8, 0.45)' : colors.border
                        }
                      ]}
                    >
                      <View style={styles.workshopTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.workshopName, { color: colors.text }]} numberOfLines={1}>
                            {w.workshopName}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textDim }} numberOfLines={1}>
                            {w.ownerName} • {w.ownerEmail}
                          </Text>
                        </View>
                        {renderBadge(sub)}
                      </View>

                      <View style={styles.metaRow}>
                        <View style={styles.metaChip}>
                          <Users size={11} color={colors.textMuted} />
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            {w.clientsCount} clientes
                          </Text>
                        </View>
                        <View style={styles.metaChip}>
                          <ClipboardList size={11} color={colors.textMuted} />
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            {w.ordersCount} OS
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {isLifetime
                            ? 'Sem vencimento'
                            : `Venc: ${sub?.dueDate ? formatDate(String(sub.dueDate).slice(0, 10)) : '-'}`}
                        </Text>
                      </View>

                      {/* Botões de ação rápida */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            handleGrantAction('LIFETIME', {
                              tenantId: w.tenantId,
                              name: w.workshopName
                            })
                          }
                          style={[
                            styles.smallActionBtn,
                            {
                              backgroundColor: isLifetime ? 'rgba(234, 179, 8, 0.25)' : '#eab308'
                            }
                          ]}
                        >
                          <Crown size={12} color={isLifetime ? '#eab308' : '#000'} />
                          <Text
                            style={[
                              styles.smallActionText,
                              { color: isLifetime ? '#eab308' : '#000' }
                            ]}
                          >
                            Vitalício
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            handleGrantAction('ACTIVE_30D', {
                              tenantId: w.tenantId,
                              name: w.workshopName
                            })
                          }
                          style={[styles.smallActionBtn, { backgroundColor: 'rgba(34, 197, 94, 0.18)' }]}
                        >
                          <Text style={[styles.smallActionText, { color: '#22c55e' }]}>+30 Dias</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            handleGrantAction('TRIAL_7D', {
                              tenantId: w.tenantId,
                              name: w.workshopName
                            })
                          }
                          style={[styles.smallActionBtn, { backgroundColor: 'rgba(59, 102, 255, 0.18)' }]}
                        >
                          <Text style={[styles.smallActionText, { color: '#3b66ff' }]}>+7d Trial</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            handleGrantAction('BLOCK', {
                              tenantId: w.tenantId,
                              name: w.workshopName
                            })
                          }
                          style={[styles.smallActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                        >
                          <Text style={[styles.smallActionText, { color: '#ef4444' }]}>Bloquear</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: 18,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  adminIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  lockSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  kpiBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  kpiNum: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  quickGrantCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 12,
  },
  workshopCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  workshopTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workshopName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
    paddingTop: 10,
  },
  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 7,
  },
  smallActionText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
