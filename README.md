# Projeto Laguardia · SKEMA Consultoria Jr.

Site do projeto com a Padaria Laguardia: cronograma, reuniões, equipe, tarefas e entregas.
Todo o conteúdo fica atrás de login: cada pessoa digita o próprio nome e a senha única da equipe.

## Estrutura
- `public/login.html` — tela de login (única página pública).
- `api/page.js` — entrega o site (`api/_site.js`) só para quem está logado.
- `api/login.js`, `api/logout.js`, `api/_auth.js` — sessão por cookie assinado (30 dias).
- `api/state.js`, `api/task.js`, `api/entregas.js` — status das tarefas e entregas, salvos no Upstash Redis.
- `api/upload.js` — anexos das entregas no Vercel Blob (até 4,4 MB por arquivo).

## Variáveis de ambiente na Vercel
| Variável | Para quê |
|---|---|
| `SITE_PASSWORD` | Senha única da equipe (obrigatória). |
| `SESSION_SECRET` | Texto longo e aleatório para assinar o login (recomendado). |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Criadas sozinhas ao conectar o Upstash Redis em Storage. |
| `BLOB_READ_WRITE_TOKEN` | Criada sozinha ao conectar um Vercel Blob em Storage. |

Trocar a senha: mude `SITE_PASSWORD` em Settings → Environment Variables e faça um novo deploy.
