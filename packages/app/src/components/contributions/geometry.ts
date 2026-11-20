import type {
  ContributionCalendar,
  ContributionDay,
} from "../../types/contributions";

export type Point = { x: number; y: number };
export type CalendarCell = ContributionDay & { week: number; index: number };
export type Face = {
  points: Point[];
  tone: number;
  cell: CalendarCell;
  depth: number;
};
export type ChartMode = "2d" | "3d";

export const LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
];

export function calendarCells(calendar: ContributionCalendar): CalendarCell[] {
  return calendar.weeks
    .flatMap((week, column) =>
      week.contributionDays.map((day) => ({ ...day, week: column })),
    )
    .map((day, index) => ({ ...day, index }));
}

export const GRID = { left: 38, top: 28, step: 14, cell: 10, height: 136 };

export function flatCell(cell: CalendarCell): Point[] {
  const x = GRID.left + cell.week * GRID.step;
  const y = GRID.top + cell.weekday * GRID.step;
  return [
    { x, y },
    { x: x + GRID.cell, y },
    { x: x + GRID.cell, y: y + GRID.cell },
    { x, y: y + GRID.cell },
  ];
}

/** Orthographic camera: real 3D columns projected onto a Canvas 2D surface. */
export function columnFaces(
  cells: CalendarCell[],
  weeks: number,
  angle: number,
  width: number,
  height: number,
): Face[] {
  const max = Math.max(1, ...cells.map((cell) => cell.contributionCount));
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const project = (x: number, y: number, z: number) => {
    const u = (x - weeks / 2) * cos - (y - 3.5) * sin;
    const depth = (x - weeks / 2) * sin + (y - 3.5) * cos;
    return { x: u, y: depth * 0.55 - z, depth };
  };
  const raw: Face[] = [];
  for (const cell of cells) {
    const x = cell.week,
      y = cell.weekday;
    const z = cell.contributionCount
      ? 0.35 + 5 * Math.sqrt(cell.contributionCount / max)
      : 0.12;
    const p = (dx: number, dy: number, dz: number) =>
      project(x + dx, y + dy, dz);
    const a = p(0, 0, z),
      b = p(0.78, 0, z),
      c = p(0.78, 0.78, z),
      d = p(0, 0.78, z);
    const center = p(0.39, 0.39, 0);
    // These two walls face the camera in the supported orbit range (0.15–0.8 radians).
    raw.push({
      points: [b, p(0.78, 0, 0), p(0.78, 0.78, 0), c],
      tone: -0.25,
      cell,
      depth: center.depth,
    });
    raw.push({
      points: [d, c, p(0.78, 0.78, 0), p(0, 0.78, 0)],
      tone: -0.12,
      cell,
      depth: center.depth,
    });
    raw.push({ points: [a, b, c, d], tone: 0, cell, depth: center.depth });
  }
  if (!raw.length) return [];
  const points = raw.flatMap((face) => face.points);
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min(
    (width - 36) / (maxX - minX || 1),
    (height - 40) / (maxY - minY || 1),
  );
  const left = (width - (maxX - minX) * scale) / 2,
    top = (height - (maxY - minY) * scale) / 2;
  return raw
    .sort((a, b) => a.depth - b.depth)
    .map((face) => ({
      ...face,
      points: face.points.map((p) => ({
        x: left + (p.x - minX) * scale,
        y: top + (p.y - minY) * scale,
      })),
    }));
}

export function containsPoint(points: Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
