import { getMetadataOptions } from "./metadata.service";
import type { MetadataKey, MetadataOption } from "./types";

// Mapa central que relaciona uma chave de metadata com a função que busca os dados no backend
// Evita múltiplos services e centraliza todas as rotas de metadata
// Cada chave retorna uma função que chama o service genérico com o endpoint correto
export const metadataRegistry: Record<
  MetadataKey,
  () => Promise<MetadataOption[]>
> = {
  gender: () => getMetadataOptions("/metadata/gender"),
  raceColor: () => getMetadataOptions("/metadata/race-colors"),
  maritalStatus: () => getMetadataOptions("/metadata/marital-status"),
  religion: () => getMetadataOptions("/metadata/religion"),
  educationLevel: () => getMetadataOptions("/metadata/education-level"),
  referralSource: () => getMetadataOptions("/metadata/referral-source"),
  sex: () => getMetadataOptions("/metadata/sex"),
  relationship: () => getMetadataOptions("/metadata/relationship"),
};
