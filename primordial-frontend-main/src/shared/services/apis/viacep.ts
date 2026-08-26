export type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
};

export async function fetchAddressByCEP(
  cepDigits: string,
  signal?: AbortSignal,
): Promise<ViaCepResponse> {
  const cep = cepDigits.replace(/\D/g, "");
  if (cep.length !== 8) {
    throw new Error("CEP inválido (precisa ter 8 dígitos).");
  }

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });

  if (!res.ok) {
    throw new Error("Falha ao consultar o ViaCEP.");
  }

  const data = (await res.json()) as ViaCepResponse;
  return data;
}
