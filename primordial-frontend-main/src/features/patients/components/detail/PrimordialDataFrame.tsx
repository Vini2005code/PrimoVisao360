type PrimordialDataFrameProps = {
  embedded?: boolean;
  title?: string;
};

export default function PrimordialDataFrame({
  embedded = false,
  title = "Primordial DATA — Visão 360",
}: PrimordialDataFrameProps) {
  return (
    <iframe
      title={title}
      src={embedded ? "/primordial-data?embedded=true" : "/primordial-data"}
      className="h-[min(1100px,calc(100vh-7rem))] min-h-[760px] w-full border-0 bg-transparent"
      sandbox="allow-scripts allow-same-origin allow-forms"
      referrerPolicy="no-referrer"
    />
  );
}
