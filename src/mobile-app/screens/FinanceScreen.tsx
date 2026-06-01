import React, { useState } from 'react';
import { 
  Plus, Search, ArrowUpRight, ArrowDownRight, Trash2, Calendar, 
  Percent, Wallet, DollarSign, PiggyBank, Receipt, X, ArrowLeft, Filter 
} from 'lucide-react';
import { useDatabase, FinancialTransaction, TransactionCategory } from '../context/DatabaseContext';

export const FinanceScreen: React.FC = () => {
  const { transactions, billings, workOrders, addTransaction, deleteTransaction } = useDatabase();

  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Entradas' | 'Saídas'>('Todos');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Operacional' as TransactionCategory,
    date: new Date().toISOString().split('T')[0]
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('/');
  };

  // --- STATS CALCULATIONS ---
  // 1. Total Received (Sum of all Entrada transactions)
  const totalRecebido = transactions
    .filter(t => t.type === 'Entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Total Outflows (Sum of all Saída transactions)
  const totalDespesas = transactions
    .filter(t => t.type === 'Saída')
    .reduce((sum, t) => sum + t.amount, 0);

  // 3. Net Balance (Received - Despesas)
  const saldoAtual = totalRecebido - totalDespesas;

  // 4. Backlog / Value to Receive
  const totalAReceber = billings.reduce((acc, b) => {
    if (b.status === 'Cancelado') return acc;
    return acc + b.installments.filter(i => i.status === 'Pendente').reduce((s, i) => s + i.amount, 0);
  }, 0);

  // 5. Month Faturamento
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const faturamentoMes = workOrders
    .filter(o => o.date.startsWith(currentMonthStr))
    .reduce((acc, o) => acc + o.grandTotal, 0);

  // --- PERIOD SUMMARY CALCULATIONS ---
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Daily Stats (Hoje)
  const transactionsHoje = transactions.filter(t => t.date === todayStr);
  const entradasHoje = transactionsHoje.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasHoje = transactionsHoje.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoHoje = entradasHoje - saidasHoje;

  // 2. Weekly Stats (Esta Semana Calendar)
  const today = new Date();
  const startOfWeek = new Date(today);
  const dayIndex = today.getDay();
  // Set to Sunday of current week
  startOfWeek.setDate(today.getDate() - dayIndex);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const isThisWeek = (dateStr: string) => {
    const tDate = new Date(dateStr + 'T00:00:00');
    return tDate >= startOfWeek && tDate <= endOfWeek;
  };

  const transactionsSemana = transactions.filter(t => isThisWeek(t.date));
  const entradasSemana = transactionsSemana.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasSemana = transactionsSemana.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoSemana = entradasSemana - saidasSemana;

  // 3. Monthly Stats (Este Mês Calendar)
  const transactionsMes = transactions.filter(t => t.date.startsWith(currentMonthStr));
  const entradasMes = transactionsMes.filter(t => t.type === 'Entrada').reduce((sum, t) => sum + t.amount, 0);
  const saidasMes = transactionsMes.filter(t => t.type === 'Saída').reduce((sum, t) => sum + t.amount, 0);
  const saldoMes = entradasMes - saidasMes;

  // --- FILTERS ---
  const filteredTransactions = transactions.filter(t => {
    if (activeFilter === 'Todos') return true;
    if (activeFilter === 'Entradas') return t.type === 'Entrada';
    return t.type === 'Saída';
  });

  // --- ACTIONS ---
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return alert('Por favor, preencha a descrição e valor!');

    addTransaction({
      type: 'Saída',
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      description: expenseForm.description
    });

    setIsAddingExpense(false);
    setExpenseForm({
      description: '',
      amount: '',
      category: 'Operacional',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja excluir este lançamento financeiro? O saldo será recalculado.')) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none animate-slide-up">
      
      {/* 1. MAIN BOOKKEEPING DIRECTORY */}
      {!isAddingExpense && (
        <div className="flex flex-col space-y-4 h-full overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">Financeiro</h2>
              <p className="text-xs text-slate-400">Fluxo de caixa e despesas operacionais</p>
            </div>
            
            <button
              onClick={() => setIsAddingExpense(true)}
              className="p-2 bg-danger-500 hover:bg-danger-600 text-white rounded-xl shadow-premium flex items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-95"
            >
              <Plus size={15} />
              Lançar Despesa
            </button>
          </div>

          {/* Quick Balance Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Saldo Caixa */}
            <div className="col-span-2 bg-dark-900 border border-dark-800 rounded-xl p-3 flex justify-between items-center relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-bold text-dark-400 tracking-wider flex items-center gap-1">
                  <PiggyBank size={10} className="text-success-500" />
                  Saldo Atual (Em Caixa)
                </span>
                <h3 className={`text-xl font-black ${saldoAtual >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
                  {formatCurrency(saldoAtual)}
                </h3>
              </div>
              
              <div className="text-right text-[9px] text-dark-400 font-medium">
                <div>Faturamento: <span className="font-semibold text-slate-200">{formatCurrency(faturamentoMes)}</span></div>
                <div>A Receber: <span className="font-semibold text-brand-400">{formatCurrency(totalAReceber)}</span></div>
              </div>
            </div>

            {/* Total Received Indicator */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-3">
              <span className="text-[8px] uppercase font-bold text-dark-400 tracking-wider flex items-center gap-1">
                <ArrowUpRight size={10} className="text-success-500" />
                Recebido (Entradas)
              </span>
              <div className="text-sm font-bold text-slate-200 mt-1">{formatCurrency(totalRecebido)}</div>
            </div>

            {/* Total Expenses Indicator */}
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-3">
              <span className="text-[8px] uppercase font-bold text-dark-400 tracking-wider flex items-center gap-1">
                <ArrowDownRight size={10} className="text-danger-500" />
                Despesas (Saídas)
              </span>
              <div className="text-sm font-bold text-slate-200 mt-1">{formatCurrency(totalDespesas)}</div>
            </div>
          </div>

          {/* Period Summary Card Deck */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-[10px] font-bold text-slate-100 uppercase tracking-wider">Resumo por Período</h4>
                <p className="text-[8px] text-slate-400 mt-0.5">Entradas, saídas e lucro líquido</p>
              </div>
              
              {/* Period Selector Tabs */}
              <div className="flex bg-dark-950 border border-dark-800 rounded-lg p-0.5 text-[8px] font-bold uppercase select-none">
                {(['diario', 'semanal', 'mensal'] as const).map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSummaryPeriod(period)}
                    className={`px-2 py-1 rounded transition-all ${summaryPeriod === period ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-400 hover:text-slate-200'}`}
                  >
                    {period === 'diario' ? 'Diário' : period === 'semanal' ? 'Semanal' : 'Mensal'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-left">
              {/* Entradas */}
              <div className="bg-dark-950 border border-dark-800 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase font-bold text-success-500 tracking-wider flex items-center gap-0.5">
                  <ArrowUpRight size={8} />
                  Entradas
                </span>
                <div className="text-[11px] font-black text-slate-100 mt-1 truncate">
                  {formatCurrency(
                    summaryPeriod === 'diario' ? entradasHoje :
                    summaryPeriod === 'semanal' ? entradasSemana :
                    entradasMes
                  )}
                </div>
              </div>

              {/* Saídas */}
              <div className="bg-dark-950 border border-dark-800 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase font-bold text-danger-500 tracking-wider flex items-center gap-0.5">
                  <ArrowDownRight size={8} />
                  Saídas
                </span>
                <div className="text-[11px] font-black text-slate-100 mt-1 truncate">
                  {formatCurrency(
                    summaryPeriod === 'diario' ? saidasHoje :
                    summaryPeriod === 'semanal' ? saidasSemana :
                    saidasMes
                  )}
                </div>
              </div>

              {/* Saldo Líquido */}
              <div className="bg-dark-950 border border-dark-800 rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[7.5px] uppercase font-bold text-brand-400 tracking-wider flex items-center gap-0.5">
                  <DollarSign size={8} />
                  Líquido
                </span>
                <div className={`text-[11px] font-black mt-1 truncate ${
                  (summaryPeriod === 'diario' ? saldoHoje :
                   summaryPeriod === 'semanal' ? saldoSemana :
                   saldoMes) >= 0 ? 'text-success-500' : 'text-danger-500'
                }`}>
                  {formatCurrency(
                    summaryPeriod === 'diario' ? saldoHoje :
                    summaryPeriod === 'semanal' ? saldoSemana :
                    saldoMes
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* List Headers / Filters */}
          <div className="flex justify-between items-center flex-shrink-0 pt-1">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Lançamentos</span>
            
            {/* Horizontal Filter switch */}
            <div className="flex bg-dark-900 border border-dark-800 rounded-lg p-0.5 text-[8px] font-bold uppercase select-none">
              {['Todos', 'Entradas', 'Saídas'].map(fl => (
                <button
                  key={fl}
                  onClick={() => setActiveFilter(fl as any)}
                  className={`px-2 py-1 rounded transition-all ${activeFilter === fl ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-400 hover:text-slate-200'}`}
                >
                  {fl}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2 pb-20">
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-dark-500">
                <span className="text-3xl">📇</span>
                <h4 className="text-xs font-bold text-slate-400 mt-2">Nenhum lançamento</h4>
              </div>
            ) : (
              filteredTransactions.map(t => {
                const isInflow = t.type === 'Entrada';
                return (
                  <div key={t.id} className="bg-dark-900 border border-dark-800 rounded-xl p-3 flex items-center justify-between hover:border-dark-750 transition-colors animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isInflow ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'}`}>
                        {isInflow ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div className="pr-2 text-left">
                        <div className="text-xs font-semibold text-slate-200 leading-tight line-clamp-1">{t.description}</div>
                        <div className="text-[8px] text-dark-400 font-bold uppercase mt-0.5">
                          {t.category} • {formatDate(t.date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`font-bold text-xs ${isInflow ? 'text-success-500' : 'text-danger-500'}`}>
                        {isInflow ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                      
                      {/* Allow deletion for manual Saidas or other entries */}
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1 hover:bg-danger-500/10 text-dark-500 hover:text-danger-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. OVERLAY FORM: ADD NEW EXPENSE OUTFLOW */}
      {isAddingExpense && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-4">
            <button onClick={() => setIsAddingExpense(false)} className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-sm font-bold text-slate-100">Lançar Nova Despesa (Saída)</h3>
          </div>

          {/* Form */}
          <form onSubmit={handleAddExpense} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Descrição / Justificativa *</label>
              <input
                type="text"
                required
                placeholder="Ex: Compra de 2 amortecedores Cofap ou Conta de luz"
                value={expenseForm.description}
                onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Valor Pago *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500 text-xs font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Data de Vencimento/Pago *</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={e => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Categoria da Despesa</label>
              <select
                value={expenseForm.category}
                onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value as TransactionCategory }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="Compra Peças">Compra de Peças (Estoque)</option>
                <option value="Operacional">Despesas Operacionais (Energia, Água, Aluguel...)</option>
                <option value="Salário">Salários / Comissões</option>
                <option value="Outros">Outros Gastos avulsos</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="flex-1 py-2.5 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs bg-danger-500 hover:bg-danger-600 text-white font-semibold rounded-xl shadow-premium transition-all active:scale-98"
              >
                Salvar Despesa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
