import React from 'react';
import { Play, ClipboardList, CheckCircle, Wallet, Calendar, Users, Car, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

export const DashboardScreen: React.FC = () => {
  const { workOrders, clients, vehicles, billings, transactions } = useDatabase();

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- STATS CALCULATIONS ---
  const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;
  const osAndamento = workOrders.filter(o => o.status === 'Em andamento').length;
  const osConcluidas = workOrders.filter(o => o.status === 'Concluída').length;
  
  // Total to receive (amount in pending installments)
  const valorAReceber = billings.reduce((acc, b) => {
    if (b.status === 'Cancelado') return acc;
    const pendingSum = b.installments
      .filter(i => i.status === 'Pendente')
      .reduce((sum, i) => sum + i.amount, 0);
    return acc + pendingSum;
  }, 0);

  // Month Billing (Sum of all completed/delivered/in-progress OS created this calendar month)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const faturamentoMes = workOrders
    .filter(o => o.date.startsWith(currentMonthStr))
    .reduce((acc, o) => acc + o.grandTotal, 0);

  // Total cash inflow this month
  const totalRecebidoMes = transactions
    .filter(t => t.type === 'Entrada' && t.date.startsWith(currentMonthStr))
    .reduce((acc, t) => acc + t.amount, 0);

  // Total expenses this month
  const totalDespesasMes = transactions
    .filter(t => t.type === 'Saída' && t.date.startsWith(currentMonthStr))
    .reduce((acc, t) => acc + t.amount, 0);

  // Recent transactions list
  const recentTransactions = transactions.slice(0, 4);

  // Recent OS list
  const recentOS = workOrders.slice(0, 3);

  // --- MOCK CHART DATA GENERATION ---
  // Generate daily points for the last 5 days
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    
    const dayInflows = transactions
      .filter(t => t.type === 'Entrada' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    const dayOutflows = transactions
      .filter(t => t.type === 'Saída' && t.date === dateStr)
      .reduce((sum, t) => sum + t.amount, 0);

    return { dayName, inflows: dayInflows, outflows: dayOutflows };
  });

  // Calculate SVG heights
  const maxVal = Math.max(...days.map(d => Math.max(d.inflows, d.outflows, 300)));
  const chartHeight = 100;
  const padding = 15;

  return (
    <div className="flex flex-col space-y-6 pb-10 animate-slide-up no-scrollbar overflow-y-auto max-h-full">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-100 font-sans tracking-tight">Painel Principal</h2>
        <p className="text-sm text-slate-400">Visão geral das atividades da oficina</p>
      </div>

      {/* Grid: Indicators */}
      <div className="grid grid-cols-2 gap-4">
        {/* Metric: Faturamento */}
        <div className="col-span-2 bg-gradient-to-r from-brand-600 to-brand-800 border border-brand-500 rounded-2xl p-5 shadow-premium relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
            <Wallet size={140} />
          </div>
          <span className="text-xs uppercase font-bold text-brand-200 tracking-wider flex items-center gap-1.5">
            <Calendar size={13} />
            Faturamento do Mês
          </span>
          <h3 className="text-3xl font-black text-white mt-1.5 font-sans">{formatCurrency(faturamentoMes)}</h3>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-brand-100 bg-brand-900/40 w-fit px-3 py-1 rounded-full backdrop-blur-xs">
            <span className="font-bold">{formatCurrency(totalRecebidoMes)}</span> recebido à vista/parcelas
          </div>
        </div>

        {/* Metric: OS Abertas */}
        <div className="bg-dark-900 border-2 border-brand-500/30 shadow-[0_0_12px_rgba(59,102,255,0.08)] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">Abertas</span>
            <span className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
              <ClipboardList size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">{osAbertas}</div>
            <span className="text-xs text-slate-400">Ordens abertas</span>
          </div>
        </div>

        {/* Metric: OS Em Andamento */}
        <div className="bg-dark-900 border-2 border-warning-500/30 shadow-[0_0_12px_rgba(245,158,11,0.08)] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">Em Curso</span>
            <span className="p-2 bg-warning-500/10 text-warning-500 rounded-xl">
              <Play size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">{osAndamento}</div>
            <span className="text-xs text-slate-400">Na oficina</span>
          </div>
        </div>

        {/* Metric: OS Concluídas */}
        <div className="bg-dark-900 border-2 border-success-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">Concluídas</span>
            <span className="p-2 bg-success-500/10 text-success-500 rounded-xl">
              <CheckCircle size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-white">{osConcluidas}</div>
            <span className="text-xs text-slate-400">Prontas p/ entrega</span>
          </div>
        </div>

        {/* Metric: Valor a Receber */}
        <div className="bg-dark-900 border border-brand-500/20 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">A Receber</span>
            <span className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
              <Wallet size={16} />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-lg font-black text-white truncate">{formatCurrency(valorAReceber)}</div>
            <span className="text-xs text-slate-400">Parcelas pendentes</span>
          </div>
        </div>
      </div>

      {/* Grid: Client & Vehicle Counts */}
      <div className="flex gap-3">
        <div className="flex-1 bg-dark-900 border border-dark-800 rounded-2xl p-3.5 flex items-center gap-3.5">
          <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
            <Users size={18} />
          </div>
          <div>
            <div className="text-sm font-black text-white">{clients.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Clientes</div>
          </div>
        </div>
        
        <div className="flex-1 bg-dark-900 border border-dark-800 rounded-2xl p-3.5 flex items-center gap-3.5">
          <div className="p-2.5 bg-brand-500/10 text-brand-400 rounded-xl">
            <Car size={18} />
          </div>
          <div>
            <div className="text-sm font-black text-white">{vehicles.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Veículos</div>
          </div>
        </div>
      </div>

      {/* Financial Flow Dynamic Chart */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Fluxo de Caixa</span>
            <h4 className="text-sm font-bold text-white">Últimos 5 Dias</h4>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              Entradas
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              Saídas
            </span>
          </div>
        </div>

        {/* Pure SVG Bar Chart */}
        <div className="relative w-full h-36 flex items-end">
          <svg className="w-full h-full" viewBox={`0 0 200 ${chartHeight}`} preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="0" y1="20" x2="200" y2="20" stroke="#2c313c" strokeWidth="0.5" strokeDasharray="2" />
            <line x1="0" y1="50" x2="200" y2="50" stroke="#2c313c" strokeWidth="0.5" strokeDasharray="2" />
            <line x1="0" y1="80" x2="200" y2="80" stroke="#2c313c" strokeWidth="0.5" strokeDasharray="2" />
            
            {/* Bars for each day */}
            {days.map((d, index) => {
              const xPos = padding + index * 40;
              const inflowHeight = (d.inflows / maxVal) * (chartHeight - 20);
              const outflowHeight = (d.outflows / maxVal) * (chartHeight - 20);

              return (
                <g key={index}>
                  {/* Inflow Bar */}
                  <rect
                    x={xPos}
                    y={chartHeight - 15 - inflowHeight}
                    width="6"
                    height={Math.max(1, inflowHeight)}
                    rx="1.5"
                    fill="#3b66ff"
                    className="transition-all duration-300"
                  />
                  {/* Outflow Bar */}
                  <rect
                    x={xPos + 8}
                    y={chartHeight - 15 - outflowHeight}
                    width="6"
                    height={Math.max(1, outflowHeight)}
                    rx="1.5"
                    fill="#ef4444"
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Chart X Labels */}
          <div className="absolute left-0 right-0 bottom-0 flex justify-between px-2 text-[10px] text-slate-400 uppercase font-bold">
            {days.map((d, i) => (
              <span key={i} className="w-8 text-center">{d.dayName}</span>
            ))}
          </div>
        </div>
      </div>

      {/* OS Status / Recentes */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Ordens Recentes</span>
          <span className="text-xs text-brand-400 font-bold cursor-pointer">Ver todas</span>
        </div>

        <div className="space-y-3">
          {recentOS.map(os => {
            const client = clients.find(c => c.id === os.clientId);
            const vehicle = vehicles.find(v => v.id === os.vehicleId);
            
            let statusColor = 'bg-brand-500/10 text-brand-400 border-brand-500/30';
            if (os.status === 'Em andamento') statusColor = 'bg-warning-500/10 text-warning-500 border-warning-500/30';
            else if (os.status === 'Concluída') statusColor = 'bg-success-500/10 text-success-500 border-success-500/30';
            else if (os.status === 'Entregue') statusColor = 'bg-dark-800 text-slate-400 border-dark-700';

            return (
              <div key={os.id} className="bg-dark-900 border border-dark-800 rounded-2xl p-4 flex items-center justify-between hover:border-brand-500/30 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-brand-400">{os.osNumber}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full ${statusColor}`}>
                      {os.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1.5 font-medium">
                    {client?.name} <span className="text-slate-400 font-normal">• {vehicle?.brand} {vehicle?.model}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-sm text-slate-100">{formatCurrency(os.grandTotal)}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{os.date.split('-').reverse().join('/')}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Finance Transactions Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Últimos Lançamentos</span>
          <span className="text-xs text-brand-400 font-bold cursor-pointer">Ver extrato</span>
        </div>

        <div className="space-y-3">
          {recentTransactions.map(t => {
            const isInflow = t.type === 'Entrada';
            const itemBorder = isInflow ? 'border-success-500/20' : 'border-danger-500/20';
            return (
              <div key={t.id} className={`bg-dark-900 border ${itemBorder} rounded-2xl p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-3.5">
                  <div className={`p-2 rounded-xl ${isInflow ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'}`}>
                    {isInflow ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-200 line-clamp-1">{t.description}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">{t.category} • {t.date.split('-').reverse().join('/')}</div>
                  </div>
                </div>
                <div className={`font-black text-sm ${isInflow ? 'text-success-500' : 'text-danger-500'}`}>
                  {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
