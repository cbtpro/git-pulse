import {afterEach,expect,it,vi} from 'vitest';
import {actions} from '../src/services/github/ActionsService';
import {githubDownload} from '../src/services/github/GitHubDownloads';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('paginates runs with encoded branch and explicit credentials',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({workflow_runs:[]}),{headers:{link:'<https://api.github.com/next>; rel="next"'}}));vi.stubGlobal('fetch',fetcher);
 expect((await actions.runs('a','b',2,'failure','feat/ui','source',new AbortController().signal)).hasNext).toBe(true);
 const url=new URL(fetcher.mock.calls[0][0]);expect(url.searchParams.get('branch')).toBe('feat/ui');expect(url.searchParams.get('page')).toBe('2');expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer source');
});
it('uses supported run operations and propagates rejection',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(null,{status:204})).mockResolvedValueOnce(new Response('{}',{status:403}));vi.stubGlobal('fetch',fetcher);
 await actions.control('a','b',5,'rerun-failed-jobs','t');
 expect(fetcher.mock.calls[0][0]).toBe('https://api.github.com/repos/a/b/actions/runs/5/rerun-failed-jobs');
 await expect(actions.control('a','b',5,'cancel','t')).rejects.toMatchObject({status:403});
 await expect(actions.control('a','b',5,'cancel',null)).rejects.toThrow('请先登录');
 expect(fetcher).toHaveBeenCalledTimes(2);
});
it('loads plain text logs and bounds large responses',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('x'.repeat(2_000_100))));
 const result=await githubDownload('a','b','job',3,'t','job.log');
 expect(result?.truncated).toBe(true);expect(result?.text.length).toBe(2_000_000);
});
