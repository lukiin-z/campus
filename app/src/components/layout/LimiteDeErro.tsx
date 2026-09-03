import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Fronteira de erro da aplicação.
 *
 * ## Por que ela existe
 *
 * O CP5 corrigiu a tela branca de um caso: o mock que não sobe. Faltava o outro,
 * e ele foi medido — servindo a build sob um host com fallback de SPA, uma
 * chamada de dados voltou `200 text/html`, um componente chamou `.map` em algo
 * que não era lista e o React **desmontou a árvore inteira**. A faixa de aviso
 * renderizava, e sumia junto: o resultado final era a mesma página em branco que
 * a correção anterior existia para eliminar.
 *
 * React 18 não tem tratamento padrão para erro de renderização. Sem fronteira,
 * qualquer `throw` em qualquer componente apaga o app todo — não a tela, o app.
 * Com fronteira, o erro fica contido e a pessoa vê o que aconteceu e o que
 * fazer.
 *
 * ## Por que é classe
 *
 * `getDerivedStateFromError` e `componentDidCatch` só existem em componente de
 * classe. Não há equivalente em hook — é a única classe do projeto, e é por
 * imposição da API do React, não por preferência.
 *
 * ## O que ela NÃO faz
 *
 * Não captura erro em `event handler`, `setTimeout` ou promessa rejeitada: esses
 * não passam pela renderização. Falha de dados já é tratada na camada de
 * serviços (`lib/api.ts` lança `ApiError`) e nos estados de erro de cada tela.
 * Esta fronteira é a rede embaixo do trapézio, não o trapézio.
 */
interface Estado {
  erro: Error | null;
}

export class LimiteDeErro extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    /*
     * O console é o único destino honesto aqui: o projeto não tem serviço de
     * telemetria, e inventar um seria dependência sem uso real. O
     * `componentStack` é o que diz QUAL componente quebrou — sem ele, a
     * mensagem sozinha raramente localiza o defeito.
     */
    // eslint-disable-next-line no-console -- sem telemetria no projeto; ver ADR-0003
    console.error('[Campus] erro de renderização:', erro, info.componentStack);
  }

  render(): ReactNode {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    return (
      <div role="alert" className="mx-auto max-w-content px-5 py-10">
        <h1 className="font-display text-title-md font-bold text-ink">Algo quebrou nesta tela.</h1>
        <p className="mt-2 text-body-sm text-ink-soft">
          O erro foi contido aqui para o resto do app continuar de pé. Recarregar costuma resolver;
          se voltar a acontecer, a mensagem abaixo é o que a equipe precisa saber.
        </p>
        <p className="mt-4 break-words rounded-card bg-surface-muted p-4 font-mono text-mono-xs text-ink-soft">
          {erro.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-pill bg-ink px-5 py-3 font-display text-body-sm font-bold text-surface"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
