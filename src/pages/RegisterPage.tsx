import { Link } from 'react-router-dom'

import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Guarda tus estaciones favoritas y recibe alertas configurables.
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700">
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}
