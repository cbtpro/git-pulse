import {afterEach,expect,it,vi} from 'vitest';
import {dashboardQuery,loadDashboard} from '../src/services/github/WorkDashboardService';
afterEach(()=>vi.unstubAllGlobals());
it('scopes every task to the selected user and optional repository',()=>{
 expect(dashboardQuery('review','octo','a/b')).toBe('is:open is:pr review-requested:octo repo:a/b');
 expect(dashboardQuery('assigned','octo','')).toBe('is:open assignee:octo');
 expect(dashboardQuery('mentioned','octo','')).toBe('is:open mentions:octo');
 expect(dashboardQuery('failed','octo','')).toBe('is:open is:pr author:octo status:failure');
 expect(()=>dashboardQuery('review','octo','a/b is:closed')).toThrow();
});
it('refuses missing source credentials before making a request',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await expect(loadDashboard('assigned','octo','',1,null,new AbortController().signal)).rejects.toThrow('来源账号');
 expect(fetcher).not.toHaveBeenCalled();
});
it('paginates with source authentication',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[],total_count:11})));vi.stubGlobal('fetch',fetcher);
 expect((await loadDashboard('mentioned','other','a/b',1,'other-token',new AbortController().signal)).hasNext).toBe(true);
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer other-token');
});
