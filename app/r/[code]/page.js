'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ReferralLandingPage() {
  const params = useParams();
  const code = params.code;
  const [copied, setCopied] = useState(false);

  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || '#';

  useEffect(() => {
    if (code) {
      navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => {});
    }
  }, [code]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 50% 15%, rgba(88,101,242,0.14), transparent 55%), #0e1013',
        color: '#eef0f4',
        fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        padding: 24,
      }}
    >
      <div style={{ width: 380, textAlign: 'center' }}>
        <svg width="72" height="72" viewBox="0 0 240 240" style={{ marginBottom: 16, filter: 'drop-shadow(0 6px 18px rgba(88,101,242,0.4))' }}>
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b96ff" />
              <stop offset="100%" stopColor="#5865f2" />
            </linearGradient>
          </defs>
          <g transform="translate(120,128)">
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#3a3f4d" transform="translate(-98,58)" />
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#2f3441" transform="translate(98,58)" />
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="url(#g)" transform="translate(0,-58)" />
          </g>
        </svg>

        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px' }}>IdleHive</h1>
        <p style={{ color: '#8b93a1', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>
          Você foi indicado! Baixe o app, crie sua conta e use o código abaixo no cadastro
          pra apoiar quem te indicou.
        </p>

        <div
          style={{
            background: '#171a20',
            border: '1px solid #262b34',
            borderRadius: 10,
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 11, color: '#8b93a1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seu código de indicação
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
              letterSpacing: '0.08em',
              color: '#7c88ff',
            }}
          >
            {code}
          </div>
          <div style={{ fontSize: 11, color: copied ? '#3ba55d' : '#565d68', marginTop: 8 }}>
            {copied ? '✓ Copiado pra área de transferência' : 'Copie este código'}
          </div>
        </div>

        <a
          href={downloadUrl}
          style={{
            display: 'block',
            background: '#5865f2',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 7,
            padding: '12px 0',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Baixar o IdleHive
        </a>
      </div>
    </main>
  );
}
