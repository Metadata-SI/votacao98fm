import type { CargoSlug } from '../../shared/enquete-types';
import { CARGOS_META } from './enquete';

/*
 * Geração do código que a redação cola no 98fmnatal.com.br.
 *
 * O iframe é isolado de propósito: o CSS e o JS do site da rádio não interferem
 * na enquete, e a enquete não interfere no site. O único canal entre os dois é
 * uma mensagem de altura via postMessage, para o iframe não ficar com barra de
 * rolagem nem com espaço sobrando.
 */

export const MENSAGEM_ALTURA = '98fm-enquete:altura';

export interface OpcoesEmbed {
  /** Origem onde o painel está publicado (ex.: https://enquetes.98fmnatal.com.br). */
  origem: string;
  tema: 'claro' | 'escuro';
  /** Mostrar a apuração parcial depois que o leitor vota. */
  mostrarResultado: boolean;
  /** Largura máxima do bloco no site, em px. 0 = ocupar toda a largura. */
  larguraMaxima: number;
  /** Ajuste automático de altura via postMessage. */
  alturaAutomatica: boolean;
}

export const OPCOES_EMBED_PADRAO: OpcoesEmbed = {
  origem: '',
  tema: 'claro',
  mostrarResultado: true,
  larguraMaxima: 720,
  alturaAutomatica: true,
};

export function urlEnquete(cargo: CargoSlug, opcoes: OpcoesEmbed): string {
  const base = (opcoes.origem || '').replace(/\/+$/, '');
  const params = new URLSearchParams();
  if (opcoes.tema !== 'claro') params.set('tema', opcoes.tema);
  if (!opcoes.mostrarResultado) params.set('resultado', '0');
  const query = params.toString();
  return `${base}/enquete/${cargo}${query ? `?${query}` : ''}`;
}

/*
 * Altura natural da enquete a ~720px de largura. Como só a lista de candidatos
 * rola — cabeçalho, barra de confirmação e assinatura ficam parados —, a caixa
 * tem altura previsível, e estes números batem com o que o widget mede em tela.
 * Senador soma os campos de 1º/2º voto; deputado soma o campo de busca.
 */
function alturaNatural(cargo: CargoSlug): number {
  const meta = CARGOS_META[cargo];
  if (meta.listaLonga) return 730;
  if (meta.votos > 1) return 720;
  return 680;
}

export function gerarCodigoEmbed(cargo: CargoSlug, opcoes: OpcoesEmbed): string {
  const meta = CARGOS_META[cargo];
  const src = urlEnquete(cargo, opcoes);
  const titulo = `Enquete 98FM — ${meta.titulo}`;
  const wrapperStyle = opcoes.larguraMaxima > 0
    ? `max-width:${opcoes.larguraMaxima}px;margin:0 auto;`
    : 'width:100%;';

  const iframe = [
    '  <iframe',
    `    data-enquete-98fm="${cargo}"`,
    `    src="${src}"`,
    `    title="${titulo}"`,
    '    loading="lazy"',
    '    scrolling="no"',
    `    style="width:100%;height:${alturaNatural(cargo)}px;border:0;display:block;overflow:hidden;"`,
    '  ></iframe>',
  ].join('\n');

  const script = opcoes.alturaAutomatica
    ? `
<script>
/* Ajusta a altura do iframe conforme a enquete muda de passo. */
(function () {
  window.addEventListener('message', function (evento) {
    var dados = evento.data;
    if (!dados || dados.tipo !== '${MENSAGEM_ALTURA}') return;
    var frames = document.querySelectorAll('iframe[data-enquete-98fm]');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === evento.source) {
        frames[i].style.height = dados.altura + 'px';
      }
    }
  });
})();
</script>`
    : '';

  return `<!-- ${titulo} -->
<div class="enquete-98fm" style="${wrapperStyle}">
${iframe}
</div>${script}
`;
}

/** Variante de uma linha, para CMS que não aceita <script> no corpo da matéria. */
export function gerarCodigoEmbedSimples(cargo: CargoSlug, opcoes: OpcoesEmbed): string {
  const meta = CARGOS_META[cargo];
  // Sem o script de ajuste, a altura é fixa. A folga cobre a pergunta ocupando
  // uma ou duas linhas a mais em telas estreitas.
  const altura = alturaNatural(cargo) + 40;
  return `<iframe src="${urlEnquete(cargo, opcoes)}" title="Enquete 98FM — ${meta.titulo}" style="width:100%;max-width:${opcoes.larguraMaxima > 0 ? `${opcoes.larguraMaxima}px` : '100%'};height:${altura}px;border:0;display:block;margin:0 auto;" loading="lazy"></iframe>`;
}

/** Avisa a página hospedeira da altura atual. Chamado de dentro do iframe. */
export function publicarAltura(altura: number): void {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ tipo: MENSAGEM_ALTURA, altura: Math.ceil(altura) }, '*');
}
