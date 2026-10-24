import * as React from 'react'
import { BrandEmail } from './layout'
import type { TemplateEntry } from './registry'

function DealInvitation({ title = '', link = '' }: { title?: string; link?: string }) {
  return (
    <BrandEmail
      preview={`دعوة لمراجعة صفقة على إنسايت · Invitation to review a deal${title ? ` — ${title}` : ''}`}
      actionUrl={link}
      ar={{
        heading: 'لديك دعوة لمراجعة صفقة',
        paragraphs: ['دعاك الطرف الآخر إلى صفقة على إنسايت. راجع الشروط والمبلغ، ثم اقبلها أو اطلب تعديلها. يبقى المبلغ محفوظاً في الصفقة حتى تتم كما اتفقتما.'],
        facts: title ? [{ label: 'الصفقة', value: title }] : undefined,
        button: 'مراجعة الصفقة',
        note: 'إذا لم تكن تعرف هذه الصفقة، لا تتخذ أي إجراء وتجاهل الرسالة.',
      }}
      en={{
        heading: 'You have a deal to review',
        paragraphs: ['The other party invited you to a deal on Insight. Review the terms and amount, then accept or ask for changes. The amount stays held in the deal until it completes as agreed.'],
        facts: title ? [{ label: 'Deal', value: title }] : undefined,
        button: 'Review the deal',
        note: "If you don't recognise this deal, take no action and ignore this email.",
      }}
    />
  )
}

export const template = {
  component: DealInvitation,
  subject: (d: Record<string, any>) => `إنسايت · دعوة لمراجعة صفقة | Insight · Deal invitation${d?.['title'] ? ` — ${d['title']}` : ''}`,
  displayName: 'Deal invitation',
  previewData: { title: 'Office chairs from a factory', link: 'https://insightsettle.com/invite/demo' },
} satisfies TemplateEntry
