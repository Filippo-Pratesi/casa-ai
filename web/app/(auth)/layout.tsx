export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CasaAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Assistente AI per agenti immobiliari</p>
        </div>
        {children}
      </div>
    </div>
  )
}
