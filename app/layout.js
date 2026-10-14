import Script from 'next/script';

// Meta Pixel do IdleHive (o ID não é segredo). PageView em toda página;
// o "Lead" do download é disparado no clique (app/page.js) e a "Purchase"
// sai do servidor, no webhook do Mercado Pago (lib/metaCapi.js).
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1586118063529920';

export const metadata = {
  title: 'IdleHive — Todas as suas contas idle, numa colmeia só',
  description:
    'Abra várias contas do mesmo jogo ao mesmo tempo, cada uma isolada de verdade. Teste grátis por 8h, depois R$ 19,90 vitalício.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: '-apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
        {children}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      </body>
    </html>
  );
}
