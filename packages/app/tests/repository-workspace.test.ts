import { afterEach, expect, it, vi } from "vitest";
import { repositories, decodeRepoText, repoRoute, type RepoContent } from "../src/services/github/RepositoryService";
const signal = () => new AbortController().signal;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("encodes branch and file paths and uses the chosen account", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([])));
  vi.stubGlobal("fetch", fetcher);
  await repositories.contents("octo", "project", "feature/a & b", "src/a b.ts", "source-account", signal());
  expect(fetcher).toHaveBeenCalledWith("https://api.github.com/repos/octo/project/contents/src/a%20b.ts?ref=feature%2Fa+%26+b", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer source-account" }) }));
  expect(repoRoute("octo/project", "account/1")).toBe("/repo/octo/project?account=account%2F1");
  expect(() => repoRoute("../project")).toThrow();
});
it("distinguishes missing Star from failed authentication and supports empty write responses", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("{}", {status:404})).mockResolvedValueOnce(new Response("{}", {status:401})).mockResolvedValue(new Response(null, {status:204}));
  vi.stubGlobal("fetch", fetcher);
  expect(await repositories.starred("a", "b", "t", signal())).toBe(false);
  await expect(repositories.starred("a", "b", "t", signal())).rejects.toMatchObject({status:401});
  await repositories.star("a", "b", true, "t");
  await repositories.star("a", "b", false, "t");
  expect(fetcher.mock.calls.slice(2).map((call) => call[1].method)).toEqual(["PUT", "DELETE"]);
});
it("previews UTF8 and empty files but rejects binary and oversized files", () => {
  const file = {encoding:"base64", size:6, content:btoa(String.fromCharCode(...new TextEncoder().encode("你好")))} as RepoContent;
  expect(decodeRepoText(file)).toBe("你好");
  expect(decodeRepoText({...file, size:0, content:""})).toBe("");
  expect(decodeRepoText({...file, content:btoa("\x00data")})).toBeNull();
  expect(decodeRepoText({...file, size:1_000_001})).toBeNull();
});
