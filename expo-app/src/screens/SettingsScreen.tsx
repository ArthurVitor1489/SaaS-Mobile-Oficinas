import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { ArrowLeft, Shield, Trash2, Moon, Sun } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { formatCurrency, formatDate } from '../utils/formatters';
import TermsPrivacyModal from '../components/TermsPrivacyModal';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();
  const {
    settings,
    updateSettings,
    exportDatabaseJson,
    restoreBackup,
    resetDatabase,
    deleteAccount,
    workOrders,
    clients,
    billings
  } = useDatabase();

  const [showTermsModal, setShowTermsModal] = useState(false);

  const [name, setName] = useState(settings.name || '');
  const [cnpj, setCnpj] = useState(settings.cnpj || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '');
  const [email, setEmail] = useState(settings.email || '');
  const [address, setAddress] = useState(settings.address || '');
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');
  const [autoSequence, setAutoSequence] = useState(settings.autoSequence ?? true);

  const handleSaveSettings = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome da oficina.');
      return;
    }
    const success = await updateSettings({
      name: name.trim(),
      cnpj: cnpj.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      address: address.trim(),
      logoUrl: logoUrl.trim(),
      autoSequence
    });
    if (success) {
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } else {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    }
  };

  const handleExportBackup = async () => {
    try {
      const dataStr = await exportDatabaseJson();
      const filename = `oficinapro-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, dataStr, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar Backup JSON' });
      } else {
        Alert.alert('Exportado', 'Compartilhamento indisponível neste dispositivo.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao exportar backup.');
    }
  };

  const handleImportBackup = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const fileUri = res.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      Alert.alert(
        'Confirmar Restauração',
        'Todos os dados locais serão substituídos pelos dados deste arquivo de backup. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              const success = await restoreBackup(fileContent);
              if (success) {
                Alert.alert('Sucesso', 'Backup restaurado com sucesso! Reiniciando dados...');
              } else {
                Alert.alert('Erro', 'Arquivo de backup inválido.');
              }
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Erro', 'Falha ao importar backup.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const clientMap = new Map(clients.map(c => [c.id, c]));
      const billingMap = new Map(billings.map(b => [b.osId, b]));
      let csvContent = '\uFEFFID OS;Número OS;Data;Cliente;Mão de Obra;Peças;Total Geral;Situação\n';
      
      workOrders.forEach(os => {
        const clientName = clientMap.get(os.clientId)?.name || '-';
        const billing = billingMap.get(os.id);
        const statusLabel = billing ? (billing.status === 'Pago' ? 'Faturada (Paga)' : 'Faturada (Pendente)') : 'A Faturar';
        csvContent += `"${os.id}";"${os.osNumber}";"${formatDate(os.date)}";"${clientName}";"${formatCurrency(os.servicesTotal)}";"${formatCurrency(os.partsTotal)}";"${formatCurrency(os.grandTotal)}";"${statusLabel}"\n`;
      });

      const filename = `ordens-servico-${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Ordens CSV' });
      } else {
        Alert.alert('Concluído', 'CSV gerado no cache temporário.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Excluir Minha Conta e Dados',
      'ATENÇÃO: Esta ação é definitiva e irreversível! Todos os clientes, veículos, ordens de serviço, faturamentos e configurações da sua oficina serão apagados permanentemente de nossos servidores e do seu dispositivo, em conformidade com a LGPD.\n\nDeseja realmente excluir sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sim, Excluir Definitivamente', 
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAccount();
            if (success) {
              Alert.alert('Conta Excluída', 'Sua conta e todos os dados foram apagados com sucesso.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Voltar</Text>
          </TouchableOpacity>
          <Text style={[styles.tabTitle, { color: colors.text }]}>Configurações</Text>
        </View>

        {/* APARÊNCIA DO APLICATIVO */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APARÊNCIA DO APLICATIVO</Text>
        <View style={[styles.themeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setThemeMode('dark')}
            style={[
              styles.themeOptionBtn,
              { borderColor: colors.border, backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'transparent' },
              isDark && { borderColor: colors.primary }
            ]}
          >
            <View style={styles.themeOptionRow}>
              <Moon size={20} color={isDark ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.themeOptionTitle, { color: isDark ? colors.primary : colors.text }]}>
                  Modo Escuro {isDark ? '(Ativo)' : ''}
                </Text>
                <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                  Tema elegante com fundo escuro e redução de fadiga visual
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.themeDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setThemeMode('light')}
            style={[
              styles.themeOptionBtn,
              { borderColor: colors.border, backgroundColor: !isDark ? 'rgba(59, 130, 246, 0.12)' : 'transparent' },
              !isDark && { borderColor: colors.primary }
            ]}
          >
            <View style={styles.themeOptionRow}>
              <Sun size={20} color={!isDark ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.themeOptionTitle, { color: !isDark ? colors.primary : colors.text }]}>
                  Modo Claro {!isDark ? '(Ativo)' : ''}
                </Text>
                <Text style={[styles.themeOptionDesc, { color: colors.textMuted }]}>
                  Fundo limpo e cartões brancos de alto contraste
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>DADOS DA OFICINA</Text>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nome Fantasia / Razão Social *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: Oficina Mecânica Central"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={100}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CNPJ da Empresa</Text>
          <TextInput
            value={cnpj}
            onChangeText={setCnpj}
            placeholder="Ex: 00.000.000/0001-00"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={20}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Telefone Comercial</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="Ex: (11) 5555-5555"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={20}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>WhatsApp Comercial</Text>
          <TextInput
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="Ex: (11) 99999-9999"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={20}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>E-mail Comercial</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Ex: contato@oficina.com"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={80}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Endereço Comercial</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Ex: Av. Principal, 123 - Centro"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={200}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>URL do Logotipo (.PNG / .JPG)</Text>
          <TextInput
            value={logoUrl}
            onChangeText={setLogoUrl}
            placeholder="Ex: https://site.com/logo.png"
            placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
            maxLength={500}
            style={[styles.formInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          />

          <View style={[styles.switchRow, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Numeração Sequencial de OS</Text>
              <Text style={[styles.switchDesc, { color: colors.textMuted }]}>Gera IDs sequenciais automáticos (ex: OS-0001, OS-0002) para ordens de serviço.</Text>
            </View>
            <Switch
              value={autoSequence}
              onValueChange={setAutoSequence}
              trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <TouchableOpacity onPress={handleSaveSettings} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.saveBtnText}>Salvar Configurações</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BACKUP & EXPORTAÇÕES</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={[styles.actionGridBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleExportBackup}>
            <Text style={[styles.actionGridBtnTitle, { color: colors.text }]}>Exportar JSON</Text>
            <Text style={[styles.actionGridBtnDesc, { color: colors.textMuted }]}>Compartilhar backup de segurança local</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionGridBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleImportBackup}>
            <Text style={[styles.actionGridBtnTitle, { color: colors.text }]}>Importar JSON</Text>
            <Text style={[styles.actionGridBtnDesc, { color: colors.textMuted }]}>Importar arquivo de dados de backup</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionGridBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleExportCsv}>
            <Text style={[styles.actionGridBtnTitle, { color: colors.text }]}>Relatório Excel (.CSV)</Text>
            <Text style={[styles.actionGridBtnDesc, { color: colors.textMuted }]}>Exportar lista completa de ordens</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SEGURANÇA & PRIVACIDADE</Text>
        <View style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.privacyRowBtn}
            onPress={() => setShowTermsModal(true)}
          >
            <View style={styles.privacyRowLeft}>
              <Shield size={18} color={colors.primary} />
              <View>
                <Text style={[styles.privacyBtnTitle, { color: colors.text }]}>Termos de Uso e Política de Privacidade</Text>
                <Text style={[styles.privacyBtnDesc, { color: colors.textMuted }]}>Conformidade LGPD e diretrizes de dados</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.privacyDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity 
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.deleteAccountBtnText, { color: colors.error }]}>Excluir Minha Conta e Todos os Dados</Text>
          </TouchableOpacity>
        </View>

        <TermsPrivacyModal
          visible={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
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
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  themeBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 8,
    marginBottom: 16,
  },
  themeOptionBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  themeOptionDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  themeDivider: {
    height: 1,
    marginVertical: 6,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  formInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#fff',
    minHeight: 46,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchDesc: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  actionGrid: {
    gap: 10,
  },
  actionGridBtn: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 14,
  },
  actionGridBtnTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionGridBtnDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  privacyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  privacyRowBtn: {
    padding: 16,
  },
  privacyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyBtnTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  privacyBtnDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  privacyDivider: {
    height: 1,
    backgroundColor: '#1e293b',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deleteAccountBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
});
