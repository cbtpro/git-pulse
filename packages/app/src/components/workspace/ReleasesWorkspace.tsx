import {useCallback,useState} from 'react';
import {Button,Card,Select,Spin,Tag} from '@arco-design/web-react';
import {Bell,BellOff,Download} from 'lucide-react';
import {useTranslation} from '../../i18n';
import {useRepository} from './RepositoryContext';
import {useAccountWorkspace} from '../../hooks/useAccountWorkspace';
import {useGitHubResource} from '../../hooks/useGitHubResource';
import {useWorkspaceAction} from '../../hooks/useWorkspaceAction';
import {usePlatform} from '../../hooks/usePlatform';
import {TokenManager} from '../../services/auth/TokenManager';
import {assetMatchesOS,releases,type Release} from '../../services/github/ReleaseService';
import {repoRoute} from '../../services/github/RepositoryService';
import {githubDownload} from '../../services/github/GitHubDownloads';
import {MarkdownBody,WorkPager} from './WorkShared';
import {RequestError,EmptyState} from '../common/ResourceState';
export function ReleaseFilter({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 const {t}=useTranslation();return <Select aria-label={t('版本类型')} value={value} onChange={onChange} style={{width:150}} options={[{value:'all',label:t('全部版本')},{value:'stable',label:t('正式版本')},{value:'preview',label:t('预发布版本')}]}/>;
}
export function releaseVisible(release:Release,filter:string){return !release.draft&&(filter==='all'||(filter==='preview'?release.prerelease:!release.prerelease));}
export function SubscriptionButton() {
 const c=useRepository(),{t}=useTranslation(),action=useWorkspaceAction(),workspace=useAccountWorkspace(c.accountId);
 const repository=c.repo.full_name.toLowerCase(),subscribed=workspace.subscriptions.includes(repository);
 return <Button icon={subscribed?<BellOff size={16}/>:<Bell size={16}/>} loading={action.busy} onClick={()=>{
  if(!c.accountId||!c.token)return c.onShowLogin();
  void action.run(()=>TokenManager.updateWorkspace(c.accountId!,current=>{if(!subscribed&&current.subscriptions.length>=30)throw new Error('最多订阅 30 个仓库，请先移除部分订阅。');return {...current,subscriptions:subscribed?current.subscriptions.filter(name=>name!==repository):[...current.subscriptions,repository]};}));
 }}>{t(subscribed?'取消版本订阅':'订阅版本更新')}</Button>;
}
export function ReleasesWorkspace() {
 const c=useRepository(),{t}=useTranslation();const [page,setPage]=useState(1),[filter,setFilter]=useState('stable');
 const resource=useGitHubResource(useCallback(signal=>releases.list(c.owner,c.name,page,c.token,signal),[c.owner,c.name,page,c.token]));
 const items=resource.data?.data.filter(release=>releaseVisible(release,filter))||[];
 return <>
  <div className="gp-work-toolbar"><ReleaseFilter value={filter} onChange={value=>{setFilter(value);setPage(1);}}/><SubscriptionButton/><Button onClick={resource.reload} disabled={resource.loading}>{t('刷新')}</Button></div>
  {resource.loading?<Spin/>:resource.error?<RequestError error={resource.error} retry={resource.reload} onLogin={c.onShowLogin}/>:<>{!items.length?<EmptyState title={t('本页暂无符合条件的版本')} description={resource.data?.hasNext?t('可以翻页查看更多版本。'):''}/>:items.map(release=><ReleaseCard key={release.id} release={release} repository={c.repo.full_name} token={c.token} accountId={c.accountId}/>)}<WorkPager page={page} hasNext={Boolean(resource.data?.hasNext)} onChange={setPage}/></>}
 </>;
}
export function ReleaseCard({release,repository,token,accountId}:{release:Release;repository:string;token:string|null;accountId:string|null}) {
 const {t}=useTranslation(),{os}=usePlatform(),action=useWorkspaceAction();const [showAll,setShowAll]=useState(false);
 const assets=[...release.assets].sort((a,b)=>Number(assetMatchesOS(b.name,os))-Number(assetMatchesOS(a.name,os)));
 const [owner,name]=repository.split('/');
 return <Card className="gp-work-content" title={<span className="gp-work-break">{release.name||release.tag_name}</span>} extra={<Tag color={release.prerelease?'orange':'green'}>{t(release.prerelease?'预发布版本':'正式版本')}</Tag>}>
  <div className="gp-work-toolbar"><a href={`#${repoRoute(repository,accountId)}${accountId?'&':'?'}tab=releases`}>{repository}</a><span className="gp-work-muted">{release.tag_name} · {release.published_at?new Date(release.published_at).toLocaleDateString():''}</span><a href={release.html_url} target="_blank" rel="noreferrer">GitHub</a></div>
  <details className="gp-work-release-notes"><summary>{t('更新说明')}</summary><MarkdownBody body={release.body} url={release.html_url}/></details>
  {assets.length>0&&<ul className="gp-file-list">{assets.slice(0,showAll?undefined:5).map(asset=><li key={asset.id}><div className="gp-work-break"><strong>{asset.name}</strong><p className="gp-work-muted">{(asset.size/1024/1024).toFixed(1)} MB {assetMatchesOS(asset.name,os)&&<Tag color="blue">{t('适合当前系统')}</Tag>}</p></div>{token?<Button icon={<Download size={16}/>} aria-label={`${t('下载')} ${asset.name}`} loading={action.busy} onClick={()=>void action.run(()=>githubDownload(owner,name,'release',asset.id,token,asset.name))}/>:<a href={asset.browser_download_url} target="_blank" rel="noreferrer">{t('下载')}</a>}</li>)}</ul>}
  {assets.length>5&&<Button size="small" onClick={()=>setShowAll(!showAll)}>{t(showAll?'收起附件':'展开全部附件')}</Button>}
 </Card>;
}
