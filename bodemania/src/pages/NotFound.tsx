import { Link } from '../router'
import { Goat } from '../components/ProductArt'

export default function NotFound() {
  return (
    <div className="wrap flex flex-col items-center py-20 text-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28" aria-hidden>
        <Goat fill="#0d1a2b" eye="#f4e7c4" />
      </svg>
      <h1 className="display mt-6 text-4xl font-semibold">Ih, o bode se perdeu.</h1>
      <p className="mt-2 text-mute">Esta página não existe ou mudou de lugar.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/" className="btn btn-primary">
          Voltar ao início
        </Link>
        <Link to="/loja" className="btn btn-ghost">
          Ver a loja
        </Link>
      </div>
    </div>
  )
}
