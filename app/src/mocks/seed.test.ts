import { describe, expect, it } from 'vitest';
import { SENHA_DEMO } from './support';
import { SENHA_DEMO as SENHA_NA_TELA } from '../features/auth/perfis';
import { PERFIS_DEMO } from '../features/auth/perfis';
import { assertInvariants, getDb } from './db';
import { decideOnboarding, normalizaCodigo, onboardingPendente } from '../domain/auth';
import { canSee } from '../domain/visibility';
import { isActive } from '../domain/participation';
import { occupiesSpot } from '../domain/capacity';
import { checkInOpen } from '../domain/deadlines';
import { USUARIO_ATUAL_ID } from './seed';

/**
 * O seed é o estado da demonstração — e estado de demonstração apodrece calado.
 *
 * Cada caso aqui existe porque alguma coisa dependia do seed e ninguém
 * verificava: a senha duplicada entre o mock e a tela, o perfil de
 * demonstração que aponta para um e-mail que precisa existir, e as três
 * situações que o roteiro de 5 minutos precisa encontrar prontas
 * (docs/18-ambiente-de-teste.md).
 *
 * Um destes casos nasceu de um defeito real: a primeira tentativa de criar a
 * oferta de vaga pôs a usuária da demonstração em um evento de outro curso —
 * participação em evento invisível, que nenhuma invariante do mock detecta.
 */

describe('coerência da senha de demonstração', () => {
  it('a senha da tela de login é a mesma que o mock aceita', () => {
    /*
     * Tela não importa `mocks/` (`no-restricted-imports`, RNF-016), então o
     * literal está escrito duas vezes de propósito. Este teste é o que impede
     * as duas cópias de divergirem: sem ele, trocar a senha no seed deixaria os
     * atalhos de "entrar como" quebrados, e só quem tentasse usá-los saberia.
     */
    expect(SENHA_NA_TELA).toBe(SENHA_DEMO);
  });
});

describe('perfis de demonstração da tela de login', () => {
  it('todo perfil aponta para um usuário que existe no seed, com os papéis certos', () => {
    const db = getDb();
    for (const perfil of PERFIS_DEMO) {
      const usuario = db.usuarios.find((u) => u.email === perfil.email);
      expect(usuario, `perfil ${perfil.email} não existe no seed`).toBeDefined();
      // O rótulo de papel na tela não pode inventar autoridade.
      expect([...perfil.papeis].sort()).toEqual([...(usuario?.papeis ?? [])].sort());
    }
  });
});

describe('o código de turma que a tela sugere', () => {
  it('existe no seed, está ativo e é do curso que o perfil precisa', () => {
    /*
     * Nasceu de um defeito: o rodapé da tela de login sugeria `ESPX-26`, e o
     * código real da 3ESPX é `3ESPX-26`. Quem seguisse a instrução recebia
     * "esse código de turma não existe" — a demonstração do onboarding morria
     * na primeira tentativa, e nada no projeto reprovava.
     */
    const db = getDb();
    const perfis = PERFIS_DEMO.filter((p) => p.codigoSugerido);
    expect(perfis.length, 'nenhum perfil sugere código: o onboarding perde a instrução').toBe(1);

    for (const perfil of perfis) {
      const codigo = normalizaCodigo(perfil.codigoSugerido ?? '');
      const turma = db.turmas.find((t) => normalizaCodigo(t.codigoConvite) === codigo);

      expect(turma, `código ${perfil.codigoSugerido} não existe em nenhuma turma`).toBeDefined();
      expect(turma?.codigoAtivo, `a turma ${turma?.nome} está com o código desativado`).toBe(true);

      // E o vínculo tem de ser possível: a decisão do domínio precisa aceitar.
      const decisao = decideOnboarding({
        cursoId: turma?.cursoId ?? '',
        codigoConvite: perfil.codigoSugerido ?? '',
        cursos: db.cursos,
        turmas: db.turmas,
      });
      expect(decisao.aceito, `o domínio recusa o código sugerido para ${perfil.nome}`).toBe(true);
    }
  });
});

