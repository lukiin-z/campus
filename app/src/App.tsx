import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CriarEventoPage } from './pages/CriarEventoPage';
import { EventoDetalhePage } from './pages/EventoDetalhePage';
import { EventosPage } from './pages/EventosPage';
import { FeedPage } from './pages/FeedPage';
import { IngressoPage } from './pages/IngressoPage';
import { NaoEncontradaPage } from './pages/NaoEncontradaPage';
import { PerfilPage } from './pages/PerfilPage';
import { useSessao } from './hooks/useCampusData';

/**
 * Rotas do app. As sete rotas do CP4/CP5:
 * `/` feed · `/eventos` · `/eventos/:id` · `/criar` · `/perfil` ·
 * `/ingresso/:id` · `*` 404.
 *
 * `/login` e `/onboarding` (RF-001 a RF-005) e as telas administrativas
 * (RF-041, RF-043) entram nas Sprints 2 e 3 — ver docs/13-roadmap-cp5-cp6.md.
 */
export function App() {
  // Carrega a sessão uma vez e a publica na store: nenhuma tela busca o usuário
  // atual por conta própria.
  useSessao();

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/eventos" element={<EventosPage />} />
        <Route path="/eventos/:id" element={<EventoDetalhePage />} />
        <Route path="/criar" element={<CriarEventoPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/ingresso/:id" element={<IngressoPage />} />
        <Route path="*" element={<NaoEncontradaPage />} />
      </Routes>
    </AppShell>
  );
}
