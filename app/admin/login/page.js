'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../../lib/supabaseBrowser';
import '../admin.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace('/admin');
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <svg className="login-hex" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="loginGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b96ff" />
              <stop offset="100%" stopColor="#5865f2" />
            </linearGradient>
          </defs>
          <g transform="translate(120,128)">
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#3a3f4d" transform="translate(-98,58)" />
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#2f3441" transform="translate(98,58)" />
            <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="url(#loginGrad)" transform="translate(0,-58)" />
          </g>
        </svg>
        <h1>IdleHive — Admin</h1>
        <p className="login-sub">Acesso restrito à gestão do sistema</p>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        {error && <p style={{ color: '#ff8a8a', fontSize: 12, marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
