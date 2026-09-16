'use client';

import { useState } from 'react';
import './landing.css';

function Hex({ className, filled, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg">
      <polygon
        points="14,1 27,8 27,24 14,31 1,24 1,8"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function BrandMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b96ff" />
          <stop offset="100%" stopColor="#5865f2" />
        </linearGradient>
      </defs>
      <g transform="translate(120,128)">
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#3a3f4d" transform="translate(-98,58)" />
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#2f3441" transform="translate(98,58)" />
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="url(#brandGrad)" transform="translate(0,-58)" />
      </g>
    </svg>
  );
}

const DOWNLOAD_URL = process.env.NEXT_PUBLIC_DOWNLOAD_URL || '#baixar';
const DISCORD_URL = 'https://discord.gg/rbqT6WJRFZ';

const STEPS = [
  { t: 'Crie sua conta', d: 'Direto no app — e-mail e senha. Leva 30 segundos.' },
  { t: 'Teste 8h grátis', d: 'Liberado na hora, automaticamente, sem pedir cartão.' },
  { t: 'Baixe o instalador', d: 'Windows, verificado, com atualização automática depois.' },
  { t: 'Instale', d: 'Next, next, concluído. Sem enrolação.' },
  { t: 'Entre com e-mail e senha', d: 'Sem serial, sem chave pra digitar.' },
  { t: 'Primeira ativação', d: 'Seu dispositivo é vinculado à conta na hora.' },
  { t: 'Compre quando quiser', d: 'Pagamento único, R$ 20, sem mensalidade.' },
  { t: 'Pronto', d: 'Adicione suas contas e organize a grade.' },
];

const WHY = [
  { t: 'Isolamento de verdade', d: 'Cada conta tem cookies, cache e login próprios. Uma nunca derruba a outra.' },
  { t: 'Tudo à vista', d: 'Grade automática que se ajusta sozinha, com zoom adaptado pra cada jogo continuar legível.' },
  { t: 'Do seu jeito', d: 'Favorite, renomeie, expanda um painel pra tela cheia — tudo com um clique.' },
];

const PERF = [
  { t: 'Um processo por conta', d: 'Cada painel roda isolado — se um travar, os outros seguem firmes.' },
  { t: 'Métricas em tempo real', d: 'CPU e RAM de cada conta, visíveis direto na barra lateral.' },
  { t: 'Otimizado de propósito', d: 'Painéis fora de foco param de renderizar na tela — a conta continua ativa, sem pesar.' },
  { t: 'Áudio e zoom por conta', d: 'Silencie uma, dê zoom em outra. Controle fino, individual.' },
];

const SECURITY = [
  { t: 'Login por e-mail e senha', d: 'Sem serial, sem chave — você entra com a sua conta.' },
  { t: 'Licença por dispositivo', d: 'Cada computador é vinculado à sua licença, com um limite claro de vagas.' },
  { t: 'Slot extra por computador', d: 'Precisa de duas contas no mesmo PC? Libere uma vaga a mais, sem comprar outra licença inteira.' },
  { t: 'Chave de ativação', d: 'Ganhou uma chave promocional? Resgate na hora, sem passar pelo pagamento.' },
  { t: 'Atualizações automáticas', d: 'O app se atualiza sozinho e avisa quando terminar — só reiniciar quando quiser.' },
  { t: 'Uso responsável', d: 'O IdleHive organiza sessões; não automatiza ações nem captura credenciais.' },
];

const COMPARE = [
  ['Sessões separadas lado a lado', true, false],
  ['Isolamento 100% (login/cookies/cache)', true, false],
  ['Tudo dentro de uma janela só', true, false],
  ['CPU e RAM por conta na tela', true, false],
  ['Chave de ativação pra promoções', true, false],
  ['Slot extra de dispositivo sob demanda', true, false],
  ['Atualização automática', true, false],
];

