import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import type { PatientVision360Chart } from "../../types/patientVision360.types";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
);

const CHART_COLORS = [
  "#014c69",
  "#e78024",
  "#2f9892",
  "#755da8",
  "#c2473d",
  "#5d7f3f",
];

type PatientVision360ChartProps = {
  chart: PatientVision360Chart;
};

export default function PatientVision360ChartView({
  chart,
}: PatientVision360ChartProps) {
  const barData: ChartData<"bar", number[], string> = {
    labels: chart.labels,
    datasets: [
      {
        label: chart.title,
        data: chart.values,
        backgroundColor: "rgba(1, 76, 105, 0.18)",
        borderColor: CHART_COLORS[0],
        borderWidth: 2,
      },
    ],
  };

  const lineData: ChartData<"line", number[], string> = {
    labels: chart.labels,
    datasets: [
      {
        label: chart.title,
        data: chart.values,
        backgroundColor: "rgba(1, 76, 105, 0.18)",
        borderColor: CHART_COLORS[0],
        borderWidth: 2,
        pointBackgroundColor: CHART_COLORS[1],
        tension: 0.3,
      },
    ],
  };

  const pieData: ChartData<"pie", number[], string> = {
    labels: chart.labels,
    datasets: [
      {
        label: chart.title,
        data: chart.values,
        backgroundColor: chart.values.map(
          (_, index) => CHART_COLORS[index % CHART_COLORS.length],
        ),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const doughnutData: ChartData<"doughnut", number[], string> = {
    labels: chart.labels,
    datasets: [
      {
        label: chart.title,
        data: chart.values,
        backgroundColor: chart.values.map(
          (_, index) => CHART_COLORS[index % CHART_COLORS.length],
        ),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { intersect: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="mb-4 text-sm font-semibold text-foreground">
        {chart.title}
      </p>
      <div className="h-72 w-full" role="img" aria-label={chart.title}>
        {chart.type === "bar" ? (
          <Bar data={barData} options={barOptions} />
        ) : null}
        {chart.type === "line" ? (
          <Line data={lineData} options={lineOptions} />
        ) : null}
        {chart.type === "pie" ? (
          <Pie data={pieData} options={pieOptions} />
        ) : null}
        {chart.type === "doughnut" ? (
          <Doughnut data={doughnutData} options={doughnutOptions} />
        ) : null}
      </div>
    </div>
  );
}
