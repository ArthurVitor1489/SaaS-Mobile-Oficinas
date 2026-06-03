import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const {
    settings,
    updateSettings,
    exportDatabaseJson,
    restoreBackup,
    resetDatabase,
    workOrders,
    clients
  } = useDatabase();

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
      let csvContent = '\uFEFFID OS;Número OS;Data;Cliente;Mão de Obra;Peças;Total Geral;Status\n';
      
      workOrders.forEach(os => {
        const clientName = clientMap.get(os.clientId)?.name || '-';
        csvContent += `"${os.id}";"${os.osNumber}";"${formatDate(os.date)}";"${clientName}";"${formatCurrency(os.servicesTotal)}";"${formatCurrency(os.partsTotal)}";"${formatCurrency(os.grandTotal)}";"${os.status}"\n`;
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

  const handleResetDatabase = () => {
    Alert.alert(
      'Limpar Base de Dados',
      'Isso irá apagar todos os dados locais e redefinir para a semente de teste padrão. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Resetar Tudo', 
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            Alert.alert('Sucesso', 'Base de dados resetada com sucesso.');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.tabTitle}>Configurações</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionHeading}>DADOS DA OFICINA</Text>

        <Text style={styles.inputLabel}>Nome Fantasia / Razão Social *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Oficina Mecânica Central"
          placeholderTextColor="#475569"
          maxLength={100}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>CNPJ da Empresa</Text>
        <TextInput
          value={cnpj}
          onChangeText={setCnpj}
          placeholder="Ex: 00.000.000/0001-00"
          placeholderTextColor="#475569"
          maxLength={20}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>Telefone Comercial</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Ex: (11) 5555-5555"
          placeholderTextColor="#475569"
          maxLength={20}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>WhatsApp Comercial</Text>
        <TextInput
          value={whatsapp}
          onChangeText={setWhatsapp}
          placeholder="Ex: (11) 99999-9999"
          placeholderTextColor="#475569"
          maxLength={20}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>E-mail Comercial</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Ex: contato@oficina.com"
          placeholderTextColor="#475569"
          maxLength={80}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>Endereço Comercial</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Ex: Av. Principal, 123 - Centro"
          placeholderTextColor="#475569"
          maxLength={200}
          style={styles.formInput}
        />

        <Text style={styles.inputLabel}>URL do Logotipo (.PNG / .JPG)</Text>
        <TextInput
          value={logoUrl}
          onChangeText={setLogoUrl}
          placeholder="Ex: https://site.com/logo.png"
          placeholderTextColor="#475569"
          maxLength={500}
          style={styles.formInput}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.switchLabel}>Numeração Sequencial de OS</Text>
            <Text style={styles.switchDesc}>Gera IDs sequenciais automáticos (ex: OS-0001, OS-0002) para ordens de serviço.</Text>
          </View>
          <Switch
            value={autoSequence}
            onValueChange={setAutoSequence}
            trackColor={{ false: '#1e293b', true: '#3b66ff' }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity onPress={handleSaveSettings} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Salvar Configurações</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>BACKUP & EXPORTAÇÕES</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionGridBtn} onPress={handleExportBackup}>
          <Text style={styles.actionGridBtnTitle}>Exportar JSON</Text>
          <Text style={styles.actionGridBtnDesc}>Compartilhar backup de segurança local</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionGridBtn} onPress={handleImportBackup}>
          <Text style={styles.actionGridBtnTitle}>Importar JSON</Text>
          <Text style={styles.actionGridBtnDesc}>Importar arquivo de dados de backup</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionGridBtn} onPress={handleExportCsv}>
          <Text style={styles.actionGridBtnTitle}>Relatório Excel (.CSV)</Text>
          <Text style={styles.actionGridBtnDesc}>Exportar lista completa de ordens</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionGridBtn, { borderColor: theme.colors.error }]} onPress={handleResetDatabase}>
          <Text style={[styles.actionGridBtnTitle, { color: theme.colors.error }]}>Resetar Banco</Text>
          <Text style={styles.actionGridBtnDesc}>Limpar todos os dados locais e reiniciar</Text>
        </TouchableOpacity>
      </View>
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
});
