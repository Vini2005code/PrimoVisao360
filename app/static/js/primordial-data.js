import { sendMessage } from "./api.js?v=20260811-1";
import { destroyChartsWithin, renderChart } from "./charts.js";

const elements = {
  contextNotice: document.querySelector("#context-notice"),
  form: document.querySelector("#chat-form"),
  input: document.querySelector("#chat-message"),
  sendButton: document.querySelector("#send-button"),
  count: document.querySelector("#character-count"),
  messages: document.querySelector("#message-list"),
  savedList: document.querySelector("#saved-list"),
  savedCount: document.querySelector("#saved-count"),
  toastRegion: document.querySelector("#toast-region"),
  tabs: [...document.querySelectorAll("[data-tab]")],
  panels: [...document.querySelectorAll(".tab-panel")],
};

const state = {
  activeTab: "chat",
  messages: [],
  savedItems: [],
  sending: false,
};

const suggestedQuestions = [
  "Quantos pacientes existem?",
  "Quais pacientes têm doenças raras?",
  "Quais pacientes têm diabetes e usam insulina?",
  "Quais medicamentos estão em uso?",
  "Quais pacientes usam suplementos?",
  "Quais pacientes têm maior risco cardiometabólico?",
];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toast(message, type = "success") {
  const node = element("div", `toast${type === "error" ? " toast--error" : ""}`, message);
  elements.toastRegion.append(node);
  window.setTimeout(() => node.remove(), 3500);
}

function createStateView(mark, title, description, action) {
  const wrapper = element("div", "state");
  const inner = element("div", "state__inner");
  inner.append(
    element("span", "state__mark", mark),
    element("strong", "", title),
    element("p", "", description),
  );
  if (action) inner.append(action);
  wrapper.append(inner);
  return wrapper;
}

function createChart(chart) {
  const card = element("section", "chart-card");
  const wrap = element("div", "chart-canvas-wrap");
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", chart.title);
  wrap.append(canvas);
  card.append(element("strong", "", chart.title), wrap);
  window.requestAnimationFrame(() => renderChart(canvas, chart));
  return card;
}

function formatColumnName(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCellValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

function createDataTable(rows) {
  const wrapper = element("div", "data-table-wrap");
  const table = element("table", "data-table");
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach((column) => headRow.append(element("th", "", formatColumnName(column))));
  head.append(headRow);
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tableRow = document.createElement("tr");
    columns.forEach((column) => tableRow.append(element("td", "", formatCellValue(row[column]))));
    body.append(tableRow);
  });
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

function createSuggestions(questions) {
  const suggestions = element("div", "suggestions");
  questions.forEach((question) => {
    const button = element("button", "button button--outline", question);
    button.type = "button";
    button.addEventListener("click", () => {
      elements.input.value = question;
      updateCharacterCount();
      elements.input.focus();
    });
    suggestions.append(button);
  });
  return suggestions;
}

function isMessageSaved(messageId) {
  return state.savedItems.some((item) => item.sourceMessageId === messageId);
}

function createMessage(message) {
  const assistant = message.role === "assistant";
  const article = element("article", `message message--${message.role}`);
  const avatar = element("span", `avatar avatar--${message.role}`, assistant ? "AI" : "DR");
  avatar.setAttribute("aria-hidden", "true");

  const messageBody = element("div", "message__body");
  const bubble = element("div", "bubble");
  bubble.append(element("p", "", message.content));
  if (message.data_rows?.length) bubble.append(createDataTable(message.data_rows));
  if (message.suggestions?.length) bubble.append(createSuggestions(message.suggestions));
  messageBody.append(bubble);
  if (message.chart_data) messageBody.append(createChart(message.chart_data));

  const meta = element("div", "message__meta");
  meta.append(element("time", "", formatDateTime(message.created_at)));
  if (assistant) {
    const saved = isMessageSaved(message.id);
    const button = element("button", "text-button", saved ? "◆ Salvo" : "◇ Salvar resposta");
    button.type = "button";
    button.disabled = saved;
    button.addEventListener("click", () => handleSave(message));
    meta.append(button);
  }
  messageBody.append(meta);
  if (assistant) article.append(avatar, messageBody);
  else article.append(messageBody, avatar);
  return article;
}

function createPendingMessage() {
  const row = element("div", "message");
  const body = element("div", "message__body");
  const meta = element("div", "message__meta");
  const dots = element("span", "loading-dots");
  dots.setAttribute("aria-label", "Consultando");
  dots.append(element("span"), element("span"), element("span"));
  meta.append(dots, document.createTextNode("Consultando o PostgreSQL em modo somente leitura..."));
  body.append(meta);
  row.append(element("span", "avatar avatar--assistant", "AI"), body);
  return row;
}

