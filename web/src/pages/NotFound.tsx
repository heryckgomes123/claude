import { Link } from 'react-router-dom';
import { Empty } from '../components/ui';
import { Medallion } from '../brand/Logo';

export default function NotFound() {
  return (
    <div className="page">
      <Empty icon={<Medallion size={120} />} title="Essa porta não leva a lugar nenhum" action={<Link to="/" className="btn btn--primary">Voltar à Toca</Link>}>
        O corredor está escuro e o javali não reconhece este caminho.
      </Empty>
    </div>
  );
}