describe('estados que o roteiro de demonstração precisa encontrar prontos', () => {
  it('existe um usuário com o vínculo pendente, para o onboarding ser demonstrável', () => {
    const semVinculo = getDb().usuarios.filter(onboardingPendente);
    expect(semVinculo.length).toBeGreaterThan(0);
    // E-mail verificado: o onboarding é o passo DEPOIS da verificação (RF-004).
    expect(semVinculo.every((u) => u.emailVerificado)).toBe(true);
  });

  it('a usuária da demonstração tem uma oferta de vaga viva, com prazo no futuro', () => {
    const db = getDb();
    const oferta = db.participacoes.find(
      (p) => p.usuarioId === USUARIO_ATUAL_ID && p.status === 'OFERTA_PENDENTE',
    );
    expect(
      oferta,
      'sem OFERTA_PENDENTE o fluxo de RN-008 exige provocar um cancelamento',
    ).toBeDefined();
    expect(oferta?.ofertaExpiraEm).toBeTruthy();
    expect(new Date(oferta?.ofertaExpiraEm ?? 0).getTime()).toBeGreaterThan(Date.now());
    // Oferta é vaga reservada, não posição de fila (RN-007).
    expect(oferta?.posicaoFila).toBeNull();
  });

  it('a usuária da demonstração tem uma cobrança aguardando pagamento', () => {
    const db = getDb();
    const pendente = db.participacoes.find(
      (p) => p.usuarioId === USUARIO_ATUAL_ID && p.status === 'PENDENTE_PAGAMENTO',
    );
    expect(pendente).toBeDefined();
    expect(new Date(pendente?.pagamentoExpiraEm ?? 0).getTime()).toBeGreaterThan(Date.now());

    const evento = db.eventos.find((e) => e.id === pendente?.eventoId);
    // Cobrança em evento gratuito não faria sentido (RN-011).
    expect(evento?.preco ?? 0).toBeGreaterThan(0);
  });

  it('existe evento com a janela de check-in ABERTA agora, e alguém para validar', () => {
    /*
     * Este caso nasceu de uma lacuna encontrada ao montar o ambiente de teste:
     * nenhum evento do seed estava na janela de RN-017, então
     * `POST /eventos/:id/checkin` só sabia responder `AINDA_NAO_ABRIU`. O
     * caminho de sucesso de RF-034 e a recusa por uso único de RN-018 — que só
     * existe DEPOIS de um check-in aceito — não eram demonstráveis.
     *
     * A verificação é sobre "agora" de propósito: o evento em andamento tem a
     * hora derivada de `Date.now()`, e um horário cravado no seed voltaria a
     * falhar fora daquela faixa do dia.
     */
    const db = getDb();
    const agora = new Date();

    const abertos = db.eventos.filter((e) => e.status === 'PUBLICADO' && checkInOpen(e, agora));
    expect(abertos.length, 'nenhum evento na janela de check-in').toBeGreaterThan(0);

    const comQuemValidar = abertos.filter((evento) =>
      db.participacoes.some((p) => p.eventoId === evento.id && p.status === 'CONFIRMADA'),
    );
    expect(
      comQuemValidar.length,
      'janela aberta mas ninguém confirmado: o check-in não teria o que aceitar',
    ).toBeGreaterThan(0);

    // E alguém que JÁ entrou, para a recusa por uso único poder ser mostrada.
    const jaEntrou = abertos.some((evento) =>
      db.participacoes.some(
        (p) =>
          p.eventoId === evento.id &&
          p.status === 'PRESENTE' &&
          db.presencas.some((pr) => pr.participacaoId === p.id),
      ),
    );
    expect(jaEntrou, 'sem presença registrada, RN-018 exigiria validar duas vezes ao vivo').toBe(
      true,
    );
  });

  it('existe evento lotado com fila, para a lista de espera ser demonstrável', () => {
    const db = getDb();
    const lotados = db.eventos.filter(
      (e) => e.status === 'PUBLICADO' && e.ocupadas >= e.capacidade,
    );
    expect(lotados.length).toBeGreaterThan(0);

    const comFila = lotados.filter((evento) =>
      db.participacoes.some((p) => p.eventoId === evento.id && p.status === 'LISTA_ESPERA'),
    );
    expect(comFila.length).toBeGreaterThan(0);
  });
});

