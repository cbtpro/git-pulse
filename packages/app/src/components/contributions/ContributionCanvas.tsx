import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import type { ContributionCalendar } from "../../types/contributions";
import {
  calendarCells,
  columnFaces,
  containsPoint,
  flatCell,
  GRID,
  LEVELS,
  type ChartMode,
  type Face,
  type Point,
} from "./geometry";

export function ContributionCanvas({
  calendar,
  mode,
}: {
  calendar: ContributionCalendar;
  mode: ChartMode;
}) {
  const { t, i18n } = useTranslation();
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const faces = useRef<Face[]>([]);
  const drag = useRef<{ x: number; angle: number; moved: boolean } | null>(
    null,
  );
  const cells = useMemo(() => calendarCells(calendar), [calendar]);
  const [availableWidth, setAvailableWidth] = useState(800);
  const [angle, setAngle] = useState(0.38);
  const [selected, setSelected] = useState(cells.length - 1);
  const [dark, setDark] = useState(
    document.body.getAttribute("arco-theme") === "dark",
  );
  const width =
    mode === "2d"
      ? Math.max(
          availableWidth,
          GRID.left + calendar.weeks.length * GRID.step + 12,
        )
      : availableWidth;
  const height = mode === "2d" ? GRID.height : 270;
  const current = cells[Math.min(selected, cells.length - 1)];
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(value));

  useLayoutEffect(() => {
    const element = viewport.current!;
    const update = () => {
      // A retained page has zero width while hidden; keep its canvas and scroll.
      if (element.clientWidth > 0) setAvailableWidth(element.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.body.getAttribute("arco-theme") === "dark"),
    );
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["arco-theme"],
    });
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (viewport.current)
      viewport.current.scrollLeft =
        mode === "2d" ? viewport.current.scrollWidth : 0;
  }, [calendar, mode, availableWidth]);

  useLayoutEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    element.width = Math.round(width * ratio);
    element.height = Math.round(height * ratio);
    ctx.scale(ratio, ratio);
    const colors = dark
      ? ["#252b34", "#0e4429", "#006d32", "#26a641", "#39d353"]
      : ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
    const draw = (points: Point[], fill: string, tone = 0) => {
      ctx.beginPath();
      points.forEach((point, index) =>
        index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y),
      );
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (tone < 0) {
        ctx.fillStyle = `rgba(0,0,0,${-tone})`;
        ctx.fill();
      }
    };
    faces.current =
      mode === "3d"
        ? columnFaces(cells, calendar.weeks.length, angle, width, height)
        : cells.map((cell) => ({
            cell,
            points: flatCell(cell),
            depth: 0,
            tone: 0,
          }));
    for (const face of faces.current) {
      const level = Math.max(0, LEVELS.indexOf(face.cell.contributionLevel));
      draw(face.points, colors[level], face.tone);
      if (face.cell.index === selected && face.tone === 0) {
        ctx.strokeStyle = dark ? "#f8fafc" : "#202637";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    if (mode === "2d") {
      ctx.font =
        '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = dark ? "#a0a8bb" : "#667085";
      ctx.textBaseline = "middle";
      for (const weekday of [1, 3, 5]) {
        const name = new Intl.DateTimeFormat(i18n.language, {
          weekday: "short",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, 0, 7 + weekday)));
        ctx.fillText(
          name,
          0,
          GRID.top + weekday * GRID.step + GRID.cell / 2,
          34,
        );
      }
      let previousMonth = "",
        previousX = -100;
      for (const cell of cells) {
        const month = cell.date.slice(0, 7);
        const x = GRID.left + cell.week * GRID.step;
        if (month !== previousMonth) {
          if (x - previousX >= 34) {
            ctx.fillText(
              new Intl.DateTimeFormat(i18n.language, {
                month: "short",
                timeZone: "UTC",
              }).format(new Date(cell.date)),
              x,
              12,
            );
            previousX = x;
          }
          previousMonth = month;
        }
      }
    }
  }, [
    cells,
    calendar.weeks.length,
    mode,
    width,
    height,
    angle,
    selected,
    dark,
    i18n.language,
  ]);

  const pick = (clientX: number, clientY: number) => {
    const box = canvas.current!.getBoundingClientRect();
    const point = {
      x: ((clientX - box.left) * width) / box.width,
      y: ((clientY - box.top) * height) / box.height,
    };
    const hit = [...faces.current]
      .reverse()
      .find((face) => containsPoint(face.points, point));
    if (hit) setSelected(hit.cell.index);
  };
  return (
    <>
      <div className="gp-contribution-viewport" ref={viewport}>
        <canvas
          ref={canvas}
          className={`gp-contribution-canvas gp-contribution-${mode}`}
          style={{ width, height }}
          tabIndex={0}
          role="img"
          aria-label={t(
            "贡献图，共 {{total}} 次贡献。使用方向键查看每日详情。",
            {
              total: calendar.totalContributions.toLocaleString(i18n.language),
            },
          )}
          aria-describedby="contribution-day"
          onKeyDown={(event) => {
            if (!cells.length) return;
            const step = {
              ArrowLeft: -7,
              ArrowRight: 7,
              ArrowUp: -1,
              ArrowDown: 1,
            }[event.key];
            if (
              step === undefined &&
              event.key !== "Home" &&
              event.key !== "End"
            )
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? cells.length - 1
                  : Math.max(
                      0,
                      Math.min(cells.length - 1, selected + (step ?? 0)),
                    );
            setSelected(next);
            if (mode === "2d" && cells[next] && viewport.current)
              viewport.current.scrollLeft = Math.max(
                0,
                flatCell(cells[next])[0].x - availableWidth / 2,
              );
          }}
          onPointerDown={(event) => {
            pick(event.clientX, event.clientY);
            if (mode === "3d") {
              drag.current = { x: event.clientX, angle, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerMove={(event) => {
            if (drag.current && mode === "3d") {
              const delta = event.clientX - drag.current.x;
              if (Math.abs(delta) > 3) drag.current.moved = true;
              if (drag.current.moved)
                setAngle(
                  Math.max(
                    0.15,
                    Math.min(0.8, drag.current.angle + delta * 0.003),
                  ),
                );
            } else if (event.pointerType === "mouse")
              pick(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (drag.current && !drag.current.moved)
              pick(event.clientX, event.clientY);
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          {t("过去一年共 {{total}} 次贡献", {
            total: calendar.totalContributions.toLocaleString(i18n.language),
          })}
        </canvas>
      </div>
      <div className="gp-contribution-footer">
        <p id="contribution-day" aria-live="polite" aria-atomic="true">
          {current
            ? t("{{date}} · {{count}} 次贡献", {
                date: dateLabel(current.date),
                count: current.contributionCount.toLocaleString(i18n.language),
              })
            : t("过去一年没有贡献记录")}
        </p>
        <div className="gp-contribution-legend" aria-hidden="true">
          <span>{t("少")}</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} data-level={level} />
          ))}
          <span>{t("多")}</span>
        </div>
      </div>
      <p className="gp-contribution-hint">
        {mode === "2d"
          ? t("横向滚动查看全年，点按方块查看当天贡献。")
          : t("柱高代表贡献次数，左右拖动旋转视角，点按柱子查看详情。")}
      </p>
    </>
  );
}
