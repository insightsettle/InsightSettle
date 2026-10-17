import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import type { TemplateEntry } from './registry';

function AuctionOffer({ title = '', link = '', deadline = '', ended = false }: { title?: string; link?: string; deadline?: string; ended?: boolean }) {
  return <Html lang="ar" dir="rtl"><Head /><Preview>{ended ? 'انتهى عرض القطعة — لم يتم الخصم' : 'رابط دفع قطعة المزاد'}</Preview><Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}><Container style={{ padding: '24px' }}><Heading>Insight</Heading><Text>{title}</Text><Text>{ended ? 'انتهى عرضك لهذه القطعة، ولم يتم خصم أي مبلغ.' : 'الدفع يعني قبول شروط القطعة. مزوّد الدفع محاكى ولا تتحرك أموال حقيقية في هذه النسخة التجريبية.'}</Text>{!ended && <><Text>مهلة الدفع: {deadline}</Text><Button href={link}>عرض القطعة والدفع</Button></>}<Text>{ended ? 'Your offer ended. No payment was charged.' : 'Payment accepts the lot terms. Demo environment: the payment provider is simulated.'}</Text></Container></Body></Html>;
}
export const template = { component: AuctionOffer, subject: 'Insight — تحديث عرض المزاد / Auction offer update' } satisfies TemplateEntry;