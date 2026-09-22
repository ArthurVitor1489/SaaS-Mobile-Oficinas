import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Shield, FileText } from 'lucide-react-native';
import { theme, useTheme } from '../styles/theme';

interface TermsPrivacyModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export default function TermsPrivacyModal({ visible, onClose, initialTab = 'terms' }: TermsPrivacyModalProps) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Shield size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Informações Legais & Segurança</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* TAB SELECTOR */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              onPress={() => setActiveTab('terms')}
              style={[styles.tabItem, activeTab === 'terms' && { backgroundColor: isDark ? 'rgba(59, 102, 255, 0.15)' : 'rgba(59, 102, 255, 0.1)' }]}
            >
              <FileText size={15} color={activeTab === 'terms' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'terms' && { color: colors.primary }]}>
                Termos de Uso
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('privacy')}
              style={[styles.tabItem, activeTab === 'privacy' && { backgroundColor: isDark ? 'rgba(59, 102, 255, 0.15)' : 'rgba(59, 102, 255, 0.1)' }]}
            >
              <Shield size={15} color={activeTab === 'privacy' ? colors.primary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'privacy' && { color: colors.primary }]}>
                Privacidade (LGPD)
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {activeTab === 'terms' ? (
              <View>
                <Text style={styles.sectionHeading}>TERMOS DE USO DO SERVIÇO (MECÂNICAPRO)</Text>
                <Text style={styles.lastUpdated}>Última atualização: Setembro de 2026</Text>

                <Text style={styles.paragraphTitle}>1. Aceitação dos Termos</Text>
                <Text style={styles.paragraph}>
                  Ao criar uma conta ou utilizar o aplicativo MecânicaPro, você concorda expressamente com estes Termos de Uso e com todas as leis e regulamentos aplicáveis. Se você não concordar com qualquer um destes termos, não utilize o aplicativo.
                </Text>

                <Text style={styles.paragraphTitle}>2. Finalidade da Plataforma</Text>
                <Text style={styles.paragraph}>
                  O MecânicaPro é um software de gestão (SaaS) voltado a oficinas mecânicas, centros automotivos e reparadores independentes, disponibilizando ferramentas para gestão de ordens de serviço, cadastro de clientes, veículos, estoque e controle financeiro.
                </Text>

                <Text style={styles.paragraphTitle}>3. Planos, Assinaturas e Período de Testes</Text>
                <Text style={styles.paragraph}>
                  • Oferecemos um período de avaliação gratuita (Trial) de 30 dias para novas oficinas.{'\n'}
                  • As assinaturas são processadas de forma segura diretamente pela Google Play Store.{'\n'}
                  • A renovação da assinatura ocorre automaticamente no encerramento de cada período faturado, podendo ser cancelada a qualquer momento nas configurações de assinaturas da sua conta Google Play.{'\n'}
                  • Em caso de inadimplência, o aplicativo entra em período de tolerância de 7 dias antes da transição para o Modo Leitura.
                </Text>

                <Text style={styles.paragraphTitle}>4. Responsabilidade pelos Dados</Text>
                <Text style={styles.paragraph}>
                  A veracidade dos dados cadastrados de clientes, peças, valores e ordens de serviço é de inteira responsabilidade do usuário da oficina. O MecânicaPro não se responsabiliza por obrigações fiscais ou orçamentos divergentes acordados entre a oficina e seus clientes finais.
                </Text>

                <Text style={styles.paragraphTitle}>5. Exclusão de Conta e Rescisão</Text>
                <Text style={styles.paragraph}>
                  Você pode solicitar a exclusão definitiva da sua conta e de todos os dados da sua oficina a qualquer momento diretamente no menu Configurações do aplicativo.
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.sectionHeading}>POLÍTICA DE PRIVACIDADE & PROTEÇÃO DE DADOS</Text>
                <Text style={styles.lastUpdated}>Em conformidade com a LGPD (Lei Federal nº 13.709/2018)</Text>

                <Text style={styles.paragraphTitle}>1. Informações que Coletamos</Text>
                <Text style={styles.paragraph}>
                  Para a correta prestação do serviço, coletamos apenas os dados essenciais:{'\n'}
                  • Dados da sua Oficina: Nome comercial, CNPJ, e-mail, telefone/WhatsApp e endereço.{'\n'}
                  • Dados Operacionais inseridos por você: Nomes e contatos de clientes, dados de veículos (placa, modelo, ano) e itens das ordens de serviço.
                </Text>

                <Text style={styles.paragraphTitle}>2. Armazenamento e Segurança</Text>
                <Text style={styles.paragraph}>
                  Todos os dados trafegam por conexões seguras criptografadas (HTTPS / TLS) e são armazenados em infraestrutura de nuvem moderna e protegida. Realizamos backups automáticos periódicos para garantir a disponibilidade dos dados da sua oficina.
                </Text>

                <Text style={styles.paragraphTitle}>3. Não Compartilhamento com Terceiros</Text>
                <Text style={styles.paragraph}>
                  Não vendemos, não alugamos e não compartilhamos dados de clientes ou veículos cadastrados por sua oficina com corretores de dados, parceiros comerciais ou redes de anúncios. Os dados pertencem exclusivamente à sua oficina.
                </Text>

                <Text style={styles.paragraphTitle}>4. Seus Direitos (LGPD)</Text>
                <Text style={styles.paragraph}>
                  Você possui o direito a qualquer momento de:{'\n'}
                  • Acessar, corrigir e atualizar os dados cadastrais da sua oficina;{'\n'}
                  • Exportar cópia completa de segurança em formato JSON ou relatórios em planilha Excel (.CSV);{'\n'}
                  • Excluir completamente todos os dados da conta e registros associados através do botão "Excluir Minha Conta" nas configurações.
                </Text>

                <Text style={styles.paragraphTitle}>5. Contato com o Encarregado de Dados (DPO)</Text>
                <Text style={styles.paragraph}>
                  Em caso de dúvidas sobre nossa política de privacidade ou solicitações relacionadas à proteção de dados, utilize o canal de suporte via WhatsApp disponível no menu do aplicativo.
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.acceptBtn}>
            <Text style={styles.acceptBtnText}>Entendi e Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0f1115',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#181c24',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.15)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  content: {
    paddingBottom: 20,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 14,
    marginTop: 2,
  },
  paragraphTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 10,
  },
  acceptBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
});
