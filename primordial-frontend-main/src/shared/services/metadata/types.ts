// Define o formato padrão usado no frontend para opções de metadata
export type MetadataOption = {
  value: string;
  label: string;
};

// Define o formato da resposta vinda do backend (antes de ser transformada para MetadataOption)
export type MetadataApiResponse = {
  code: string;
  label: string;
};

// Define todas as chaves válidas de metadata no sistema
// Usado para garantir tipagem segura no registry e nos hooks
export type MetadataKey =
  | "gender"
  | "raceColor"
  | "maritalStatus"
  | "religion"
  | "educationLevel"
  | "referralSource"
  | "sex"
  | "relationship";
