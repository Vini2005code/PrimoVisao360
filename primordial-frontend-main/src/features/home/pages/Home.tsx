import PageHeader from "@/app/layouts/app/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import ModuleCard from "@/features/home/components/ModuleCard";
import { homeModules } from "@/features/home/data/homeModules";

export default function Home() {
  return (
    <>
      <PageHeader
        title="Bem-vindo ao Primordial"
        description="Selecione um módulo para começar"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {homeModules.map((module) => (
          <ModuleCard key={module.to} {...module} />
        ))}
      </div>

      <div className="mt-10 space-y-4">
        <PageHeader
          title="Estados de interface"
          description="Exemplos visuais base para empty, error e loading"
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <EmptyState
            title="Nenhum convênio cadastrado"
            description="Adicione um convênio para visualizar as informações nesta seção."
            action={<Button variant="outline">Adicionar convênio</Button>}
          />

          <ErrorState
            title="Erro ao carregar convênios"
            description="Não foi possível buscar os dados no momento. Tente novamente."
            onRetry={() => {}}
          />

          <LoadingState
            title="Carregando convênios"
            description="Aguarde enquanto os dados do paciente são carregados."
          />
        </div>
      </div>
    </>
  );
}
