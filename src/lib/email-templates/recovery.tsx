import * as React from 'react'
import { BrandEmail } from './layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <BrandEmail
    preview="رابط تعيين كلمة مرور جديدة لحسابك في إنسايت · Reset your Insight password"
    actionUrl={confirmationUrl}
    ar={{
      heading: 'تعيين كلمة مرور جديدة',
      paragraphs: ['وصلنا طلب لتعيين كلمة مرور جديدة لحسابك. اضغط الزر أدناه واختر كلمة مرور جديدة.'],
      button: 'تعيين كلمة المرور',
      note: 'الرابط صالح لفترة محدودة ولاستخدام واحد. إذا لم تطلب ذلك، تجاهل الرسالة وستبقى كلمة مرورك كما هي.',
    }}
    en={{
      heading: 'Reset your password',
      paragraphs: ['We received a request to set a new password for your account. Use the button below to choose a new one.'],
      button: 'Set a new password',
      note: "This link works once and for a limited time. If you didn't ask for it, ignore this email and your password stays the same.",
    }}
  />
)

export default RecoveryEmail
