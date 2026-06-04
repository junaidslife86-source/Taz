type MiniSparklineProps = {
  values: number[];
  stroke: string;
  fill?: string;
  height?: number;
};

export function MiniSparkline({
  values,
  stroke,
  fill,
  height = 36,
}: MiniSparklineProps) {
  const width = 120;
  const data = values.length ? values : [0];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const innerH = height - padding * 2;
  const innerW = width - padding * 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg
      className="overview-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {fill ? (
        <polygon points={areaPoints} fill={fill} stroke="none" opacity={0.35} />
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
