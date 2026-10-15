// lib/legal.js — dados e moldura das páginas legais (/termos, /privacidade, /reembolso).
// Quem vende e responde pelo IdleHive (Código de Defesa do Consumidor / Decreto 7.962).
export const LEGAL = {
  responsavel: 'Adriane Savagin',
  cidade: 'São Paulo/SP, Brasil',
  email: 'atendimento@spedrososolucoes.com.br',
  discord: 'https://discord.gg/rbqT6WJRFZ',
  atualizado: '15 de outubro de 2026',
  preco: 'R$ 19,90',
};

const wrap = { maxWidth: 760, margin: '0 auto', padding: '48px 16px 64px', color: '#eef0f4', lineHeight: 1.65, fontSize: 16 };
const page = { background: '#0e1013', minHeight: '100vh' };
const link = { color: '#94a0ff' };

export function LegalPage({ title, children }) {
  return (
    <div style={page}>
      <main style={wrap}>
        <a href="/" style={link}>← Voltar para o IdleHive</a>
        <h1 style={{ fontSize: 32, margin: '24px 0 4px' }}>{title}</h1>
        <p style={{ color: '#8b93a1', marginTop: 0 }}>Última atualização: {LEGAL.atualizado}</p>
        {children}
        <hr style={{ borderColor: '#262b34', margin: '40px 0 16px' }} />
        <p style={{ color: '#8b93a1', fontSize: 14 }}>
          {LEGAL.responsavel} · {LEGAL.cidade} · <a href={`mailto:${LEGAL.email}`} style={link}>{LEGAL.email}</a>
          <br />
          <a href="/termos" style={link}>Termos</a> · <a href="/privacidade" style={link}>Privacidade</a> · <a href="/reembolso" style={link}>Reembolso</a>
        </p>
      </main>
    </div>
  );
}