const FAQ = [
  { q: 'O que é o IdleHive?', a: 'Um app desktop feito pra rodar várias contas do mesmo site ou jogo ao mesmo tempo, cada uma numa sessão totalmente separada, dentro de uma única janela.' },
  { q: 'Preciso de uma conta pra cada painel?', a: 'Cada painel é uma conta independente: login, cookies, cache e armazenamento próprios. Nada de uma conta enxergar a outra.' },
  { q: 'Quantas contas posso abrir?', a: 'Quantas quiser. A grade se organiza automaticamente conforme você adiciona painéis.' },
  { q: 'Funciona com qualquer site?', a: 'Funciona como um navegador baseado em Chromium. A compatibilidade depende de cada serviço, e o uso deve respeitar os termos de cada um.' },
  { q: 'É pesado? Vai travar meu PC?', a: 'Cada conta roda no seu próprio processo, e painéis fora de foco param de renderizar. Você acompanha CPU e RAM de cada conta em tempo real.' },
  { q: 'Como funciona a licença?', a: 'A licença fica ligada à sua conta e ao seu dispositivo. Você não recebe uma chave pra digitar — é só fazer login no app (a não ser que use uma chave promocional).' },
  { q: 'Posso usar em dois computadores?', a: 'Por padrão, cada licença ativa em 1 dispositivo. Pra usar em outro ao mesmo tempo, dá pra comprar um slot extra específico pra aquele computador.' },
  { q: 'Como funciona o programa de afiliados?', a: 'Qualquer usuário pode virar afiliado direto no app, sem aprovação manual. Você recebe um código e um link únicos, e ganha uma comissão fixa por cada licença vendida através deles.' },
  { q: 'Tem versão pra Mac ou Linux?', a: 'Hoje o instalador é só pra Windows. Outras plataformas podem vir conforme a demanda.' },
  { q: 'Vocês veem minhas senhas dos sites?', a: 'Não. Cookies e sessões ficam nas partições locais do aplicativo e nunca são enviados pro servidor de licenças.' },
  { q: 'Como recebo as atualizações?', a: 'O app verifica sozinho, baixa em segundo plano e avisa quando está pronto — você escolhe quando reiniciar.' },
  { q: 'Tem suporte?', a: 'Tem — pela nossa comunidade no Discord.' },
];

