# Protótipo estático original (preservado)

Este é o protótipo HTML/CSS/JS puro que originou a identidade visual do Campus,
mantido intacto para referência histórica e como prova da evolução do produto.

| Arquivo | O que é |
|---|---|
| `index.html` | Protótipo navegável de 5 telas (feed, eventos, criar, detalhe, perfil), sem build nem dependências |
| `README-original.md` | README original do repositório, escrito na fase de protótipo |

## Por que foi preservado

O `index.html` é a **referência visual obrigatória** do projeto. A identidade do app
React em [`../../app/`](../../app/) é a evolução direta dele — mesma paleta, mesma
tipografia e o mesmo elemento de assinatura (o **cartão-ingresso picotado**), agora
formalizados como design tokens em
[`docs/06-marca/identidade-visual.md`](../../docs/06-marca/identidade-visual.md) e
implementados em `app/tailwind.config.ts`.

## Como abrir

Abra `index.html` direto no navegador — não precisa de servidor, build ou instalação.
Publicado também no GitHub Pages em `/prototipo/` (ver `deploy-pages.yml`).

## O que mudou do protótipo para o app React

| Aspecto | Protótipo (aqui) | App React (`app/`) |
|---|---|---|
| Dados | Fixos no HTML | Seed tipado + repositórios + MSW interceptando HTTP |
| Navegação | `display:none` por aba | React Router com rotas reais e 404 |
| Estilo | Variáveis CSS soltas | Design tokens no `tailwind.config.ts` |
| Componentes | Classes CSS repetidas | Componentes React tipados em `src/components/ui/` |
| Validação de formulário | Nenhuma | Zod + React Hook Form |
| Estado | Variável global `lastTab` | Zustand (sessão/UI) + TanStack Query (dados) |
| Teste | Nenhum | Vitest + Testing Library + Playwright |
| Imagens | URLs externas (Unsplash, pravatar) | Capas geradas em SVG/gradiente local, sem dependência de rede |
