function assertObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Resposta inválida: ${field}`);
  }
  return value;
}

function assertKeys(value, allowed, field) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) throw new Error(`Resposta inválida: ${field}`);
}

function assertString(value, field, maximum = 4000) {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(`Resposta inválida: ${field}`);
  }
  return value;
}

function normalizeDataRows(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("Resposta inválida: dados");
  }
  return value.map((rawRow) => {
    const row = assertObject(rawRow, "registro");
    const normalized = {};
    Object.entries(row).forEach(([key, item]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(key)) {
        throw new Error("Resposta inválida: coluna");
      }
      if (item == null || ["string", "number", "boolean"].includes(typeof item)) {
        normalized[key] = item;
      } else {
        normalized[key] = JSON.stringify(item);
      }
    });
    return normalized;
  });
}

function normalizeSuggestions(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 10) {
    throw new Error("Resposta inválida: sugestões");
  }
  return value.map((item) => assertString(item, "sugestão", 200));
}

export async function sendMessage(message) {
  const question = assertString(message, "pergunta", 500);
  const httpResponse = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": crypto.randomUUID(),
      "X-Requested-With": "PrimordialDATA",
    },
    body: JSON.stringify({ pergunta: question }),
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
  });
  if (!httpResponse.ok) {
    throw new Error(`Serviço indisponível (${httpResponse.status}).`);
  }

  const response = assertObject(await httpResponse.json(), "chat");
  assertKeys(response, ["pergunta", "resposta"], "chat");
  assertString(response.pergunta, "pergunta", 500);
  const answer = assertObject(response.resposta, "resposta");
  assertKeys(answer, ["tipo", "mensagem", "dados", "sugestoes"], "resposta");

  return {
    id: `database-${crypto.randomUUID()}`,
    role: "assistant",
    content: assertString(answer.mensagem, "mensagem", 1000),
    created_at: new Date().toISOString(),
    data_rows: normalizeDataRows(answer.dados),
    suggestions: normalizeSuggestions(answer.sugestoes),
  };
}
