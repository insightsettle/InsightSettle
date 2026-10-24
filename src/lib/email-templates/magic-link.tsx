import * as React from 'react'
import { BrandEmail } from './layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <BrandEmail
    preview="رابط الدخول إلى إنسايت · Your Insight sign-in link"
    actionUrl={confirmationUrl}
    ar={{
      heading: 'رابط الدخول إلى حسابك',
      paragraphs: ['اضغط الزر أدناه لتسجيل الدخول إلى إنسايت دون كلمة مرور.'],
      button: 'تسجيل الدخول',
      note: 'الرابط صالح لفترة محدودة ولاستخدام واحد. إذا لم تطلبه، تجاهل الرسالة.',
    }}
    en={{
      heading: 'Your sign-in link',
      paragraphs: ['Use the button below to sign in to Insight without a password.'],
      button: 'Sign in',
      note: "This link works once and for a limited time. If you didn't request it, ignore this email.",
    }}
  />
)

export default MagicLinkEmail
