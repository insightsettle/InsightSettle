import { Body, Button, Container, Head, Html, Text } from '@react-email/components';
import type { TemplateEntry } from './registry';
function DealInvitation({title='',link=''}:{title?:string;link?:string}){
 return <Html lang="ar" dir="rtl"><Head/><Body><Container><Text>إنسايت | Insight</Text><Text>{title}</Text><Text>دعوة لمراجعة صفقة — Invitation to review a deal</Text><Button href={link}>عرض الصفقة / View deal</Button><Text>نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية.</Text><Text>Demo: payment provider simulated; no real money moves.</Text></Container></Body></Html>;
}
export const template={component:DealInvitation,subject:'Insight — دعوة صفقة / Deal invitation'} satisfies TemplateEntry;
