import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

/** Rota `*`. Diz o que aconteceu e oferece o caminho de volta. */
export function NaoEncontradaPage() {
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-mono-xs uppercase text-accent-strong">Erro 404</p>
      <h1 className="mt-2 font-display text-display-xl font-bold text-text">Página não existe</h1>
      <p className="mx-auto mt-3 max-w-content text-body-md text-text-muted">
        O endereço que você abriu não corresponde a nenhuma tela do Campus. Se você chegou aqui por
        um link de evento, ele pode ter sido cancelado ou estar fora do seu alcance.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link to="/">
          <Button>Voltar para o início</Button>
        </Link>
        <Link to="/eventos" className="text-body-sm text-text-muted underline hover:text-text">
          Ver eventos
        </Link>
      </div>
    </div>
  );
}
