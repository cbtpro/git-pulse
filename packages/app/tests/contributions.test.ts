import { afterEach, expect, it, vi } from "vitest";
import { github } from "../src/services/github/GitHubService";
import {
  calendarCells,
  columnFaces,
  containsPoint,
  flatCell,
} from "../src/components/contributions/geometry";
import type { ContributionCalendar } from "../src/types/contributions";

const calendar: ContributionCalendar = {
  totalContributions: 12,
  weeks: [
    {
      contributionDays: [
        {
          date: "2026-01-03",
          weekday: 6,
          contributionCount: 0,
          contributionLevel: "NONE",
        },
      ],
    },
    {
      contributionDays: [
        {
          date: "2026-01-04",
          weekday: 0,
          contributionCount: 12,
          contributionLevel: "FOURTH_QUARTILE",
        },
      ],
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());

it("requests the signed-in user's actual calendar and keeps the week/day positions", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            viewer: {
              contributionsCollection: { contributionCalendar: calendar },
            },
          },
        }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  expect(
    await github.contributions("test-token", new AbortController().signal),
  ).toEqual(calendar);
  expect(fetch.mock.calls[0][0]).toBe("https://api.github.com/graphql");
  const options = fetch.mock.calls[0][1];
  expect(options.method).toBe("POST");
  expect(options.headers.Authorization).toBe("Bearer test-token");
  expect(JSON.parse(options.body).query).toContain("viewer");
  const cells = calendarCells(calendar);
  expect(
    cells.map((cell) => [cell.week, cell.weekday, cell.contributionCount]),
  ).toEqual([
    [0, 6, 0],
    [1, 0, 12],
  ]);
  expect(containsPoint(flatCell(cells[0]), { x: 42, y: 117 })).toBe(true);
  expect(containsPoint(flatCell(cells[0]), { x: 42, y: 50 })).toBe(false);
});

it("does not turn permission failures or partial GraphQL results into an empty calendar", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            errors: [{ message: "Forbidden" }],
            data: { viewer: null },
          }),
        ),
      ),
  );
  await expect(
    github.contributions("test-token", new AbortController().signal),
  ).rejects.toMatchObject({ status: 403 });
});

it("rejects malformed daily counts instead of drawing invalid geometry", async () => {
  const invalid = structuredClone(calendar);
  invalid.weeks[0].contributionDays[0].contributionCount = -1;
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              viewer: {
                contributionsCollection: { contributionCalendar: invalid },
              },
            },
          }),
        ),
      ),
  );
  await expect(
    github.contributions("test-token", new AbortController().signal),
  ).rejects.toThrow("贡献数据不完整");
});

it("draws finite 3D geometry for zero-contribution years and fits both orbit limits", () => {
  const cells = calendarCells(calendar);
  for (const angle of [0.15, 0.8]) {
    const faces = columnFaces(cells, 2, angle, 300, 270);
    expect(faces).toHaveLength(6);
    for (const face of faces)
      for (const point of face.points) {
        expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(300);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(270);
      }
    expect(faces.map((face) => face.depth)).toEqual(
      faces.map((face) => face.depth).sort((a, b) => a - b),
    );
  }
  const empty = cells.map((cell) => ({ ...cell, contributionCount: 0 }));
  expect(
    columnFaces(empty, 2, 0.38, 300, 270).every((face) =>
      face.points.every((p) => Number.isFinite(p.y)),
    ),
  ).toBe(true);
});
