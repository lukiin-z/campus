#!/usr/bin/env bash
# =============================================================================
# criar-quadro.sh — cria o quadro do Campus no Trello pela API REST
# =============================================================================
#
# O script NÃO tem dado de card embutido: ele lê tudo de trello-import.json, que
# fica neste mesmo diretório e é a fonte da verdade (mesmo arquivo usado por
# quadro.md e criar-quadro.md). Cria, nesta ordem: quadro -> 7 listas -> 18
# labels -> 32 cards (Sprint 1 já em Done, Sprint 2 e 3 nas listas do pacote) ->
# 11 checklists -> atribuição de membros.
#
# -----------------------------------------------------------------------------
# COMO OBTER A KEY E O TOKEN
# -----------------------------------------------------------------------------
# 1) Logado no Trello, abra https://trello.com/power-ups/admin
#    -> "Novo"/"New" -> crie um Power-Up qualquer (nome sugerido: campus-cli)
#    -> aba "API key" -> "Generate a new API key" -> copie a Key.
#
# 2) Na mesma aba clique em "Token", ou abra a URL abaixo trocando SUA_KEY:
#    https://trello.com/1/authorize?expiration=1day&name=campus-cli&scope=read,write&response_type=token&key=SUA_KEY
#    Autorize e copie o token exibido.
#
# 3) Exporte no seu shell — nunca dentro de arquivo do repositório:
#      export TRELLO_KEY='sua-key'
#      export TRELLO_TOKEN='seu-token'
#
# 4) Rode primeiro em seco, depois de verdade:
#      bash criar-quadro.sh --dry-run
#      bash criar-quadro.sh
#
# -----------------------------------------------------------------------------
# AVISO DE SEGURANÇA
# -----------------------------------------------------------------------------
# O token dá acesso de LEITURA E ESCRITA a todos os seus quadros do Trello.
#   * NUNCA comite key ou token. Nunca cole em issue, PR, print ou slide.
#   * Use expiration=1day ao gerar o token deste script.
#   * Revogue depois de usar: https://trello.com/my/account -> tokens de API.
#   * Se vazar, revogue imediatamente e gere outro.
# Este script só recebe credencial por variável de ambiente, e por isso não há
# nenhum lugar onde escrever a sua — de propósito.
# =============================================================================

set -euo pipefail

# --- Bloco 1: constantes e modo de execução ---------------------------------
# EXECUTAR=0 significa --dry-run: imprime a chamada e não toca no Trello.
API='https://api.trello.com/1'
EXECUTAR=1
DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACOTE="$DIR_SCRIPT/trello-import.json"
CONTADOR_FAKE=0

case "${1:-}" in
  --dry-run) EXECUTAR=0 ;;
  --help|-h)
    printf 'uso: %s [--dry-run]\n' "$(basename "$0")"
    printf '  --dry-run   imprime o que faria, sem criar nada no Trello\n'
    exit 0
    ;;
  '') : ;;
  *) printf 'argumento desconhecido: %s (use --help)\n' "$1" >&2; exit 2 ;;
esac

# --- Bloco 2: funções de erro e de aviso ------------------------------------
erro()  { printf '\nERRO: %s\n' "$*" >&2; exit 1; }
aviso() { printf 'aviso: %s\n' "$*" >&2; }
passo() { printf '\n==> %s\n' "$*"; }

# --- Bloco 3: checagem de dependências --------------------------------------
# curl faz as chamadas; jq lê o pacote JSON. Sem um dos dois, para aqui.
for dep in curl jq base64; do
  command -v "$dep" >/dev/null 2>&1 || erro "dependência ausente: $dep. Instale antes de rodar."
done
[[ -r "$PACOTE" ]] || erro "pacote não encontrado ou ilegível: $PACOTE"
jq -e . "$PACOTE" >/dev/null 2>&1 || erro "trello-import.json não é JSON válido."

# --- Bloco 4: checagem de credenciais ---------------------------------------
# Em execução real, key e token são obrigatórios. Em --dry-run seguimos sem
# credencial, justamente para poder testar o roteiro sem gerar token.
if [[ $EXECUTAR -eq 1 ]]; then
  [[ -n "${TRELLO_KEY:-}"   ]] || erro "TRELLO_KEY vazia. Exporte a variável de ambiente (veja o cabeçalho deste arquivo). Não escreva a key no script."
  [[ -n "${TRELLO_TOKEN:-}" ]] || erro "TRELLO_TOKEN vazio. Exporte a variável de ambiente (veja o cabeçalho deste arquivo). Não escreva o token no script."
