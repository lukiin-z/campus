import { describe, expect, it } from 'vitest';
import { repositories } from './index';
import { ApiError } from './index';
import { getDb } from '../mocks/db';

/**
 * CT-025 — escrita no feed pela API (RF-037, RF-038, RN-001, RN-019).
 *
 * Era a única lacuna de teste de integração entre os fluxos do CP5, e é
 * justamente onde o CP4 já tinha achado um defeito de classe: handler de
 * escrita que não repete a verificação de alcance. Aqui a verificação passa
 * pela camada HTTP inteira, como a tela faz.
 *
 * O usuário autenticado padrão do mock é Marina Alves (3ESPX · Engenharia).
 */

/** Alcance ativo em cada teste: o `x-usuario-id` do mock não é usado aqui. */
async function publicaveis(): Promise<string[]> {
  const eventos = await repositories.feed.eventosPublicaveis();
  return eventos.map((e) => e.id);
}

describe('quem pode publicar (RN-019)', () => {
  it('só oferece eventos em que a pessoa ESTEVE — inscrição não basta', async () => {
    const ids = await publicaveis();

    // `evt-009` e `evt-010` têm participação `PRESENTE` da Marina.
    expect(ids).toContain('evt-009');
    expect(ids).toContain('evt-010');

    /*
     * `evt-001` e `evt-004` têm participação CONFIRMADA e ainda não
     * aconteceram. Antes da correção do CP5 os dois apareciam aqui, e a
     * escrita depois recusava — seletor oferecendo o que a API nega.
     */
    expect(ids).not.toContain('evt-001');
    expect(ids).not.toContain('evt-004');

    // `evt-002` é o hackathon em que ela está na FILA. Nunca publicável.
    expect(ids).not.toContain('evt-002');
  });

  it('recusa publicar em evento onde só há inscrição confirmada', async () => {
    await expect(
      repositories.feed.publicar({ eventoId: 'evt-001', legenda: 'foto do churrasco' }),
    ).rejects.toBeInstanceOf(ApiError);

    try {
      await repositories.feed.publicar({ eventoId: 'evt-001', legenda: 'foto do churrasco' });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(403);
        expect(erro.codigo).toBe('SEM_PARTICIPACAO');
      }
    }
  });

  it('recusa publicar em evento da fila de espera (RN-019 via isActive)', async () => {
    // O caso concreto do defeito: `isActive` incluía `LISTA_ESPERA`, então
    // quem nunca teve vaga publicava no feed do evento.
    try {
      await repositories.feed.publicar({ eventoId: 'evt-002', legenda: 'foto do hackathon' });
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) expect(erro.codigo).toBe('SEM_PARTICIPACAO');
    }
  });

  it('publica em evento em que esteve, e a publicação aparece no feed', async () => {
    const antes = await repositories.feed.listar();

    const nova = await repositories.feed.publicar({
      eventoId: 'evt-009',
      legenda: 'A churrasqueira aguentou. O rateio também.',
      imagemSeed: 7,
    });

    expect(nova.eventoId).toBe('evt-009');
    expect(nova.autor.nome).toBe('Marina Alves');
    expect(nova.evento.titulo).toContain('boas-vindas');
    expect(nova.comentarios).toEqual([]);
    expect(nova.removida).toBe(false);

    const depois = await repositories.feed.listar();
    expect(depois.length).toBe(antes.length + 1);
    // Mais recente primeiro: a nova publicação abre o feed.
    expect(depois[0]?.id).toBe(nova.id);
  });
});

