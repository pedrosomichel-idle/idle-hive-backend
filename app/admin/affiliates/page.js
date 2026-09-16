'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '../../../lib/adminFetch';

function formatBRL(cents) {
  return ((cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);

  const loadAffiliates = () => {
    adminFetch('/api/admin/affiliates')
      .then((data) => setAffiliates(data.affiliates))
      .catch((err) => setError(err.message));
  };

  useEffect(loadAffiliates, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setCreating(true);
    try {
      await adminFetch('/api/admin/affiliates', {
        method: 'POST',
        body: JSON.stringify({ name, email, code }),
      });
      setName('');
      setEmail('');
      setCode('');
      loadAffiliates();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <h1>Afiliados</h1>
      <p className="page-sub">Parceiros de indicação, ativações trazidas e comissões a pagar.</p>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleCreate}>
        <div className="field">
          <label>Nome do parceiro</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>E-mail (o parceiro loga no painel dele com esse e-mail)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Código (opcional — gerado a partir do nome se vazio)</label>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: JOAO20" />
        </div>
        <button type="submit" className="btn" disabled={creating}>
          {creating ? 'Criando…' : '+ Criar parceiro'}
        </button>
      </form>

      {!affiliates && !error && <p>Carregando…</p>}
      {affiliates && (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>E-mail</th>
              <th>Ativações</th>
              <th>Pendente</th>
              <th>Pago</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>
                  <code className="key-code">{a.code}</code>
                </td>
                <td>{a.email}</td>
                <td>{a.activations}</td>
                <td>{formatBRL(a.pendingCents)}</td>
                <td>{formatBRL(a.paidCents)}</td>
                <td>
                  <Link href={`/admin/affiliates/${a.id}`} className="btn secondary" style={{ textDecoration: 'none' }}>
                    Ver comissões
                  </Link>
                </td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum parceiro cadastrado ainda.</td>
              </tr>
            )}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
