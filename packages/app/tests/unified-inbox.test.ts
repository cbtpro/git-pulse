import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {UnifiedInboxFeed,markSourceNotificationRead,notificationKey,type AccountNotification} from '../src/services/github/UnifiedInboxService';
import {github,type Notification} from '../src/services/github/GitHubService';
import {TokenManager} from '../src/services/auth/TokenManager';
const signal=()=>new AbortController().signal;
const notification=(id:string,time:number)=>({id,unread:true,updated_at:new Date(1760000000000+time*60000).toISOString(),subject:{title:id,type:'Issue',url:'https://api.github.com/repos/a/b/issues/1'},repository:{full_name:'a/b'}} as Notification);
beforeEach(()=>TokenManager.clearAll());
afterEach(async()=>{vi.restoreAllMocks();await TokenManager.clearAll();});
it('merges globally sorted pages without losing each account’s remaining items',async()=>{
 const a=Array.from({length:40},(_,i)=>notification(`a-${i}`,100-i));const b=Array.from({length:20},(_,i)=>notification(`b-${i}`,90.5-i));
 const fetcher=vi.spyOn(github,'notifications').mockImplementation(async(_all,_participating,page,token)=>({data:(token==='a'?a:b).slice((page-1)*20,page*20),hasNext:token==='a'&&page===1}));
 const feed=new UnifiedInboxFeed([{id:'a',username:'alice',token:'a'},{id:'b',username:'bob',token:'b'}],false,false);
 const first=await feed.load(1,signal()),second=await feed.load(2,signal());
 const expected=[...a,...b].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,40).map(item=>item.id);
 expect([...first.data,...second.data].map(item=>item.id)).toEqual(expected);
 expect(fetcher).toHaveBeenCalledTimes(3);
});
it('keeps a successful account visible when another account fails',async()=>{
 vi.spyOn(github,'notifications').mockImplementation(async(_a,_p,_n,token)=>{if(token==='b')throw new Error('Access denied');return {data:[notification('same-thread',1)],hasNext:false};});
 const result=await new UnifiedInboxFeed([{id:'a',username:'alice',token:'a'},{id:'b',username:'bob',token:'b'}],false,false).load(1,signal());
 expect(result.data[0].accountId).toBe('a');expect(result.errors[0].accountId).toBe('b');
});
it('marks only the original account and refuses to fall back after its removal',async()=>{
 await TokenManager.saveSession('a-token','alice','token');await TokenManager.saveSession('b-token','bob','token');
 const item={...notification('42',1),accountId:'legacy:alice',accountName:'alice'} as AccountNotification;
 const mark=vi.spyOn(github,'markNotificationRead').mockResolvedValue();
 await markSourceNotificationRead(item);
 expect(mark.mock.calls[0][1]).toBe('a-token');
 expect(notificationKey(item)).not.toBe(notificationKey({...item,accountId:'legacy:bob'}));
 await TokenManager.removeAccount('legacy:alice');
 await expect(markSourceNotificationRead(item)).rejects.toThrow('来源账号');
 expect(mark).toHaveBeenCalledTimes(1);expect(TokenManager.getToken()).toBe('b-token');
});
