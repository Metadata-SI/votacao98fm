import type { ResultadoPayload, PerguntaColeta, RespostaColeta } from '../../shared/coleta-types';

const FONTE_URL = 'https://resultado.gdsd.com.br/?p=90bfcadaf72147e792cf9fdb6be623e2';

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&aacute;/g, 'á').replace(/&Aacute;/g, 'Á')
    .replace(/&eacute;/g, 'é').replace(/&Eacute;/g, 'É')
    .replace(/&iacute;/g, 'í').replace(/&Iacute;/g, 'Í')
    .replace(/&oacute;/g, 'ó').replace(/&Oacute;/g, 'Ó')
    .replace(/&uacute;/g, 'ú').replace(/&Uacute;/g, 'Ú')
    .replace(/&atilde;/g, 'ã').replace(/&Atilde;/g, 'Ã')
    .replace(/&otilde;/g, 'õ').replace(/&Otilde;/g, 'Õ')
    .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&ecirc;/g, 'ê').replace(/&acirc;/g, 'â').replace(/&ocirc;/g, 'ô')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

// A célula de resposta às vezes traz "quantidade | percentual%" e às vezes só
// "percentual%" (sem contagem absoluta) — depende da fonte. Quando não há
// contagem na célula, `quantidade` fica null e quem chama preenche a partir
// do percentual * total de coletas (ver `preencherQuantidades` abaixo).
function parseQuantidadePercentual(raw: string): { quantidade: number | null; percentual: number } {
  const trimmed = raw.trim();
  if (trimmed.includes('|')) {
    const [qtdStr, pctStr] = trimmed.split('|').map(s => s.trim());
    const quantidade = parseInt((qtdStr || '0').replace(/[^\d-]/g, ''), 10) || 0;
    const percentual = parseFloat((pctStr || '0').replace('%', '').replace(',', '.').trim()) || 0;
    return { quantidade, percentual };
  }
  const percentual = parseFloat(trimmed.replace('%', '').replace(',', '.').trim()) || 0;
  return { quantidade: null, percentual };
}

function parsePerguntaTexto(rawTexto: string): { numero: number; tipo: string | null; texto: string } {
  const numeroMatch = rawTexto.match(/^\s*(\d+)\s*-\s*/);
  const numero = numeroMatch ? parseInt(numeroMatch[1], 10) : 0;
  let rest = numeroMatch ? rawTexto.slice(numeroMatch[0].length) : rawTexto;

  const tipoMatch = rest.match(/^\[([^\]]+)\]\s*/);
  const tipo = tipoMatch ? tipoMatch[1] : null;
  if (tipoMatch) rest = rest.slice(tipoMatch[0].length);

  return { numero, tipo, texto: decodeEntities(rest) };
}

export function parseResultadoHtml(html: string): ResultadoPayload {
  const tituloMatch = html.match(/<title>([^<]*)<\/title>/i);
  const titulo = tituloMatch ? decodeEntities(tituloMatch[1]) : 'Pesquisa Eleitoral';

  const atualizadoMatch = html.match(/Atualizada em\s*([^<]*?)\s*\(Hor[aá]rio de Bras[ií]lia\)/i);
  const atualizadoEm = atualizadoMatch ? decodeEntities(atualizadoMatch[1]) : null;

  // Cabeçalho traz o total real de coletas ("Coletas realizadas: N") — é a fonte
  // mais confiável de N, já que nem toda pergunta traz contagem absoluta por opção.
  const coletasMatch = html.match(/Coletas realizadas:\s*(\d+)/i);
  const totalColetas = coletasMatch ? parseInt(coletasMatch[1], 10) : null;

  const blocks = html.split("class='pergunta' colspan='2'>").slice(1);
  const rowRe = /class='resposta'[^>]*>([^<]*)<\/td><td[^>]*class='resposta'[^>]*>([^<]*)<\/td>/g;

  const perguntas: PerguntaColeta[] = blocks.map(block => {
    const rawTexto = block.split('</td>')[0];
    const { numero, tipo, texto } = parsePerguntaTexto(rawTexto);

    const respostas: RespostaColeta[] = [];
    let m: RegExpExecArray | null;
    rowRe.lastIndex = 0;
    while ((m = rowRe.exec(block))) {
      const opcao = decodeEntities(m[1]);
      const { quantidade, percentual } = parseQuantidadePercentual(m[2]);
      // Sem contagem absoluta na célula: aproxima a partir do percentual sobre o
      // total real de coletas (arredondando ao entrevistado mais próximo).
      const quantidadeFinal = quantidade !== null
        ? quantidade
        : totalColetas !== null ? Math.round((percentual / 100) * totalColetas) : 0;
      respostas.push({ opcao, quantidade: quantidadeFinal, percentual });
    }

    return { numero, tipo, texto, respostas };
  });

  // O total de entrevistas é o total real informado no cabeçalho; na ausência
  // dele, cai para o somatório da pergunta de município (1 escolha por entrevistado).
  const perguntaMunicipio = perguntas.find(p => /munic[ií]pio/i.test(p.texto));
  const totalEntrevistas = totalColetas ?? (perguntaMunicipio
    ? perguntaMunicipio.respostas.reduce((sum, r) => sum + r.quantidade, 0)
    : Math.max(0, ...perguntas.map(p => p.respostas.reduce((s, r) => s + r.quantidade, 0))));

  return {
    titulo,
    atualizadoEm,
    buscadoEm: new Date().toISOString(),
    totalEntrevistas,
    perguntas,
  };
}

export async function buscarResultado(): Promise<ResultadoPayload> {
  const response = await fetch(FONTE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AcompanhamentoPesquisaBot/1.0)' },
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar resultado.gdsd.com.br: HTTP ${response.status}`);
  }
  const html = await response.text();
  return parseResultadoHtml(html);
}
