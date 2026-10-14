import { LEGAL, LegalPage } from '../../lib/legal';

export const metadata = { title: 'Política de reembolso — IdleHive', robots: { index: false } };

export default function Reembolso() {
  return (
    <LegalPage title="Política de reembolso">
      <p>Você tem <strong>7 dias corridos</strong> a partir da compra para desistir da licença do IdleHive e receber o valor de volta, sem precisar justificar (art. 49 do Código de Defesa do Consumidor).</p>
      <h2>Como pedir</h2>
      <p>Envie um e-mail para <a href={`mailto:${LEGAL.email}`} style={{ color: '#94a0ff' }}>{LEGAL.email}</a> com o e-mail da sua conta no IdleHive. Também atendemos pela <a href={LEGAL.discord} style={{ color: '#94a0ff' }}>comunidade no Discord</a>.</p>
      <h2>Como o valor volta</h2>
      <p>Pagamentos via PIX são devolvidos para a conta de origem pelo Mercado Pago, em geral em até 7 dias úteis após o pedido. Depois do reembolso, a licença é desativada.</p>
      <h2>Depois de 7 dias</h2>
      <p>Passado o prazo, não há reembolso, exceto se a licença não for liberada ou houver defeito que impeça o uso — nesses casos, fale com o suporte.</p>
    </LegalPage>
  );
}
