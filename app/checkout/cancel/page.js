export default function CheckoutCancelPage() {
  return (
    <main
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#14161a',
        color: '#e6e6e6',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div>
        <h1>Pagamento cancelado</h1>
        <p>Nenhuma cobrança foi feita. Pode fechar esta aba e voltar pro IdleHive quando quiser tentar de novo.</p>
      </div>
    </main>
  );
}
