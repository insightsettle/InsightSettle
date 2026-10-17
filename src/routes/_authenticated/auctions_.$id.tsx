import { createFileRoute } from '@tanstack/react-router';
import { AuctionOrganiser } from '@/components/auction/AuctionOrganiser';
export const Route=createFileRoute('/_authenticated/auctions_/$id')({head:()=>({meta:[{title:'Auction management | Insight'},{name:'description',content:'Review auction lots, winning bidders, payment deadlines and payout shares.'},{property:'og:title',content:'Insight auction management'},{property:'og:description',content:'Track every auction lot from winner recording through inspection.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:Page});
function Page(){const {id}=Route.useParams();return <AuctionOrganiser id={id}/>;}
