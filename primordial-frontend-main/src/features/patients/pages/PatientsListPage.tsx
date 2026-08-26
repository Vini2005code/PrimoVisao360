import { UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/app/layouts/app/PageHeader";
import { SearchInput } from "@/components/filters/SearchInput";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { normalizeText } from "@/shared/utils/formatters/normalizeText";
import PatientsListTable from "../components/list/PatientsListTable";
import { usePatientsList } from "../hooks/usePatientsList";
import { mapPatientResponseToCard } from "../mappers/mapPatientResponseToCard";

export default function PatientsListPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = usePatientsList(0, 20);

  const patientCards = useMemo(() => {
    if (!data?.content) return [];
    return data.content.map(mapPatientResponseToCard);
  }, [data]);

  const filteredPatients = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return patientCards;

    return patientCards.filter((patient) =>
      normalizeText(patient.fullName).includes(query),
    );
  }, [patientCards, search]);

  let content;

  if (isLoading) {
    content = <LoadingState description="Carregando pacientes..." />;
  } else if (isError) {
    content = <ErrorState description="Erro ao carregar pacientes." />;
  } else if (patientCards.length === 0) {
    content = (
      <EmptyState
        title="Nenhum paciente cadastrado"
        description="Comece cadastrando seu primeiro paciente no sistema."
      />
    );
  } else if (filteredPatients.length === 0) {
    content = (
      <EmptyState
        title="Nenhum paciente encontrado"
        description="Tente buscar por outro nome."
      />
    );
  } else {
    content = (
      <PatientsListTable
        patients={filteredPatients}
        totalCount={data?.totalElements ?? filteredPatients.length}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Pacientes"
        actions={
          <Button variant="accent" asChild>
            <Link to="/patients/new">
              <UserPlus />
              Adicionar paciente
            </Link>
          </Button>
        }
      />

      <div className="space-y-8">
        <SearchInput
          placeholder="Pesquisar paciente por nome"
          value={search}
          onChange={setSearch}
        />

        {content}
      </div>
    </>
  );
}
