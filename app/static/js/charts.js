const COLORS = ["#014c69", "#e78024", "#2f9892", "#755da8", "#c2473d", "#5d7f3f"];
const instances = new WeakMap();

function dataset(chart) {
  if (chart.type === "pie" || chart.type === "doughnut") {
    return {
      label: chart.title,
      data: chart.values,
      backgroundColor: chart.values.map((_, index) => COLORS[index % COLORS.length]),
      borderColor: "#ffffff",
      borderWidth: 2,
    };
  }
  return {
    label: chart.title,
    data: chart.values,
    backgroundColor: "rgba(1, 76, 105, 0.16)",
    borderColor: COLORS[0],
    borderWidth: 2,
    pointBackgroundColor: COLORS[1],
    tension: 0.3,
  };
}

function options(type) {
  const radial = type === "pie" || type === "doughnut";
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? false
      : undefined,
    plugins: {
      legend: { display: radial, position: "bottom" },
      tooltip: { intersect: false },
    },
    scales: radial
      ? undefined
      : {
          x: { grid: { display: false } },
          y: { beginAtZero: true },
        },
  };
}

export function renderChart(canvas, chart) {
  if (!window.Chart) {
    canvas.replaceWith(document.createTextNode("Gráfico temporariamente indisponível."));
    return;
  }
  const current = instances.get(canvas);
  if (current) current.destroy();
  const instance = new window.Chart(canvas, {
    type: chart.type,
    data: { labels: chart.labels, datasets: [dataset(chart)] },
    options: options(chart.type),
  });
  instances.set(canvas, instance);
}

export function destroyChartsWithin(container) {
  container.querySelectorAll("canvas").forEach((canvas) => {
    const instance = instances.get(canvas);
    if (instance) instance.destroy();
    instances.delete(canvas);
  });
}

