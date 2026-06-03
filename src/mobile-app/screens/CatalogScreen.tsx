import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit2, AlertTriangle, Package, Shield, Settings, Info, ArrowLeft, Tag, DollarSign, Archive, X } from 'lucide-react';
import { useDatabase, ServiceItem, PartItem } from '../context/DatabaseContext';

export const CatalogScreen: React.FC = () => {
  const { 
    services, parts, 
    addService, updateService, deleteService,
    addPart, updatePart, deletePart 
  } = useDatabase();

  const [activeSegment, setActiveSegment] = useState<'services' | 'parts'>('services');
  const [search, setSearch] = useState('');
  
  // Overlay states
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Service Form State
  const [serviceForm, setServiceForm] = useState({ name: '', code: '', description: '', price: '' });
  
  // Part Form State
  const [partForm, setPartForm] = useState({
    name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: ''
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- FILTERS ---
  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  // --- ACTIONS ---
  const handleSubmitService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name || !serviceForm.price) return alert('Preencha os campos obrigatórios!');
    
    if (editingItemId) {
      updateService(editingItemId, {
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
        price: parseFloat(serviceForm.price)
      });
      setEditingItemId(null);
    } else {
      addService({
        name: serviceForm.name,
        code: serviceForm.code.toUpperCase(),
        description: serviceForm.description,
        price: parseFloat(serviceForm.price)
      });
    }

    setIsAddingItem(false);
    setServiceForm({ name: '', code: '', description: '', price: '' });
  };

  const handleSubmitPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.name || !partForm.code || !partForm.salePrice || !partForm.stock) {
      return alert('Preencha os campos obrigatórios!');
    }

    if (editingItemId) {
      updatePart(editingItemId, {
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || 'Fornecedor avulso',
        purchasePrice: parseFloat(partForm.purchasePrice) || 0,
        salePrice: parseFloat(partForm.salePrice),
        stock: parseInt(partForm.stock)
      });
      setEditingItemId(null);
    } else {
      addPart({
        name: partForm.name,
        code: partForm.code.toUpperCase(),
        supplier: partForm.supplier || 'Fornecedor avulso',
        purchasePrice: parseFloat(partForm.purchasePrice) || 0,
        salePrice: parseFloat(partForm.salePrice),
        stock: parseInt(partForm.stock)
      });
    }

    setIsAddingItem(false);
    setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
  };

  const handleStartEditService = (item: ServiceItem) => {
    setEditingItemId(item.id);
    setServiceForm({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      price: item.price.toString()
    });
    setIsAddingItem(true);
  };

  const handleStartEditPart = (item: PartItem) => {
    setEditingItemId(item.id);
    setPartForm({
      name: item.name,
      code: item.code,
      supplier: item.supplier || '',
      purchasePrice: item.purchasePrice.toString(),
      salePrice: item.salePrice.toString(),
      stock: item.stock.toString()
    });
    setIsAddingItem(true);
  };

  const handleCancel = () => {
    setIsAddingItem(false);
    setEditingItemId(null);
    setServiceForm({ name: '', code: '', description: '', price: '' });
    setPartForm({ name: '', code: '', supplier: '', purchasePrice: '', salePrice: '', stock: '' });
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Deseja excluir este serviço do catálogo?')) deleteService(id);
  };

  const handleDeletePart = (id: string) => {
    if (confirm('Deseja excluir esta peça do catálogo?')) deletePart(id);
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none animate-slide-up">
      
      {/* 1. LIST VIEW */}
      {!isAddingItem && (
        <div className="flex flex-col space-y-5 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">Catálogo</h2>
              <p className="text-sm text-slate-400">Serviços e estoque de peças</p>
            </div>
            <button
              onClick={() => setIsAddingItem(true)}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-premium flex items-center justify-center gap-1.5 text-sm font-bold transition-all active:scale-95"
            >
              <Plus size={16} />
              Novo
            </button>
          </div>

          {/* Sliding segment controller */}
          <div className="flex bg-dark-900 border border-dark-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => {
                setActiveSegment('services');
                setSearch('');
              }}
              className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeSegment === 'services' ? 'bg-brand-500 text-white shadow-premium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Tag size={14} />
              Serviços ({services.length})
            </button>
            <button
              onClick={() => {
                setActiveSegment('parts');
                setSearch('');
              }}
              className={`flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeSegment === 'parts' ? 'bg-brand-500 text-white shadow-premium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Package size={14} />
              Peças ({parts.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder={activeSegment === 'services' ? "Buscar serviços..." : "Buscar peças por nome, SKU..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4.5 py-3 h-12 text-sm text-slate-200 placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-dark-500 hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Lists content */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-3.5">
            {/* Services List Rendering */}
            {activeSegment === 'services' && (
              filteredServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-dark-500">
                  <h4 className="text-sm font-bold text-slate-400 mt-2">Nenhum serviço catalogado</h4>
                </div>
              ) : (
                filteredServices.map(item => (
                  <div key={item.id} className="bg-dark-900 border border-dark-800 rounded-2xl p-4.5 flex items-start justify-between">
                    <div className="space-y-1.5 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-100">{item.name}</span>
                        {item.code && (
                          <span className="text-[10px] font-mono bg-dark-950 border border-dark-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                            {item.code}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3.5 flex-shrink-0 text-right">
                      <div>
                        <div className="font-black text-sm text-brand-400">{formatCurrency(item.price)}</div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mão de obra</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleStartEditService(item)}
                          className="p-1.5 hover:bg-dark-850 text-slate-400 hover:text-brand-400 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(item.id)}
                          className="p-1.5 hover:bg-danger-500/10 text-slate-500 hover:text-danger-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Parts List Rendering */}
            {activeSegment === 'parts' && (
              filteredParts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-dark-500">
                  <h4 className="text-sm font-bold text-slate-400 mt-2">Nenhuma peça no estoque</h4>
                </div>
              ) : (
                filteredParts.map(item => {
                  // Determine stock color badge
                  let stockColor = 'bg-success-500/10 text-success-500 border-success-500/20';
                  let stockLabel = `Estoque: ${item.stock}`;
                  if (item.stock === 0) {
                    stockColor = 'bg-danger-500/10 text-danger-500 border-danger-500/20';
                    stockLabel = 'Sem estoque';
                  } else if (item.stock <= 5) {
                    stockColor = 'bg-warning-500/10 text-warning-500 border-warning-500/20';
                    stockLabel = `Estoque Baixo: ${item.stock}`;
                  }

                  return (
                    <div key={item.id} className="bg-dark-900 border border-dark-800 rounded-2xl p-4.5 flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-100">{item.name}</span>
                            <span className="text-[10px] font-mono bg-dark-950 border border-dark-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                              {item.code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Forn: <span className="font-semibold text-slate-350">{item.supplier}</span>
                          </div>
                        </div>
                        
                        <div className={`text-xs font-bold px-2.5 py-0.5 border rounded-full flex items-center gap-1 ${stockColor}`}>
                          {item.stock <= 5 && item.stock > 0 && <AlertTriangle size={11} />}
                          {stockLabel}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-dark-800 pt-3 text-xs">
                        <div className="flex gap-4">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Compra:</span>
                            <span className="font-bold text-slate-300">{formatCurrency(item.purchasePrice)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-brand-400 block font-bold">Venda:</span>
                            <span className="font-black text-brand-400">{formatCurrency(item.salePrice)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-success-500 block font-bold">Lucro:</span>
                            <span className="font-extrabold text-success-500">{formatCurrency(item.salePrice - item.purchasePrice)}</span>
                          </div>
                        </div>

                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => handleStartEditPart(item)}
                            className="p-1.5 hover:bg-dark-850 text-slate-400 hover:text-brand-400 rounded-lg transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeletePart(item.id)}
                            className="p-1.5 hover:bg-danger-500/10 text-slate-500 hover:text-danger-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}

      {/* 2. OVERLAY FORM: ADD NEW ITEM */}
      {isAddingItem && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-dark-800 pb-3 mb-5">
            <button onClick={handleCancel} className="p-1.5 hover:bg-dark-800 text-slate-300 rounded-lg transition-colors">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-base font-black text-slate-100">
              {editingItemId ? 'Editar' : 'Cadastrar'} {activeSegment === 'services' ? 'Serviço' : 'Peça'}
            </h3>
          </div>

          {/* Forms Body */}
          {activeSegment === 'services' ? (
            /* Service Form */
            <form onSubmit={handleSubmitService} className="flex-1 overflow-y-auto no-scrollbar space-y-4.5 pb-20">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alinhamento de Direção 3D"
                  value={serviceForm.name}
                  onChange={e => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Código / Referência</label>
                  <input
                    type="text"
                    placeholder="Ex: SRV-ALIN"
                    value={serviceForm.code}
                    onChange={e => setServiceForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Valor Cobrado *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="120.00"
                      value={serviceForm.price}
                      onChange={e => setServiceForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Descrição do Serviço</label>
                <textarea
                  placeholder="Descreva o que é executado nesse procedimento..."
                  value={serviceForm.description}
                  onChange={e => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3.5 text-sm bg-dark-800 hover:bg-dark-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-premium transition-all active:scale-98"
                >
                  {editingItemId ? 'Atualizar Serviço' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          ) : (
            /* Part Form */
            <form onSubmit={handleSubmitPart} className="flex-1 overflow-y-auto no-scrollbar space-y-4.5 pb-20">
              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Nome da Peça *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pastilha de Freio Dianteira"
                  value={partForm.name}
                  onChange={e => setPartForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Código SKU/Peça *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PAS-COB150"
                    value={partForm.code}
                    onChange={e => setPartForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Estoque *</label>
                  <input
                    type="number"
                    required
                    placeholder="12"
                    value={partForm.stock}
                    onChange={e => setPartForm(prev => ({ ...prev, stock: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Fornecedor</label>
                <input
                  type="text"
                  placeholder="Ex: Distribuidora Real de AutoPeças"
                  value={partForm.supplier}
                  onChange={e => setPartForm(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Valor de Compra</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="65.00"
                      value={partForm.purchasePrice}
                      onChange={e => setPartForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">Valor de Venda *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="130.00"
                      value={partForm.salePrice}
                      onChange={e => setPartForm(prev => ({ ...prev, salePrice: e.target.value }))}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-3 h-12 text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3.5 text-sm bg-dark-800 hover:bg-dark-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 text-sm bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-premium transition-all active:scale-98"
                >
                  {editingItemId ? 'Atualizar Peça' : 'Salvar Peça'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
