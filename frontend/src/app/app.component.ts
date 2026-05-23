import { Component, ChangeDetectionStrategy, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from './services/finance.service';
import { CardResumoComponent } from './components/card-resumo/card-resumo.component';
import { CardPizzaComponent } from './components/card-pizza/card-pizza.component';
import { Transacao, Conta, Categoria } from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CardResumoComponent, CardPizzaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private financeService = inject(FinanceService);

  // Constants & Configs
  mapIcones = this.financeService.mapIcones;
  objCoresDisp = ['bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-yellow-100 text-yellow-600', 'bg-green-100 text-green-600', 'bg-teal-100 text-teal-600', 'bg-blue-100 text-blue-600', 'bg-indigo-100 text-indigo-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600', 'bg-gray-100 text-gray-600'];
  objCoresCartao = ['bg-slate-800', 'bg-blue-600', 'bg-purple-600', 'bg-orange-500', 'bg-emerald-600', 'bg-red-600', 'bg-pink-600', 'bg-cyan-600'];
  chavesIcones = Object.keys(this.mapIcones);

  // View State
  abaAtiva = signal<'dashboard'|'transacoes'|'cartoes'|'contas'|'categorias'>('dashboard');
  mesAnoAtual = signal(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  
  // Data Signals (from Service)
  transacoesGlobais = this.financeService.transacoesGlobais;
  categorias = this.financeService.categorias;
  contas = this.financeService.contas;

  // Modals & Forms State
  modalTransacaoAberto = signal(false);
  formT = signal<any>({ descricao: '', valor: 0, tipo: 'despesa', categoria: '', conta: '', data: '' });

  formCategoriaAberto = signal(false);
  formCategoria = signal<any>(null);
  
  formContaAberto = signal(false);
  formConta = signal<any>(null);

  modalPagarAberto = signal(false);
  faturaData = signal<any>(null);
  faturaContaOrigem = signal('');
  faturaErro = signal('');

  abasMenu = [
    { id: 'dashboard', label: 'Início', icon: 'ph ph-house' },
    { id: 'transacoes', label: 'Transações', icon: 'ph ph-list-numbers' },
    { id: 'cartoes', label: 'Cartões', icon: 'ph ph-credit-card' },
    { id: 'contas', label: 'Contas', icon: 'ph ph-bank' },
    { id: 'categorias', label: 'Categorias', icon: 'ph ph-tag' },
  ];

  ngOnInit() {
    this.loadExternalIcons();
  }

  private loadExternalIcons() {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@phosphor-icons/web';
    document.head.appendChild(script);
  }

  // --- COMPUTEDS ---

  contasDebito = computed(() => this.contas().filter(c => c.tipo === 'debito'));
  cartoes = computed(() => this.contas().filter(c => c.tipo === 'credito'));
  
  cartoesExibicao = computed(() => {
    return this.cartoes().map(cartao => {
      const fatura = this.getResumoFatura(cartao);
      return {
        ...cartao,
        fatura,
        valorFaturaFormatado: this.fm(fatura.valorFatura),
        valorPagoFormatado: this.fm(fatura.valorPago),
        dataAberturaFormatada: `${fatura.dataAbertura.getDate()}/${fatura.dataAbertura.getMonth() + 1}`,
        dataFechamentoFormatada: `${fatura.dataFechamento.getDate()}/${fatura.dataFechamento.getMonth() + 1}`,
        dataVencimentoFormatada: `${fatura.dataVencimento.getDate()}/${(fatura.dataVencimento.getMonth() + 1).toString().padStart(2, '0')}`
      };
    });
  });

  transacoesMes = computed(() => {
    const mes = this.mesAnoAtual();
    return [...this.transacoesGlobais()]
      .filter(t => String(t.data).startsWith(mes) || t.mesReferencia === mes)
      .sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  });

  transacoesExibicao = computed(() => {
    return this.transacoesMes().map(t => {
      const isFatura = t.tipo === 'pagamento_fatura';
      const cat = this.getCategoria(t.categoria, isFatura);
      const con = this.getConta(isFatura ? t.contaOrigem! : t.conta!);
      return {
        ...t,
        isFatura,
        valorAbsoluto: Math.abs(t.valor),
        valorFormatado: this.fm(t.valor),
        dataFormatada: this.fd(t.data),
        catNome: cat.nome,
        catCor: cat.cor,
        catIcon: cat.iconClass,
        contaNome: isFatura ? `Saiu de: ${con.nome}` : con.nome,
        isDespesa: t.tipo === 'despesa' || isFatura
      };
    });
  });

  dash = computed(() => {
    const tG = this.transacoesGlobais();
    const tM = this.transacoesMes();
    const cs = this.contas();
    const cats = this.categorias();

    let saldoContas = 0;
    const saldosPorContaMap: Record<string, number> = {};
    cs.filter(c => c.tipo === 'debito').forEach(c => {
        saldosPorContaMap[c.id] = c.saldoInicial || 0;
        saldoContas += c.saldoInicial || 0;
    });

    tG.forEach(t => {
      const conta = cs.find(c => c.id === (t.conta || t.contaOrigem));
      if (conta && conta.tipo === 'debito') {
        if (t.tipo === 'receita') { saldoContas += t.valor; if(saldosPorContaMap[t.conta!] !== undefined) saldosPorContaMap[t.conta!] += t.valor; }
        if (t.tipo === 'despesa') { saldoContas -= t.valor; if(saldosPorContaMap[t.conta!] !== undefined) saldosPorContaMap[t.conta!] -= t.valor; }
        if (t.tipo === 'pagamento_fatura') { saldoContas -= t.valor; if(saldosPorContaMap[t.contaOrigem!] !== undefined) saldosPorContaMap[t.contaOrigem!] -= t.valor; }
      }
    });

    let receitasMes = 0; let despesasMes = 0;
    const catMap: Record<string, number> = {}; const contaMap: Record<string, number> = {};

    tM.forEach(t => {
      if (t.tipo === 'pagamento_fatura') return;
      if (t.tipo === 'receita') receitasMes += t.valor;
      else if (t.tipo === 'despesa') {
        despesasMes += t.valor;
        catMap[t.categoria] = (catMap[t.categoria] || 0) + t.valor;
        contaMap[t.conta!] = (contaMap[t.conta!] || 0) + t.valor;
      }
    });

    const formatarGrafico = (mapa: Record<string, number>, listaBase: any[], corPadrao = 'bg-gray-100 text-gray-500') => 
      Object.keys(mapa).map(id => {
        const item = listaBase.find(i => i.id === id) || { nome: 'Desconhecida', cor: corPadrao };
        return { id, nome: item.nome, valor: mapa[id], percentual: (mapa[id] / (despesasMes || 1)) * 100, corHex: item.corCartao || this.financeService.extrairHexCor(item.cor) };
      }).sort((a, b) => b.valor - a.valor);

    const coresContas = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];
    const contasComCor = cs.map((c, i) => ({ ...c, corCartao: coresContas[i % coresContas.length] }));

    return { 
      saldoContas, receitasMes, despesasMes, 
      despesasPorCategoria: formatarGrafico(catMap, cats), 
      despesasPorConta: formatarGrafico(contaMap, contasComCor),
      saldosPorContaExibicao: cs.filter(c => c.tipo === 'debito').map(c => ({ ...c, saldo: saldosPorContaMap[c.id] || 0, saldoFormatado: this.fm(saldosPorContaMap[c.id] || 0) }))
    };
  });

  tituloHeader = computed(() => {
    const map: Record<string, string> = { dashboard: 'Visão Geral', transacoes: 'Transações', cartoes: 'Cartões', contas: 'Contas', categorias: 'Categorias' };
    return map[this.abaAtiva()] || 'App';
  });

  nomeMesAtual = computed(() => {
    const [ano, mes] = this.mesAnoAtual().split('-');
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${nomesMeses[parseInt(mes) - 1]} ${ano}`;
  });

  resumoCards = computed(() => [
    { titulo: 'Saldo em Contas', valor: this.dash().saldoContas, iconeClass: 'ph ph-wallet', bgIcon: '', destaque: true, tooltip: 'Soma de todas as contas correntes' },
    { titulo: 'Receitas do Mês', valor: this.dash().receitasMes, iconeClass: 'ph ph-trend-up text-green-600', bgIcon: 'bg-green-100', destaque: false, tooltip: '' },
    { titulo: 'Despesas do Mês', valor: this.dash().despesasMes, iconeClass: 'ph ph-trend-down text-red-600', bgIcon: 'bg-red-100', destaque: false, tooltip: '' }
  ]);

  pizzaCards = computed(() => [
    { titulo: 'Gastos por Categoria (Mês)', dados: this.dash().despesasPorCategoria },
    { titulo: 'Gastos por Conta/Cartão (Mês)', dados: this.dash().despesasPorConta }
  ]);

  // --- ACTIONS ---

  fm(valor: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0); }
  fd(dataString: string) {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  alterarMes(delta: number) {
    const [ano, mes] = this.mesAnoAtual().split('-').map(Number);
    let novaData = new Date(ano, mes - 1 + delta, 1);
    this.mesAnoAtual.set(`${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}`);
  }

  getCategoria(id: string, isFatura: boolean) {
    if (isFatura) return { nome: 'Transferência', cor: 'bg-indigo-100 text-indigo-600', iconClass: 'ph ph-arrows-left-right' };
    const cat = this.categorias().find(c => c.id === id);
    return cat ? { ...cat, iconClass: this.mapIcones[cat.iconName] || 'ph ph-question' } : { nome: 'Desconhecida', cor: 'bg-gray-100 text-gray-500', iconClass: 'ph ph-question' };
  }

  getConta(id: string) { return this.contas().find(c => c.id === id) || { nome: 'Desconhecida' }; }

  abrirModalTransacao(t: any = null) {
    if (t) { this.formT.set({ ...t }); } 
    else {
      const cat = this.categorias().find(c => c.tipo === 'despesa');
      const con = this.contas()[0];
      this.formT.set({ descricao: '', valor: '', tipo: 'despesa', categoria: cat?.id || '', conta: con?.id || '', data: new Date().toISOString().split('T')[0] });
    }
    this.modalTransacaoAberto.set(true);
  }

  fecharModalTransacao() { this.modalTransacaoAberto.set(false); }
  updateForm(field: string, value: any) { this.formT.set({ ...this.formT(), [field]: value }); }
  
  setTipo(tipo: string) {
    const cat = this.categorias().find(c => c.tipo === tipo);
    this.formT.set({ ...this.formT(), tipo, categoria: cat?.id || '' });
  }

  salvarTransacao() {
    const form = this.formT();
    form.valor = parseFloat(form.valor.toString().replace(',', '.'));
    if (!form.id) {
      form.id = Math.random().toString(36).substring(2, 9);
      this.financeService.addTransacao(form);
    } else {
      this.financeService.updateTransacao(form);
    }
    this.fecharModalTransacao();
  }

  deletarTransacao(id: string) { this.financeService.deleteTransacao(id); }

  abrirFormCategoria(cat: any = null) {
    this.formCategoria.set(cat ? {...cat} : { nome: '', tipo: 'despesa', cor: this.objCoresDisp[0], iconName: 'Tags' });
    this.formCategoriaAberto.set(true);
  }
  fecharFormCategoria() { this.formCategoriaAberto.set(false); }
  updateFormCategoria(field: string, value: any) { this.formCategoria.set({ ...this.formCategoria(), [field]: value }); }
  salvarCategoria() {
    const form = this.formCategoria();
    if(form.id) this.financeService.updateCategoria(form);
    else this.financeService.addCategoria({ ...form, id: Math.random().toString(36).substring(2, 9) });
    this.fecharFormCategoria();
  }
  deletarCategoria(id: string) { this.financeService.deleteCategoria(id); }

  abrirFormConta(isCartao: boolean, conta: any = null) {
    this.formConta.set(conta ? {...conta} : (
      isCartao 
        ? { nome: '', tipo: 'credito', diaFechamento: 1, diaVencimento: 10, finalCartao: '1234', corCartao: this.objCoresCartao[0] }
        : { nome: '', tipo: 'debito', saldoInicial: 0 }
    ));
    this.formContaAberto.set(true);
  }
  fecharFormConta() { this.formContaAberto.set(false); }
  updateFormConta(field: string, value: any) { this.formConta.set({ ...this.formConta(), [field]: value }); }
  salvarConta() {
    const form = this.formConta();
    if(form.tipo === 'debito') form.saldoInicial = parseFloat(form.saldoInicial.toString().replace(',', '.')) || 0;
    if(form.id) this.financeService.updateConta(form);
    else this.financeService.addConta({ ...form, id: Math.random().toString(36).substring(2, 9) });
    this.fecharFormConta();
  }
  deletarConta(id: string) { this.financeService.deleteConta(id); }

  getResumoFatura(cartao: any) {
    const [ano, mes] = this.mesAnoAtual().split('-').map(Number);
    const diaF = cartao.diaFechamento || 1;
    const diaV = cartao.diaVencimento || 10;
    
    const dataFechamento = new Date(ano, mes - 1, diaF);
    const dataAbertura = new Date(ano, mes - 2, diaF);
    const dataVencimento = new Date(ano, diaV <= diaF ? mes : mes - 1, diaV);
    
    let totalDespesas = 0; let totalReceitas = 0; let valorPago = 0;

    this.transacoesGlobais().forEach(t => {
      if (t.tipo === 'pagamento_fatura' && t.contaDestino === cartao.id && t.mesReferencia === this.mesAnoAtual()) {
        valorPago += t.valor; return;
      }
      if (t.conta === cartao.id && t.tipo !== 'pagamento_fatura') {
        const dataT = new Date(t.data + 'T12:00:00'); 
        if (dataT >= dataAbertura && dataT < dataFechamento) {
          if (t.tipo === 'despesa') totalDespesas += t.valor;
          if (t.tipo === 'receita') totalReceitas += t.valor;
        }
      }
    });

    const valorFatura = Math.max(0, totalDespesas - totalReceitas);
    const hoje = new Date();
    let status = 'aberta';
    if (valorPago >= valorFatura && valorFatura > 0) status = 'paga';
    else if (hoje >= dataFechamento) status = 'fechada';
    if (valorFatura === 0 && valorPago === 0) status = 'zerada';

    return { dataAbertura, dataFechamento, dataVencimento, valorFatura, valorPago, status };
  }

  abrirModalPagarFatura(cartao: any, fatura: any) {
    this.faturaData.set({ cartao, fatura });
    this.faturaErro.set('');
    const contaDebito = this.contas().find(c => c.tipo === 'debito');
    this.faturaContaOrigem.set(contaDebito ? contaDebito.id : '');
    this.modalPagarAberto.set(true);
  }
  fecharModalPagarFatura() { this.modalPagarAberto.set(false); }

  getBtnLabel() {
    const t = this.formT();
    if (t.id) return 'Salvar Alterações';
    return t.tipo === 'despesa' ? 'Salvar Despesa' : 'Salvar Receita';
  }

  confirmarPagamentoFatura() {
    const { cartao, fatura } = this.faturaData();
    const contaOrigem = this.faturaContaOrigem();
    if (!contaOrigem) { this.faturaErro.set('Selecione uma conta para pagar a fatura.'); return; }

    const contaDebito = this.dash().saldosPorContaExibicao.find((c: any) => c.id === contaOrigem);
    if (contaDebito && fatura.valorFatura > (contaDebito as any).saldo!) {
      this.faturaErro.set(`Saldo insuficiente. Você tem apenas ${this.fm((contaDebito as any).saldo!)} nesta conta.`);
      return;
    }

    const transacaoFatura = {
      id: Math.random().toString(36).substring(2, 9),
      tipo: 'pagamento_fatura',
      descricao: `Pagamento Fatura ${cartao.nome}`,
      valor: fatura.valorFatura,
      categoria: 'outros',
      contaOrigem: contaOrigem,
      contaDestino: cartao.id,
      data: new Date().toISOString().split('T')[0],
      mesReferencia: this.mesAnoAtual()
    };
    
    this.financeService.addTransacao(transacaoFatura as Transacao);
    this.fecharModalPagarFatura();
  }

  getGradient(dados: any[]) {
    let cumulative = 0;
    return 'conic-gradient(' + dados.map(d => {
      const start = cumulative; cumulative += d.percentual; return `${d.corHex} ${start}% ${cumulative}%`;
    }).join(', ') + ')';
  }
}
