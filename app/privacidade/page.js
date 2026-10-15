import { LEGAL, LegalPage } from '../../lib/legal';

export const metadata = { title: 'Política de privacidade — IdleHive', robots: { index: false } };

export default function Privacidade() {
  return (
    <LegalPage title="Política de privacidade">
      <p>Esta política explica como {LEGAL.responsavel}, controlador dos dados, trata informações de quem visita o site ou usa o IdleHive, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Conta:</strong> e-mail e senha (guardada de forma criptografada pelo nosso provedor de autenticação).</li>
        <li><strong>Licença:</strong> identificador do dispositivo, status da licença e registro dos pagamentos (valor, data, identificador do Mercado Pago).</li>
        <li><strong>Site:</strong> páginas visitadas, cliques e origem da visita, por meio do Meta Pixel.</li>
      </ul>
      <p>Cookies e sessões dos sites e jogos que você abre no app ficam no seu computador e <strong>não</strong> são enviados aos nossos servidores.</p>
      <h2>2. Para que usamos</h2>
      <ul>
        <li>liberar e validar a sua licença (execução de contrato);</li>
        <li>registrar pagamentos e cumprir obrigações legais;</li>
        <li>medir o desempenho dos anúncios (legítimo interesse) — inclusive enviando à Meta, de forma criptografada (hash), o e-mail de quem comprou, para saber qual anúncio gerou a venda.</li>
      </ul>
      <h2>3. Com quem compartilhamos</h2>
      <p>Mercado Pago (pagamento), Supabase e Vercel (infraestrutura), Meta (medição de anúncios) e autoridades quando exigido por lei. Não vendemos seus dados.</p>
      <h2>4. Seus direitos</h2>
      <p>Você pode pedir acesso, correção, exclusão ou portabilidade dos seus dados, e revogar consentimentos, pelo e-mail <a href={`mailto:${LEGAL.email}`} style={{ color: '#94a0ff' }}>{LEGAL.email}</a>. Também pode reclamar à ANPD. Para bloquear o Meta Pixel, use as configurações de cookies do navegador ou as <a href="https://www.facebook.com/adpreferences" style={{ color: '#94a0ff' }}>preferências de anúncios da Meta</a>.</p>
      <h2>5. Retenção</h2>
      <p>Dados de conta e licença: enquanto a conta existir. Registros de pagamento: pelo prazo exigido pela legislação fiscal e de consumo.</p>
    </LegalPage>
  );
}