function renderMessages() {
  destroyChartsWithin(elements.messages);
  elements.messages.replaceChildren();
  elements.messages.setAttribute("aria-busy", String(state.sending));
  if (state.messages.length === 0) {
    elements.messages.append(
      createStateView(
        "✦",
        "Consulte o prontuário real",
        "Escolha uma consulta cadastrada ou escreva a pergunta com suas palavras.",
        createSuggestions(suggestedQuestions),
      ),
    );
  } else {
    state.messages.forEach((message) => elements.messages.append(createMessage(message)));
  }
  if (state.sending) elements.messages.append(createPendingMessage());
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function createSavedCard(item) {
  const card = element("article", "saved-card card");
  const heading = element("header", "saved-card__heading");
  const copy = element("span");
  copy.append(
    element("strong", "", item.title),
    element("small", "", `Salvo em ${formatDateTime(item.createdAt)}`),
  );
  heading.append(element("span", "feature-heading__mark", "◆"), copy);
  const content = element("div", "saved-card__content");
  content.append(element("p", "", item.content));
  if (item.dataRows?.length) content.append(createDataTable(item.dataRows));
  const footer = element("footer", "saved-card__footer");
  const remove = element("button", "text-button delete-button", "× Remover");
  remove.type = "button";
  remove.addEventListener("click", () => {
    state.savedItems = state.savedItems.filter((saved) => saved.id !== item.id);
    renderSavedItems();
    renderMessages();
  });
  footer.append(remove);
  card.append(heading, content, footer);
  return card;
}

function renderSavedItems() {
  destroyChartsWithin(elements.savedList);
  elements.savedList.replaceChildren();
  elements.savedCount.textContent = String(state.savedItems.length);
  elements.savedCount.hidden = state.savedItems.length === 0;
  if (state.savedItems.length === 0) {
    elements.savedList.append(
      createStateView("◇", "Nenhum conteúdo salvo", "As respostas fixadas nesta sessão aparecerão aqui."),
    );
    return;
  }
  state.savedItems.forEach((item) => elements.savedList.append(createSavedCard(item)));
}

function handleSave(message) {
  if (isMessageSaved(message.id)) return;
  state.savedItems.unshift({
    id: `saved-${crypto.randomUUID()}`,
    sourceMessageId: message.id,
    title: message.content.slice(0, 80),
    content: message.content,
    dataRows: message.data_rows,
    createdAt: new Date().toISOString(),
  });
  renderMessages();
  renderSavedItems();
  toast("Resposta salva nesta sessão.");
}

function updateComposer() {
  elements.input.disabled = state.sending;
  elements.sendButton.disabled = state.sending || elements.input.value.trim().length === 0;
}

function updateCharacterCount() {
  elements.count.textContent = `Ctrl + Enter para enviar · ${elements.input.value.length}/500`;
  updateComposer();
}

async function handleSubmit(event) {
  event.preventDefault();
  const question = elements.input.value.trim();
  if (!question || state.sending) return;
  const userMessage = {
    id: `local-${crypto.randomUUID()}`,
    role: "user",
    content: question,
    created_at: new Date().toISOString(),
  };
  state.messages.push(userMessage);
  state.sending = true;
  elements.input.value = "";
  updateCharacterCount();
  renderMessages();
  try {
    state.messages.push(await sendMessage(question));
  } catch {
    toast("Não foi possível consultar o prontuário. Tente novamente.", "error");
  } finally {
    state.sending = false;
    updateComposer();
    renderMessages();
  }
}

function setActiveTab(name) {
  state.activeTab = name;
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  elements.panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${name}`;
  });
  if (name === "saved") renderSavedItems();
}

function initializeTabs() {
  elements.tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const next = elements.tabs[(index + offset + elements.tabs.length) % elements.tabs.length];
      setActiveTab(next.dataset.tab);
      next.focus();
    });
  });
}

function initialize() {
  initializeTabs();
  elements.contextNotice.hidden = true;
  elements.form.addEventListener("submit", handleSubmit);
  elements.input.maxLength = 500;
  elements.input.addEventListener("input", updateCharacterCount);
  elements.input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      elements.form.requestSubmit();
    }
  });
  renderMessages();
  renderSavedItems();
  updateCharacterCount();
}

initialize();