else
  [[ -n "${TRELLO_KEY:-}" && -n "${TRELLO_TOKEN:-}" ]] || aviso "--dry-run sem TRELLO_KEY/TRELLO_TOKEN: nenhuma chamada será feita mesmo."
fi

# --- Bloco 5: wrapper do curl ----------------------------------------------
# Uso: api POST /cards --data-urlencode 'name=...' ...
# --fail       -> HTTP >= 400 vira código de saída != 0 (e o set -e derruba o script)
# --silent --show-error -> sem barra de progresso, mas com a mensagem de erro
# key e token vão no CORPO por --data-urlencode, não na URL: token em query
# string acaba em log de proxy e em histórico de shell.
api() {
  local metodo="$1" caminho="$2"; shift 2
  if [[ $EXECUTAR -eq 0 ]]; then
    # Em seco: mostra a chamada com o token redigido e devolve um id sintético
    # para os passos seguintes continuarem coerentes.
    local resumo=()
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --data-urlencode) resumo+=("$(printf '%.90s' "$2")"); shift 2 ;;
        *) shift ;;
      esac
    done
    printf '   [seco] %-4s %-28s %s\n' "$metodo" "$caminho" "$(printf '%s | ' "${resumo[@]}")" >&2
    CONTADOR_FAKE=$((CONTADOR_FAKE + 1))
    printf 'dry%021d' "$CONTADOR_FAKE"
    return 0
  fi
  curl --fail --silent --show-error --location \
    --request "$metodo" "${API}${caminho}" \
    --data-urlencode "key=${TRELLO_KEY}" \
    --data-urlencode "token=${TRELLO_TOKEN}" \
    "$@"
}

# Extrai o campo id da resposta. Em seco, a resposta já é o id sintético.
api_id() {
  local saida; saida="$(api "$@")"
  if [[ $EXECUTAR -eq 0 ]]; then printf '%s' "$saida"; return 0; fi
  printf '%s' "$saida" | jq -r '.id'
}

# --- Bloco 6: funções de criação -------------------------------------------
# Uma função por recurso, todas usando --data-urlencode para que acento,
# espaço, quebra de linha e "·" cheguem intactos ao Trello.

criar_quadro() { # nome, descricao
  api_id POST /boards \
    --data-urlencode "name=$1" \
    --data-urlencode "desc=$2" \
    --data-urlencode 'defaultLists=false' \
    --data-urlencode 'prefs_background=orange' \
    --data-urlencode 'prefs_permissionLevel=org' \
    --data-urlencode 'prefs_cardCovers=true'
}

criar_lista() { # id_quadro, nome, pos
  api_id POST /lists \
    --data-urlencode "idBoard=$1" \
    --data-urlencode "name=$2" \
    --data-urlencode "pos=$3"
}

criar_label() { # id_quadro, nome, cor
  api_id POST /labels \
    --data-urlencode "idBoard=$1" \
    --data-urlencode "name=$2" \
    --data-urlencode "color=$3"
}

criar_card() { # id_lista, nome, descricao, pos, due (ISO ou vazio)
  api_id POST /cards \
    --data-urlencode "idList=$1" \
    --data-urlencode "name=$2" \
    --data-urlencode "desc=$3" \
    --data-urlencode "pos=$4" \
    --data-urlencode "due=$5"
}

aplicar_label() { # id_card, id_label
  api POST "/cards/$1/idLabels" --data-urlencode "value=$2" >/dev/null
}

criar_checklist() { # id_card, nome
  api_id POST /checklists \
    --data-urlencode "idCard=$1" \
    --data-urlencode "name=$2"
}

criar_item() { # id_checklist, nome, checked(true|false), pos
  api POST "/checklists/$1/checkItems" \
    --data-urlencode "name=$2" \
    --data-urlencode "checked=$3" \
    --data-urlencode "pos=$4" >/dev/null
}

# --- Bloco 7: mapas de id sintético -> id real ------------------------------
# O pacote usa ids fixos de 24 hex (ex: 6511a1000000000000000001) só para
# amarrar as referências. Aqui traduzimos cada um para o id que o Trello devolve.
declare -A ID_LISTA ID_LABEL ID_CARD

# --- Bloco 8: cria o quadro -------------------------------------------------
NOME_QUADRO="$(jq -r '.name' "$PACOTE")"
DESC_QUADRO="$(jq -r '.desc' "$PACOTE")"

passo "Criando o quadro: $NOME_QUADRO"
ID_QUADRO="$(criar_quadro "$NOME_QUADRO" "$DESC_QUADRO")"
printf '    quadro: %s\n' "$ID_QUADRO"

