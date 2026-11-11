-- Banco de dados do site do Projeto Laguardia (SKEMA Consultoria Jr.)
-- Rode este arquivo uma vez no SQL Editor do Supabase. Ele pode ser rodado de novo sem apagar dados.
-- Todo acesso passa pelas funções da Vercel com a chave de serviço; o navegador nunca fala direto com o banco.

-- 1. Pessoas que entram no site (o login é o nome, sem acentos e em minúsculas)
create table if not exists public.usuarios (
  login          text primary key,
  nome           text not null,
  criado_em      timestamptz not null default now(),
  ultimo_acesso  timestamptz not null default now(),
  acessos        integer not null default 1
);

-- 2. Status atual de cada tarefa do cronograma
create table if not exists public.tarefas_status (
  tarefa_id      text primary key,
  status         text not null check (status in ('A fazer', 'Em andamento', 'Concluída')),
  atualizado_por text references public.usuarios(login) on update cascade,
  atualizado_em  timestamptz not null default now()
);

-- 3. Histórico: cada mudança de status fica registrada
create table if not exists public.tarefas_historico (
  id         bigint generated always as identity primary key,
  tarefa_id  text not null,
  status     text not null,
  login      text references public.usuarios(login) on update cascade,
  em         timestamptz not null default now()
);
create index if not exists tarefas_historico_login_idx on public.tarefas_historico (login, em desc);
create index if not exists tarefas_status_atualizado_por_idx on public.tarefas_status (atualizado_por);

-- 4. Entregas à Padaria (datas, status, anexos, retorno da Ana Paula)
create table if not exists public.entregas (
  id              text primary key,
  dados           jsonb not null,
  criada_por      text,
  criada_em       timestamptz not null default now(),
  atualizada_por  text,
  atualizada_em   timestamptz not null default now()
);

-- Segurança: RLS ligado e nenhuma política pública. Só a chave de serviço (usada pela Vercel) lê e grava.
alter table public.usuarios          enable row level security;
alter table public.tarefas_status    enable row level security;
alter table public.tarefas_historico enable row level security;
alter table public.entregas          enable row level security;

-- Registra o login: cria a pessoa na primeira vez e soma um acesso nas seguintes.
create or replace function public.registrar_acesso(p_login text, p_nome text)
returns public.usuarios
language sql
security definer
set search_path = public
as $$
  insert into public.usuarios (login, nome) values (p_login, p_nome)
  on conflict (login) do update
    set ultimo_acesso = now(), acessos = public.usuarios.acessos + 1
  returning *;
$$;
revoke all on function public.registrar_acesso(text, text) from public, anon, authenticated;
grant execute on function public.registrar_acesso(text, text) to service_role;

-- Pasta pública para os anexos das entregas (os links são longos e aleatórios)
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', true)
on conflict (id) do nothing;

-- Dados iniciais (copiados do site anterior em 05/11/2026)
insert into public.entregas (id, dados) values
  ('e1-plano', '{"alteracoes": "", "apresentacao": "2026-11-09", "arquivos": [], "clausula": "Entregável (i) · Cláusula 6ª, §3º", "conteudo": "cronograma detalhado das fases e responsáveis por cada frente; enviar até o fim da 2ª semana (sai na qua, 11/11, com os ajustes do kick-off).", "envio": "2026-11-11", "frente": "Gestão", "gostou": "", "notas": "", "resp": ["PO"], "status": "A fazer", "tipo": "formal", "titulo": "Plano de Trabalho"}'::jsonb),
  ('e2-marketing', '{"alteracoes": "", "apresentacao": "2026-12-08", "arquivos": [], "clausula": "Entregável (iii) · Cláusula 6ª, §3º", "conteudo": "diagnóstico do Instagram, WhatsApp e Google; pilares dos diferenciais da marca; linha editorial e formatos do Instagram; recomendações de WhatsApp e SEO; direcionamento da campanha de Natal 2026.", "envio": "2026-12-09", "frente": "Frente 2 · Marketing digital", "gostou": "", "notas": "", "resp": ["I5"], "status": "A fazer", "tipo": "formal", "titulo": "Direcionamento de Marketing e Comunicação Digital"}'::jsonb),
  ('e3-pesquisa', '{"alteracoes": "", "apresentacao": "2026-12-15", "arquivos": [], "clausula": "Entregável (ii) · Cláusula 6ª, §3º", "conteudo": "concorrentes de panetone artesanal online, faixas de preço e modelos de envio, custos e viabilidade do frete por CEP, recomendações de posicionamento e preço, base de leads em MG por prioridade.", "envio": "2026-12-16", "frente": "Frente 1 · Mercado e leads", "gostou": "", "notas": "", "resp": ["I1"], "status": "A fazer", "tipo": "formal", "titulo": "Relatório de Pesquisa de Mercado e Leads Qualificados"}'::jsonb),
  ('p1-natal-rapido', '{"apresentacao": "2026-11-24", "arquivos": [], "envio": "2026-11-25", "frente": "Frente 2 · Marketing digital", "notas": "", "resp": ["I6", "I7"], "status": "A fazer", "tipo": "previa", "titulo": "Ações rápidas de Natal (1 página)"}'::jsonb),
  ('p2-campanha-leads', '{"apresentacao": "2026-12-01", "arquivos": [], "envio": "2026-12-02", "frente": "Frente 2 · Marketing digital", "notas": "", "resp": ["I8", "I4"], "status": "A fazer", "tipo": "previa", "titulo": "Campanha de Natal + 20 leads prioritários"}'::jsonb),
  ('p3-preco-frete', '{"apresentacao": "2026-12-08", "arquivos": [], "envio": "2026-12-09", "frente": "Frente 1 · Mercado e leads", "notas": "", "resp": ["I1", "I2"], "status": "A fazer", "tipo": "previa", "titulo": "Preço e frete recomendados (preliminar)"}'::jsonb)
on conflict (id) do nothing;

insert into public.tarefas_status (tarefa_id, status, atualizado_em) values
  ('0311-kick-off-proposto', 'Concluída', '2026-11-05T11:57:40.512Z'::timestamptz),
  ('0511-contrato-lido-e-duvidas-anotadas', 'Em andamento', '2026-11-05T11:59:29.257Z'::timestamptz),
  ('0611-kick-off-interno-realizado', 'Em andamento', '2026-11-05T11:57:33.810Z'::timestamptz),
  ('2910-contrato-assinado-e-1a-parcela-conf', 'Em andamento', '2026-11-01T13:57:40.486Z'::timestamptz)
on conflict (tarefa_id) do nothing;
