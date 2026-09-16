'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/adminFetch';

function formatBRL(cents) {
  return ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Visão geral</h1>
      <p className="page-sub">O panorama de todo o sistema IdleHive num lugar só.</p>

      {error && <div className="admin-error">{error}</div>}
      {!data && !error && <p className="loading-state">Carregando…</p>}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat-card accent">
              <div className="value">{formatBRL(data.totalRevenueCents)}</div>
              <div className="label">Receita total (Stripe)</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.totalUsers}</div>
              <div className="label">Usuários cadastrados</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.totalLicenses}</div>
              <div className="label">Licenças ativas</div>
            </div>
          </div>

          <div className="section-title">Engajamento</div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="value">{data.totalTrials}</div>
              <div className="label">Trials iniciados</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.totalDevices}</div>
              <div className="label">Dispositivos ativados</div>
            </div>
            <div className="stat-card">
              <div className="value">
                {data.redeemedKeys}<span style={{ color: '#565d68', fontSize: 16 }}> / {data.totalKeys}</span>
              </div>
              <div className="label">Chaves resgatadas / geradas</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
