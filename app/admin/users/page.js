'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Usuários</h1>
      <p className="page-sub">Todos os cadastros, plano atual e origem de indicação.</p>
      {error && <div className="admin-error">{error}</div>}
      {!users && !error && <p>Carregando…</p>}
      {users && (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Plano</th>
              <th>Expira em</th>
              <th>Dispositivos</th>
              <th>Indicado por</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.plan}`}>{u.plan}</span>
                </td>
                <td>{u.plan === 'standard' ? 'permanente' : formatDate(u.expiresAt)}</td>
                <td>{u.devices}</td>
                <td>{u.referralCode || '—'}</td>
                <td>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum usuário ainda.</td>
              </tr>
            )}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
