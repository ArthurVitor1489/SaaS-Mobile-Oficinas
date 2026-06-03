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
        <div className="flex flex-col space-y-5 h-full">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">Cobranças</h2>
            <p className="text-sm text-slate-400">Controle de recebimentos e parcelas</p>
          </div>

          {/* Search and Filters */}
          <div className="relative flex-shrink-0">
            <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Buscar por OS ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4.5 py-3 h-12 text-sm text-slate-200 placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-dark-500 hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Status Quick Slider filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 select-none flex-shrink-0">
            {['Todos', 'Pendente', 'Parcialmente pago', 'Pago', 'Cancelado'].map(st => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all border ${isActive ? 'bg-brand-500 text-white border-brand-500 shadow-premium' : 'bg-dark-900 text-slate-400 border-dark-800 hover:text-slate-200'}`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* Billings Cards List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-20">
            {filteredBillings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-dark-500">
                <span className="text-4xl">💰</span>
                <h4 className="text-sm font-bold text-slate-400 mt-2.5">Nenhuma cobrança encontrada</h4>
                <p className="text-xs text-dark-500 mt-1.5 max-w-[240px]">Fature ordens de serviço pendentes na aba de OS.</p>
              </div>
            ) : (
              filteredBillings.map(b => {
                const clientName = getBillingClientName(b.osId);
                const osNum = getBillingOSNumber(b.osId);

                // Badge and Card styling based on status
                let badgeColor = 'bg-brand-500/10 text-brand-400 border-brand-500/30';
                let statusBorder = 'border-brand-500/20 shadow-[0_0_12px_rgba(59,102,255,0.04)]';
                if (b.status === 'Pago') {
                  badgeColor = 'bg-success-500/10 text-success-500 border-success-500/30';
                  statusBorder = 'border-success-500/20 shadow-[0_0_12px_rgba(16,185,129,0.04)]';
                } else if (b.status === 'Parcialmente pago') {
                  badgeColor = 'bg-warning-500/10 text-warning-500 border-warning-500/30';
                  statusBorder = 'border-warning-500/20 shadow-[0_0_12px_rgba(245,158,11,0.04)]';
                } else if (b.status === 'Cancelado') {
                  badgeColor = 'bg-dark-800 text-slate-400 border-dark-700';
                  statusBorder = 'border-dark-800 shadow-none';
                }

                // Count paid installments
                const totalInstallments = b.installments.length;
                const paidInstallments = b.installments.filter(i => i.status === 'Pago').length;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBilling(b)}
                    className={`bg-dark-900 border-2 ${statusBorder} rounded-2xl p-4.5 flex items-center justify-between hover:border-brand-500/40 cursor-pointer transition-all active:bg-dark-800/50 animate-fade-in`}
                  >
                    <div className="space-y-1.5 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-brand-400">{osNum}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full uppercase ${badgeColor}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-100 line-clamp-1">{clientName}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        Método: <span className="font-bold text-slate-300">{b.paymentMethod}</span> • Parcelas:{' '}
                        <span className="font-black text-brand-400 bg-brand-500/10 px-1.5 py-0.25 rounded text-[10px]">
                          {paidInstallments}/{totalInstallments}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-3.5">
                      <div>
                        <div className="font-black text-sm text-slate-100">{formatCurrency(b.amount)}</div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 block">
                          Venc: {formatDate(b.dueDate)}
                        </span>
                      </div>
                      <ChevronRight size={18} className="text-dark-500" />
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
          <div className="flex items-center border-b border-dark-800 pb-3 mb-4">
            <button onClick={() => setSelectedBilling(null)} className="p-1.5 hover:bg-dark-800 text-slate-300 rounded-lg flex items-center gap-1.5 text-sm font-bold transition-colors">
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>

          {/* Header stats card */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4.5 mb-4 space-y-4 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cobrança da OS</span>
                <h3 className="text-base font-black text-brand-450 mt-0.5">{getBillingOSNumber(selectedBilling.osId)}</h3>
              </div>
              <div className={`text-[10px] font-extrabold px-2.5 py-0.5 border rounded-full uppercase ${
                selectedBilling.status === 'Pago' ? 'bg-success-500/10 text-success-500 border-success-500/20' : 
                selectedBilling.status === 'Parcialmente pago' ? 'bg-warning-500/10 text-warning-500 border-warning-500/20' :
                'bg-brand-500/10 text-brand-400 border-brand-500/20'
              }`}>
                {selectedBilling.status}
              </div>
            </div>

            <div className="border-t border-dark-800 pt-3.5 grid grid-cols-2 gap-3.5 text-xs text-slate-300 font-medium">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Cliente:</span>
                <span className="font-bold text-slate-100 line-clamp-1">{getBillingClientName(selectedBilling.osId)}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Forma de Recebimento:</span>
                <span className="font-bold text-slate-100">{selectedBilling.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Data Faturamento:</span>
                <span>{selectedBilling.createdAt ? selectedBilling.createdAt.split('T')[0].split('-').reverse().join('/') : formatDate(selectedBilling.dueDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[9px] tracking-wider">Valor Total:</span>
                <span className="font-black text-emerald-500 text-sm">{formatCurrency(selectedBilling.amount)}</span>
              </div>
            </div>
          </div>

          {/* Chronological List of Installments */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-4">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
              Lista Cronológica de Parcelas
            </span>

            <div className="space-y-3">
              {selectedBilling.installments.map((inst, index) => {
                const isPaid = inst.status === 'Pago';
                const instBorder = isPaid ? 'border-success-500/20 shadow-[0_0_12px_rgba(16,185,129,0.04)]' : 'border-dark-800 hover:border-dark-750';
                return (
                  <div
                    key={index}
                    className={`bg-dark-900 border-2 ${instBorder} rounded-2xl p-4.5 flex items-center justify-between transition-all`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-slate-200">
                          Parcela {inst.number} de {selectedBilling.installments.length}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-md uppercase ${
                          isPaid ? 'bg-success-500/10 text-success-500 border-success-500/20' : 'bg-warning-500/10 text-warning-500 border-warning-500/20'
                        }`}>
                          {inst.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                        <Calendar size={13} className="text-slate-500" />
                        <span>Vencimento: {formatDate(inst.dueDate)}</span>
                        {isPaid && inst.paidAt && (
                          <span className="text-slate-500 text-[10px] font-normal">
                            • Pago em: {inst.paidAt.split('T')[0].split('-').reverse().join('/')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <span className="font-black text-sm text-white">
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
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1 shadow-premium active:scale-95 transition-all"
                        >
                          <DollarSign size={13} />
                          Dar Baixa
                        </button>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-success-500/10 text-success-500 flex items-center justify-center border border-success-500/25">
                          <Check size={14} className="stroke-[3]" />
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
