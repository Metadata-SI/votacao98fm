# Enquetes 98FM — Eleições 2026

Painel interno onde a redação da 98FM monta e acompanha as enquetes eleitorais, e gera o código para
incorporá-las no **98fmnatal.com.br**.

Cada cargo tem a sua enquete, com contagem própria. O painel exibe hoje os dois cargos em 2º turno:

| Cargo | Abrangência | Votos por leitor | Candidatos | No painel |
| --- | --- | --- | --- | --- |
| Presidente | Brasil | 1 | 2 (2º turno) | sim |
| Governador | RN | 1 | 2 (2º turno) | sim |
| **Senador** | RN | **2 — 1º e 2º voto** | 13 | não |
| Deputado Federal | RN | 1 | 99 | não |
| Deputado Estadual | RN | 1 | 148 | não |

Quem aparece em cada cargo, e com que cor, está em `shared/segundoTurno.ts`. Cargo listado ali é
recortado para os dois finalistas e ganha o selo "2º turno"; cargo ausente segue com a lista inteira.

Quais cargos o painel mostra está em `CARGOS_NO_PAINEL`, em `src/lib/enquete.ts`. Tirar um cargo de lá
só o esconde do painel — a rota `/enquete/<cargo>` e a API continuam respondendo, para não quebrar
enquete já incorporada numa matéria publicada.

O Senado do RN tem duas vagas em disputa, então a enquete de senador pede dois nomes: o leitor escolhe o
1º e o 2º voto, e o mesmo candidato não pode receber os dois.

## Como funciona

```
/                      painel da redação — cards por cargo + botão "Incorporar"
/enquete/:cargo        página servida dentro do iframe no site da rádio

/api/candidatos        lista de opções de cada cargo (busca no TSE, com fallback local)
/api/votos             GET = apuração da enquete · POST = registra o voto do leitor
```

### De onde vêm os candidatos

Dos arquivos oficiais que o TSE publica em `resultados.tse.jus.br` — os mesmos que alimentam o site de
divulgação. De lá vêm nome de urna, número, partido, coligação, vice/suplentes e a foto oficial.

`shared/candidatosSnapshot.ts` é um retrato desses dados guardado no projeto. Serve só como rede de
segurança: se o TSE não responder, a enquete no ar continua mostrando a lista em vez de aparecer vazia.
O painel avisa quando está usando o retrato em vez da fonte ao vivo.

Para atualizar o retrato (vale fazer se a Justiça Eleitoral mexer em algum registro):

```bash
npm run snapshot:candidatos
```

Para outra eleição ou outro estado, ajuste as variáveis antes de rodar. Os códigos de eleição estão em
<https://resultados.tse.jus.br/oficial/comum/config/ele-c.json>:

```bash
TSE_CICLO=ele2026 TSE_ELEICAO_FEDERAL=6257 TSE_ELEICAO_ESTADUAL=6259 TSE_UF=rn npm run snapshot:candidatos
```

As mesmas variáveis valem em produção, e são lidas por `api/lib/tseCandidatos.ts`.

## Onde os votos ficam guardados

`api/lib/votosStore.ts` grava no Postgres do Supabase, pela API REST (PostgREST) — escolhida porque fala
HTTP puro, então funciona em função serverless sem conexão persistente e sem dependência nova no
`package.json`.

Sem as credenciais o projeto continua funcionando, mas guarda os votos **em memória**: cada instância
serverless fica com a sua própria contagem e tudo se perde a cada deploy. É suficiente para `npm run dev`,
não para o ar. O painel mostra um aviso amarelo enquanto estiver nesse modo.

### 1. Criar as tabelas

No Supabase: **SQL Editor → New query**, cole o conteúdo de
[`supabase/migracoes/001_enquetes.sql`](supabase/migracoes/001_enquetes.sql) e rode. É uma vez só.

Isso cria:

| Objeto | Para quê |
| --- | --- |
| `votos` | uma linha por escolha (cargo, candidato, posição, eleitor, data) |
| índice `votos_eleitor_unico` | trava de voto único, em `(cargo, eleitor_id, posicao)` |
| view `resultados_enquete` | votos por candidato e posição |
| view `participantes_enquete` | eleitores distintos por cargo |

