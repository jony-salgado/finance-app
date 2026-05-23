import { Injectable, signal, computed } from '@angular/core';
import { Transacao, Conta, Categoria } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  // Configurações
  mapIcones: Record<string, string> = { 
    Utensils: 'ph-fork-knife', Car: 'ph-car', ShoppingCart: 'ph-shopping-cart', 
    GraduationCap: 'ph-graduation-cap', HeartPulse: 'ph-heartbeat', Landmark: 'ph-bank', 
    TrendingUp: 'ph-trend-up', ListOrdered: 'ph-list-numbers', Wallet: 'ph-wallet', 
    CreditCard: 'ph-credit-card', Briefcase: 'ph-briefcase', Coffee: 'ph-coffee', 
    Smartphone: 'ph-device-mobile', Tags: 'ph-tag', HelpCircle: 'ph-question' 
  };
  
  tailwindColors: Record<string, string> = { 
    'text-red-600': '#dc2626', 'text-orange-600': '#ea580c', 'text-yellow-600': '#ca8a04', 
    'text-green-600': '#16a34a', 'text-teal-600': '#0d9488', 'text-blue-600': '#2563eb', 
    'text-indigo-600': '#4f46e5', 'text-purple-600': '#9333ea', 'text-pink-600': '#db2777', 
    'text-gray-600': '#4b5563', 'text-gray-500': '#6b7280' 
  };

  // State
  transacoesGlobais = signal<Transacao[]>(this.getTransacoesIniciais());
  categorias = signal<Categoria[]>([
    { id: 'alimentacao', nome: 'Alimentação', iconName: 'Utensils', cor: 'bg-orange-100 text-orange-600', tipo: 'despesa' },
    { id: 'transporte', nome: 'Transporte', iconName: 'Car', cor: 'bg-blue-100 text-blue-600', tipo: 'despesa' },
    { id: 'salario', nome: 'Salário', iconName: 'Landmark', cor: 'bg-green-100 text-green-600', tipo: 'receita' },
    { id: 'investimentos', nome: 'Investimentos', iconName: 'TrendingUp', cor: 'bg-teal-100 text-teal-600', tipo: 'receita' }
  ]);
  contas = signal<Conta[]>([
    { id: 'conta_corrente', nome: 'Conta Corrente', tipo: 'debito', saldoInicial: 0 },
    { id: 'nubank', nome: 'Cartão Nubank', tipo: 'credito', diaFechamento: 5, diaVencimento: 12, finalCartao: '1234', corCartao: 'bg-purple-600' }
  ]);

  constructor() {}

  private getTransacoesIniciais(): Transacao[] {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const mesPassado = String(d.getMonth() === 0 ? 12 : d.getMonth()).padStart(2, '0');
    const anoMesPassado = d.getMonth() === 0 ? ano - 1 : ano;

    return [
      { id: '1', descricao: 'Salário', valor: 15400.00, tipo: 'receita', categoria: 'salario', conta: 'conta_corrente', data: `${ano}-${mes}-05` },
      { id: '2', descricao: 'Supermercado', valor: 850.50, tipo: 'despesa', categoria: 'alimentacao', conta: 'nubank', data: `${ano}-${mes}-02` },
      { id: '3', descricao: 'Uber', valor: 45.00, tipo: 'despesa', categoria: 'transporte', conta: 'nubank', data: `${ano}-${mes}-10` },
      { id: '4', descricao: 'Restaurante', valor: 320.00, tipo: 'despesa', categoria: 'alimentacao', conta: 'nubank', data: `${anoMesPassado}-${mesPassado}-25` },
    ];
  }

  // Utils
  extrairHexCor(classesCor: string) {
    if (!classesCor) return '#cbd5e1'; 
    for (const key in this.tailwindColors) { if (classesCor.includes(key)) return this.tailwindColors[key]; }
    return '#cbd5e1';
  }

  // Actions
  addTransacao(t: Transacao) {
    this.transacoesGlobais.update(ts => [...ts, t]);
  }

  updateTransacao(t: Transacao) {
    this.transacoesGlobais.update(ts => ts.map(item => item.id === t.id ? t : item));
  }

  deleteTransacao(id: string) {
    this.transacoesGlobais.update(ts => ts.filter(t => t.id !== id));
  }

  addCategoria(c: Categoria) {
    this.categorias.update(cs => [...cs, c]);
  }

  updateCategoria(c: Categoria) {
    this.categorias.update(cs => cs.map(item => item.id === c.id ? c : item));
  }

  deleteCategoria(id: string) {
    this.categorias.update(cs => cs.filter(c => c.id !== id));
  }

  addConta(c: Conta) {
    this.contas.update(cs => [...cs, c]);
  }

  updateConta(c: Conta) {
    this.contas.update(cs => cs.map(item => item.id === c.id ? c : item));
  }

  deleteConta(id: string) {
    this.contas.update(cs => cs.filter(c => c.id !== id));
  }
}
