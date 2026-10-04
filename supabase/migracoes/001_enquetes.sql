-- Enquetes eleitorais da 98FM — estrutura de votos.
--
-- Rode este arquivo uma vez no SQL Editor do Supabase
-- (Dashboard > SQL Editor > New query > cole > Run).
--
-- Modelo: uma linha por escolha, não um contador. Fica mais simples de auditar
-- ("quantos votos entraram depois das 18h?"), e é o próprio banco que garante a
-- trava de voto único, sem precisar de transação na aplicação.

create table if not exists public.votos (
  id           bigint      generated always as identity primary key,
  cargo        text        not null,
  candidato_id text        not null,  -- sqcand do TSE
  posicao      smallint    not null default 1,  -- 1 e 2 no Senado; sempre 1 nos demais
  eleitor_id   text        not null,  -- id anônimo do navegador
  criado_em    timestamptz not null default now(),

  constraint votos_cargo_valido check (
    cargo in ('presidente', 'governador', 'senador', 'deputado-federal', 'deputado-estadual')
  ),
  constraint votos_posicao_valida check (posicao between 1 and 2)
);

-- Trava de voto único. É o que devolve "já votou" quando o mesmo dispositivo
-- tenta votar de novo no mesmo cargo. Sendo um índice, a checagem é atômica:
-- duas requisições simultâneas do mesmo leitor não contam duas vezes.
create unique index if not exists votos_eleitor_unico
  on public.votos (cargo, eleitor_id, posicao);

-- Apuração sempre filtra por cargo e agrupa por candidato.
create index if not exists votos_apuracao
  on public.votos (cargo, candidato_id);

-- O navegador nunca fala com esta tabela: quem grava é a função serverless, com
-- a service role. RLS ligada e sem nenhuma policy bloqueia anon e authenticated,
-- enquanto a service role passa por cima (bypassrls).
alter table public.votos enable row level security;

-- ---------------------------------------------------------------------------
-- Apuração
-- ---------------------------------------------------------------------------

-- Votos por candidato e posição. A quebra por posição é o que permite mostrar
-- "1 como 1º voto, 1 como 2º voto" na enquete do Senado.
create or replace view public.resultados_enquete
with (security_invoker = true) as
  select cargo, candidato_id, posicao, count(*)::int as votos
  from public.votos
  group by cargo, candidato_id, posicao;

-- Participantes distintos. Não é a soma dos votos: no Senado cada pessoa vota
-- duas vezes.
create or replace view public.participantes_enquete
with (security_invoker = true) as
  select cargo, count(distinct eleitor_id)::int as participantes
  from public.votos
  group by cargo;

revoke all on public.votos from anon, authenticated;
revoke all on public.resultados_enquete from anon, authenticated;
revoke all on public.participantes_enquete from anon, authenticated;
