import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogTitle } from '@/components/ui/dialog';
import { consoleSearch } from '@/lib/staff-control.functions';
import { useLocale } from '@/lib/locale';
export function ConsoleSearch(){
 const {text}=useLocale();const fn=useServerFn(consoleSearch);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [term,setTerm]=useState('');
 const result=useQuery({queryKey:['console-search',term],queryFn:()=>fn({data:{query:term}}),enabled:open&&term.length>=2});
 return <><Button variant="ghost" size="icon" aria-label={text('Global search','البحث الشامل')} title={text('Global search','البحث الشامل')} onClick={()=>setOpen(true)}><Search/></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent data-no-localize className="max-h-[80vh] overflow-y-auto"><DialogTitle>{text('Global search','البحث الشامل')}</DialogTitle><form className="flex min-w-0 gap-2" onSubmit={e=>{e.preventDefault();setTerm(query.trim());}}><Input autoFocus aria-label={text('Search email, phone, name or reference','ابحث بالبريد أو الهاتف أو الاسم أو المرجع')} value={query} onChange={e=>setQuery(e.target.value)} placeholder={text('Email, phone, name, DL-, invoice or provider ref','البريد، الهاتف، الاسم، الصفقة، الفاتورة أو مرجع المزوّد')} minLength={2} maxLength={120}/><Button size="icon" aria-label={text('Search','بحث')}><Search/></Button></form>{result.isFetching&&<p>{text('Searching…','جارٍ البحث…')}</p>}{result.isError&&<p role="alert" className="text-destructive">{text('Search unavailable','تعذّر البحث')}</p>}<div className="divide-y">{result.data?.map(r=><div key={`${r.kind}-${r.id}`} className="py-3" onClick={()=>setOpen(false)}>{r.kind==='user'?<Link to="/console/users/$userId" params={{userId:r.id}} className="block min-w-0 break-words font-medium">{r.label}</Link>:<Link to="/console/deals/$dealId" params={{dealId:r.id}} className="block min-w-0 break-words font-medium">{r.label}</Link>}<p className="break-words text-xs text-muted-foreground">{r.detail}</p></div>)}</div>{result.data?.length===0&&<p>{text('No matches','لا توجد نتائج')}</p>}</DialogContent></Dialog></>;
}
