import { HttpResponse } from 'msw';
import type {
  Evento,
  EventoView,
  FiltroAlcance,
  FiltroPeriodo,
  FiltroPreco,
  Participacao,
  ParticipacaoView,
} from '../types/domain';
import { availableSpots } from '../domain/capacity';
import { enrollmentOpen } from '../domain/deadlines';
import { findActiveParticipation, isActive } from '../domain/participation';
import { waitlistSize } from '../domain/waitlist';
import { alcanceRotulo, canSee } from '../domain/visibility';
import {
  findEvento,
  findUsuario,
  getDb,
  pagamentoDaParticipacao,
  participacoesDoEvento,
  participacoesDoUsuario,
  presencaDaParticipacao,
} from './db';
import { USUARIO_ATUAL_ID } from './seed';
import { aplicarExpiracoes } from './expiracao';

/**
 * Peças compartilhadas da "API" do CP5.
 *
 * Estes handlers NÃO são um atalho: eles aplicam as mesmas funções de
 * `src/domain/` que a API real vai aplicar no CP6, devolvem os mesmos códigos de
 * status e as mesmas formas de erro descritas no contrato de
 * docs/08-arquitetura.md. É isso que faz o app já exercitar carregamento, erro e
 * conflito desde agora (ADR-0003, RNF-016).
 */

export const BASE = '/api';

/** Latência simulada: sem ela, nenhum estado de carregamento seria exercitado. */
const LATENCIA_MS = 180;

export async function latencia(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, LATENCIA_MS));
}

/**
 * Início de toda requisição: latência simulada e **prazos aplicados**.
 *
 * A segunda parte não é detalhe. `paymentExpired`, `offerExpired` e
 * `planPromotion` existiam desde o CP4 e nenhum handler as chamava: o
 * cronômetro da cobrança chegava a zero na tela e o pagamento continuava sendo
 * aceito. Aplicar na borda da requisição é o que faz RN-012 e RN-008 valerem —
 * e é o que a API do CP6 vai fazer no guard, com job agendado por cima.
 *
 * Ver `mocks/expiracao.ts` para o porquê de ser preguiçoso e não agendado.
 */
export async function abrirRequisicao(): Promise<void> {
  await latencia();
  await aplicarExpiracoes();
}

/**
 * Usuário autenticado.
 *
 * No CP5 não há login (RF-003 é da Sprint 2): a sessão é o usuário fixo do seed.
 * O cabeçalho `x-usuario-id` existe como afordância de teste do mock — é o que
 * permite exercitar cenário multiusuário (concorrência pela última vaga, CT-020)
 * antes de existir autenticação. Quando o login entrar, este cabeçalho sai e o
 * usuário passa a vir do token.
 */
/**
 * Senha única dos usuários do seed.
 *
 * O seed não guarda hash de senha: no CP5 a autenticação é simulada e o objetivo
 * é que qualquer pessoa avaliando consiga entrar como qualquer perfil. O hash
 * argon2 real entra no CP6 (RNF-019). Documentada em docs/18-ambiente-de-teste.md.
 */
export const SENHA_DEMO = 'campus123';

const PREFIXO_TOKEN = 'campus.sess';

/** Token opaco para a tela, legível pelo mock: `campus.sess.<usuarioId>`. */
export function tokenDeSessao(usuarioId: string): string {
  return `${PREFIXO_TOKEN}.${usuarioId}`;
}

function usuarioIdDoToken(request?: Request): string | null {
  const cabecalho = request?.headers.get('Authorization');
  if (!cabecalho?.startsWith('Bearer ')) return null;
  const token = cabecalho.slice('Bearer '.length).trim();
  if (!token.startsWith(`${PREFIXO_TOKEN}.`)) return null;
  return token.slice(PREFIXO_TOKEN.length + 1) || null;
}

/**
 * Usuário autenticado, resolvido em três níveis, do mais específico ao padrão:
 *
 * 1. `x-usuario-id` — afordância de teste do mock. É o que permite exercitar
 *    cenário multiusuário (concorrência pela última vaga, CT-020) sem montar
 *    duas sessões de navegador. Não existe na API do CP6.
 * 2. `Authorization: Bearer campus.sess.<id>` — o caminho que o app usa depois
 *    do login (RF-003). No CP6 o token vira JWT assinado e só a leitura muda.
 * 3. Usuário fixo do seed — mantido porque o mock também responde a requisição
 *    direta (curl, teste de integração) sem passar pela tela de login.
 */
export function usuarioAtual(request?: Request) {
  const id = request?.headers.get('x-usuario-id') ?? usuarioIdDoToken(request) ?? USUARIO_ATUAL_ID;
  const usuario = findUsuario(id);
  if (!usuario) throw new Error(`usuário ${id} não encontrado`);
  return usuario;
}

export function erro(status: number, codigo: string, mensagem: string, extra: object = {}) {
  return HttpResponse.json({ erro: codigo, mensagem, ...extra }, { status });
}

