import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { ChevronRight, Package, Settings, ArrowLeft, Plus, Search, Edit2, Trash2, X } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency } from '../utils/formatters';
import { ServiceItem, PartItem } from '../types';

interface MoreScreenProps {
  moreSubScreen: 'menu' | 'catalog' | 'settings';
  setMoreSubScreen: (subScreen: 'menu' | 'catalog' | 'settings') => void;
  catalogSegment: 'services' | 'parts';
  setCatalogSegment: (segment: 'services' | 'parts') => void;
  catalogSearch: string;
  setCatalogSearch: (search: string) => void;
  onAddCatalogService: () => void;
  onEditCatalogService: (service: ServiceItem) => void;
  onAddCatalogPart: () => void;
  onEditCatalogPart: (part: PartItem) => void;
  handleExportBackup: () => void;
  handleImportBackup: () => void;
  handleExportCsv: () => void;
  handleResetDatabase: () => void;
}

export default function MoreScreen({
  moreSubScreen,
  setMoreSubScreen,
  catalogSegment,
  setCatalogSegment,
  catalogSearch,
  setCatalogSearch,
  onAddCatalogService,
  onEditCatalogService,
  onAddCatalogPart,
  onEditCatalogPart,
  handleExportBackup,
  handleImportBackup,
  handleExportCsv,
  handleResetDatabase,
}: MoreScreenProps) {
  const { services, parts, settings, updateSettings, deleteService, deletePart } = useDatabase();

  const filteredServices = useMemo(() => {
    return services.filter(s =>
      s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(catalogSearch.toLowerCase()))
    );
  }, [services, catalogSearch]);

  const filteredParts = useMemo(() => {
    return parts.filter(p =>
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(catalogSearch.toLowerCase())) ||
      (p.supplier && p.supplier.toLowerCase().includes(catalogSearch.toLowerCase()))
    );
  }, [parts, catalogSearch]);

  const handleRemoveService = (id: string) => {
    Alert.alert(
      'Excluir Serviço',
      'Tem certeza que deseja remover este serviço do catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteService(id);
            if (success) {
              Alert.alert('Sucesso', 'Serviço removido com sucesso!');
            }
          }
        }
      ]
    );
  };

  const handleRemovePart = (id: string) => {
    Alert.alert(
      'Excluir Peça',
      'Tem certeza que deseja remover esta peça do catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePart(id);
            if (success) {
              Alert.alert('Sucesso', 'Peça removida com sucesso!');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      {/* 1. MENU PRINCIPAL */}
      {moreSubScreen === 'menu' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.tabTitle}>Mais Opções</Text>
          <Text style={[styles.menuCardSub, { marginBottom: 15 }]}>Ferramentas SaaS de suporte administrativo</Text>

          <TouchableOpacity
            style={[styles.card, styles.menuCard]}
            onPress={() => {
              setMoreSubScreen('catalog');
              setCatalogSegment('services');
              setCatalogSearch('');
            }}
          >
            <View style={styles.menuCardLeft}>
              <View style={styles.menuIconContainer}>
                <Package size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuCardTitle}>Catálogo de Serviços e Peças</Text>
                <Text style={styles.menuCardSub}>Configure preços e quantidade em estoque.</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.menuCard]}
            onPress={() => setMoreSubScreen('settings')}
          >
            <View style={styles.menuCardLeft}>
              <View style={styles.menuIconContainer}>
                <Settings size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuCardTitle}>Dados da Oficina & Configurações</Text>
                <Text style={styles.menuCardSub}>Edite CNPJ, cabeçalho de PDFs e backups.</Text>
              </View>
            </View>
            <ChevronRight size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* 2. SUB MENU: CATALOG */}
      {moreSubScreen === 'catalog' && (
        <View style={{ flex: 1 }}>
          <View style={styles.screenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={() => setMoreSubScreen('menu')}>
              <ArrowLeft size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.backButtonText}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (catalogSegment === 'services') onAddCatalogService();
                else onAddCatalogPart();
              }}
            >
              <Plus size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Cadastrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.segmentContainer}>
            <TouchableOpacity
              onPress={() => setCatalogSegment('services')}
              style={[styles.segmentTab, catalogSegment === 'services' ? styles.segmentTabActive : null]}
            >
              <Text style={[styles.segmentTabText, catalogSegment === 'services' ? styles.segmentTabTextActive : null]}>
                Serviços ({services.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCatalogSegment('parts')}
              style={[styles.segmentTab, catalogSegment === 'parts' ? styles.segmentTabActive : null]}
            >
              <Text style={[styles.segmentTabText, catalogSegment === 'parts' ? styles.segmentTabTextActive : null]}>
                Peças ({parts.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBarWrapper}>
            <Search size={14} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar no catálogo..."
              placeholderTextColor="#475569"
              value={catalogSearch}
              onChangeText={setCatalogSearch}
              style={styles.searchBarInput}
            />
            {catalogSearch !== '' && (
              <TouchableOpacity onPress={() => setCatalogSearch('')}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 8 }}>
            {catalogSegment === 'services' ? (
              filteredServices.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum serviço encontrado.</Text>
              ) : (
                filteredServices.map(item => (
                  <View key={item.id} style={styles.catalogListItem}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      {item.code ? <Text style={styles.catalogItemCodeBadge}>{item.code}</Text> : null}
                    </View>
                    <View style={styles.catalogItemRight}>
                      <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.price)}</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={styles.itemActionEdit}
                          onPress={() => onEditCatalogService(item)}
                        >
                          <Edit2 size={10} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.itemActionDelete}
                          onPress={() => handleRemoveService(item.id)}
                        >
                          <Trash2 size={10} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )
            ) : (
              filteredParts.length === 0 ? (
                <Text style={styles.emptyText}>Nenhuma peça encontrada.</Text>
              ) : (
                filteredParts.map(item => (
                  <View key={item.id} style={styles.catalogListItem}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.catalogItemName}>{item.name}</Text>
                      <Text style={styles.catalogItemMeta}>SKU: {item.code} | Forn: {item.supplier}</Text>
                    </View>
                    <View style={styles.catalogItemRight}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.catalogItemPriceVal}>{formatCurrency(item.salePrice)}</Text>
                        <Text style={styles.catalogItemStock}>Estoque: {item.stock}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity
                          style={styles.itemActionEdit}
                          onPress={() => onEditCatalogPart(item)}
                        >
                          <Edit2 size={10} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.itemActionDelete}
                          onPress={() => handleRemovePart(item.id)}
                        >
                          <Trash2 size={10} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* 3. SUB MENU: SETTINGS */}
      {moreSubScreen === 'settings' && (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <TouchableOpacity style={[styles.backButton, { marginBottom: 12 }]} onPress={() => setMoreSubScreen('menu')}>
            <ArrowLeft size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.backButtonText}>Menu</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Dados Comerciais</Text>
            
            <Text style={styles.formLabel}>Nome Fantasia</Text>
            <TextInput
              value={settings.name}
              onChangeText={t => updateSettings({ name: t })}
              style={styles.formInput}
            />

            <Text style={styles.formLabel}>CNPJ</Text>
            <TextInput
              value={settings.cnpj}
              onChangeText={t => updateSettings({ cnpj: t })}
              style={styles.formInput}
            />

            <Text style={styles.formLabel}>Endereço Comercial</Text>
            <TextInput
              value={settings.address}
              onChangeText={t => updateSettings({ address: t })}
              style={styles.formInput}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Telefone Comercial</Text>
                <TextInput
                  value={settings.phone}
                  onChangeText={t => updateSettings({ phone: t })}
                  style={styles.formInput}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>WhatsApp</Text>
                <TextInput
                  value={settings.whatsapp}
                  onChangeText={t => updateSettings({ whatsapp: t })}
                  style={styles.formInput}
                />
              </View>
            </View>

            <Text style={styles.formLabel}>E-mail de Contato</Text>
            <TextInput
              value={settings.email}
              onChangeText={t => updateSettings({ email: t })}
              style={styles.formInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>URL do Logotipo (.png/.jpg)</Text>
            <TextInput
              value={settings.logoUrl}
              onChangeText={t => updateSettings({ logoUrl: t })}
              style={styles.formInput}
              autoCapitalize="none"
            />

            <Text style={styles.formLabel}>Notas de Rodapé do PDF</Text>
            <TextInput
              value={settings.pdfNotes}
              onChangeText={t => updateSettings({ pdfNotes: t })}
              style={styles.formInput}
            />

            {/* Toggle autoSequence */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.toggleTitle}>Numeração de OS automática</Text>
                <Text style={styles.toggleSubtitle}>Gera OS-0001, OS-0002 em sequência</Text>
              </View>
              <TouchableOpacity
                onPress={() => updateSettings({ autoSequence: !settings.autoSequence })}
                style={[
                  styles.toggleButton,
                  settings.autoSequence ? { backgroundColor: theme.colors.primary, alignItems: 'flex-end' } : { backgroundColor: theme.colors.border, alignItems: 'flex-start' }
                ]}
              >
                <View style={styles.toggleDot} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Backup & Segurança</Text>
            <Text style={styles.backupDetails}>Exporte seus cadastros de clientes, carros e finanças para segurança física offline, permitindo restaurar a qualquer momento.</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.backupActionButton}
                onPress={handleExportBackup}
              >
                <Text style={styles.backupActionButtonText}>Exportar JSON</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backupActionButton}
                onPress={handleImportBackup}
              >
                <Text style={styles.backupActionButtonText}>Importar JSON</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.excelExportButton}
              onPress={handleExportCsv}
            >
              <Text style={styles.excelExportText}>Exportar Ordens (Excel .CSV)</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetDatabase}
            >
              <Text style={styles.resetButtonText}>Resetar Base de Dados (Limpar Tudo)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
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
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.roundness.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.roundness.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.roundness.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: theme.colors.card,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  segmentTabTextActive: {
    color: theme.colors.primary,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: theme.spacing.md,
  },
  searchBarInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  menuCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderColor: theme.colors.border,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  menuIconContainer: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  menuTextContainer: {
    flex: 1,
    paddingRight: 6,
  },
  menuCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  menuCardSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  catalogListItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogItemName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  catalogItemCodeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 102, 255, 0.3)',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  catalogItemMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  catalogItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  catalogItemPriceVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
  catalogItemStock: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  itemActionEdit: {
    padding: 6,
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    borderRadius: 6,
  },
  itemActionDelete: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    minHeight: 48,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  toggleTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  toggleSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  backupDetails: {
    fontSize: 11,
    color: theme.colors.textDim,
    lineHeight: 16,
  },
  backupActionButton: {
    flex: 1,
    backgroundColor: theme.colors.inputBg,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  backupActionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  excelExportButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    minHeight: 44,
  },
  excelExportText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  resetButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    minHeight: 44,
  },
  resetButtonText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
