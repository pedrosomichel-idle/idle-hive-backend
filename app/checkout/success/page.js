export default function CheckoutSuccessPage() {
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
        <h1>Pagamento confirmado ✅</h1>
        <p>Pode fechar esta aba e voltar pro IdleHive.</p>
        <p>Clique em &quot;Já paguei, verificar de novo&quot; na tela de licença do app.</p>
      </div>
    </main>
  );
}
