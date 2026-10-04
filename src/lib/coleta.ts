import type { PerguntaColeta, ResultadoPayload } from '../../shared/coleta-types';

export type { PerguntaColeta, RespostaColeta, ResultadoPayload } from '../../shared/coleta-types';

// Lista oficial dos 63 municípios do plano amostral, na ordem em que aparecem na fonte.
export const RN_MUNICIPIOS = [
  'Acari', 'Afonso Bezerra', 'Alexandria', 'Alto do Rodrigues', 'Apodi', 'Areia Branca', 'Arez',
  'Assú', 'Baraúna', 'Brejinho', 'Caicó', 'Campo Grande', 'Canguaretama', 'Caraúbas', 'Ceará-Mirim',
  'Currais Novos', 'Extremoz', 'Goianinha', 'Governador Dix-Sept Rosado', 'Guamaré', 'Ielmo Marinho',
  'Ipanguaçu', 'Jardim de Piranhas', 'João Câmara', 'Jucurutu', 'Lagoa Nova', 'Lajes', 'Luís Gomes',
  'Macaíba', 'Macau', 'Maxaranguape', 'Monte Alegre', 'Mossoró', 'Natal', 'Nísia Floresta', 'Nova Cruz',
  'Parelhas', 'Parnamirim', 'Patu', 'Pau dos Ferros', 'Pedro Avelino', 'Pedro Velho', 'Pendências',
  'Poço Branco', 'Rio do Fogo', 'Santa Cruz', 'Santana do Matos', 'Santo Antônio', 'São Gonçalo do Amarante',
  'São José de Mipibu', 'São José do Campestre', 'São Miguel', 'São Paulo do Potengi', 'São Tomé',
  'Serra do Mel', 'Taipu', 'Tangará', 'Tenente Ananias', 'Tibau do Sul', 'Touros', 'Umarizal', 'Upanema',
  'Vera Cruz',
] as const;

// ---------------------------------------------------------------------------
// PLANO AMOSTRAL (metas). A fonte (resultado.gdsd.com.br) só informa o REALIZADO,
// não as metas planejadas. Até que o plano amostral seja enviado, todo mundo fica
// como `null` ("meta a definir"). Quando as metas chegarem, basta preencher os
// números abaixo — o resto do painel (%, pendências, status) já calcula sozinho.
// ---------------------------------------------------------------------------
export const META_TOTAL: number | null = 1536;

// Metas por município, na mesma ordem de RN_MUNICIPIOS.
const METAS_MUNICIPIOS_VALORES = [
  9, 8, 16, 9, 20, 15, 9,
  35, 15, 8, 42, 8, 19, 13, 35,
  33, 24, 17, 8, 12, 8,
  10, 11, 32, 14, 13, 9, 10,
  32, 17, 8, 10, 123, 339, 14, 34,
  16, 87, 14, 29, 8, 9, 8,
  8, 8, 32, 9, 24, 46,
  22, 13, 27, 23, 15,
  9, 8, 15, 11, 11, 17, 12, 8,
  8,
];

export const METAS_MUNICIPIOS: Record<string, number | null> = Object.fromEntries(
  RN_MUNICIPIOS.map((nome, i) => [nome, METAS_MUNICIPIOS_VALORES[i]]),
);

export type DemografiaChave = 'sexo' | 'idade' | 'escolaridade' | 'renda';

// Metas demográficas do plano amostral, em % do total de entrevistas (não em
// contagem absoluta — não temos o N total planejado ainda). O painel compara
// essa % alvo com a % que a coleta já apresenta em cada categoria, para saber
// se está faltando gente de determinado perfil ou já foi além da cota.
export const METAS_DEMOGRAFICAS: Record<DemografiaChave, Record<string, number | null>> = {
  sexo: {
    'Masculino': 47.23,
    'Feminino': 52.77,
  },
  idade: {
    'Até 24 anos': 12.90,
    'De 25 a 34 anos': 19.38,
    'De 35 a 44 anos': 20.24,
    'De 45 a 59 anos': 25.00,
    '60 anos ou mais': 22.48,
  },
  escolaridade: {
    'Analfabeto ou até o Ensino Fundamental completo': 38.05,
    'Ensino Médio incompleto ou completo': 38.46,
    'Ensino Superior incompleto ou completo': 23.49,
    'Prefiro não responder': null, // sem meta própria (não fazia parte do plano)
  },
  renda: {
    'Até 2 salários mínimos (R$ 3.242,00)': 48.21,
    'Mais de 2 a 5 salários mínimos (R$ 3.242,01 a R$ 8.105,00)': 35.31,
    'Mais de 5 a 10 salários mínimos (R$ 8.105,01 a R$ 16.210,00)': 10.25,
    'Mais de 10 salários mínimos (R$ 16.210,00)': 6.23,
    'Não sabe/Não respondeu (NS/NR)': null, // sem meta própria (não fazia parte do plano)
  },
};