Guardamos uma linha por voto em vez de um contador: fica auditável ("quantos votos entraram depois das
18h?") e é o próprio banco que garante a trava de voto único, sem transação na aplicação.

### 2. Pegar as credenciais

No Supabase, em **Project Settings → API**:

- `SUPABASE_URL` → o campo **Project URL** (`https://<ref>.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` → a chave **service_role**

A chave `anon` não é usada: o navegador nunca fala direto com o Supabase, só com `/api/votos`.

> A `service_role` ignora a RLS e dá acesso total ao banco. Ela é lida apenas pelas funções em `api/`, que
> rodam no servidor. **Nunca** coloque o prefixo `VITE_` nela — o Vite embutiria a chave no JavaScript
> entregue ao navegador.

### 3. Cadastrar na Vercel (produção)

Pelo painel: **Settings → Environment Variables**, em cada variável marque os ambientes
*Production*, *Preview* e *Development*.

Ou pela linha de comando:

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

**Variável nova só vale no próximo deploy.** Depois de cadastrar, rode `vercel --prod` ou use
*Deployments → ⋯ → Redeploy*. Para conferir se pegou, abra o painel: o aviso amarelo
"Votos guardados apenas em memória" some.

### 4. Rodar local

```bash
cp .env.example .env.local
```

Preencha as duas chaves no `.env.local` e reinicie o `npm run dev`. O `.env.local` é ignorado pelo Git.

Para desenvolver sem banco é só não preencher — o modo em memória assume sozinho.

> Em dev o `vite.config.ts` repassa o `.env` para `process.env` (`loadEnv` com prefixo vazio). Sem isso o
> Vite só exporia variáveis `VITE_` para o cliente, e as funções de `api/` nunca enxergariam as
> credenciais.

### Consultas úteis

```sql
-- apuração de um cargo
select candidato_id, posicao, count(*) from votos
where cargo = 'senador' group by candidato_id, posicao order by 3 desc;

-- ritmo de votação por hora
select date_trunc('hour', criado_em) as hora, count(*) from votos
where cargo = 'senador' group by 1 order by 1;

-- zerar uma enquete antes de publicar
delete from votos where cargo = 'senador';
```

### Voto único

Cada navegador recebe um id anônimo (`crypto.randomUUID`) guardado no `localStorage`, enviado junto com o
voto. O servidor registra esse id num `SADD` — operação atômica, então duas requisições simultâneas do
mesmo leitor não contam duas vezes. Quem já votou recebe `409`.

É a trava usual de enquete de rádio: segura o clique repetido e o F5, mas não resiste a quem limpa o
navegador de propósito. Como a enquete é de opinião e não tem valor científico, isso é aceitável — está
escrito na própria enquete.

O `POST /api/votos` também valida as escolhas contra a lista real de candidatos do cargo, para que ninguém
infle a enquete chamando a API com um id inventado.

## Senha do painel

O painel (`/`) exige login. A enquete incorporada (`/enquete/:cargo`) e as rotas que ela consome
(`/api/candidatos`, `/api/votos`) continuam **públicas** — quem entra ali é o ouvinte no site da rádio.

```
PAINEL_SENHA=...
```

A senha é conferida no servidor (`api/painel-sessao.ts`) e **nunca** entra no JavaScript do navegador. O
que o cliente recebe é um cookie `HttpOnly` assinado com HMAC-SHA256, válido por 12h. A chave da
assinatura é a própria senha, então **trocar a senha derruba todas as sessões abertas** — sem precisar de
outra variável nem de tabela de sessões.

Cuidados embutidos: comparação em tempo constante (não dá para descobrir a senha medindo o tempo de
resposta), atraso fixo de 700ms em tentativa errada, e `Secure` no cookie fora do localhost.

Sem a variável o painel abre sem login e mostra um aviso amarelo — assim ninguém fica trancado para fora
por esquecer de configurar, mas o risco fica visível.

> O que a senha protege é a **interface** do painel. Os dados em si (lista de candidatos do TSE, totais
> das enquetes) seguem acessíveis pelas rotas públicas, porque a enquete incorporada depende delas.

## Incorporar no 98fmnatal.com.br

No painel, clique em **Incorporar** no card do cargo. O diálogo deixa ajustar:

- **endereço do painel** — o domínio público deste projeto, de onde o iframe carrega a enquete;
- **largura máxima** — `0` ocupa toda a largura do espaço;
- **tema** — claro ou escuro, para matéria de fundo escuro;
- **mostrar resultado parcial** depois do voto;
- **ajuste automático de altura**.

Saem dois formatos:

- **Código recomendado** — iframe + um trecho de script que ajusta a altura conforme a enquete muda de
  passo (seleção → voto → resultado). Use sempre que o CMS aceitar bloco de HTML com `<script>`.
- **Só o iframe** — uma linha, altura fixa, sem script. Para CMS que remove `<script>` do corpo da matéria.

A enquete roda isolada dentro do iframe: o CSS do site da rádio não interfere nela, e ela não interfere no
site. O único canal entre os dois é a mensagem de altura (`postMessage`, tipo `98fm-enquete:altura`).

A assinatura das marcas (Metadata, Grupo Dial Natal, 98FM e Jovem Pan) vai junto no pé da enquete, em
versão reduzida — é o mesmo `RodapeParceria` do painel, com `compacto`. Por causa disso, quem mede a
altura para o site hospedeiro é a página `src/pages/Enquete.tsx`, não o widget: medindo só o widget, o
iframe cortaria o rodapé.

### Altura da enquete

A enquete é uma caixa de altura fixa: **só a lista de candidatos rola**. Pergunta, logo, campos de 1º/2º
voto, busca, botão de confirmação e assinatura ficam parados, de modo que o bloco ocupe sempre o mesmo
espaço na matéria — cerca de 680px (Presidente e Governador), 720px (Senador) e 730px (deputados), em vez
de esticar o iframe por mais de mil pixels.

Esses números estão em `alturaNatural()` (`src/lib/embed.ts`) e alimentam tanto a altura inicial do iframe
quanto a altura fixa da variante sem script. Se você mexer no `max-h` da faixa que rola em
`EnqueteWidget.tsx`, ajuste-os junto.

## Rodando localmente

```bash
npm install
npm run dev
```

O plugin `apiDevPlugin` em `vite.config.ts` serve as funções de `api/` dentro do `vite dev`, imitando o
contrato da Vercel (`req.query`, `req.body`, `res.status().json()`), então não é preciso `vercel dev`.

```bash
npm run lint     # eslint
npm run build    # build de produção
npm test         # vitest
```

## Estrutura

```
api/
  candidatos.ts            GET das opções de cada cargo
  votos.ts                 GET da apuração · POST do voto
  lib/tseCandidatos.ts     busca e normaliza os arquivos do TSE
  lib/votosStore.ts        Supabase (PostgREST) com fallback em memória
  lib/http.ts              contrato mínimo de req/res
  painel-sessao.ts         login/logout do painel
  lib/sessao.ts            senha, cookie assinado e validação

shared/
  enquete-types.ts         tipos usados pela API e pelo front
  candidatosSnapshot.ts    retrato das candidaturas (gerado — não edite à mão)

supabase/
  migracoes/001_enquetes.sql  tabela de votos, índice de voto único e views

src/
  pages/Index.tsx          o painel
  pages/Enquete.tsx        a página do iframe
  components/CargoCard.tsx       card de cargo, com prévia
  components/RodapeParceria.tsx  assinatura das marcas (painel e enquete)
  components/LoginPainel.tsx     tela de senha do painel
  components/EmbedDialog.tsx     gerador do código de incorporação
  components/EnqueteWidget.tsx   a votação em si
  components/CandidatoItem.tsx   linha de candidato
  components/ResultadoEnqueteLista.tsx  apuração parcial
  lib/enquete.ts           config dos cargos + cliente da API
  lib/embed.ts             montagem do código do iframe

scripts/
  gerar-snapshot-candidatos.mjs
```

## Observações

- As enquetes medem a opinião dos ouvintes. Não têm valor científico e não substituem pesquisa registrada
  nem a apuração oficial do TSE — o aviso aparece para o leitor dentro da própria enquete.
- O cabeçalho do painel ainda usa o logo da Metadata (`src/assets/`). Troque pelos arquivos da 98FM se
  preferir — a assinatura das quatro marcas no rodapé é independente disso.
- Os arquivos da coleta GDS anterior (`PanelResumoColeta`, `useColeta`, `api/resultado.ts` e companhia)
  continuam no repositório, mas nenhuma rota aponta para eles. Podem ser removidos quando não forem mais
  necessários.
