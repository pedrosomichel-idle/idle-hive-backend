export const metadata = {
  title: 'IdleHive — Todas as suas contas idle, numa colmeia só',
  description:
    'Abra várias contas do mesmo jogo ao mesmo tempo, cada uma isolada de verdade. Teste grátis por 8h, depois R$ 9,90 vitalício.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
