import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { ArrowLeft, ShieldCheck, FileCheck2, UploadCloud } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import api from '../services/api';

export default function FiscalSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Form states
  const [cnpj, setCnpj] = useState('');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [regimeTributario, setRegimeTributario] = useState('1'); // 1 = Simples, 3 = Normal
  const [optanteSimples, setOptanteSimples] = useState(true);
  const [aliquotaISS, setAliquotaISS] = useState('2.00');
  const [focusTokenSandbox, setFocusTokenSandbox] = useState('');
  const [hasCertificate, setHasCertificate] = useState(false);

  // Certificate state
  const [certPassword, setCertPassword] = useState('');

  useEffect(() => {
    async function loadFiscalConfig() {
      try {
        const res = await api.get('/fiscal/config');
        if (res.data) {
          setCnpj(res.data.cnpj || '');
          setInscricaoMunicipal(res.data.inscricaoMunicipal || '');
          setInscricaoEstadual(res.data.inscricaoEstadual || '');
          setRegimeTributario(String(res.data.regimeTributario || '1'));
          setOptanteSimples(res.data.optanteSimples ?? true);
          setAliquotaISS(parseFloat(res.data.aliquotaISS || '2.00').toFixed(2));
          setFocusTokenSandbox(res.data.focusTokenSandbox || '');
          setHasCertificate(res.data.hasCertificate ?? false);
        }
      } catch (err: any) {
        // Se retornar 404, apenas mantém os valores vazios padrão
        if (err.response?.status !== 404) {
          console.warn('Erro ao carregar dados fiscais:', err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    loadFiscalConfig();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        cnpj: cnpj.trim(),
        inscricaoMunicipal: inscricaoMunicipal.trim() || null,
        inscricaoEstadual: inscricaoEstadual.trim() || null,
        regimeTributario: Number(regimeTributario),
        optanteSimples,
        aliquotaISS: parseFloat(aliquotaISS) || 2.0,
        focusTokenSandbox: focusTokenSandbox.trim() || null,
      };

      await api.post('/fiscal/config', payload);
      Alert.alert('Sucesso', 'Configurações fiscais salvas com sucesso!');
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.message || 'Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCertificate = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Algumas versões de Android barram .pfx se colocar mimeType estrito, então usa curinga
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) return;
      
      const file = res.assets[0];
      if (!file.name.toLowerCase().endsWith('.pfx') && !file.name.toLowerCase().endsWith('.p12')) {
        Alert.alert('Formato Inválido', 'Por favor, selecione um arquivo de certificado com extensão .pfx ou .p12');
        return;
      }

      // Solicitar a senha do certificado
      Alert.prompt(
        'Senha do Certificado',
        'Por favor, insira a senha do certificado digital A1 selecionado:',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar',
            onPress: async (password?: string) => {
              if (!password) {
                Alert.alert('Erro', 'Senha do certificado é obrigatória.');
                return;
              }
              
              setUploadingCert(true);
              try {
                // Ler o arquivo em formato Base64
                const base64File = await FileSystem.readAsStringAsync(file.uri, {
                  encoding: 'base64',
                });

                await api.post('/fiscal/certificate', {
                  base64File,
                  password,
                });

                setHasCertificate(true);
                Alert.alert('Sucesso', 'Certificado digital A1 configurado com sucesso na Focus NFe!');
              } catch (err: any) {
                Alert.alert('Falha no Certificado', err.response?.data?.message || 'Ocorreu um erro ao processar o certificado.');
              } finally {
                setUploadingCert(false);
              }
            }
          }
        ],
        'secure-text'
      );
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao abrir seletor de arquivos.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b66ff" />
        <Text style={styles.loadingText}>Carregando módulo fiscal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HEADER */}
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={20} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.tabTitle}>Módulo Fiscal</Text>
        </View>

        {/* CARD INFORMATIVO CERTIFICADO */}
        <View style={styles.certCard}>
          <View style={styles.certCardHeader}>
            <View style={[styles.certBadgeBg, { backgroundColor: hasCertificate ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
              {hasCertificate ? (
                <FileCheck2 size={24} color="#22c55e" />
              ) : (
                <UploadCloud size={24} color="#ef4444" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.certCardTitle}>Certificado Digital A1</Text>
              <Text style={styles.certCardDesc}>
                {hasCertificate 
                  ? 'Configurado e ativo. Suas notas serão assinadas em lote na nuvem.'
                  : 'Pendente de upload. Envie seu arquivo .pfx para emitir notas fiscais.'
                }
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.certUploadBtn, { borderColor: hasCertificate ? '#22c55e' : '#3b66ff' }]}
            onPress={handleUploadCertificate}
            disabled={uploadingCert}
          >
            {uploadingCert ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.certUploadBtnText, { color: hasCertificate ? '#22c55e' : '#3b66ff' }]}>
                {hasCertificate ? 'Substituir Certificado A1' : 'Selecionar Certificado A1 (.PFX)'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* FORMULÁRIO CONFIGURAÇÃO FISCAL */}
        <View style={styles.formCard}>
          <Text style={styles.sectionHeading}>DADOS TRIBUTÁRIOS & CREDENCIAIS</Text>

          <Text style={styles.inputLabel}>CNPJ para Emissão *</Text>
          <TextInput
            value={cnpj}
            onChangeText={setCnpj}
            placeholder="00.000.000/0001-00"
            placeholderTextColor="#475569"
            maxLength={20}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <Text style={styles.inputLabel}>Inscrição Municipal (NFS-e)</Text>
          <TextInput
            value={inscricaoMunicipal}
            onChangeText={setInscricaoMunicipal}
            placeholder="Digite a inscrição municipal"
            placeholderTextColor="#475569"
            maxLength={30}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <Text style={styles.inputLabel}>Inscrição Estadual (NF-e)</Text>
          <TextInput
            value={inscricaoEstadual}
            onChangeText={setInscricaoEstadual}
            placeholder="Digite a inscrição estadual"
            placeholderTextColor="#475569"
            maxLength={30}
            keyboardType="numeric"
            style={styles.formInput}
          />

          <Text style={styles.inputLabel}>Regime Tributário *</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity 
              style={[styles.pickerBtn, regimeTributario === '1' && styles.pickerBtnActive]}
              onPress={() => setRegimeTributario('1')}
            >
              <Text style={[styles.pickerBtnText, regimeTributario === '1' && styles.pickerBtnTextActive]}>Simples Nacional</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.pickerBtn, regimeTributario === '3' && styles.pickerBtnActive]}
              onPress={() => setRegimeTributario('3')}
            >
              <Text style={[styles.pickerBtnText, regimeTributario === '3' && styles.pickerBtnTextActive]}>Regime Normal</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.switchLabel}>Microempresa Optante pelo Simples</Text>
              <Text style={styles.switchDesc}>Define enquadramento de incentivo fiscal da lei complementar 123.</Text>
            </View>
            <Switch
              value={optanteSimples}
              onValueChange={setOptanteSimples}
              trackColor={{ false: '#1e293b', true: '#3b66ff' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.inputLabel}>Alíquota Padrão de ISS (%)</Text>
          <TextInput
            value={aliquotaISS}
            onChangeText={setAliquotaISS}
            placeholder="2.00"
            placeholderTextColor="#475569"
            maxLength={5}
            keyboardType="decimal-pad"
            style={styles.formInput}
          />

          <Text style={styles.inputLabel}>Token de Homologação Focus NFe</Text>
          <TextInput
            value={focusTokenSandbox}
            onChangeText={setFocusTokenSandbox}
            placeholder="Insira seu token Focus NFe"
            placeholderTextColor="#475569"
            secureTextEntry
            autoCapitalize="none"
            style={styles.formInput}
          />
          <Text style={styles.fieldHint}>
            Insira "sandbox_mock" para testar o sistema fiscal localmente em modo simulação.
          </Text>

          <TouchableOpacity onPress={handleSaveConfig} style={styles.saveBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Salvar Configuração Fiscal</Text>
            )}
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
  certCard: {
    backgroundColor: '#0f1115',
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  certCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  certBadgeBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  certCardDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  certUploadBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  certUploadBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
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
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    marginTop: 2,
  },
  pickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerBtnActive: {
    backgroundColor: '#3b66ff',
    borderColor: '#3b66ff',
  },
  pickerBtnText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pickerBtnTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginVertical: 10,
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
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  fieldHint: {
    fontSize: 10,
    color: '#64748b',
    marginTop: -6,
    marginBottom: 10,
    lineHeight: 14,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#090b0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
});
