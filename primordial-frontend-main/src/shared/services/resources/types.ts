export type ResourceOption = {
  value: string;
  label: string;
};
export type OccupationApiResponse = {
  id: number;
  code: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type NationalityApiResponse = {
  id: number;
  code: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type MunicipalityApiResponse = {
  id: number;
  code: string | null;
  name: string;
  uf: string;
  createdAt: string;
  updatedAt: string;
};

export type HealthInsuranceOperatorApiResponse = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};
