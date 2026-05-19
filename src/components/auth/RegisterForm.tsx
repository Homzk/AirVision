import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/authStore'

export function RegisterForm() {
  const navigate = useNavigate()
  const signUp = useAuthStore((s) => s.signUp)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    const result = await signUp(email, password)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.needsConfirmation) {
      toast.info('Revisa tu correo para confirmar la cuenta.')
      navigate('/login')
      return
    }
    toast.success('Cuenta creada. Bienvenido a AirVision.')
    navigate('/')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="register-confirm" className="text-sm font-medium">
          Confirmar contraseña
        </label>
        <input
          id="register-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
