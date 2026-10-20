import React from 'react';
import { cn } from '@/lib/utils';

export default function App(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <main className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
        <header className="mb-6 border-b border-border pb-4">
          <span className="inline-block rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            GEPF Agroindústria
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            SGMS — Gestão de Sopradoras
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistema Local de Apontamentos & Eficiência Operacional
          </p>
        </header>

        <section className="space-y-4">
          <div className="rounded-lg bg-secondary/50 p-4 text-sm text-secondary-foreground">
            <p className="font-medium text-foreground">Ambiente Base Inicializado</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Vite + React 18 + TypeScript + Tailwind CSS configurados com tokens corporativos e suporte a telas industriais.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border p-2">
              <span className="font-semibold text-foreground">Rede LAN:</span> Ativa (:5173)
            </div>
            <div className="rounded border border-border p-2">
              <span className="font-semibold text-foreground">Alvos Touch:</span> ≥ 44px
            </div>
          </div>

          <button
            type="button"
            className={cn(
              'inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-primary px-4 py-2.5',
              'text-sm font-semibold text-primary-foreground shadow transition-colors',
              'hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'active:scale-[0.99] touch-manipulation'
            )}
          >
            Acessar Sistema
          </button>
        </section>
      </main>
    </div>
  );
}