# --- Bloco 9: cria as 7 listas na ordem do pacote ---------------------------
passo "Criando as listas"
while IFS= read -r registro; do
  linha="$(printf '%s' "$registro" | base64 --decode)"
  id_antigo="$(printf '%s' "$linha" | jq -r '.id')"
  nome="$(printf '%s' "$linha" | jq -r '.name')"
  pos="$(printf '%s' "$linha" | jq -r '.pos')"
  novo="$(criar_lista "$ID_QUADRO" "$nome" "$pos")"
  ID_LISTA["$id_antigo"]="$novo"
  printf '    lista %-16s -> %s\n' "$nome" "$novo"
done < <(jq -r '.lists | sort_by(.pos) | .[] | @base64' "$PACOTE")

# --- Bloco 10: cria as 18 labels -------------------------------------------
# 11 de módulo (mod:) e 7 de tipo (tipo:). A cor vem do pacote, com as chaves
# aceitas pela API (green, sky_dark, black_light, ...).
passo "Criando as labels"
while IFS= read -r registro; do
  linha="$(printf '%s' "$registro" | base64 --decode)"
  id_antigo="$(printf '%s' "$linha" | jq -r '.id')"
  nome="$(printf '%s' "$linha" | jq -r '.name')"
  cor="$(printf '%s' "$linha" | jq -r '.color')"
  novo="$(criar_label "$ID_QUADRO" "$nome" "$cor")"
  ID_LABEL["$id_antigo"]="$novo"
  printf '    label %-22s %-14s -> %s\n' "$nome" "$cor" "$novo"
done < <(jq -r '.labels[] | @base64' "$PACOTE")

# --- Bloco 11: cria os 32 cards --------------------------------------------
# Ordem: lista por lista (pela pos da lista), card por card (pela pos do card).
# Os cards da Sprint 1 já nascem em Done, porque o CP4 está entregue.
passo "Criando os cards"
total_cards=0
while IFS= read -r registro_lista; do
  linha_lista="$(printf '%s' "$registro_lista" | base64 --decode)"
  id_lista_antigo="$(printf '%s' "$linha_lista" | jq -r '.id')"
  nome_lista="$(printf '%s' "$linha_lista" | jq -r '.name')"
  id_lista_novo="${ID_LISTA[$id_lista_antigo]}"

  while IFS= read -r registro; do
    linha="$(printf '%s' "$registro" | base64 --decode)"
    id_antigo="$(printf '%s' "$linha" | jq -r '.id')"
    nome="$(printf '%s' "$linha" | jq -r '.name')"
    desc="$(printf '%s' "$linha" | jq -r '.desc')"
    pos="$(printf '%s' "$linha" | jq -r '.pos')"
    due="$(printf '%s' "$linha" | jq -r '.due // ""')"

    novo="$(criar_card "$id_lista_novo" "$nome" "$desc" "$pos" "$due")"
    ID_CARD["$id_antigo"]="$novo"
    total_cards=$((total_cards + 1))

    # As duas labels do card, traduzidas pelo mapa do bloco 10.
    while IFS= read -r id_label_antigo; do
      aplicar_label "$novo" "${ID_LABEL[$id_label_antigo]}"
    done < <(printf '%s' "$linha" | jq -r '.idLabels[]')

    printf '    [%-14s] %s\n' "$nome_lista" "$(printf '%.72s' "$nome")"
  done < <(jq -r --arg l "$id_lista_antigo" '.cards | map(select(.idList == $l)) | sort_by(.pos) | .[] | @base64' "$PACOTE")
done < <(jq -r '.lists | sort_by(.pos) | .[] | @base64' "$PACOTE")

# --- Bloco 12: cria as checklists ------------------------------------------
# 11 cards têm subtarefas. O estado (complete/incomplete) é preservado, então a
# Sprint 1 chega com as checklists marcadas.
passo "Criando as checklists"
while IFS= read -r registro; do
  linha="$(printf '%s' "$registro" | base64 --decode)"
  id_card_antigo="$(printf '%s' "$linha" | jq -r '.idCard')"
  nome="$(printf '%s' "$linha" | jq -r '.name')"
  id_card_novo="${ID_CARD[$id_card_antigo]}"
  id_checklist="$(criar_checklist "$id_card_novo" "$nome")"

  while IFS= read -r item_registro; do
    item="$(printf '%s' "$item_registro" | base64 --decode)"
    item_nome="$(printf '%s' "$item" | jq -r '.name')"
    item_pos="$(printf '%s' "$item" | jq -r '.pos')"
    marcado=false
    [[ "$(printf '%s' "$item" | jq -r '.state')" == 'complete' ]] && marcado=true
    criar_item "$id_checklist" "$item_nome" "$marcado" "$item_pos"
  done < <(printf '%s' "$linha" | jq -r '.checkItems | sort_by(.pos) | .[] | @base64')

  printf '    checklist em %s (%s itens)\n' "$id_card_novo" "$(printf '%s' "$linha" | jq -r '.checkItems | length')"
