'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '../../lib/supabaseBrowser';
import './admin.css';

const NAV_ITEMS = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/users', label: 'Usuários' },
  { href: '/admin/keys', label: 'Chaves de ativação' },
  { href: '/admin/affiliates', label: 'Afiliados' },
  { href: '/admin/reports', label: 'Denúncias' },
];

function HexIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="14,1 27,8 27,24 14,31 1,24 1,8" />
    </svg>
  );
}

function BrandHex() {
  return (
    <svg className="brand-hex" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b96ff" />
          <stop offset="100%" stopColor="#5865f2" />
        </linearGradient>
      </defs>
      <g transform="translate(120,128)">
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#3a3f4d" transform="translate(-98,58)" />
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="#2f3441" transform="translate(98,58)" />
        <polygon points="52,-90 104,0 52,90 -52,90 -104,0 -52,-90" fill="url(#navGrad)" transform="translate(0,-58)" />
      </g>
    </svg>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecking(false);
      return;
    }
    supabaseBrowser()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) {
          router.replace('/admin/login');
          return;
        }
        setChecking(false);
      });
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="admin-shell">
        <div className="admin-main loading-state">Carregando…</div>
      </div>
    );
  }

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace('/admin/login');
  };

  const isActive = (href) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <div className="admin-shell">
      <nav className="admin-nav">
        <div className="admin-brand">
          <BrandHex />
          <div>
            <h2>IdleHive</h2>
            <p className="brand-sub">Painel administrativo</p>
          </div>
        </div>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
            <HexIcon className="nav-hex" />
            {item.label}
          </Link>
        ))}
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Sair
        </button>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  );
}
