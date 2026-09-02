/**
 * Faixa de aviso quando o mock não sobe.
 *
 * O CP5 não tem servidor: quem responde `fetch('/api/...')` é o service worker
 * do MSW (ADR-0003). Se o registro dele falha, TODA tela mostra "não carregou" e
 * a causa fica invisível — a pessoa conclui que o app está quebrado, quando o
 * que está bloqueado é o registro de service worker no navegador dela.
 *
 * A faixa fica fixa no topo e empurra o conteúdo (não sobrepõe): aviso que cobre
 * a barra de navegação troca um problema por outro.
 */
export function AvisoMockIndisponivel({ motivo }: { motivo: string }) {
  return (
    <div role="alert" className="border-b border-border bg-accent-soft px-5 py-3">
      <div className="mx-auto max-w-content">
        <p className="font-display text-body-sm font-bold text-coral-800">
          Os dados de demonstração não carregaram.
        </p>
        <p className="mt-1 text-body-xs text-coral-700">
          Este protótipo responde às requisições por um service worker no seu próprio navegador, e o
          registro dele foi recusado. Costuma ser janela privada, armazenamento do site desligado ou
          página aberta fora de <code className="font-mono">https</code> /{' '}
          <code className="font-mono">localhost</code>. As telas aparecem, mas sem dados.
        </p>
        <p className="mt-1 font-mono text-mono-xs text-coral-700">{motivo}</p>
      </div>
    </div>
  );
}
