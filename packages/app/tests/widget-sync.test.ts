import { describe, expect, it, vi } from "vitest";
import { createWidgetSynchronizer, widgetSnapshot, type WidgetSnapshot } from "../src/services/widgets/ContributionWidgetSync";
import type { ContributionCalendar } from "../src/types/contributions";

const calendar: ContributionCalendar = { totalContributions: 8, weeks: [{ contributionDays: [{ date: "2026-11-21", weekday: 6, contributionCount: 8, contributionLevel: "FOURTH_QUARTILE" }] }] };
const account = { id: "1", username: "octocat", token: "never-share-this-token" };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (value: unknown) => void; const promise = new Promise<T>((r,j) => { resolve=r; reject=j; }); return { promise, resolve, reject }; }
function fixture(fetch = vi.fn().mockResolvedValue(calendar)) {
  const snapshots: WidgetSnapshot[] = [];
  const changed = vi.fn();
  const write = vi.fn(async (value: WidgetSnapshot) => { snapshots.push(value); });
  const sync = createWidgetSynchronizer({ fetch, write, changed, now: () => 1000 });
  return { sync, snapshots, write, changed, fetch };
}

describe("native contribution widget sync", () => {
  it("sends only aggregate counts and public account labels, never tokens", async () => {
    const { sync, snapshots } = fixture();
    await sync.setAccount(account,"zh-CN");
    expect(snapshots.map(s => s.status)).toEqual(["loading","ready"]);
    expect(snapshots.at(-1)).toMatchObject({ accountId:"1", username:"octocat", total:8, updatedAt:1000, days:[{ count:8, level:4 }] });
    expect(JSON.stringify(snapshots)).not.toContain(account.token);
    expect(Object.keys(widgetSnapshot(account,"en",calendar,1000)).sort()).toEqual(["accountId","days","language","status","total","updatedAt","username","version","weeks"]);
    sync.dispose();
  });
  it("clears the old account before fetching and ignores a late response after switching", async () => {
    const old = deferred<ContributionCalendar>();
    const next = deferred<ContributionCalendar>();
    const fetch = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const { sync, snapshots } = fixture(fetch);
    const first = sync.setAccount(account,"en");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const second = sync.setAccount({ id:"2", username:"other", token:"second-token" },"en");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(snapshots.at(-1)).toMatchObject({ accountId:"2", status:"loading", days:[] });
    old.resolve(calendar); await first;
    expect(snapshots.some(s=>s.accountId==="1" && s.status==="ready")).toBe(false);
    next.resolve({...calendar,totalContributions:20}); await second;
    expect(snapshots.at(-1)).toMatchObject({ accountId:"2", total:20 });
    sync.dispose();
  });
  it("clears on logout and cannot resurrect a delayed fetch", async () => {
    const request = deferred<ContributionCalendar>();
    const { sync, snapshots, fetch } = fixture(vi.fn().mockReturnValue(request.promise));
    const pending = sync.setAccount(account,"en");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    await sync.setAccount(null,"en");
    request.resolve(calendar); await pending;
    expect(snapshots.at(-1)).toMatchObject({ status:"signedOut", accountId:null, username:null, days:[], total:0 });
    sync.dispose();
  });
  it("retains the same account's snapshot on network failure and relabels without another query", async () => {
    const { sync, snapshots, fetch, changed } = fixture();
    await sync.setAccount(account,"en");
    fetch.mockRejectedValueOnce(new Error("offline"));
    await sync.refresh(true);
    expect(snapshots.at(-1)?.status).toBe("ready");
    expect(changed).toHaveBeenLastCalledWith({ syncing:false,error:"fetch",updatedAt:1000 });
    await sync.setAccount({...account},"ja");
    expect(snapshots.at(-1)).toMatchObject({ language:"ja", total:8, updatedAt:1000 });
    expect(fetch).toHaveBeenCalledTimes(2);
    sync.dispose();
  });
  it("serializes native writes so a slow previous write cannot replace the new account", async () => {
    const gate = deferred<void>();
    const { sync, snapshots, write } = fixture();
    write.mockImplementationOnce(async value => { await gate.promise; snapshots.push(value); });
    const first = sync.setAccount(account,"en");
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
    const second = sync.setAccount({id:"2",username:"next",token:"next"},"en");
    gate.resolve(); await Promise.all([first,second]);
    expect(snapshots.at(-1)).toMatchObject({ accountId:"2",status:"ready" });
    expect(snapshots.filter(s=>s.status==="ready")).toHaveLength(1);
    sync.dispose();
  });
  it("deduplicates foreground refreshes and uses the profile's explicit refresh", async () => {
    const { sync, snapshots, fetch } = fixture();
    await sync.setAccount(account,"en");
    await Promise.all([sync.refresh(),sync.refresh()]);
    expect(fetch).toHaveBeenCalledOnce();
    await sync.accept({...calendar,totalContributions:9},account.token);
    expect(snapshots.at(-1)?.total).toBe(9);
    sync.dispose();
  });
  it("does not write after disposal or report a failed write as synchronized", async () => {
    const { sync, write, changed } = fixture();
    write.mockRejectedValue(new Error("unavailable"));
    await sync.setAccount(account,"en");
    expect(changed).toHaveBeenLastCalledWith({ syncing:false,error:"write",updatedAt:null });
    sync.dispose();
    const count = write.mock.calls.length;
    await sync.accept(calendar,account.token); await sync.refresh(true);
    expect(write).toHaveBeenCalledTimes(count);
  });
});
