import * as React from 'react'
import { CONTACT_RECIPIENT } from '../contact-request'
import { BrandEmail } from './layout'
import type { TemplateEntry } from './registry'

function ContactRequest({ email = '' }: { email?: string }) {
  return (
    <BrandEmail
      preview="طلب تواصل جديد من موقع إنسايت · New contact request"
      demo={false}
      footer={{ ar: 'رسالة داخلية لفريق إنسايت. ردّك على هذه الرسالة يصل إلى الزائر مباشرة.', en: 'Internal message for the Insight team. Replying to this email reaches the visitor directly.' }}
      ar={{
        heading: 'طلب تواصل جديد',
        paragraphs: ['أرسل زائر بريده من الموقع ووافق على التواصل معه. الطلب محفوظ أيضاً في صندوق الدعم بلوحة الإدارة.'],
        facts: [{ label: 'بريد الزائر', value: <bdi dir="ltr">{email}</bdi> }],
        note: 'ردّ على هذه الرسالة للتواصل معه، ثم حدّث حالة الطلب في صندوق الدعم.',
      }}
      en={{
        heading: 'New contact request',
        paragraphs: ['A visitor left their email on the website and agreed to be contacted. The request is also saved in the console support inbox.'],
        facts: [{ label: 'Visitor email', value: email }],
        note: 'Reply to this email to reach them, then update the request status in the support inbox.',
      }}
    />
  )
}

export const template = {
  component: ContactRequest,
  subject: 'إنسايت · طلب تواصل جديد | Insight · New contact request',
  to: CONTACT_RECIPIENT,
  displayName: 'Contact request',
  previewData: { email: 'visitor@example.com' },
} satisfies TemplateEntry
