# IdleHive — Backend de Licenciamento + Landing Page

Backend (Next.js) que dá conta do modelo de monetização do app Idle
Panels: conta (Supabase Auth), pagamento único via Stripe Checkout,
licença vinculada a dispositivos (com limite), e teste grátis de 8h sem
cartão — igual ao modelo do idle-labs.com. A raiz do mesmo projeto
(`/`) é a landing page pública do produto — mesma URL, mesmo deploy.

## Landing page (`/`)

Página única (`app/page.js` + `app/landing.css`), sem dependência de
backend pra renderizar — hero, como funciona, recursos, performance,
segurança/licença, programa de afiliados, comparação, preço, FAQ
(accordion) e comunidade (Discord). Segue a mesma identidade visual do
app e do painel admin (tokens de cor, hexágonos, tipografia mono nos
dados).

Duas variáveis controlam ela:
- `NEXT_PUBLIC_DOWNLOAD_URL` — pra onde os botões "Baixar" apontam
  (aponte pro seu GitHub Releases depois de configurar o auto-updater
  do app, ex: `https://github.com/seu-usuario/idle-hive/releases/latest`)
- O link do Discord está fixo no código (`DISCORD_URL` em
  `app/page.js`) — troque lá se mudar de servidor.

**Sem área de cliente própria**: ao contrário do idle-labs.com, o
IdleHive não tem login/dashboard pelo navegador — cadastro, licença e
o programa de afiliados acontecem todos dentro do próprio app desktop.
Por isso a landing não tem botão "Entrar", só "Baixar".

## Como as peças se encaixam

```
Electron (idle-hive)  --login-->  Supabase Auth (email/senha)
                         --status/ativação/checkout-->  este backend
                                                          |
                                                          v
                                                   Supabase (Postgres)
                                                          ^
                                                          |
                                              Stripe --webhook--> este backend
```

O Electron nunca fala direto com o Supabase pras tabelas de licença —
só faz login direto no Supabase Auth (pra pegar o token de sessão) e
depois usa esse token pra chamar as rotas deste backend, que é quem de
fato lê/grava licença e dispositivos (usando a service_role key, que
nunca sai do servidor).

## 1. Criar o projeto Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Authentication → Providers**, deixe **Email** habilitado
   (padrão). Se quiser login com Google (como o idle-labs.com oferece),
   habilite o provider Google aqui — isso não muda nada neste backend,
   só o app Electron precisaria de uma tela a mais pra esse fluxo.
3. Em **SQL Editor**, rode o conteúdo de `supabase/schema.sql` deste
   projeto — cria as tabelas `licenses`, `devices`, `trials`, `admins`,
   `license_keys`, `affiliates`, `commissions` e `device_extra_slots`.
   **Se você já tinha rodado uma versão anterior deste schema**, só
   precisa rodar de novo o bloco novo (a tabela `device_extra_slots`,
   perto do fim do arquivo) — `create table if not exists` não duplica
   o que já existe.
4. Em **Project Settings → API**, copie:
   - `Project URL` → vai em `SUPABASE_URL`
   - `service_role` key (não a `anon`!) → vai em
     `SUPABASE_SERVICE_ROLE_KEY`

## 2. Criar o produto no Stripe