describe('integridade do seed', () => {
  /**
   * Participações fora do alcance atual do dono, aceitas de propósito.
   *
   * O sistema NÃO consegue criar uma dessas: o handler de inscrição recusa com
   * `FORA_DO_ALCANCE`. O único caminho real até este estado é **o vínculo mudar
   * depois da inscrição** — troca de turma, troca de curso, transferência — e é
   * exatamente o caso que a exceção de RN-001 existe para cobrir: quem já
   * participa continua vendo o evento mesmo tendo perdido o alcance.
   *
   * A lista é explícita porque a alternativa é pior. Verificar "nenhuma
   * participação fora de alcance" reprovaria o seed herdado do CP4; verificar
   * com a exceção ligada passaria sempre e não provaria nada. Com a lista, um
   * caso NOVO reprova — foi assim que `par-124` foi pega, criada por descuido
   * em um evento de turma que a dona não vê.
   */
  const FORA_DE_ALCANCE_INTENCIONAL: Record<string, string> = {
    'par-004':
      'Karen (3ESPY) aguardando pagamento no churrasco da 3ESPX: entrou quando era da turma e trocou depois',
    'par-064':
      'Henrique (Eng. Computação) na fila do workshop de Sistemas de Informação: inscrito antes da mudança de curso',
    'par-090':
      'Marina presente no churrasco da 1CCB: evento passado, de quando ela era da turma. É o caso citado em services/inscricao.test.ts',
  };

  it('toda participação fora do alcance do dono está na lista de exceções documentada', () => {
    const db = getDb();
    const inesperadas: string[] = [];
    const naoUsadas = new Set(Object.keys(FORA_DE_ALCANCE_INTENCIONAL));

    for (const participacao of db.participacoes) {
      if (!isActive(participacao.status) && participacao.status !== 'PRESENTE') continue;
      const usuario = db.usuarios.find((u) => u.id === participacao.usuarioId);
      const evento = db.eventos.find((e) => e.id === participacao.eventoId);
      if (!usuario || !evento) {
        inesperadas.push(`${participacao.id}: usuário ou evento inexistente`);
        continue;
      }

      // `temParticipacaoAtiva: false` de propósito: aqui a pergunta é se o
      // alcance ATUAL cobre o evento, não se a exceção o torna visível.
      if (canSee(usuario, evento, { temParticipacaoAtiva: false })) continue;

      if (participacao.id in FORA_DE_ALCANCE_INTENCIONAL) {
        naoUsadas.delete(participacao.id);
        // A exceção só vale porque a pessoa continua vendo o evento (RN-001).
        expect(
          canSee(usuario, evento, { temParticipacaoAtiva: true }),
          `${participacao.id}: a exceção de RN-001 deveria manter o evento visível`,
        ).toBe(true);
        continue;
      }

      inesperadas.push(
        `${participacao.id}: ${usuario.nome} participa de ${evento.id} (${evento.alcance}) fora do alcance atual dela, e não está na lista de exceções`,
      );
    }

    expect(inesperadas).toEqual([]);
    // Exceção que deixou de existir tem de sair da lista, senão ela vira lixo.
    expect(
      [...naoUsadas],
      'exceção documentada que não corresponde a nenhuma participação',
    ).toEqual([]);
  });

  it('a contagem materializada de cada evento cabe na capacidade', () => {
    // Redundante com `assertInvariants`, mas aqui ela roda sobre o SEED, e não
    // ao fim de uma transação: um seed inválido falharia no primeiro request.
    expect(() => assertInvariants()).not.toThrow();

    for (const evento of getDb().eventos) {
      expect(evento.ocupadas, `${evento.id} estoura a capacidade`).toBeLessThanOrEqual(
        evento.capacidade,
      );
    }
  });

  it('a posição na fila é contígua e começa em 1 em cada evento', () => {
    const db = getDb();
    const porEvento = new Map<string, number[]>();

    for (const p of db.participacoes) {
      if (p.status !== 'LISTA_ESPERA') continue;
      expect(p.posicaoFila, `${p.id} está na fila sem posição`).not.toBeNull();
      const lista = porEvento.get(p.eventoId) ?? [];
      lista.push(p.posicaoFila ?? 0);
      porEvento.set(p.eventoId, lista);
    }

    for (const [eventoId, posicoes] of porEvento) {
      const ordenadas = [...posicoes].sort((a, b) => a - b);
      const esperadas = ordenadas.map((_, i) => i + 1);
      expect(ordenadas, `fila de ${eventoId} tem posição repetida ou buraco`).toEqual(esperadas);
    }
  });

  it('só quem ocupa vaga é contado como ocupante conhecido', () => {
    // Guarda o acordo entre `occupiesSpot` e o seed: se um status novo entrar em
    // ESTADOS_QUE_OCUPAM sem entrar aqui, a contagem do seed passa a mentir.
    const db = getDb();
    for (const evento of db.eventos) {
      const ocupantes = db.participacoes.filter(
        (p) => p.eventoId === evento.id && occupiesSpot(p.status),
      ).length;
      expect(
        ocupantes,
        `${evento.id} tem mais ocupantes materializados que vagas`,
      ).toBeLessThanOrEqual(evento.capacidade);
    }
  });
});
