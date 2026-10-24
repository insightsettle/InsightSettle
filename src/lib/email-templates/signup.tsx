import * as React from 'react'
import { BrandEmail } from './layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandEmail
    preview="أكّد بريدك لتفعيل حسابك في إنسايت · Confirm your email for Insight"
    actionUrl={confirmationUrl}
    ar={{
      heading: 'مرحباً بك في إنسايت',
      paragraphs: [
        'شكراً لإنشاء حسابك. خطوة أخيرة: أكّد بريدك الإلكتروني لتفعيل الحساب والبدء بأول صفقة.',
        <>البريد المسجّل: <bdi dir="ltr">{recipient}</bdi></>,
      ],
      button: 'تأكيد البريد الإلكتروني',
      note: 'إذا لم تُنشئ هذا الحساب، تجاهل هذه الرسالة ولن يتم تفعيل أي شيء.',
    }}
    en={{
      heading: 'Welcome to Insight',
      paragraphs: [
        'Thanks for creating your account. One last step: confirm your email to activate it and start your first deal.',
        <>Registered email: <bdi>{recipient}</bdi></>,
      ],
      button: 'Confirm email',
      note: "If you didn't create this account, you can ignore this email and nothing will be activated.",
    }}
  />
)

export default SignupEmail