// --------------------------------------------------------------------------
// Projeções (o que a API devolve para a tela)
// --------------------------------------------------------------------------

export function toEventoView(evento: Evento, usuarioId: string): EventoView {
  const db = getDb();
  const organizador = findUsuario(evento.organizadorId);
  const participacoes = participacoesDoEvento(evento.id);
  const minha = findActiveParticipation(participacoes, usuarioId);

  return {
    ...evento,
    organizador: {
      id: organizador?.id ?? 'desconhecido',
      nome: organizador?.nome ?? 'Organizador',
      avatarSeed: organizador?.avatarSeed ?? 1,
    },
    alcanceRotulo: alcanceRotulo(evento, {
      turmas: db.turmas,
      cursos: db.cursos,
      faculdade: db.faculdade,
    }),
    vagasDisponiveis: availableSpots(evento),
    taxaOcupacao: evento.capacidade > 0 ? evento.ocupadas / evento.capacidade : 0,
    inscricoesAbertas: enrollmentOpen(evento, new Date()),
    totalListaEspera: waitlistSize(participacoes),
    minhaParticipacao: minha,
  };
}

export function toParticipacaoView(participacao: Participacao): ParticipacaoView | null {
  const evento = findEvento(participacao.eventoId);
  if (!evento) return null;
  return {
    ...participacao,
    evento: {
      id: evento.id,
      titulo: evento.titulo,
      inicio: evento.inicio,
      fim: evento.fim,
      local: evento.local,
      preco: evento.preco,
      alcance: evento.alcance,
      status: evento.status,
      capaSeed: evento.capaSeed,
    },
    pagamento: pagamentoDaParticipacao(participacao.id) ?? null,
    presenca: presencaDaParticipacao(participacao.id) ?? null,
  };
}

export function eventosVisiveis(usuarioId: string): Evento[] {
  const db = getDb();
  const usuario = findUsuario(usuarioId);
  if (!usuario) return [];
  const minhas = participacoesDoUsuario(usuarioId);

  return db.eventos.filter((evento) =>
    canSee(usuario, evento, {
      temParticipacaoAtiva: minhas.some((p) => p.eventoId === evento.id && isActive(p.status)),
    }),
  );
}

export function aplicarFiltros(
  eventos: Evento[],
  usuarioId: string,
  filtros: { alcance: FiltroAlcance; preco: FiltroPreco; periodo: FiltroPeriodo; busca: string },
): Evento[] {
  const usuario = findUsuario(usuarioId);
  const agora = Date.now();
  const fimDoMes = new Date();
  fimDoMes.setMonth(fimDoMes.getMonth() + 1, 0);
  fimDoMes.setHours(23, 59, 59, 999);
  const seteDias = agora + 7 * 24 * 3_600_000;

  return (
    eventos
      .filter(
        (e) => e.status === 'PUBLICADO' || e.status === 'CANCELADO' || e.status === 'REALIZADO',
      )
      .filter((e) => {
        switch (filtros.alcance) {
          case 'MINHA_TURMA':
            return e.alcance === 'TURMA' && e.turmaId === usuario?.turmaId;
          case 'MEU_CURSO':
            return e.alcance === 'CURSO' && e.cursoId === usuario?.cursoId;
          case 'FACULDADE':
            return e.alcance === 'FACULDADE';
          default:
            return true;
        }
      })
      .filter((e) => {
        if (filtros.preco === 'GRATUITOS') return e.preco === 0;
        if (filtros.preco === 'PAGOS') return e.preco > 0;
        return true;
      })
      .filter((e) => {
        const inicio = new Date(e.inicio).getTime();
        if (filtros.periodo === 'ESTE_MES') return inicio <= fimDoMes.getTime();
        if (filtros.periodo === 'PROXIMOS_7_DIAS') return inicio <= seteDias;
        return true;
      })
      .filter((e) => {
        if (!filtros.busca) return true;
        const termo = filtros.busca.toLowerCase();
        return (
          e.titulo.toLowerCase().includes(termo) ||
          e.local.toLowerCase().includes(termo) ||
          e.descricao.toLowerCase().includes(termo)
        );
      })
      /*
       * Quem abre "Eventos" quer saber o que vem, não o que passou. Então: os
       * futuros primeiro, em ordem crescente (o mais próximo no topo); depois os
       * encerrados, em ordem decrescente (o mais recente primeiro). Ordenar tudo
       * por data colocaria a Semana de Recepção de agosto acima do churrasco de
       * setembro — exatamente o contrário do que a tela serve para responder.
       */
      .sort((a, b) => {
        const inicioA = new Date(a.inicio).getTime();
        const inicioB = new Date(b.inicio).getTime();
        const futuroA = new Date(a.fim).getTime() >= agora;
        const futuroB = new Date(b.fim).getTime() >= agora;
        if (futuroA !== futuroB) return futuroA ? -1 : 1;
        return futuroA ? inicioA - inicioB : inicioB - inicioA;
      })
  );
}
