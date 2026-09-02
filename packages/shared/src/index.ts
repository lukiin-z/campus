/**
 * `@campus/shared` — o contrato entre o app e a API.
 *
 * Três coisas moram aqui, e nada além:
 *
 * | O quê | Por que é compartilhado |
 * |---|---|
 * | `types.ts` | Enums e entidades. Duas cópias de um enum de status é o jeito mais rápido de o front aceitar um valor que o banco recusa |
 * | `domain/` | As regras de negócio, como funções puras. **Portadas, não reescritas**: `planPromotion` existe uma vez, e é a mesma que decide na tela e na API |
 * | `schemas.ts` | Validação de forma e faixa em Zod. O formulário e o `ValidationPipe` da API usam o mesmo objeto |
 *
 * O que **não** mora aqui: nada que importe React, `fetch`, Prisma, NestJS ou
 * `msw`. O pacote é consumido pelos dois lados, então uma dependência de
 * runtime de um deles quebraria o outro. A única dependência é `zod`.
 *
 * A fronteira é verificada: `scripts/check-contrato.mjs` reprova se qualquer
 * arquivo daqui importar algo fora desta lista.
 *
 * ## Como o CP5 chegou aqui
 *
 * Até o CP5, tudo isto vivia em `app/src/`. O CP6 acrescentou um segundo
 * consumidor, e a decisão foi **mover**, não copiar — o prompt do checkpoint
 * pedia exatamente isso, e a razão de engenharia é a de sempre: a segunda cópia
 * não nasce errada, ela fica errada na primeira correção feita só de um lado.
 *
 * `app/src/types/domain.ts` e os módulos que sobraram em `app/src/domain/`
 * continuam existindo; os três que sobraram são apresentação, não domínio
 * (`format`, `eventAction`, `eventSchema`).
 */

// ---------------------------------------------------------------------------
// Tipos e enumerações
// ---------------------------------------------------------------------------
export * from './types';

// ---------------------------------------------------------------------------
// Schemas de validação
// ---------------------------------------------------------------------------
export * from './schemas';

// ---------------------------------------------------------------------------
// Regras de negócio — funções puras, uma por arquivo temático
// ---------------------------------------------------------------------------
export * from './domain/policy';
export * from './domain/auth';
export * from './domain/capacity';
export * from './domain/deadlines';
export * from './domain/participation';
export * from './domain/waitlist';
export * from './domain/payment';
export * from './domain/refund';
export * from './domain/visibility';
export * from './domain/permissions';
export * from './domain/checkin';
export * from './domain/pix';
export * from './domain/ticketToken';