done < <(jq -r '.checklists[] | @base64' "$PACOTE")

# --- Bloco 13: convida os membros e atribui os cards ------------------------
# Os usernames do pacote são provisórios (ver quadro.md §3). O script tenta
# resolver cada um; se o Trello não conhecer o username, avisa e segue — a
# atribuição fica para a tabela da §7 de criar-quadro.md.
passo "Convidando membros e atribuindo cards"
declare -A ID_MEMBRO
while IFS= read -r registro; do
  linha="$(printf '%s' "$registro" | base64 --decode)"
  id_antigo="$(printf '%s' "$linha" | jq -r '.id')"
  usuario="$(printf '%s' "$linha" | jq -r '.username')"
  nome="$(printf '%s' "$linha" | jq -r '.fullName')"
  tipo="$(printf '%s' "$linha" | jq -r '.memberType')"

  if [[ $EXECUTAR -eq 0 ]]; then
    printf '   [seco] GET  /members/%-18s -> resolveria o id de %s\n' "$usuario" "$nome" >&2
    ID_MEMBRO["$id_antigo"]="dryMembro-$usuario"
    continue
  fi

  # Único GET do script. Aqui key e token vão em query string (-G), o que é
  # inevitável no GET; a chamada é sobre TLS e não grava nada em disco.
  if id_real="$(curl --fail --silent --show-error -G "${API}/members/${usuario}" \
        --data-urlencode "key=${TRELLO_KEY}" \
        --data-urlencode "token=${TRELLO_TOKEN}" \
        --data-urlencode 'fields=id' | jq -r '.id')"; then
    ID_MEMBRO["$id_antigo"]="$id_real"
    api PUT "/boards/${ID_QUADRO}/members/${id_real}" \
      --data-urlencode "type=$([[ "$tipo" == 'admin' ]] && printf 'admin' || printf 'normal')" >/dev/null
    printf '    membro %-22s -> %s\n' "$nome" "$id_real"
  else
    aviso "username '$usuario' não resolvido no Trello — atribua $nome à mão (criar-quadro.md §7)."
  fi
done < <(jq -r '.members[] | @base64' "$PACOTE")

# Atribuição: primeiro membro do card é o responsável.
while IFS= read -r registro; do
  linha="$(printf '%s' "$registro" | base64 --decode)"
  id_card_antigo="$(printf '%s' "$linha" | jq -r '.id')"
  id_card_novo="${ID_CARD[$id_card_antigo]}"
  while IFS= read -r id_membro_antigo; do
    id_membro_novo="${ID_MEMBRO[$id_membro_antigo]:-}"
    [[ -n "$id_membro_novo" ]] || continue
    api POST "/cards/${id_card_novo}/idMembers" --data-urlencode "value=${id_membro_novo}" >/dev/null
  done < <(printf '%s' "$linha" | jq -r '.idMembers[]')
done < <(jq -r '.cards[] | @base64' "$PACOTE")

# --- Bloco 14: resumo -------------------------------------------------------
passo 'Resumo'
printf '    quadro .......: %s\n' "$ID_QUADRO"
printf '    listas .......: %s\n' "$(jq -r '.lists | length' "$PACOTE")"
printf '    labels .......: %s\n' "$(jq -r '.labels | length' "$PACOTE")"
printf '    cards ........: %s\n' "$total_cards"
printf '    checklists ...: %s (%s itens)\n' \
  "$(jq -r '.checklists | length' "$PACOTE")" \
  "$(jq -r '[.checklists[].checkItems | length] | add' "$PACOTE")"

if [[ $EXECUTAR -eq 0 ]]; then
  printf '\nExecução em seco: nada foi criado no Trello. Rode sem --dry-run para valer.\n'
else
  printf '\nPronto. Agora, à mão (a API não cobre ou não vale a pena automatizar):\n'
  printf '  1. Power-Up Campos personalizados -> campo numérico "Pontos" (valores na §7 de criar-quadro.md).\n'
  printf '  2. Conferir os 8 itens de validação da §10 de criar-quadro.md.\n'
  printf '  3. Print do quadro em uso -> docs/09-trello/evidencia.png (requisitos na §7.6 de quadro.md).\n'
  printf '  4. Revogar o token: https://trello.com/my/account\n'
fi