describe('alcance na escrita (RN-001, RNF-012)', () => {
  it('evento fora do alcance responde 404, sem revelar que existe', async () => {
    /*
     * `evt-006` é evento de CURSO de Sistemas de Informação; Marina é de
     * Engenharia. A resposta é `404 NAO_ENCONTRADO` e não `403`: um `403`
     * confirmaria a existência do evento (RNF-012).
     */
    try {
      await repositories.feed.publicar({ eventoId: 'evt-006', legenda: 'foto qualquer' });
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(404);
        expect(erro.codigo).toBe('NAO_ENCONTRADO');
      }
    }
  });

  it('evento inexistente e evento invisível são indistinguíveis', async () => {
    const codigos: string[] = [];
    for (const eventoId of ['evt-006', 'evt-inexistente']) {
      try {
        await repositories.feed.publicar({ eventoId, legenda: 'foto qualquer' });
      } catch (erro) {
        if (erro instanceof ApiError) codigos.push(`${erro.status}:${erro.codigo}`);
      }
    }
    expect(codigos[0]).toBe(codigos[1]);
  });

  it('o feed só devolve publicação de evento visível', async () => {
    const publicacoes = await repositories.feed.listar();
    const db = getDb();
    for (const publicacao of publicacoes) {
      const evento = db.eventos.find((e) => e.id === publicacao.eventoId);
      expect(evento, `publicação ${publicacao.id} aponta para evento inexistente`).toBeDefined();
      // Nenhuma publicação de evento de outro curso vaza para o feed.
      expect(evento?.id).not.toBe('evt-006');
    }
  });
});

describe('limites de texto', () => {
  it('recusa legenda com menos de 2 letras', async () => {
    try {
      await repositories.feed.publicar({ eventoId: 'evt-009', legenda: 'a' });
      throw new Error('esperava recusa');
    } catch (erro) {
      expect(erro).toBeInstanceOf(ApiError);
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(422);
        expect(erro.codigo).toBe('LEGENDA_CURTA');
      }
    }
  });

  it('recusa legenda com mais de 500 caracteres', async () => {
    try {
      await repositories.feed.publicar({ eventoId: 'evt-009', legenda: 'x'.repeat(501) });
      throw new Error('esperava recusa');
    } catch (erro) {
      if (erro instanceof ApiError) expect(erro.codigo).toBe('LEGENDA_LONGA');
    }
  });

  it('aceita exatamente 500 caracteres', async () => {
    // O limite é inclusivo: 500 passa, 501 não. Sem este caso, um `>=` no
    // lugar do `>` passaria despercebido.
    const publicada = await repositories.feed.publicar({
      eventoId: 'evt-009',
      legenda: 'x'.repeat(500),
    });
    expect(publicada.legenda.length).toBe(500);
  });
});

describe('comentários (RF-038)', () => {
  it('comenta em publicação visível e o comentário volta no feed', async () => {
    const feed = await repositories.feed.listar();
    const alvo = feed[0];
    expect(alvo, 'o seed precisa ter pelo menos uma publicação').toBeDefined();
    if (!alvo) return;

    const comentario = await repositories.feed.comentar(alvo.id, {
      texto: 'Alguém tem a foto da chegada do ônibus?',
    });

    expect(comentario.publicacaoId).toBe(alvo.id);
    expect(comentario.autorId).toBe('usr-001');
    expect(comentario.removido).toBe(false);

    const depois = await repositories.feed.listar();
    const mesma = depois.find((p) => p.id === alvo.id);
    expect(mesma?.comentarios.map((c) => c.id)).toContain(comentario.id);
    // O autor vem resolvido: a tela não busca usuário por conta própria.
    expect(mesma?.comentarios.find((c) => c.id === comentario.id)?.autor.nome).toBe('Marina Alves');
  });

  it('recusa comentário curto e comentário longo com códigos próprios', async () => {
    const feed = await repositories.feed.listar();
    const alvo = feed[0];
    if (!alvo) return;

    const codigos: string[] = [];
    for (const texto of ['a', 'x'.repeat(281)]) {
      try {
        await repositories.feed.comentar(alvo.id, { texto });
      } catch (erro) {
        if (erro instanceof ApiError) codigos.push(erro.codigo);
      }
    }
    expect(codigos).toEqual(['TEXTO_CURTO', 'TEXTO_LONGO']);
  });

  it('recusa comentar em publicação inexistente', async () => {
    try {
      await repositories.feed.comentar('pub-inexistente', { texto: 'oi pessoal' });
      throw new Error('esperava recusa');
    } catch (erro) {
      if (erro instanceof ApiError) {
        expect(erro.status).toBe(404);
        expect(erro.codigo).toBe('NAO_ENCONTRADA');
      }
    }
  });
});