function FaqItem({ item, isOpen, onToggle }) {
  return (
    <div className={`faq-item${isOpen ? ' open' : ''}`}>
      <button type="button" onClick={onToggle}>
        {item.q}
        <span className="plus">+</span>
      </button>
      <div className="faq-answer">
        <p>{item.a}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="landing">
      {/* Nav */}
      <header className="nav">
        <div className="inner">
          <a href="#topo" className="nav-brand">
            <BrandMark />
            IdleHive
          </a>
          <nav className="nav-links">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#preco">Preço</a>
            <a href="#faq">Perguntas</a>
          </nav>
          <div className="nav-cta">
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Comunidade</a>
            <a href={DOWNLOAD_URL} className="btn btn-primary btn-sm">Baixar grátis</a>
          </div>
          <button type="button" className="nav-toggle" onClick={() => setMobileOpen((v) => !v)}>☰</button>
        </div>
      </header>

      {mobileOpen && (
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href="#recursos" style={{ color: '#eef0f4' }}>Recursos</a>
          <a href="#como-funciona" style={{ color: '#eef0f4' }}>Como funciona</a>
          <a href="#preco" style={{ color: '#eef0f4' }}>Preço</a>
          <a href="#faq" style={{ color: '#eef0f4' }}>Perguntas</a>
          <a href={DOWNLOAD_URL} className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Baixar grátis</a>
        </div>
      )}

      {/* Hero */}
      <section className="hero" id="topo">
        <div className="inner">
          <div className="hero-badge">
            <span className="pulse-dot" />
            Teste grátis de 8 horas · sem cartão de crédito
          </div>
          <h1>
            Todas as suas contas idle,<br />numa <span>colmeia</span> só.
          </h1>
          <p className="lead">
            Abra várias contas do mesmo jogo ao mesmo tempo, cada uma isolada de verdade —
            cookies, login e cache próprios — organizadas numa grade dentro de uma única janela.
          </p>
          <div className="hero-ctas">
            <a href={DOWNLOAD_URL} className="btn btn-primary">Baixar o IdleHive</a>
            <a href="#como-funciona" className="btn btn-ghost">Ver como funciona</a>
          </div>
          <p className="hero-note">Windows · Grátis por 8h, depois R$ 20 em pagamento único</p>

          <div className="hero-stats">
            <div className="hero-stat"><Hex /> Sessões isoladas de verdade</div>
            <div className="hero-stat"><Hex /> CPU e RAM por conta</div>
            <div className="hero-stat"><Hex /> Atualização automática</div>
          </div>

          {/* Mockup ilustrativo da grade (não é screenshot real) */}
          <div className="mockup">
            <div className="mockup-bar"><span /><span /><span /></div>
            <div className="mockup-body">
              <div className="mockup-sidebar">
                <div className="mockup-item"><span className="dot" /><span className="bar" /></div>
                <div className="mockup-item"><span className="dot" /><span className="bar" /></div>
                <div className="mockup-item"><span className="dot" /><span className="bar" /></div>
                <div className="mockup-item"><span className="dot" /><span className="bar" /></div>
              </div>
              <div className="mockup-grid">
                <div className="mockup-panel"><div className="mockup-panel-head"><span className="dot" /><span className="bar" /></div><div className="mockup-panel-body" /></div>
                <div className="mockup-panel"><div className="mockup-panel-head"><span className="dot" /><span className="bar" /></div><div className="mockup-panel-body" /></div>
                <div className="mockup-panel"><div className="mockup-panel-head"><span className="dot" /><span className="bar" /></div><div className="mockup-panel-body" /></div>
                <div className="mockup-panel"><div className="mockup-panel-head"><span className="dot" /><span className="bar" /></div><div className="mockup-panel-body" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona">
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Como funciona</p>
          <h2>Da conta ao primeiro login</h2>
          <p className="section-sub">Oito passos, a maioria leva menos de um minuto.</p>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div className="step" key={s.t}>
                <div className="step-num">{i + 1}</div>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos">
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Por que IdleHive</p>
          <h2>Feito pra quem cansou de malabarismo com janelas</h2>
          <p className="section-sub">
            Um perfil anônimo aqui, uma extensão ali, tudo se misturando e caindo o login do
            nada. O IdleHive existe pra resolver isso — cada conta no seu hexágono.
          </p>
          <div className="card-grid">
            {WHY.map((f) => (
              <div className="feature-card" key={f.t}>
                <Hex className="icon" style={{ color: '#5865f2' }} />
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance */}
      <section>
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Performance</p>
          <h2>Roda pesado sem pesar</h2>
          <p className="section-sub">Otimizado de propósito pra rodar muitas contas sem derreter o PC.</p>
          <div className="card-grid cols-4">
            {PERF.map((f) => (
              <div className="feature-card" key={f.t}>
                <Hex className="icon" style={{ color: '#f0b132' }} />
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section>
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Segurança e licença</p>
          <h2>Sua conta, seus dispositivos, sob controle</h2>
          <div className="check-grid">
            {SECURITY.map((f) => (
              <div className="check-item" key={f.t}>
                <Hex className="icon" style={{ color: '#3ba55d' }} />
                <div>
                  <h4>{f.t}</h4>
                  <p>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Afiliados */}
      <section>
        <div className="inner">
          <div className="affiliate-banner">
            <div className="content">
              <p className="eyebrow">Programa de afiliados</p>
              <h2>Indique e ganhe R$ 5 por venda</h2>
              <p>
                Todo usuário pode virar afiliado — sem aprovação manual, sem burocracia.
                Gere seu código e link direto no app, compartilhe, e receba uma comissão
                fixa a cada licença vendida através de você.
              </p>
              <a href={DOWNLOAD_URL} className="btn btn-primary">Baixar e virar afiliado</a>
            </div>
            <div className="affiliate-stats-row">
              <div>
                <div className="stat-value">100%</div>
                <div className="stat-label">Automático</div>
              </div>
              <div>
                <div className="stat-value">R$ 5</div>
                <div className="stat-label">Por venda</div>
              </div>
              <div>
                <div className="stat-value">0</div>
                <div className="stat-label">Burocracia</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section>
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Comparação</p>
          <h2>IdleHive vs. navegador comum</h2>
          <p className="section-sub">&nbsp;</p>
          <table className="compare-table">
            <thead>
              <tr><th></th><th>IdleHive</th><th>Comum</th></tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td>
                  <td className={row[1] ? 'yes' : 'no'}>{row[1] ? '✓' : '—'}</td>
                  <td className={row[2] ? 'yes' : 'no'}>{row[2] ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Preço */}
      <section id="preco">
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Preço</p>
          <h2>Licença completa por R$ 20.</h2>
          <p className="section-sub">Teste 8 horas grátis antes de decidir. Depois, um pagamento único, sem mensalidade.</p>
          <div className="price-card">
            <div className="price-tag">Oferta única</div>
            <div style={{ fontSize: 14, color: '#8b93a1' }}>IdleHive — Licença padrão</div>
            <div className="amount">R$ 20<span>,00</span></div>
            <div className="price-note">1 dispositivo (mais com slot extra) · pagamento único</div>
            <ul className="price-list">
              <li><Hex filled style={{ color: '#3ba55d' }} /> 8h grátis pra testar</li>
              <li><Hex filled style={{ color: '#3ba55d' }} /> Sem mensalidade</li>
              <li><Hex filled style={{ color: '#3ba55d' }} /> Atualizações incluídas</li>
              <li><Hex filled style={{ color: '#3ba55d' }} /> Suporte pela comunidade</li>
            </ul>
            <a href={DOWNLOAD_URL} className="btn btn-primary" style={{ width: '100%' }}>Baixar e testar grátis</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq">
        <div className="inner">
          <p className="eyebrow" style={{ textAlign: 'center' }}>Perguntas frequentes</p>
          <h2>O que costumam perguntar</h2>
          <p className="section-sub">&nbsp;</p>
          <div className="faq-list">
            {FAQ.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comunidade */}
      <section>
        <div className="inner">
          <div className="community">
            <h2>Entra pra colmeia</h2>
            <p>Novidades, suporte e a galera que usa o IdleHive todo dia.</p>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="btn btn-primary">Comunidade oficial no Discord</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="inner">
          <a href="#topo" className="nav-brand">
            <BrandMark size={20} />
            IdleHive
          </a>
          <div className="foot-links">
            <a href="#recursos">Recursos</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#preco">Preço</a>
            <a href="#faq">Perguntas</a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">Comunidade</a>
          </div>
          <div className="copy">© {new Date().getFullYear()} IdleHive — Todos os direitos reservados</div>
        </div>
      </footer>
    </div>
  );
}
