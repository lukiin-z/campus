import { PERFIS_DEMO, papeisEmTexto } from './perfis';

/**
 * Atalho de avaliação da tela de login.
 *
 * Não é recurso do produto: é afordância de demonstração do CP5, e o texto diz
 * isso em voz alta. Sem ela, avaliar cada perfil exigiria decorar e-mails do
 * seed — e o papel de cada um não apareceria em lugar nenhum da interface.
 */
export function PerfisDemo({
  onEscolher,
  desabilitado,
}: {
  onEscolher: (email: string) => void;
  desabilitado: boolean;
}) {
  // O texto do rodapé fala do perfil sem vínculo em vez de repetir o nome dele:
  // se a lista mudar, a frase acompanha.
  const semVinculo = PERFIS_DEMO.find((perfil) => perfil.codigoSugerido);

  return (
    <section aria-labelledby="perfis-demo-titulo" className="mt-10">
      <h2 id="perfis-demo-titulo" className="font-mono text-mono-xs uppercase text-text-muted">
        Entrar como · demonstração
      </h2>
      <p className="mt-2 text-body-xs text-text-muted">
        Perfis do ambiente de demonstração do CP5. Um toque preenche o formulário e entra. A senha é
        a mesma para todos.
      </p>

      <ul className="mt-4 space-y-2">
        {PERFIS_DEMO.map((perfil) => (
          <li key={perfil.email}>
            <button
              type="button"
              disabled={desabilitado}
              onClick={() => onEscolher(perfil.email)}
              className="block w-full min-h-touch rounded-md border border-border bg-surface px-4 py-3 text-left transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-text-disabled"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-display-sm font-bold text-text">
                  {perfil.nome}
                </span>
                <span className="font-mono text-mono-xs uppercase text-accent-strong">
                  {papeisEmTexto(perfil.papeis)}
                </span>
              </span>
              <span className="mt-1 block text-body-xs text-text-muted">{perfil.descricao}</span>
              <span className="mt-1 block font-mono text-mono-xs text-text-subtle">
                {perfil.email} · {perfil.vinculo}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* O destino depois de entrar depende do vínculo, e a lista tem os dois
          casos de propósito: quatro perfis com turma e um sem. */}
      <p className="mt-4 text-body-xs text-text-subtle">
        Os quatro primeiros já têm turma e entram direto no feed.{' '}
        {semVinculo
          ? `${semVinculo.nome} não tem vínculo: entrar com ele leva ao onboarding, onde o código da 3ESPX é `
          : 'A tela de vínculo fica em /onboarding.'}
        {semVinculo?.codigoSugerido && (
          <code className="font-mono text-mono-xs">{semVinculo.codigoSugerido}</code>
        )}
      </p>
    </section>
  );
}
