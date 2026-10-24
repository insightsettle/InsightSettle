import * as React from 'react'
import { BrandEmail } from './layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <BrandEmail
    preview="تمت دعوتك إلى إنسايت · You've been invited to Insight"
    actionUrl={confirmationUrl}
    ar={{
      heading: 'تمت دعوتك إلى إنسايت',
      paragraphs: ['أُنشئت لك دعوة للانضمام إلى إنسايت، المنصة التي تحفظ مبلغ الصفقة حتى يستلم كل طرف ما اتفق عليه.'],
      button: 'قبول الدعوة',
      note: 'إذا لم تكن تتوقع هذه الدعوة، تجاهل الرسالة.',
    }}
    en={{
      heading: "You've been invited to Insight",
      paragraphs: ['You have been invited to join Insight, where the deal amount is held until each side receives what was agreed.'],
      button: 'Accept invitation',
      note: "If you weren't expecting this invitation, you can ignore this email.",
    }}
  />
)

export default InviteEmail
