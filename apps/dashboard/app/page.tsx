export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Kitro</p>
      <h1 className="max-w-xl text-center text-4xl font-semibold tracking-tight">
        Treasury agent for the XRP Ledger
      </h1>
      <p className="max-w-xl text-center text-lg text-muted-foreground">
        The agent proposes. The policy service and the ledger dispose.
      </p>
      <p className="text-sm text-muted-foreground">
        Scaffold is ready. Start with docs/BUILD_PLAN.md.
      </p>
    </main>
  );
}
