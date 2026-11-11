# Projeto Laguardia · SKEMA Consultoria Jr.

Site do projeto com a Padaria Laguardia: cronograma, reuniões, equipe, tarefas e entregas.
Todo o conteúdo fica atrás de login: cada pessoa digita o próprio nome e a senha única da equipe.

## Estrutura
- `public/login.html` — tela de login (única página pública).
- `api/page.js` — entrega o site (`api/_site.js`) só para quem está logado.
- `api/login.js`, `api/logout.js`, `api/_auth.js` — sessão por cookie assinado (30 dias). O login é o nome da pessoa, sem acentos e em minúsculas, e fica registrado na tabela `usuarios`.
- `api/state.js`, `api/task.js`, `api/entregas.js` — status das tarefas, histórico e entregas no Supabase.
- `api/upload.js` — anexos das entregas no Supabase Storage (pasta `anexos`, até 4,4 MB por arquivo).
- `supabase/schema.sql` — tabelas, segurança (RLS) e dados iniciais. Rode uma vez no SQL Editor do Supabase.

## Variáveis de ambiente na Vercel
| Variável | Para quê |
|---|---|
| `SITE_PASSWORD` | Senha única da equipe (obrigatória). |
| `SESSION_SECRET` | Texto longo e aleatório para assinar o login (recomendado). |
| `SUPABASE_URL` | URL do projeto no Supabase (Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (Settings → API). Nunca vai para o navegador. |

Trocar a senha: mude `SITE_PASSWORD` em Settings → Environment Variables e faça um novo deploy.
