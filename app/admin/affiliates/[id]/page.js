'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { adminFetch } from '../../../../lib/adminFetch';

function formatBRL(cents) {
  return ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AffiliateCommissionsPage() {
  const params = useParams();
  const affiliateId = params.id;

  const [commissions, setCommissions] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    adminFetch(`/api/admin/commissions?affiliateId=${affiliateId}`)
      .then((data) => setCommissions(data.commissions))
      .catch((err) => setError(err.message));
  };

  useEffect(load, [affiliateId]);

  const handleMarkPaid = async (id) => {
    try {
      await adminFetch('/api/admin/commissions/mark-paid', { method: 'POST', body: JSON.stringify({ id }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Comissões do parceiro</h1>
      {error && <div className="admin-error">{error}</div>}
      {!commissions && !error && <p>Carregando…</p>}
      {commissions && (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead>
            <tr>
              <th>Comprador</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((c) => (
              <tr key={c.id}>
                <td>{c.buyerEmail || c.user_id}</td>
                <td>{formatBRL(c.amount_cents)}</td>
                <td>
                  <span className={`badge ${c.status}`}>{c.status}</span>
                </td>
                <td>{formatDate(c.created_at)}</td>
                <td>
                  {c.status === 'pendente' && (
                    <button type="button" className="btn secondary" onClick={() => handleMarkPaid(c.id)}>
                      Marcar como pago
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma comissão registrada ainda.</td>
              </tr>
            )}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