1. Em **Product catalog**, crie um produto (ex: "IdleHive — Licença
   padrão"), preço único (**one-time**, não recorrente), no valor que
   você quiser (o idle-labs.com cobra R$ 20).
2. Copie o `price_id` gerado → vai em `STRIPE_PRICE_ID`.
3. Crie um **segundo produto** (ex: "IdleHive — Slot extra de
   dispositivo"), também preço único — esse é o que libera uma segunda
   conta no mesmo computador (veja "Limite de 1 conta por dispositivo"
   abaixo). Copie o `price_id` dele → vai em
   `STRIPE_DEVICE_SLOT_PRICE_ID`.
4. Em **Developers → API keys**, copie a **Secret key** →
   `STRIPE_SECRET_KEY`.
5. Em **Developers → Webhooks**, crie um endpoint apontando pra
   `https://SEU-DOMINIO/api/webhooks/stripe`, escutando o evento
   `checkout.session.completed`. Copie o **Signing secret** →
   `STRIPE_WEBHOOK_SECRET`.
   - Pra testar local antes de ter domínio: `stripe listen --forward-to
     localhost:3000/api/webhooks/stripe` (Stripe CLI).

## 3. Configurar e rodar

```bash
cp .env.example .env.local
# preencha .env.local com os valores acima
npm install
npm run dev
```

Pra produção (ex: Vercel): suba este projeto, configure as mesmas
variáveis de ambiente no painel do Vercel, e ajuste `APP_BASE_URL` pra
sua URL final (ex: `https://idle-hive-backend.vercel.app`) — é pra
onde o Stripe redireciona depois do pagamento.

## 4. Conectar o app Electron

No projeto `idle-hive`, edite `src/config.js`:

```js
module.exports = {
  SUPABASE_URL: 'https://SEU-PROJETO.supabase.co',
  SUPABASE_ANON_KEY: 'sua-anon-key-aqui', // Project Settings -> API -> anon/public
  BACKEND_URL: 'https://seu-backend.vercel.app', // ou http://localhost:3000 em dev
};
```

## Rotas

Todas (exceto o webhook) exigem `Authorization: Bearer <access_token>`
— o token de sessão que o Supabase Auth devolve depois do login.

- `POST /api/license/status` — `{ deviceId }` → status da licença/trial
  do usuário (cria o trial de 8h automaticamente na primeira consulta).
- `POST /api/license/activate` — `{ deviceId, deviceName }` → registra
  este dispositivo contra a licença, respeitando o limite.
- `POST /api/license/deactivate` — `{ deviceId }` → libera a vaga desse
  dispositivo (fluxo "trocar de computador").
- `POST /api/license/redeem-key` — `{ code }` → resgata uma chave gerada
  no painel admin, criando uma licença por prazo (`expires_at`) pro
  usuário.
- `POST /api/checkout` — cria a sessão do Stripe Checkout. Body opcional
  `{ type: "device_slot", deviceId }` pra comprar um slot extra de
  dispositivo em vez da licença padrão (veja "Limite de 1 conta por
  dispositivo" abaixo). Devolve `{ checkoutUrl }` pro app abrir no
  navegador padrão.
- `POST /api/webhooks/stripe` — só o Stripe chama essa (validada por
  assinatura); concede a licença quando o pagamento é confirmado, e
  gera a comissão do afiliado se o comprador tinha um código de
  indicação salvo no cadastro.

## Painel administrativo (`/admin`)

Acesso em `https://seu-backend/admin` — login com uma conta Supabase
Auth que esteja na tabela `admins` (veja o comentário no fim do
`supabase/schema.sql` pra se adicionar como admin).

- **Visão geral**: usuários, licenças, trials, dispositivos, receita
  total (Stripe), chaves geradas/resgatadas.
- **Usuários**: todos os cadastros, plano atual, expiração, quantos
  dispositivos ativou, código de indicação usado (se algum).
- **Chaves de ativação**: gera uma chave nova informando quantos dias
  de acesso e quantos dispositivos ela libera (com uma nota opcional
  tipo "Parceiro João" ou "Sorteio Discord Julho"). Lista todas as
  chaves já geradas, com status (disponível / usada por quem) e opção
  de revogar as que ainda não foram usadas.
- **Afiliados**: cadastra um parceiro (nome, e-mail, código —
  gerado automaticamente a partir do nome se você deixar em branco).
  Cada parceiro vê o total de ativações e comissão pendente/paga; ao
  clicar em "Ver comissões", lista cada venda atribuída a ele com botão
  pra marcar como paga (pagamento em si é manual, fora do sistema —
  Pix, transferência etc).

## Programa de afiliados: auto-afiliação

Agora é **automático** — qualquer usuário logado clica em "Tornar-se
afiliado" (ícone ◆ na sidebar do app) e o sistema gera um código único
(`HIVE-XXXX`) e um link de indicação (`/r/<código>`) na hora, sem o
admin precisar criar nada manualmente.

- `POST /api/affiliate/join` — torna o usuário logado um afiliado
  (idempotente: se já for, só devolve o que já existe).
- `GET /api/affiliate/me` — devolve código, link e estatísticas
  (ativações, comissão pendente/paga) do usuário logado.
- `/r/<código>` — landing page pública do link de indicação: copia o
  código pra área de transferência automaticamente e mostra o botão de
  download (`NEXT_PUBLIC_DOWNLOAD_URL`).

O cadastro do app agora tem um campo "Código de indicação" (opcional).
Esse código fica salvo em `user_metadata.referral_code` do usuário no
Supabase Auth. Quando essa pessoa compra a licença, o webhook do
Stripe lê esse metadata, casa com `affiliates.code`, e cria a comissão
automaticamente (`AFFILIATE_COMMISSION_FLAT_CENTS`, padrão R$ 5,00
fixos por venda — não é percentual).

O painel admin (`/admin/affiliates`) continua funcionando do jeito que
já estava — você ainda pode criar afiliados manualmente de lá também
(útil pra parceiros que você quer dar um código customizado, tipo
`JOAO20`, em vez do gerado automaticamente).

## Limite de 1 conta por dispositivo

Além do limite "quantos dispositivos uma licença libera" (`max_devices`),
existe o limite inverso: **quantas contas diferentes um mesmo
dispositivo pode ativar** — por padrão, 1. Isso evita que várias pessoas
(ou várias contas de teste) usem o mesmo PC sem pagar por licenças
separadas.

Pra liberar uma segunda conta no mesmo computador, é preciso comprar um
**slot extra pra aquele dispositivo** (`STRIPE_DEVICE_SLOT_PRICE_ID`,
produto separado no Stripe, também one-time). Quando `/api/license/activate`
rejeita por esse motivo, a resposta vem com `reason: "device_limit"` — é
assim que o app Electron sabe trocar o botão "Comprar licença" por
"Comprar slot extra pra este dispositivo" na tela de licença.

## Limitações conhecidas / próximos passos

- Login com Google não está implementado no app Electron ainda (só
  e-mail/senha) — precisaria de um fluxo de deep link/protocolo
  customizado pro OAuth redirect voltar pro app.
- Não há reembolso/cancelamento automatizado — é pagamento único, então
  não existe um evento de "assinatura cancelada" pra tratar.
- `/api/admin/users` e `/api/admin/overview` carregam até 1000 usuários
  de uma vez (`listUsers({ perPage: 1000 })`) — funciona bem em escala
  inicial; se passar disso, precisa paginar de verdade.
- Pagamento de comissão pro afiliado é manual (você marca como "pago"
  no painel depois de transferir por fora).
