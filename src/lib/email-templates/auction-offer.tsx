import * as React from 'react'
import { BrandEmail } from './layout'
import type { TemplateEntry } from './registry'

function AuctionOffer({ title = '', link = '', deadline = '', ended = false }: { title?: string; link?: string; deadline?: string; ended?: boolean }) {
  if (ended) {
    return (
      <BrandEmail
        preview="انتهى عرضك على قطعة المزاد · Your auction offer ended"
        ar={{
          heading: 'انتهى عرضك على القطعة',
          paragraphs: ['انتهت مهلة عرضك على هذه القطعة، ولم يُخصم منك أي مبلغ.'],
          facts: title ? [{ label: 'القطعة', value: title }] : undefined,
        }}
        en={{
          heading: 'Your offer has ended',
          paragraphs: ['Your offer on this lot has ended. No payment was taken.'],
          facts: title ? [{ label: 'Lot', value: title }] : undefined,
        }}
      />
    )
  }
  return (
    <BrandEmail
      preview="أنت الفائز — أكمل الدفع لقطعة المزاد · You won — complete payment for your lot"
      actionUrl={link}
      ar={{
        heading: 'مبروك، القطعة بانتظارك',
        paragraphs: ['أكمل الدفع قبل انتهاء المهلة. يبقى المبلغ محفوظاً في الصفقة حتى تستلم القطعة وتتأكد منها. الدفع يعني قبول شروط القطعة.'],
        facts: [
          ...(title ? [{ label: 'القطعة', value: title }] : []),
          ...(deadline ? [{ label: 'مهلة الدفع', value: <bdi dir="ltr">{deadline}</bdi> }] : []),
        ],
        button: 'عرض القطعة والدفع',
      }}
      en={{
        heading: 'Congratulations, your lot is waiting',
        paragraphs: ['Complete payment before the deadline. The amount stays held in the deal until you receive and check the item. Paying accepts the lot terms.'],
        facts: [
          ...(title ? [{ label: 'Lot', value: title }] : []),
          ...(deadline ? [{ label: 'Payment deadline', value: deadline }] : []),
        ],
        button: 'View lot and pay',
      }}
    />
  )
}

export const template = {
  component: AuctionOffer,
  subject: (d: Record<string, any>) => d?.['ended'] ? 'إنسايت · انتهى عرض المزاد | Insight · Auction offer ended' : 'إنسايت · أكمل دفع قطعة المزاد | Insight · Complete your auction payment',
  displayName: 'Auction offer',
  previewData: { title: 'Vintage watch', link: 'https://insightsettle.com/auctions/demo', deadline: '26 Oct 2026, 18:00', ended: false },
} satisfies TemplateEntry
