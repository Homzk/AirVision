import { Plus } from 'lucide-react'
import { useState } from 'react'

import { AlertForm } from '@/components/alerts/AlertForm'
import { AlertHistory } from '@/components/alerts/AlertHistory'
import { AlertList } from '@/components/alerts/AlertList'
import { AuthGate } from '@/components/auth/AuthGate'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAlerts } from '@/hooks/useAlerts'
import { useStations } from '@/hooks/useStations'
import { cn } from '@/lib/utils'

export default function AlertsPage() {
  return (
    <AuthGate>
      <AlertsContent />
    </AuthGate>
  )
}

function AlertsContent() {
  const { isLoading: alertsLoading, error: alertsError, canCreateMore } = useAlerts()
  const { stations, isLoading: stationsLoading, error: stationsError } = useStations()
  const [tab, setTab] = useState<'alerts' | 'history'>('alerts')
  const [isFormOpen, setFormOpen] = useState(false)

  if (alertsLoading || stationsLoading) {
    return <LoadingState message="Cargando alertas…" />
  }
  if (alertsError) {
    return <ErrorState message={alertsError.message} />
  }
  if (stationsError) {
    return <ErrorState message={stationsError.message} />
  }

  const stationsById = Object.fromEntries(stations.map((s) => [s.id, s]))

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'alerts'
              ? 'Configura cuándo quieres ser notificado por valores fuera de rango.'
              : 'Últimos 20 disparos registrados.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={!canCreateMore}
          title={
            !canCreateMore ? 'Máximo 5 alertas. Elimina una existente para crear otra.' : undefined
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-orange-600/40 px-3 py-1.5 text-sm font-medium text-orange-600 transition-colors hover:border-orange-600 hover:bg-orange-600/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Nueva alerta
        </button>
      </div>

      <div
        role="tablist"
        className="mt-6 inline-flex rounded-full border border-border bg-muted/40 p-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'alerts'}
          onClick={() => setTab('alerts')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            tab === 'alerts'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Mis alertas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => setTab('history')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            tab === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Historial
        </button>
      </div>

      <div className="mt-6">
        {tab === 'alerts' && <AlertList stationsById={stationsById} />}
        {tab === 'history' && <AlertHistory stationsById={stationsById} />}
      </div>

      {isFormOpen && <AlertFormDialog onClose={() => setFormOpen(false)} />}
    </section>
  )
}

function AlertFormDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[1010] bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear alerta"
        className="fixed left-1/2 top-1/2 z-[1020] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-2xl"
      >
        <h2 className="mb-4 text-lg font-semibold">Nueva alerta</h2>
        <AlertForm onClose={onClose} />
      </div>
    </>
  )
}
