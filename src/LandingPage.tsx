import React, { useState } from 'react';
import { 
  ChevronDown, DollarSign, Smartphone, Database, CheckCircle2, ShieldCheck, 
  Sparkles, HelpCircle, ArrowRight, Zap, RefreshCw, Star, Play
} from 'lucide-react';

interface LandingPageProps {
  onEnterSimulator: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterSimulator }) => {
  // Calculator States
  const [monthlySaaS, setMonthlySaaS] = useState<number>(120);
  
  // FAQ accordion states (index or null)
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const competitorCost1Year = monthlySaaS * 12;
  const competitorCost5Years = monthlySaaS * 12 * 5;
  const lifetimeLicensePrice = 397;
  const savings5Years = competitorCost5Years - lifetimeLicensePrice;

  const faqs = [
    {
      q: "Como o programa funciona 100% offline?",
      a: "Toda a persistência de dados é feita de maneira local no próprio aparelho (usando AsyncStorage no celular e LocalStorage no computador). Isso significa que os dados ficam gravados diretamente no disco do seu aparelho, sem depender de internet para carregar telas, abrir ordens de serviço ou calcular relatórios."
    },
    {
      q: "E se eu perder o celular ou o computador, perco meus dados?",
      a: "Não! O MecânicaPro possui uma ferramenta interna de exportação e importação de backups em formato JSON e planilha Excel em 1 clique. Você pode exportar seu backup diariamente ou semanalmente e salvá-lo no seu Google Drive, enviar para o seu próprio WhatsApp ou salvar por e-mail. Se trocar de aparelho, basta restaurar o arquivo JSON em segundos."
    },
    {
      q: "Como instalo o aplicativo no meu celular Android ou iOS?",
      a: "Para Android, disponibilizamos o instalador direto (arquivo APK gerado de forma oficial via Expo EAS) que você pode instalar instantaneamente. Para rodar em computadores, o simulador web salva os dados no navegador e permite exportar relatórios prontos."
    },
    {
      q: "O valor é realmente único ou tem alguma taxa anual?",
      a: "O valor de R$ 397 é único e vitalício. Você paga uma única vez e garante a licença permanente para uso da sua oficina. Não há anuidades, taxas extras ou cobranças por emissão de ordens de serviço."
    },
    {
      q: "Consigo enviar as ordens de serviço para o cliente pelo WhatsApp?",
      a: "Sim! O sistema gera um relatório em PDF profissional contendo todos os dados da oficina, do cliente, do veículo, lista de peças e serviços detalhados com totais, notas e assinatura digital. Esse arquivo PDF pode ser compartilhado diretamente no WhatsApp do cliente com um clique."
    }
  ];

  const benefits = [
    {
      icon: <Zap className="text-brand-400 w-5 h-5" />,
      title: "Sem Mensalidades Eternas",
      desc: "Economize milhares de reais todos os anos. Pague apenas uma vez e tenha um gerenciamento profissional para sempre."
    },
    {
      icon: <Database className="text-brand-400 w-5 h-5" />,
      title: "Funcionamento Offline-First",
      desc: "Não fique parado se a internet cair. Abra ordens de serviço, dê baixa em parcelas e gerencie o estoque 100% offline."
    },
    {
      icon: <ShieldCheck className="text-brand-400 w-5 h-5" />,
      title: "Segurança & Privacidade",
      desc: "Seus dados de faturamento e clientes pertencem apenas a você, armazenados de forma isolada e local no seu aparelho."
    },
    {
      icon: <Smartphone className="text-brand-400 w-5 h-5" />,
      title: "Assinatura Digital",
      desc: "Colete a assinatura do cliente diretamente na tela do celular antes de iniciar o serviço para garantir segurança jurídica."
    },
    {
      icon: <RefreshCw className="text-brand-400 w-5 h-5" />,
      title: "Exportação em 1 Clique",
      desc: "Exporte relatórios completos em formato Excel ou gere PDFs prontos das ordens de serviço para enviar por WhatsApp."
    },
    {
      icon: <Sparkles className="text-brand-400 w-5 h-5" />,
      title: "Faturamento & Caixa",
      desc: "Fluxo de caixa integrado que registra entradas de parcelas automaticamente e gerencia as saídas e despesas da oficina."
    }
  ];

  return (
    <div className="bg-[#090b0f] text-slate-100 min-h-screen overflow-x-hidden font-sans select-none scroll-smooth">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-dark-950/75 border-b border-dark-900 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/30 text-brand-400 font-black text-sm">
            M
          </div>
          <span className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none">
            Mecânica<span className="text-brand-500">Pro</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
          <a href="#beneficios" className="hover:text-slate-200 transition-colors">Benefícios</a>
          <a href="#calculadora" className="hover:text-slate-200 transition-colors">Economia</a>
          <a href="#funcionalidades" className="hover:text-slate-200 transition-colors">Recursos</a>
          <a href="#preco" className="hover:text-slate-200 transition-colors">Preço</a>
          <a href="#faq" className="hover:text-slate-200 transition-colors">FAQ</a>
        </nav>

        <button 
          onClick={onEnterSimulator}
          className="px-4 py-2 border border-brand-500/30 text-brand-400 hover:border-brand-500 hover:bg-brand-500/5 text-xs font-bold uppercase rounded-xl transition-all"
        >
          Testar Simulador Grátis
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 px-6 max-w-6xl mx-auto text-center space-y-8">
        {/* Glow Effects */}
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-brand-950/60 border border-brand-900 text-brand-300 px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase animate-pulse">
          🔥 OFERTA DE LANÇAMENTO: VITALÍCIO SEM MENSALIDADE
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-100 max-w-4xl mx-auto leading-tight md:leading-tight">
          O Sistema da sua Oficina.<br />
          No seu Controle. <span className="text-brand-500 underline decoration-brand-600/40">Para Sempre.</span>
        </h1>

        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Diga adeus às assinaturas mensais recorrentes. Tenha um controle profissional de ordens de serviço, fluxo de caixa, estoque e clientes pagando uma única vez. Funciona 100% offline, direto no seu dispositivo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
          <a
            href="#preco"
            className="flex-1 px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-slate-100 text-xs font-bold uppercase rounded-xl tracking-wider shadow-lg shadow-brand-900/30 transition-all flex items-center justify-center gap-2 group"
          >
            Adquirir Licença Vitalícia
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
          <button
            onClick={onEnterSimulator}
            className="flex-1 px-6 py-3.5 bg-dark-900 border border-dark-800 hover:border-dark-700 text-slate-200 text-xs font-bold uppercase rounded-xl tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Play size={12} fill="currentColor" />
            Experimentar Simulador
          </button>
        </div>

        {/* Feature quick flags */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold text-dark-400 uppercase tracking-widest pt-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-success-500" />
            Funciona Sem Internet
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-success-500" />
            Exportação Excel e PDF
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-success-500" />
            Backup Local Criptografado
          </div>
        </div>
      </section>

      {/* INTERACTIVE CALCULATOR (THE VALUE PROPOSITION) */}
      <section id="calculadora" className="bg-[#0b0d12] border-y border-dark-900 py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-1.5 text-brand-400 text-xs font-bold uppercase tracking-wider">
              <DollarSign size={16} />
              Calculadora de Retorno (ROI)
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight leading-tight">
              Compare e Veja o Tamanho da sua Economia
            </h2>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              Softwares de oficina concorrentes cobram mensalidades pesadas que sobem todo ano. Ajuste o controle abaixo para a mensalidade média do mercado e veja quanto dinheiro você está deixando na mesa em 5 anos.
            </p>

            {/* Slider control */}
            <div className="bg-dark-950 p-5 rounded-2xl border border-dark-850 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                <span>Mensalidade Concorrente</span>
                <span className="text-brand-400 text-sm">R$ {monthlySaaS},00 /mês</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="300" 
                step="10"
                value={monthlySaaS} 
                onChange={(e) => setMonthlySaaS(Number(e.target.value))}
                className="w-full h-1.5 bg-dark-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-[9px] text-dark-500 font-bold uppercase tracking-wider">
                <span>R$ 50</span>
                <span>R$ 150</span>
                <span>R$ 300</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-950 p-6 md:p-8 rounded-3xl border border-dark-850 shadow-glass-dark relative overflow-hidden space-y-6">
            {/* Header info */}
            <div className="text-center pb-4 border-b border-dark-900">
              <span className="text-[10px] text-dark-400 font-bold uppercase tracking-wider">Custo Projetado em 5 Anos</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-dark-900/40 p-4 rounded-xl border border-dark-900/60">
                <div className="text-[9px] text-slate-500 font-bold uppercase">Concorrentes SaaS</div>
                <div className="text-xl font-bold text-danger-500 mt-1">R$ {competitorCost5Years.toLocaleString('pt-BR')},00</div>
                <div className="text-[8px] text-slate-500 mt-0.5">mensalidades somadas</div>
              </div>
              <div className="bg-brand-500/5 p-4 rounded-xl border border-brand-500/20">
                <div className="text-[9px] text-brand-400 font-bold uppercase">MecânicaPro</div>
                <div className="text-xl font-bold text-brand-400 mt-1">R$ {lifetimeLicensePrice},00</div>
                <div className="text-[8px] text-brand-400/70 mt-0.5">pagamento único</div>
              </div>
            </div>

            {/* Total Savings Callout */}
            <div className="bg-success-500/5 border border-success-500/20 p-5 rounded-2xl text-center space-y-1">
              <div className="text-[9px] text-success-500 font-black uppercase tracking-widest">Sua Economia Real</div>
              <div className="text-3xl font-black text-success-500">R$ {savings5Years.toLocaleString('pt-BR')},00</div>
              <p className="text-[9px] text-slate-400">Dinheiro que fica no caixa da sua oficina mecânica.</p>
            </div>
          </div>

        </div>
      </section>

      {/* CORE BENEFITS */}
      <section id="beneficios" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Por Que MecânicaPro?</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Desenvolvido para Donos de Oficina Práticos</h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Sem telas lentas, sem problemas de conexão e sem surpresas na fatura do cartão. Foco no que importa: atender o cliente e consertar o carro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="p-6 bg-dark-950 border border-dark-900 rounded-2xl space-y-3.5 hover:border-dark-800 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-center justify-center">
                {b.icon}
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{b.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INTERACTIVE CALLOUT */}
      <section className="bg-brand-600/5 border-y border-brand-500/10 py-12 px-6 text-center space-y-5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[300px] h-[300px] bg-brand-500/5 rounded-full blur-[80px] pointer-events-none" />
        <h3 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Quer Ver Como o App Funciona Antes de Comprar?</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Nós criamos um simulador interativo idêntico ao aplicativo de celular e painel desktop. Experimente na hora adicionando veículos e faturando parcelas!
        </p>
        <button
          onClick={onEnterSimulator}
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-slate-100 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
        >
          <Play size={12} fill="currentColor" />
          Testar Simulador no Navegador
        </button>
      </section>

      {/* PRICING PLANS */}
      <section id="preco" className="py-20 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Planos e Preços</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Investimento Único, Licença Eterna</h2>
          <p className="text-xs text-slate-400">Escolha a transparência e economize desde o primeiro dia.</p>
        </div>

        <div className="max-w-md mx-auto bg-dark-950 border-2 border-brand-500/50 rounded-3xl p-6 md:p-8 shadow-glass-dark relative overflow-hidden space-y-6">
          {/* Popular Tag */}
          <div className="absolute top-4 right-4 bg-brand-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            Recomendado
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Licença Vitalícia</h3>
            <p className="text-xs text-slate-400">Acesso completo sem mensalidades.</p>
          </div>

          <div className="py-4 border-y border-dark-900 flex items-baseline gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Por apenas</span>
            <span className="text-4xl font-black text-slate-100">R$ 397</span>
            <span className="text-xs font-bold text-slate-400">à vista</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Instalador nativo (APK Android)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Portal web completo para computador</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Gerador de PDF de OS e recibos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Exportação de backups em JSON e Excel</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Fluxo de Caixa e Lançamentos integrado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
              <span>Atualizações gratuitas inclusas</span>
            </div>
          </div>

          <button
            onClick={() => alert('Parabéns pela decisão! Em uma produção real, isso direcionaria para o checkout de pagamento (Stripe/Kiwi/Hotmart).')}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-slate-100 text-xs font-bold uppercase rounded-xl tracking-wider shadow-lg shadow-brand-900/20 transition-all flex items-center justify-center gap-2"
          >
            Garantir Minha Licença
          </button>

          <p className="text-[9px] text-center text-slate-500 leading-relaxed">
            * Pagamento processado de forma segura. 7 dias de garantia incondicional de reembolso.
          </p>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-12 border-t border-dark-900">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">Dúvidas Comuns</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight">Perguntas Frequentes</h2>
          <p className="text-xs text-slate-400">Esclareça suas principais dúvidas sobre o MecânicaPro.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className="bg-[#0b0d12] border border-dark-900 rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full p-5 flex items-center justify-between text-left font-bold text-xs md:text-sm text-slate-200 hover:text-slate-100 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-400 transition-transform ${activeFaq === i ? 'transform rotate-185 text-brand-400' : ''}`} 
                />
              </button>

              {activeFaq === i && (
                <div className="px-5 pb-5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-dark-900/50">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-dark-900 py-10 px-6 text-center text-[10px] text-slate-500 space-y-2">
        <p>© 2026 MecânicaPro. Todos os direitos reservados. Licença Vitalícia Registrada.</p>
        <p className="max-w-md mx-auto leading-relaxed">
          MecânicaPro é um software independente focado em privacidade, que armazena informações de maneira local nos aparelhos do usuário.
        </p>
      </footer>

    </div>
  );
};
