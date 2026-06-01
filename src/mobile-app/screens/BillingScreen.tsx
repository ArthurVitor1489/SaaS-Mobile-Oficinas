import React, { useState } from 'react';
import { Search, Wallet, ChevronRight, X, ArrowLeft, Check, Calendar, HelpCircle, DollarSign, Filter } from 'lucide-react';
import { useDatabase, Billing, Client, WorkOrder, PaymentMethod, BillingStatus } from '../context/DatabaseContext';

export const BillingScreen: React.FC = () => {
  const { billings, clients, workOrders, payInstallment } = useDatabase();

  const [search, setSearch] = useState('');
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [statusFilter, setStatusFilter] = useState<BillingStatus | 'Todos'>('Todos');

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('/');
  };

  // --- FILTERS ---
  const filteredBillings = billings.filter(b => {
    const os = workOrders.find(o => o.id === b.osId);
    const client = clients.find(c => c.id === os?.clientId);
    
    const matchesSearch = 
      os?.osNumber.toLowerCase().includes(search.toLowerCase()) ||
      client?.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getBillingOSNumber = (osId: string) => {
    const os = workOrders.find(o => o.id === osId);
    return os ? os.osNumber : 'OS S/N';
  };

  const getBillingClientName = (osId: string) => {
    const os = workOrders.find(o => o.id === osId);
    const client = clients.find(c => c.id === os?.clientId);
    return client ? client.name : 'Cliente Avulso';
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none animate-slide-up">
      
      {/* 1. LIST VIEW OF ALL BILLINGS */}
      {!selectedBilling && (
        <div className="flex flex-col space-y-4 h-full">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Cobranças</h2>
            <p className="text-xs text-slate-400">Controle de recebimentos e parcelas</p>
          </div>

          {/* Search and Filters */}
          <div className="relative flex-shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por OS ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Quick Slider filter */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none flex-shrink-0">
            {['Todos', 'Pendente', 'Parcialmente pago', 'Pago', 'Cancelado'].map(st => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${isActive ? 'bg-brand-500 text-white border-brand-500 shadow-premium' : 'bg-dark-900 text-dark-400 border-dark-800 hover:text-slate-200'}`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Billings Cards List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-16">
            {filteredBillings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-dark-500">
                <span className="text-3xl">💰</span>
                <h4 className="text-xs font-bold text-slate-400 mt-2">Nenhuma cobrança encontrada</h4>
                <p className="text-[10px] text-dark-500 mt-1 max-w-[200px]">Fature ordens de serviço pendentes na aba de OS.</p>
              </div>
            ) : (
              filteredBillings.map(b => {
                const clientName = getBillingClientName(b.osId);
                const osNum = getBillingOSNumber(b.osId);

                // Badge colors
                let badgeColor = 'bg-brand-500/10 text-brand-400 border-brand-500/20';
                if (b.status === 'Pago') badgeColor = 'bg-success-500/10 text-success-500 border-success-500/20';
                else if (b.status === 'Parcialmente pago') badgeColor = 'bg-warning-500/10 text-warning-500 border-warning-500/20';
                else if (b.status === 'Cancelado') badgeColor = 'bg-dark-800 text-dark-400 border-dark-700';

                // Count paid installments
                const totalInstallments = b.installments.length;
                const paidInstallments = b.installments.filter(i => i.status === 'Pago').length;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBilling(b)}
                    className="bg-dark-900 border border-dark-800 rounded-xl p-3.5 flex items-center justify-between hover:border-dark-700 cursor-pointer transition-colors active:bg-dark-800/50 animate-fade-in"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-200">{osNum}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.25 border rounded-full uppercase ${badgeColor}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-300 line-clamp-1">{clientName}</div>
                      <div className="text-[9px] text-dark-400 font-medium">
                        Método: <span className="font-semibold text-dark-300">{b.paymentMethod}</span> • Parcelas:{' '}
                        <span className="font-bold text-brand-400">
                          {paidInstallments}/{totalInstallments}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div>
                        <div className="font-extrabold text-xs text-slate-200">{formatCurrency(b.amount)}</div>
                        <span className="text-[8px] text-dark-500 font-bold uppercase">
                          Venc: {formatDate(b.dueDate)}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-dark-500" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. DETAILED BILLING WITH CHRONOLOGICAL INSTALLMENTS */}
      {selectedBilling && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center border-b border-dark-800 pb-3 mb-3">
            <button onClick={() => setSelectedBilling(null)} className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg flex items-center gap-1 text-xs transition-colors">
              <ArrowLeft size={16} />
              Voltar
            </button>
          </div>

          {/* Header stats card */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 mb-4 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8px] uppercase font-bold text-dark-400 tracking-wider">Cobrança da OS</span>
                <h3 className="text-sm font-extrabold text-brand-400">{getBillingOSNumber(selectedBilling.osId)}</h3>
              </div>
              <div className={`text-[8px] font-bold px-2 py-0.5 border rounded-full uppercase ${
                selectedBilling.status === 'Pago' ? 'bg-success-500/10 text-success-500 border-success-500/20' : 
                selectedBilling.status === 'Parcialmente pago' ? 'bg-warning-500/10 text-warning-500 border-warning-500/20' :
                'bg-brand-500/10 text-brand-400 border-brand-500/20'
              }`}>
                {selectedBilling.status}
              </div>
            </div>

            <div className="border-t border-dark-800 pt-2 grid grid-cols-2 gap-2 text-[10px] text-dark-300 font-medium">
              <div>
                <span className="text-dark-500 block uppercase font-bold text-[8px]">Cliente:</span>
                <span className="font-bold text-slate-200 line-clamp-1">{getBillingClientName(selectedBilling.osId)}</span>
              </div>
              <div>
                <span className="text-dark-500 block uppercase font-bold text-[8px]">Forma de Recebimento:</span>
                <span className="font-bold text-slate-200">{selectedBilling.paymentMethod}</span>
              </div>
              <div>
                <span className="text-dark-500 block uppercase font-bold text-[8px]">Data Faturamento:</span>
                <span>{selectedBilling.createdAt ? selectedBilling.createdAt.split('T')[0].split('-').reverse().join('/') : formatDate(selectedBilling.dueDate)}</span>
              </div>
              <div>
                <span className="text-dark-500 block uppercase font-bold text-[8px]">Valor Total:</span>
                <span className="font-extrabold text-emerald-500 text-xs">{formatCurrency(selectedBilling.amount)}</span>
              </div>
            </div>
          </div>

          {/* Chronological List of Installments */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-3">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">
              Lista Cronológica de Parcelas
            </span>

            <div className="space-y-2">
              {selectedBilling.installments.map((inst, index) => {
                const isPaid = inst.status === 'Pago';
                return (
                  <div
                    key={index}
                    className={`border rounded-xl p-3 flex items-center justify-between transition-colors ${
                      isPaid 
                        ? 'bg-dark-900 border-success-500/20 text-slate-300' 
                        : 'bg-dark-900 border-dark-800 hover:border-dark-750 text-slate-100'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">
                          Parcela {inst.number} de {selectedBilling.installments.length}
                        </span>
                        <span className={`text-[7px] font-bold px-1.5 py-0.25 border rounded ${
                          isPaid ? 'bg-success-500/10 text-success-500 border-success-500/20' : 'bg-warning-500/10 text-warning-500 border-warning-500/20'
                        }`}>
                          {inst.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-[9px] text-dark-400 font-medium flex items-center gap-1.5">
                        <Calendar size={10} />
                        <span>Vencimento: {formatDate(inst.dueDate)}</span>
                        {isPaid && inst.paidAt && (
                          <span className="text-dark-500 text-[8px]">
                            • Pago em: {inst.paidAt.split('T')[0].split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-xs text-slate-200">
                        {formatCurrency(inst.amount)}
                      </span>

                      {/* Pay-off cash collection action */}
                      {!isPaid ? (
                        <button
                          onClick={() => {
                            payInstallment(selectedBilling.id, inst.number);
                            // Sincroniza visualmente no State local expandido
                            setSelectedBilling(prev => {
                              if (!prev) return null;
                              const updatedInstallments = prev.installments.map(i => 
                                i.number === inst.number ? { ...i, status: 'Pago' as const, paidAt: new Date().toISOString() } : i
                              );
                              const paidCount = updatedInstallments.filter(i => i.status === 'Pago').length;
                              const newStatus = paidCount === updatedInstallments.length ? 'Pago' as const : 'Parcialmente pago' as const;
                              return { ...prev, status: newStatus, installments: updatedInstallments };
                            });
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase rounded-lg flex items-center gap-0.5 shadow-sm active:scale-95 transition-all"
                        >
                          <DollarSign size={10} />
                          Dar Baixa
                        </button>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-success-500/10 text-success-500 flex items-center justify-center border border-success-500/20">
                          <Check size={11} className="stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
