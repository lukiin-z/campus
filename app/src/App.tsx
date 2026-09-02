import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';
import { CheckinPage } from './pages/CheckinPage';
import { CriarEventoPage } from './pages/CriarEventoPage';
import { EventoDetalhePage } from './pages/EventoDetalhePage';
import { EventosPage } from './pages/EventosPage';
import { FeedPage } from './pages/FeedPage';
import { IngressoPage } from './pages/IngressoPage';
import { LoginPage } from './pages/LoginPage';
import { NaoEncontradaPage } from './pages/NaoEncontradaPage';
import { NotificacoesPage } from './pages/NotificacoesPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { PagamentoPage } from './pages/PagamentoPage';
import { PerfilPage } from './pages/PerfilPage';
import { SkeletonLista } from './components/ui/Feedback';
import { obterToken } from './services';
import { useSessao } from './hooks/useCampusData';
import { useSessionStore } from './store/session';
import { onboardingPendente } from '@campus/shared';

/**
 * Rotas do app — 12 no CP5.
 *
 * Públicas: `/login`. Protegidas: todas as outras.
 * `/onboarding` é um caso próprio: exige sessão, mas é o único destino
 * permitido enquanto o vínculo com a turma não estiver resolvido (RF-005).
 *
 * Ver docs/05-modelagem/ para os fluxos e docs/02-requisitos.md para o mapa
 * rota → RF.
 */
export function App() {
  // Carrega a sessão uma vez e a publica na store: nenhuma tela busca o usuário
  // atual por conta própria.
  useSessao();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/onboarding"
        element={
          <ExigeSessao permitirSemVinculo>
            <OnboardingPage />
          </ExigeSessao>
        }
      />

      <Route
        path="/*"
        element={
          <ExigeSessao>
            <AppShell>
              <Routes>
                <Route path="/" element={<FeedPage />} />
                <Route path="/eventos" element={<EventosPage />} />
                <Route path="/eventos/:id" element={<EventoDetalhePage />} />
                <Route path="/eventos/:id/checkin" element={<CheckinPage />} />
                <Route path="/criar" element={<CriarEventoPage />} />
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/notificacoes" element={<NotificacoesPage />} />
                <Route path="/ingresso/:id" element={<IngressoPage />} />
                <Route path="/pagamento/:participacaoId" element={<PagamentoPage />} />
                <Route path="*" element={<NaoEncontradaPage />} />
              </Routes>
            </AppShell>
          </ExigeSessao>
        }
      />
    </Routes>
  );
}

/**
 * Guarda de rota.
 *
 * Três estados, não dois: sem token vai direto para o login; com token e sessão
 * ainda em voo mostra esqueleto; com sessão resolvida decide. Tratar "carregando"
 * como "não autenticado" faria o F5 em qualquer rota profunda piscar o login e
 * perder o destino — e `state.de` é o que devolve a pessoa para onde ela estava.
 */
function ExigeSessao({
  children,
  permitirSemVinculo = false,
}: {
  children: ReactNode;
  permitirSemVinculo?: boolean;
}) {
  const sessao = useSessionStore((s) => s.sessao);
  const resolvida = useSessionStore((s) => s.resolvida);
  const local = useLocation();

  if (!obterToken()) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  if (!sessao) {
    if (!resolvida) {
      return (
        <div className="mx-auto max-w-content px-5 py-16">
          <SkeletonLista itens={3} />
        </div>
      );
    }
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  if (!permitirSemVinculo && onboardingPendente(sessao.usuario)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
