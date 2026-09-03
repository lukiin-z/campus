import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LimiteDeErro } from './LimiteDeErro';

/**
 * A fronteira de erro nasceu de uma medição, e o teste reproduz a medição.
 *
 * O que foi observado no navegador: um componente chamou `.map` em algo que não
 * era lista, o React desmontou a árvore inteira e a página ficou em branco —
 * levando embora, junto, a faixa que explicava por que os dados não vieram.
 *
 * O que estes casos verificam é a única coisa que importa nesse cenário: **algo
 * continua na tela**, e esse algo diz o que houve.
 */

function Quebra(): never {
  throw new Error('não foi possível ler a propriedade map');
}

let consoleErro: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  /*
   * O React imprime o erro capturado no console por conta própria, além do nosso
   * `componentDidCatch`. Sem o silenciamento, a saída da suíte fica com um
   * stack trace vermelho em um teste que PASSOU — que é exatamente o tipo de
   * ruído que faz uma pessoa parar de ler a saída.
   */
  consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErro.mockRestore();
});

describe('erro de renderização', () => {
  it('mostra explicação em vez de apagar a página', () => {
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Algo quebrou nesta tela.')).toBeInTheDocument();
    expect(document.body.textContent).not.toBe('');
  });

  it('inclui a mensagem do erro, que é o que localiza o defeito', () => {
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );

    expect(screen.getByText(/não foi possível ler a propriedade map/)).toBeInTheDocument();
  });

  it('oferece recarregar, porque é o que resolve na maioria dos casos', () => {
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );

    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeInTheDocument();
  });

  it('registra o erro com o componentStack no console', () => {
    render(
      <LimiteDeErro>
        <Quebra />
      </LimiteDeErro>,
    );

    const nossa = consoleErro.mock.calls.find(
      (argumentos) => argumentos[0] === '[Campus] erro de renderização:',
    );
    expect(nossa).toBeDefined();
    // O terceiro argumento é o componentStack: sem ele a mensagem raramente diz
    // QUAL componente quebrou.
    expect(String(nossa?.[2])).toContain('Quebra');
  });
});

describe('sem erro', () => {
  it('não interfere: renderiza os filhos e nenhum alerta', () => {
    render(
      <LimiteDeErro>
        <p>conteúdo normal</p>
      </LimiteDeErro>,
    );

    expect(screen.getByText('conteúdo normal')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
