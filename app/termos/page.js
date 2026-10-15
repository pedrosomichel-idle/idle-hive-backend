import { LEGAL, LegalPage } from '../../lib/legal';

export const metadata = { title: 'Termos de uso — IdleHive', robots: { index: false } };

export default function Termos() {
  return (
    <LegalPage title="Termos de uso">
      <p>Estes termos regem o uso do aplicativo IdleHive e a compra da licença, oferecidos por {LEGAL.responsavel}, {LEGAL.cidade} ("nós"). Ao instalar, criar conta ou comprar, você concorda com eles.</p>
      <h2>1. O que é o IdleHive</h2>
      <p>Um aplicativo para Windows que abre várias sessões de sites e jogos lado a lado, cada uma isolada (login, cookies e cache próprios). Ele organiza sessões; não automatiza ações dentro dos jogos nem captura credenciais.</p>
      <h2>2. Teste e licença</h2>
      <p>Depois de criar a conta você tem 8 horas de uso grátis. A licença vitalícia custa {LEGAL.preco}, paga uma única vez via PIX, e vale para 1 dispositivo. Slots extras de dispositivo são vendidos à parte, com o preço informado no app antes da compra.</p>
      <h2>3. Uso responsável e regras dos jogos</h2>
      <p>Cada jogo ou site tem regras próprias sobre número de contas e uso de ferramentas. Você é responsável por respeitar essas regras. Não nos responsabilizamos por suspensões ou penalidades aplicadas por terceiros.</p>
      <h2>4. Pagamento</h2>
      <p>O pagamento é processado pelo Mercado Pago. Não recebemos os dados completos da sua conta bancária ou cartão.</p>
      <h2>5. Reembolso</h2>
      <p>Você pode desistir em até 7 dias da compra. Veja a <a href="/reembolso" style={{ color: '#94a0ff' }}>política de reembolso</a>.</p>
      <h2>6. Disponibilidade</h2>
      <p>Trabalhamos para manter o serviço de licenças no ar, mas não garantimos funcionamento ininterrupto nem compatibilidade permanente com sites e jogos de terceiros, que podem mudar sem aviso.</p>
      <h2>7. Alterações e contato</h2>
      <p>Podemos atualizar estes termos; a versão vigente é a publicada aqui. Contato: <a href={`mailto:${LEGAL.email}`} style={{ color: '#94a0ff' }}>{LEGAL.email}</a> ou pela <a href={LEGAL.discord} style={{ color: '#94a0ff' }}>comunidade no Discord</a>. Fica eleito o foro do domicílio do consumidor.</p>
    </LegalPage>
  );
}
