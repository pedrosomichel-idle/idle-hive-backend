'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '../../../lib/adminFetch';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState(null);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');
  const [maxDevices, setMaxDevices] = useState('2');
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);

  const loadKeys = () => {
    adminFetch('/api/admin/keys')
      .then((data) => setKeys(data.keys))
      .catch((err) => setError(err.message));
  };

  useEffect(loadKeys, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setCreating(true);
    try {
      const result = await adminFetch('/api/admin/keys', {
        method: 'POST',
        body: JSON.stringify({ days: Number(days), note, maxDevices: Number(maxDevices) }),
      });
      setLastCreated(result.key);
      setNote('');
      loadKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revogar esta chave? Ela deixa de poder ser usada.')) return;
    try {
      await adminFetch('/api/admin/keys/revoke', { method: 'POST', body: JSON.stringify({ id }) });
      loadKeys();
    } catch (err) {
      setError(err.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  return (
    <div>
      <h1>Chaves de ativação</h1>
      <p className="page-sub">Gere chaves com prazo pra parceiros e sorteios. O sistema cria o código automaticamente.</p>
      {error && <div className="admin-error">{error}</div>}

      <form className="admin-form" onSubmit={handleCreate}>
        <div className="field">
          <label>Dias de acesso</label>
          <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} required />
        </div>
        <div className="field">
          <label>Dispositivos permitidos</label>
          <input type="number" min="1" value={maxDevices} onChange={(e) => setMaxDevices(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Nota (ex: "Parceiro João", "Sorteio Discord Julho")</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </div>
        <button type="submit" className="btn" disabled={creating}>
          {creating ? 'Gerando…' : '+ Gerar chave'}
        </button>
      </form>

      {lastCreated && (
        <div className="admin-error" style={{ background: '#14351f', borderColor: '#3ba55d', color: '#3ba55d' }}>
          Chave gerada: <code className="key-code">{lastCreated.code}</code>{' '}
          <button type="button" className="btn secondary" onClick={() => copyCode(lastCreated.code)}>
            Copiar
          </button>
        </div>
      )}

      {!keys && !error && <p>Carregando…</p>}
      {keys && (
        <div className="admin-table-wrap"><table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Dias</th>
              <th>Dispositivos</th>
              <th>Nota</th>
              <th>Status</th>
              <th>Gerada em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td>
                  <code className="key-code">{k.code}</code>
                </td>
                <td>{k.days}</td>
                <td>{k.max_devices}</td>
                <td>{k.note || '—'}</td>
                <td>
                  {k.redeemed_by ? (
                    <span className="badge pago">Usada por {k.redeemedByEmail || k.redeemed_by}</span>
                  ) : (
                    <span className="badge pendente">Disponível</span>
                  )}
                </td>
                <td>{formatDate(k.created_at)}</td>
                <td>
                  {!k.redeemed_by && (
                    <button type="button" className="btn danger" onClick={() => handleRevoke(k.id)}>
                      Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhuma chave gerada ainda.</td>
              </tr>
            )}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
