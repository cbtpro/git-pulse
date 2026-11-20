import {useCallback,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Alert,Button,Card,Input,Modal,Popconfirm,Select,Spin,Tag} from '@arco-design/web-react';
import {ArrowLeft,Download,FileText,RefreshCw} from 'lucide-react';
import {useTranslation} from '../../i18n';
import {useRepository} from './RepositoryContext';
import {useGitHubResource} from '../../hooks/useGitHubResource';
import {useWorkspaceAction} from '../../hooks/useWorkspaceAction';
import {actions,type WorkflowRun} from '../../services/github/ActionsService';
import {githubDownload} from '../../services/github/GitHubDownloads';
import {RequestError,EmptyState} from '../common/ResourceState';
import {WorkPager} from './WorkShared';
const states:Record<string,string>={queued:'排队中',in_progress:'运行中',completed:'已完成',success:'成功',failure:'失败',cancelled:'已取消',skipped:'已跳过',timed_out:'已超时',action_required:'需要操作',waiting:'等待中',neutral:'中性结果',stale:'已过期'};
export function ActionStatus({status}:{status:string|null}) {const {t}=useTranslation();return <Tag color={status==='success'?'green':status==='failure'?'red':'gray'}>{t(states[status||'']||status||'等待中')}</Tag>;}
export function ActionsWorkspace() {
 const [params,setParams]=useSearchParams();const run=Number(params.get('run'));
 return run>0?<RunDetail key={run} id={run} back={()=>setParams(current=>{const next=new URLSearchParams(current);next.delete('run');return next;})}/>:<RunList/>;
}
function RunList() {
 const c=useRepository(),{t}=useTranslation();const [page,setPage]=useState(1),[status,setStatus]=useState(''),[branch,setBranch]=useState(''),[input,setInput]=useState('');const [,setParams]=useSearchParams();
 const resource=useGitHubResource(useCallback(signal=>actions.runs(c.owner,c.name,page,status,branch,c.token,signal),[c.owner,c.name,page,status,branch,c.token]));
 return <>
  <div className="gp-work-toolbar"><Select aria-label={t('运行状态')} value={status} style={{width:140}} options={[{value:'',label:t('全部')},...['queued','in_progress','success','failure','cancelled'].map(value=>({value,label:t(states[value])}))]} onChange={value=>{setStatus(value);setPage(1);}}/>
   <form className="gp-work-search" onSubmit={e=>{e.preventDefault();setBranch(input.trim());setPage(1);}}><Input aria-label={t('分支')} placeholder={t('按分支筛选')} value={input} onChange={setInput} allowClear/><Button htmlType="submit">{t('筛选')}</Button></form><Button onClick={resource.reload} disabled={resource.loading}>{t('刷新')}</Button>
  </div>
  {resource.loading?<Spin/>:resource.error?<RequestError error={resource.error} retry={resource.reload} onLogin={c.onShowLogin}/>:<>
   {!resource.data?.data.length?<EmptyState title={t('暂无工作流运行')} description=""/>:<ul className="gp-work-list">{resource.data.data.map(run=><li key={run.id}><button className="gp-work-link-button" onClick={()=>setParams(current=>{const next=new URLSearchParams(current);next.set('run',String(run.id));return next;})}><strong>{run.display_title||run.name}</strong><span>#{run.run_number} · {run.head_branch} · {new Date(run.created_at).toLocaleString()}</span></button><ActionStatus status={run.conclusion||run.status}/></li>)}</ul>}
   <WorkPager page={page} hasNext={Boolean(resource.data?.hasNext)} onChange={setPage}/>
  </>}
 </>;
}
function RunDetail({id,back}:{id:number;back:()=>void}) {
 const c=useRepository(),{t}=useTranslation();const run=useGitHubResource(useCallback(signal=>actions.get(c.owner,c.name,id,c.token,signal),[c.owner,c.name,id,c.token]));
 return <><div className="gp-work-toolbar"><Button icon={<ArrowLeft size={16}/>} onClick={back}>{t('返回列表')}</Button><Button icon={<RefreshCw size={16}/>} onClick={run.reload} disabled={run.loading}>{t('刷新')}</Button></div>{run.loading?<Spin/>:run.error?<RequestError error={run.error} retry={run.reload}/>:run.data&&<RunBody run={run.data} reload={run.reload}/>}</>;
}
function RunBody({run,reload}:{run:WorkflowRun;reload:()=>void}) {
 const c=useRepository(),{t}=useTranslation(),action=useWorkspaceAction();const [jobPage,setJobPage]=useState(1),[artifactPage,setArtifactPage]=useState(1);
 const [log,setLog]=useState<{title:string;text:string;truncated:boolean}|null>(null);
 const jobs=useGitHubResource(useCallback(signal=>actions.jobs(c.owner,c.name,run.id,jobPage,c.token,signal),[c.owner,c.name,run.id,jobPage,c.token]));
 const artifacts=useGitHubResource(useCallback(signal=>actions.artifacts(c.owner,c.name,run.id,artifactPage,c.token,signal),[c.owner,c.name,run.id,artifactPage,c.token]));
 const controls=run.status==='completed'?[['rerun','重新运行全部'],['rerun-failed-jobs','重跑失败任务']] as const:[['cancel','取消运行']] as const;
 return <>
  <h2 className="gp-work-break">{run.display_title||run.name}</h2><div className="gp-work-toolbar"><ActionStatus status={run.conclusion||run.status}/><span>{run.head_branch} · {run.head_sha.slice(0,8)} · #{run.run_number} / {run.run_attempt}</span><a href={run.html_url} target="_blank" rel="noreferrer">{t('在 GitHub 查看')}</a></div>
  {c.repo.permissions?.push&&c.token&&<div className="gp-work-toolbar">{controls.map(([operation,label])=><Popconfirm key={operation} title={t('确认执行此工作流操作？')} onOk={()=>action.run(async()=>{await actions.control(c.owner,c.name,run.id,operation,c.token);reload();})}><Button loading={action.busy} disabled={operation==='rerun-failed-jobs'&&run.conclusion!=='failure'}>{t(label)}</Button></Popconfirm>)}</div>}
  <Card className="gp-work-content" title={t('任务与步骤')}>
   {jobs.loading?<Spin/>:jobs.error?<RequestError error={jobs.error} retry={jobs.reload}/>:jobs.data?.data.map(job=><details key={job.id} className="gp-work-diff" open><summary>{job.name} <ActionStatus status={job.conclusion||job.status}/></summary><ol>{job.steps.map(step=><li key={step.number}><span className="gp-work-break">{step.name}</span> <ActionStatus status={step.conclusion||step.status}/></li>)}</ol>
    <Button icon={<FileText size={15}/>} loading={action.busy} disabled={job.status!=='completed'} onClick={()=>{if(!c.token)return c.onShowLogin();void action.run(async()=>{const data=await githubDownload(c.owner,c.name,'job',job.id,c.token,`${job.name}.log`);if(data)setLog({title:job.name,...data});});}}>{t('查看日志')}</Button> <a href={job.html_url} target="_blank" rel="noreferrer">{t('查看原文')}</a>
   </details>)}<WorkPager page={jobPage} hasNext={Boolean(jobs.data?.hasNext)} onChange={setJobPage}/>
  </Card>
  <Card className="gp-work-content" title={t('构建产物')}>
   {artifacts.loading?<Spin/>:artifacts.error?<RequestError error={artifacts.error} retry={artifacts.reload}/>:!artifacts.data?.data.length?<p>{t('暂无构建产物')}</p>:<ul className="gp-file-list">{artifacts.data.data.map(file=><li key={file.id}><div className="gp-work-break"><strong>{file.name}</strong><p className="gp-work-muted">{(file.size_in_bytes/1024/1024).toFixed(1)} MB · {t('有效期至')} {new Date(file.expires_at).toLocaleDateString()}</p></div><Button icon={<Download size={16}/>} aria-label={`${t('下载')} ${file.name}`} disabled={file.expired} loading={action.busy} onClick={()=>{if(!c.token)return c.onShowLogin();void action.run(()=>githubDownload(c.owner,c.name,'artifact',file.id,c.token,`${file.name}.zip`));}}>{t(file.expired?'已过期':'下载')}</Button></li>)}</ul>}
   <WorkPager page={artifactPage} hasNext={Boolean(artifacts.data?.hasNext)} onChange={setArtifactPage}/><p className="gp-work-muted">{t('下载需要当前账号的仓库访问权限。浏览器阻止下载时，可在 GitHub 打开此运行记录。')}</p>
  </Card>
  <Modal title={log?.title} visible={Boolean(log)} onCancel={()=>setLog(null)} footer={null} style={{width:'min(960px, calc(100vw - 32px))'}}>{log?.truncated&&<Alert type="warning" content={t('日志较大，仅显示前 2 MB。完整日志请在 GitHub 查看。')}/>}<pre className="gp-code" tabIndex={0}>{log?.text}</pre></Modal>
 </>;
}
