import { afterEach, expect, it, vi } from 'vitest';
import { collaboration, internalWorkUrl } from '../src/services/github/CollaborationService';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('separates issues from PRs and encodes search qualifiers',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[],total_count:21})));
 vi.stubGlobal('fetch',fetcher);
 const result=await collaboration.list('octo','repo','issues','open','label:"good first issue"',1,'account-b',new AbortController().signal);
 const url=new URL(fetcher.mock.calls[0][0]);
 expect(url.searchParams.get('q')).toBe('repo:octo/repo is:issue is:open label:"good first issue"');
 expect(result.hasNext).toBe(true);
 expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer account-b');
});
it('routes PR labels through issues and sends reviews against the viewed commit',async()=>{
 const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(new Response('{}')));vi.stubGlobal('fetch',fetcher);
 await collaboration.update('a','b','pulls',42,{labels:['bug'],assignees:['octo']},'b-token');
 await collaboration.review('a','b',42,'viewed-sha','REQUEST_CHANGES','Needs a test','b-token');
 expect(fetcher.mock.calls[0][0]).toBe('https://api.github.com/repos/a/b/issues/42');
 expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({commit_id:'viewed-sha',event:'REQUEST_CHANGES',body:'Needs a test'});
});
it('does not report a failed merge as success and refuses unauthenticated writes',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({merged:false,message:'Blocked'})));vi.stubGlobal('fetch',fetcher);
 await expect(collaboration.merge('a','b',1,'original-sha','squash','token')).rejects.toThrow('Blocked');
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({sha:'original-sha',merge_method:'squash'});
 await expect(collaboration.comment('a','b',1,'text',null)).rejects.toThrow('请先登录');
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('keeps source accounts in internal links and only routes trusted GitHub links',()=>{
 expect(internalWorkUrl('https://github.com/a/b/pull/7','acct')).toBe('#/repo/a/b?account=acct&tab=pulls&number=7');
 expect(internalWorkUrl('https://evil.example/a/b/pull/7','acct')).toBeNull();
});
