import { Link } from 'react-router-dom'

import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accede a tus estaciones favoritas y alertas.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-medium text-orange-600 hover:text-orange-700">
          Regístrate
        </Link>
      </p>
    </section>
  )
}
