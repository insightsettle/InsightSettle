import * as React from 'react'
import { BrandEmail } from './layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => {
  const from = oldEmail || email
  return (
    <BrandEmail
      preview="أكّد تغيير بريدك في إنسايت · Confirm your Insight email change"
      actionUrl={confirmationUrl}
      ar={{
        heading: 'تأكيد تغيير البريد الإلكتروني',
        paragraphs: ['طُلب تغيير البريد المرتبط بحسابك في إنسايت. أكّد التغيير بالضغط على الزر.'],
        facts: [
          { label: 'من', value: <bdi dir="ltr">{from}</bdi> },
          { label: 'إلى', value: <bdi dir="ltr">{newEmail}</bdi> },
        ],
        button: 'تأكيد التغيير',
        note: 'إذا لم تطلب هذا التغيير، لا تضغط الزر وتواصل معنا فوراً لحماية حسابك.',
      }}
      en={{
        heading: 'Confirm your email change',
        paragraphs: ['A change to the email on your Insight account was requested. Confirm it with the button below.'],
        facts: [
          { label: 'From', value: from },
          { label: 'To', value: newEmail },
        ],
        button: 'Confirm change',
        note: "If you didn't request this, don't click the button and contact us right away to protect your account.",
      }}
    />
  )
}

export default EmailChangeEmail
