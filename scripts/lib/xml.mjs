/**
 * Verificador mínimo de XML bem formado, para validar os SVGs escritos à mão.
 *
 * Não é um parser completo — e não precisa ser. O que interessa é o que
 * realmente quebra um SVG na prática: tag não fechada, fechamento fora de ordem,
 * `&` solto e atributo sem aspas. Uma dependência de parser XML para isso não se
 * pagaria (e o projeto não adiciona dependência sem justificar).
 */

const VAZIOS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link']);

export const XMLParser = {
  /**
   * Lança `Error` com a linha do problema se o documento não for bem formado.
   * Devolve a contagem de elementos quando está tudo certo.
   */
  parse(texto) {
    const pilha = [];
    let elementos = 0;
    let i = 0;
    let linha = 1;

    const erro = (mensagem) => {
      throw new Error(`linha ${linha}: ${mensagem}`);
    };

    while (i < texto.length) {
      const caractere = texto[i];

      if (caractere === '\n') {
        linha += 1;
        i += 1;
        continue;
      }

      if (caractere === '&') {
        // Entidade precisa terminar em `;` dentro de um limite razoável.
        const fim = texto.indexOf(';', i);
        if (fim === -1 || fim - i > 12) erro('caractere "&" solto — use &amp;');
        i = fim + 1;
        continue;
      }

      if (caractere !== '<') {
        i += 1;
        continue;
      }

      // Comentário, CDATA, declaração ou instrução de processamento: pula.
      if (texto.startsWith('<!--', i)) {
        const fim = texto.indexOf('-->', i);
        if (fim === -1) erro('comentário aberto e nunca fechado');
        linha += contarLinhas(texto.slice(i, fim));
        i = fim + 3;
        continue;
      }
      if (texto.startsWith('<![CDATA[', i)) {
        const fim = texto.indexOf(']]>', i);
        if (fim === -1) erro('CDATA aberto e nunca fechado');
        linha += contarLinhas(texto.slice(i, fim));
        i = fim + 3;
        continue;
      }
      if (texto.startsWith('<?', i) || texto.startsWith('<!', i)) {
        const fim = texto.indexOf('>', i);
        if (fim === -1) erro('declaração aberta e nunca fechada');
        i = fim + 1;
        continue;
      }

      const fimTag = encontrarFimDaTag(texto, i);
      if (fimTag === -1) erro('tag aberta e nunca fechada');

      const bruto = texto.slice(i + 1, fimTag).trim();
      linha += contarLinhas(texto.slice(i, fimTag));

      if (bruto.startsWith('/')) {
        const nome = bruto.slice(1).trim();
        const esperado = pilha.pop();
        if (esperado !== nome) {
          erro(
            esperado === undefined
              ? `fechamento </${nome}> sem abertura correspondente`
              : `fechamento </${nome}> fora de ordem — esperava </${esperado}>`,
          );
        }
      } else {
        const autofechada = bruto.endsWith('/');
        const nome = bruto.split(/[\s/>]/)[0] ?? '';
        if (!nome) erro('tag sem nome');
        elementos += 1;
        verificarAtributos(bruto.slice(nome.length), erro);
        if (!autofechada && !VAZIOS.has(nome)) pilha.push(nome);
      }

      i = fimTag + 1;
    }

    if (pilha.length > 0) {
      throw new Error(`elemento(s) sem fechamento: <${pilha.join('>, <')}>`);
    }
    return elementos;
  },
};

function contarLinhas(trecho) {
  let total = 0;
  for (const caractere of trecho) if (caractere === '\n') total += 1;
  return total;
}

/** Acha o `>` que fecha a tag, ignorando `>` dentro de valor de atributo. */
function encontrarFimDaTag(texto, inicio) {
  let dentroDeAspas = null;
  for (let i = inicio + 1; i < texto.length; i += 1) {
    const caractere = texto[i];
    if (dentroDeAspas) {
      if (caractere === dentroDeAspas) dentroDeAspas = null;
      continue;
    }
    if (caractere === '"' || caractere === "'") {
      dentroDeAspas = caractere;
      continue;
    }
    if (caractere === '>') return i;
  }
  return -1;
}

/** Todo atributo precisa de valor entre aspas — XML não aceita atributo solto. */
function verificarAtributos(trecho, erro) {
  const limpo = trecho.replace(/\/$/, '').trim();
  if (!limpo) return;

  let i = 0;
  while (i < limpo.length) {
    while (i < limpo.length && /\s/.test(limpo[i] ?? '')) i += 1;
    if (i >= limpo.length) return;

    const inicioNome = i;
    while (i < limpo.length && !/[\s=]/.test(limpo[i] ?? '')) i += 1;
    const nome = limpo.slice(inicioNome, i);
    if (!nome) return;

    while (i < limpo.length && /\s/.test(limpo[i] ?? '')) i += 1;
    if (limpo[i] !== '=') erro(`atributo "${nome}" sem valor`);
    i += 1;

    while (i < limpo.length && /\s/.test(limpo[i] ?? '')) i += 1;
    const abre = limpo[i];
    if (abre !== '"' && abre !== "'") erro(`valor do atributo "${nome}" sem aspas`);
    i += 1;

    const fim = limpo.indexOf(abre, i);
    if (fim === -1) erro(`valor do atributo "${nome}" com aspas não fechadas`);
    i = fim + 1;
  }
}
