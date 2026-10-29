import LifeLines from "@/components/LifeLines";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            LifeLines
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Family timeline animation editor
          </p>
        </div>

        <LifeLines />
      </div>
    </main>
  );
}