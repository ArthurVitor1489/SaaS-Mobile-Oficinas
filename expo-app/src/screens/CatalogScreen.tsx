import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ArrowLeft, Search, X, Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';
import CatalogServiceModal from '../components/CatalogServiceModal';
import CatalogPartModal from '../components/CatalogPartModal';
import { ServiceItem, PartItem } from '../types';

export default function CatalogScreen() {
  const navigation = useNavigation<any>();
  const {
    services,
    parts,
    addService,
    updateService,
    deleteService,
    addPart,
    updatePart,
    deletePart
  } = useDatabase();

  const [catalogSegment, setCatalogSegment] = useState<'services' | 'parts'>('services');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Modals Visibility and Forms Trackers
  const [catalogServiceModalVisible, setCatalogServiceModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceInitialForm, setServiceInitialForm] = useState<any>(null);

  const [catalogPartModalVisible, setCatalogPartModalVisible] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [partInitialForm, setPartInitialForm] = useState<any>(null);

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

  const handleOpenCatalogServiceForCreate = () => {
    setEditingServiceId(null);
    setServiceInitialForm(null);
    setCatalogServiceModalVisible(true);
  };

  const handleOpenCatalogServiceForEdit = (item: ServiceItem) => {
    setEditingServiceId(item.id);
    setServiceInitialForm({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      price: item.price.toString()
    });
    setCatalogServiceModalVisible(true);
  };

  const handleCatalogServiceSubmit = async (form: any) => {
    let success = false;
    if (editingServiceId) {
      success = await updateService(editingServiceId, {
        name: form.name,
        code: form.code,
        description: form.description,
        price: parseFloat(form.price) || 0
      });
      if (success) {
        Alert.alert('Sucesso', 'Serviço atualizado!');
      }
    } else {
      const res = await addService({
        name: form.name,
        code: form.code,
        description: form.description,
        price: parseFloat(form.price) || 0
      });
      success = !!res;
      if (success) {
        Alert.alert('Sucesso', 'Serviço catalogado!');
      }
    }
    return success;
  };

  const handleOpenCatalogPartForCreate = () => {
    setEditingPartId(null);
    setPartInitialForm(null);
    setCatalogPartModalVisible(true);
  };

  const handleOpenCatalogPartForEdit = (item: PartItem) => {
    setEditingPartId(item.id);
    setPartInitialForm({
      name: item.name,
      code: item.code,
      supplier: item.supplier || '',
      purchasePrice: item.purchasePrice.toString(),
      salePrice: item.salePrice.toString(),
      stock: item.stock.toString()
    });
    setCatalogPartModalVisible(true);
  };

  const handleCatalogPartSubmit = async (form: any) => {
    let success = false;
    if (editingPartId) {
      success = await updatePart(editingPartId, {
        name: form.name,
        code: form.code,
        supplier: form.supplier,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        stock: parseInt(form.stock) || 0
      });
      if (success) {
        Alert.alert('Sucesso', 'Peça atualizada no catálogo!');
      }
    } else {
      const res = await addPart({
        name: form.name,
        code: form.code,
        supplier: form.supplier,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        salePrice: parseFloat(form.salePrice) || 0,
        stock: parseInt(form.stock) || 0
      });
      success = !!res;
      if (success) {
        Alert.alert('Sucesso', 'Peça adicionada ao catálogo!');
      }
    }
    return success;
  };

  const handleDeleteService = (id: string) => {
    Alert.alert(
      'Remover Serviço',
      'Deseja deletar este serviço do catálogo permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
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

  const handleDeletePart = (id: string) => {
    Alert.alert(
      'Remover Peça',
      'Deseja deletar esta peça do catálogo permanentemente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
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
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={catalogSegment === 'services' ? handleOpenCatalogServiceForCreate : handleOpenCatalogPartForCreate}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.actionButtonText}>
            {catalogSegment === 'services' ? 'Serviço' : 'Peça'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          onPress={() => setCatalogSegment('services')}
          style={[styles.segmentTab, catalogSegment === 'services' ? styles.segmentTabActive : null]}
        >
          <Text style={[styles.segmentTabText, catalogSegment === 'services' ? styles.segmentTabTextActive : null]}>
            Serviços
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCatalogSegment('parts')}
          style={[styles.segmentTab, catalogSegment === 'parts' ? styles.segmentTabActive : null]}
        >
          <Text style={[styles.segmentTabText, catalogSegment === 'parts' ? styles.segmentTabTextActive : null]}>
            Peças / Produtos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarWrapper}>
        <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Buscar no catálogo..."
          placeholderTextColor="#475569"
          value={catalogSearch}
          onChangeText={setCatalogSearch}
          style={styles.searchBarInput}
        />
        {catalogSearch !== '' && (
          <TouchableOpacity onPress={() => setCatalogSearch('')}>
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {catalogSegment === 'services' ? (
          filteredServices.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum serviço cadastrado.</Text>
          ) : (
            filteredServices.map(item => (
              <View key={item.id} style={styles.catalogCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  {item.code ? <Text style={styles.itemSub}>Cód: {item.code}</Text> : null}
                  {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleOpenCatalogServiceForEdit(item)}>
                      <Edit2 size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleDeleteService(item.id)}>
                      <Trash2 size={12} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )
        ) : (
          filteredParts.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma peça cadastrada.</Text>
          ) : (
            filteredParts.map(item => (
              <View key={item.id} style={styles.catalogCard}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemSub}>Cód/SKU: {item.code} • Forn: {item.supplier || '-'}</Text>
                  <Text style={styles.itemDesc}>Estoque: <Text style={{ color: item.stock > 0 ? theme.colors.success : theme.colors.error, fontWeight: 'bold' }}>{item.stock} un</Text></Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.itemPrice}>{formatCurrency(item.salePrice)}</Text>
                  <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>Custo: {formatCurrency(item.purchasePrice)}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleOpenCatalogPartForEdit(item)}>
                      <Edit2 size={12} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnIcon} onPress={() => handleDeletePart(item.id)}>
                      <Trash2 size={12} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      <CatalogServiceModal 
        visible={catalogServiceModalVisible}
        editingServiceId={editingServiceId}
        initialForm={serviceInitialForm}
        onClose={() => setCatalogServiceModalVisible(false)}
        onSubmit={handleCatalogServiceSubmit}
      />

      <CatalogPartModal 
        visible={catalogPartModalVisible}
        editingPartId={editingPartId}
        initialForm={partInitialForm}
        onClose={() => setCatalogPartModalVisible(false)}
        onSubmit={handleCatalogPartSubmit}
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
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.roundness.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
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
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
  catalogCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  itemSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: 'bold',
  },
  itemDesc: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 6,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: theme.colors.success,
  },
  actionBtnIcon: {
    padding: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