// ---------------------------------------------------------------------------
// Identificação de perguntas por palavra-chave (robusto a mudanças na ordem/numeração
// do questionário, já que a fonte pode reformular perguntas entre pesquisas).
// ---------------------------------------------------------------------------
const KEYWORDS: Record<DemografiaChave, RegExp> = {
  sexo: /^sexo do/i,
  idade: /qual a sua idade/i,
  escolaridade: /grau de instru[cç][aã]o/i,
  renda: /renda mensal total da fam[ií]lia/i,
};

export function findPergunta(perguntas: PerguntaColeta[], test: RegExp): PerguntaColeta | undefined {
  return perguntas.find(p => test.test(p.texto));
}

export function findMunicipioPergunta(perguntas: PerguntaColeta[]): PerguntaColeta | undefined {
  return findPergunta(perguntas, /munic[ií]pio/i);
}

export function findDemografiaPergunta(perguntas: PerguntaColeta[], chave: DemografiaChave): PerguntaColeta | undefined {
  return findPergunta(perguntas, KEYWORDS[chave]);
}

export const IDADE_ORDER = ['Até 24 anos', 'De 25 a 34 anos', 'De 35 a 44 anos', 'De 45 a 59 anos', '60 anos ou mais'];
export const ESCOLARIDADE_ORDER = [
  'Analfabeto ou até o Ensino Fundamental completo',
  'Ensino Médio incompleto ou completo',
  'Ensino Superior incompleto ou completo',
  'Prefiro não responder',
];
export const RENDA_ORDER = [
  'Até 2 salários mínimos (R$ 3.242,00)',
  'Mais de 2 a 5 salários mínimos (R$ 3.242,01 a R$ 8.105,00)',
  'Mais de 5 a 10 salários mínimos (R$ 8.105,01 a R$ 16.210,00)',
  'Mais de 10 salários mínimos (R$ 16.210,00)',
  'Não sabe/Não respondeu (NS/NR)',
];

// ---------------------------------------------------------------------------
// Derivações
// ---------------------------------------------------------------------------
export type StatusMunicipio = 'não iniciado' | 'em andamento' | 'concluído' | 'excedente';

export interface MunicipioColeta {
  nome: string;
  realizado: number;
  percentualDoTotal: number;
  meta: number | null;
  pendente: number | null;
  excedente: number | null;
  percentualMeta: number | null;
  status: StatusMunicipio;
}

export function statusMunicipio(realizado: number, meta: number | null): StatusMunicipio {
  if (meta === null) return realizado > 0 ? 'em andamento' : 'não iniciado';
  if (realizado <= 0) return 'não iniciado';
  if (realizado < meta) return 'em andamento';
  if (realizado === meta) return 'concluído';
  return 'excedente';
}

export const STATUS_LABEL: Record<StatusMunicipio, string> = {
  'não iniciado': 'Não iniciado',
  'em andamento': 'Em andamento',
  'concluído': 'Concluído',
  'excedente': 'Excedente',
};

export const STATUS_COLOR: Record<StatusMunicipio, string> = {
  'não iniciado': '#95a5a6',
  'em andamento': '#f39c12',
  'concluído': '#27ae60',
  'excedente': '#2980b9',
};

export function buildMunicipios(payload: ResultadoPayload | null): MunicipioColeta[] {
  if (!payload) {
    return RN_MUNICIPIOS.map(nome => ({
      nome, realizado: 0, percentualDoTotal: 0, meta: METAS_MUNICIPIOS[nome] ?? null,
      pendente: METAS_MUNICIPIOS[nome] ?? null, excedente: null, percentualMeta: null, status: 'não iniciado',
    }));
  }
  const pergunta = findMunicipioPergunta(payload.perguntas);
  const counts: Record<string, number> = {};
  pergunta?.respostas.forEach(r => { counts[r.opcao] = r.quantidade; });
  const total = payload.totalEntrevistas || Object.values(counts).reduce((a, b) => a + b, 0);

  return RN_MUNICIPIOS.map(nome => {
    const realizado = counts[nome] ?? 0;
    const meta = METAS_MUNICIPIOS[nome] ?? null;
    const status = statusMunicipio(realizado, meta);
    return {
      nome,
      realizado,
      percentualDoTotal: total > 0 ? (realizado / total) * 100 : 0,
      meta,
      pendente: meta !== null ? Math.max(0, meta - realizado) : null,
      excedente: meta !== null ? Math.max(0, realizado - meta) : null,
      percentualMeta: meta !== null && meta > 0 ? (realizado / meta) * 100 : null,
      status,
    };
  });
}

