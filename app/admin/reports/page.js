'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    adminFetch('/api/admin/reports')
      .then((data) => setReports(data.reports))
      .catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const act = async (id, action, suspendDays) => {
    setError('');
    setBusyId(id);
    try {
      await adminFetch('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ id, action, suspendDays }),
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = (id) => {
    const days = window.prompt(
      'Suspender o denunciado do Mercado por quantos dias? (0 = só marcar como resolvida, sem suspender)',
      '7'
    );
    if (days === null) return;
    act(id, 'resolver', Number(days) || 0);
  };

  const open = (reports || []).filter((r) => r.status === 'aberta');

  return (
    <div>
      <h1>Denúncias do Mercado</h1>
      <p className="page-sub">
        Fila de moderação. Resolver permite suspender o denunciado do Mercado sem banir a conta
        inteira do IdleHive.
      </p>

      {error && <div className="admin-error">{error}</div>}
      {!reports && !error && <p className="loading-state">Carregando…</p>}

      {reports && (
        <>
          <div className="stat-grid">
            <div className={open.length > 0 ? 'stat-card accent' : 'stat-card'}>
              <div className="value">{open.length}</div>
              <div className="label">Denúncias abertas</div>
            </div>
            <div className="stat-card">
              <div className="value">{reports.length}</div>
              <div className="label">Total registrado</div>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Denunciado</th>
                  <th>Motivo</th>
                  <th>Quem denunciou</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.reported.nickname}</strong>
                      <div style={{ fontSize: 11, color: '#8b93a1' }}>
                        {r.reported.reputation.total} transações · {r.reported.reputation.tier.label}
                        {r.reported.suspendedUntil && new Date(r.reported.suspendedUntil) > new Date() && (
                          <> · <span style={{ color: '#ff8a8a' }}>suspenso até {formatDate(r.reported.suspendedUntil)}</span></>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>{r.reason}</td>
                    <td>{r.reporter.nickname}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <span className={`badge ${r.status === 'aberta' ? 'pendente' : 'pago'}`}>{r.status}</span>
                    </td>
                    <td>
                      {r.status === 'aberta' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn small danger"
                            disabled={busyId === r.id}
                            onClick={() => handleResolve(r.id)}
                          >
                            Resolver
                          </button>
                          <button
                            type="button"
                            className="btn small secondary"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, 'descartar', 0)}
                          >
                            Descartar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={6}>Nenhuma denúncia registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
