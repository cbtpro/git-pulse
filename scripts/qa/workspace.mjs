import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const repo = {id:1, name:'project',full_name:'octo/project',html_url:'https://github.com/octo/project',description:'Workspace smoke fixture',default_branch:'main',private:false,stargazers_count:12,forks_count:2,open_issues_count:1,owner:{login:'octo',avatar_url:'',html_url:'https://github.com/octo'}};
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
 await mkdir('review-artifacts/business', {recursive:true});
 for (const width of [390,1280]) {
  const context = await browser.newContext({viewport:{width,height:844},locale:'zh-CN'});
  const page = await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.github.com/**', async route => {
   const url=new URL(route.request().url()); let data={};
   if(url.pathname==='/repos/octo/project') data=repo;
   else if(url.pathname.endsWith('/branches')) data=[{name:'main'},{name:'feature/ui'}];
   else if(url.pathname.endsWith('/readme')) data={name:'README.md',encoding:'base64',content:Buffer.from('# Project\nA readable README.').toString('base64'),size:30,html_url:repo.html_url+'/blob/main/README.md',download_url:'https://raw.githubusercontent.com/octo/project/main/README.md'};
   else if(url.pathname.endsWith('/contents/src/index.ts')) data={name:'index.ts',path:'src/index.ts',encoding:'base64',content:Buffer.from('export const value = 42;').toString('base64'),size:24,html_url:repo.html_url};
   else if(url.pathname.includes('/contents/')) data=[{type:'file',name:'index.ts',path:'src/index.ts',size:24}];
   else if(url.pathname.includes('/search/')) data={items:[],total_count:0};
   else data=[];
   await route.fulfill({json:data});
  });
  await page.goto('http://localhost:1420/#/repo/octo/project');
  await expect(page.getByRole('heading',{name:'octo/project'})).toBeVisible();
  await expect(page.getByText('A readable README.')).toBeVisible();
  await page.getByRole('button',{name:'index.ts',exact:true}).click();
  await expect(page.getByText('export const value = 42;', {exact:true})).toBeVisible();
  await page.screenshot({path:`review-artifacts/business/repository-${width}.png`,fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
  expect(overflow,`Horizontal overflow at ${width}`).toBe(false);
  expect(errors).toEqual([]);
  console.log(`Repository ${width}px: README, file navigation, no overflow or page errors`);
  await context.close();
 }
} finally {await browser.close();}