export function toCsv(municipios: MunicipioColeta[]): string {
  const header = ['Município', 'Realizado', '% do total coletado', 'Meta', 'Pendente', 'Excedente', '% da meta', 'Status'];
  const lines = municipios.map(m => [
    m.nome,
    m.realizado,
    m.percentualDoTotal.toFixed(2).replace('.', ','),
    m.meta ?? '—',
    m.pendente ?? '—',
    m.excedente ?? '—',
    m.percentualMeta !== null ? m.percentualMeta.toFixed(2).replace('.', ',') : '—',
    STATUS_LABEL[m.status],
  ]);
  return [header, ...lines].map(row => row.join(';')).join('\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type StatusCota = 'abaixo da meta' | 'dentro da meta' | 'acima da meta' | 'sem meta';

export interface QuotaRow {
  categoria: string;
  realizadoCount: number;
  realizadoPct: number;
  metaPct: number | null;
  diffPct: number | null; // realizadoPct - metaPct, em pontos percentuais
  status: StatusCota;
  // Nº de entrevistas que a categoria deveria ter ao final da coleta (meta % do total de META_TOTAL).
  metaCount: number | null;
  // Diferença bruta (em nº de entrevistas) entre o que a categoria "deveria" ter ao final
  // da coleta (metaPct do META_TOTAL) e o que ela realmente tem. Positivo = faltam
  // entrevistas; negativo = já ultrapassou a meta.
  faltamBruto: number | null;
}

const TOLERANCIA_PP = 3; // margem (pontos percentuais) considerada "dentro da meta"

export function statusCota(diffPct: number | null): StatusCota {
  if (diffPct === null) return 'sem meta';
  if (diffPct < -TOLERANCIA_PP) return 'abaixo da meta';
  if (diffPct > TOLERANCIA_PP) return 'acima da meta';
  return 'dentro da meta';
}

export const STATUS_COTA_COLOR: Record<StatusCota, string> = {
  'abaixo da meta': '#e74c3c',
  'dentro da meta': '#27ae60',
  'acima da meta': '#2980b9',
  'sem meta': '#95a5a6',
};

export function buildQuotaComparison(
  respostas: { opcao: string; quantidade: number }[],
  chave: DemografiaChave,
  order?: string[],
): QuotaRow[] {
  const total = respostas.reduce((a, r) => a + r.quantidade, 0);
  const byName = Object.fromEntries(respostas.map(r => [r.opcao, r.quantidade]));
  const metas = METAS_DEMOGRAFICAS[chave];
  const keys = order ? order.filter(k => k in byName) : Object.keys(byName);

  return keys.map(categoria => {
    const realizadoCount = byName[categoria] || 0;
    const realizadoPct = total > 0 ? (realizadoCount / total) * 100 : 0;
    const metaPct = metas[categoria] ?? null;
    const diffPct = metaPct !== null ? realizadoPct - metaPct : null;

    // Quantas entrevistas essa categoria deveria ter ao final da coleta (meta % do
    // total planejado de META_TOTAL), comparado com o que ela realmente tem.
    let metaCount: number | null = null;
    let faltamBruto: number | null = null;
    if (metaPct !== null && META_TOTAL !== null) {
      metaCount = Math.round((metaPct / 100) * META_TOTAL);
      faltamBruto = metaCount - realizadoCount;
    }

    return {
      categoria, realizadoCount, realizadoPct, metaPct, diffPct, status: statusCota(diffPct),
      metaCount, faltamBruto,
    };
  });
}

export function toChartData(respostas: { opcao: string; quantidade: number }[], order?: string[]) {
  const total = respostas.reduce((a, r) => a + r.quantidade, 0);
  const byName = Object.fromEntries(respostas.map(r => [r.opcao, r.quantidade]));
  const keys = order ? order.filter(k => k in byName) : respostas.map(r => r.opcao).sort((a, b) => (byName[b] || 0) - (byName[a] || 0));
  return keys.map(name => ({
    name,
    value: byName[name] || 0,
    pct: total > 0 ? ((byName[name] || 0) / total) * 100 : 0,
  }));
}
