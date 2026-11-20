import {useEffect,useState} from 'react';
import {TokenManager} from '../services/auth/TokenManager';
export function useAccountWorkspace(id:string|null) {
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const changed=(event:Event)=>{if((event as CustomEvent).detail===id)setRevision(v=>v+1);};window.addEventListener('gitpulse:workspace',changed);return()=>window.removeEventListener('gitpulse:workspace',changed);},[id]);
 void revision;
 return TokenManager.getWorkspace(id);
}
