import * as React from 'react'
import { BrandEmail } from './layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandEmail
    preview="رمز التحقق الخاص بك في إنسايت · Your Insight verification code"
    code={token}
    ar={{
      heading: 'رمز التحقق',
      paragraphs: ['استخدم الرمز التالي لتأكيد هويتك في إنسايت:'],
      note: 'الرمز صالح لفترة قصيرة. لا تشاركه مع أي شخص، حتى لو قال إنه من إنسايت.',
    }}
    en={{
      heading: 'Verification code',
      paragraphs: ['Use this code to confirm your identity on Insight:'],
      note: 'The code expires shortly. Never share it with anyone, even someone claiming to be from Insight.',
    }}
  />
)

export default ReauthenticationEmail
