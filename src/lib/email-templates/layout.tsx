import * as React from 'react'
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'

/**
 * Shared bilingual Insight email layout (Arabic first, then English).
 * Email-safe: inline styles, table-based layout from React Email, system fonts only
 * (brand webfonts are not embedded in emails).
 */

export const BRAND = {
  green: '#138065',
  greenDark: '#0C2A22',
  mint: '#55BD8A',
  paper: '#F6FAF8',
  tint: '#E9F7F0',
  ink: '#0C2A22',
  muted: '#4B625C',
  line: '#DCEBE5',
  site: 'https://insightsettle.com',
}

const AR_FONT = "Tahoma, 'Segoe UI', 'Geeza Pro', Arial, sans-serif"
const EN_FONT = "'Segoe UI', Helvetica, Arial, sans-serif"

export type Lang = 'ar' | 'en'

export interface Block {
  heading: string
  paragraphs: React.ReactNode[]
  /** Optional key/value rows shown in a tinted box (e.g. deal reference, deadline). */
  facts?: { label: string; value: React.ReactNode }[] | undefined
  button?: string | undefined
  note?: string | undefined
}

export interface BrandEmailProps {
  preview: string
  ar: Block
  en: Block
  actionUrl?: string | undefined
  /** Large one-time code shown in both sections instead of a button. */
  code?: string | undefined
  /** Shows the demo/test-environment line in the footer. */
  demo?: boolean
  /** Replaces the default no-reply footer line (e.g. internal emails meant to be replied to). */
  footer?: { ar: string; en: string }
}

function Section_({ lang, block, actionUrl, code }: { lang: Lang; block: Block; actionUrl?: string | undefined; code?: string | undefined }) {
  const rtl = lang === 'ar'
  const font = rtl ? AR_FONT : EN_FONT
  const align = rtl ? 'right' : 'left'
  return (
    <Section dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '28px 36px 8px', textAlign: align, fontFamily: font }}>
      <Text style={{ margin: '0 0 6px', fontSize: '12px', letterSpacing: rtl ? '0' : '0.08em', color: BRAND.green, fontWeight: 700, textTransform: rtl ? 'none' : 'uppercase' }}>
        {rtl ? 'العربية' : 'English'}
      </Text>
      <Text style={{ margin: '0 0 16px', fontSize: '22px', lineHeight: '1.4', fontWeight: 700, color: BRAND.ink }}>{block.heading}</Text>
      {block.paragraphs.map((p, i) => (
        <Text key={i} style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: '1.75', color: BRAND.muted }}>{p}</Text>
      ))}
      {block.facts && block.facts.length > 0 && (
        <Section style={{ margin: '6px 0 18px', backgroundColor: BRAND.tint, borderRadius: '12px', padding: '14px 18px' }}>
          {block.facts.map((f, i) => (
            <Text key={i} style={{ margin: i === 0 ? '0' : '8px 0 0', fontSize: '14px', lineHeight: '1.6', color: BRAND.ink }}>
              <span style={{ color: BRAND.muted }}>{f.label}: </span><strong>{f.value}</strong>
            </Text>
          ))}
        </Section>
      )}
      {code && (
        <Text dir="ltr" style={{ margin: '6px 0 18px', fontFamily: "'Courier New', monospace", fontSize: '30px', letterSpacing: '0.3em', fontWeight: 700, color: BRAND.greenDark, backgroundColor: BRAND.tint, borderRadius: '12px', padding: '14px 18px', textAlign: 'center' }}>{code}</Text>
      )}
      {actionUrl && block.button && (
        <Section style={{ margin: '8px 0 18px', textAlign: align }}>
          <Button href={actionUrl} style={{ backgroundColor: BRAND.green, color: '#ffffff', fontFamily: font, fontSize: '15px', fontWeight: 700, borderRadius: '10px', padding: '14px 26px', textDecoration: 'none', display: 'inline-block' }}>
            {block.button}
          </Button>
        </Section>
      )}
      {block.note && <Text style={{ margin: '0 0 18px', fontSize: '13px', lineHeight: '1.7', color: BRAND.muted }}>{block.note}</Text>}
    </Section>
  )
}

export function BrandEmail({ preview, ar, en, actionUrl, code, demo = true, footer }: BrandEmailProps) {
  return (
    <Html lang="ar" dir="rtl">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: '32px 12px', backgroundColor: BRAND.paper }}>
        <Container style={{ maxWidth: '600px', width: '100%', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '18px', border: `1px solid ${BRAND.line}`, overflow: 'hidden' }}>
          <Section style={{ backgroundColor: BRAND.greenDark, padding: '22px 36px', textAlign: 'center' }}>
            <Link href={BRAND.site}>
              <Img src={`${BRAND.site}/brand/insight-logo-white.png`} alt="Insight" width="132" height="63" style={{ display: 'inline-block', border: 0 }} />
            </Link>
          </Section>
          <Section style={{ height: '4px', backgroundColor: BRAND.mint, lineHeight: '4px', fontSize: '1px' }}>&nbsp;</Section>

          <Section_ lang="ar" block={ar} actionUrl={actionUrl} code={code} />
          <Hr style={{ borderColor: BRAND.line, margin: '4px 36px' }} />
          <Section_ lang="en" block={en} actionUrl={actionUrl} code={code} />

          {actionUrl && (
            <Section style={{ padding: '0 36px 20px' }}>
              <Text dir="ltr" style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: BRAND.muted, fontFamily: EN_FONT, textAlign: 'left' }}>
                <span dir="rtl" style={{ fontFamily: AR_FONT }}>إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:</span><br />
                If the button doesn&apos;t work, copy this link into your browser:<br />
                <Link href={actionUrl} style={{ color: BRAND.green, wordBreak: 'break-all' }}>{actionUrl}</Link>
              </Text>
            </Section>
          )}

          <Section style={{ backgroundColor: BRAND.paper, borderTop: `1px solid ${BRAND.line}`, padding: '20px 36px', textAlign: 'center' }}>
            <Text dir="rtl" style={{ margin: '0 0 4px', fontSize: '12px', lineHeight: '1.7', color: BRAND.muted, fontFamily: AR_FONT }}>
              {footer?.ar ?? 'رسالة آلية من إنسايت، يُرجى عدم الرد عليها. لن نطلب منك أبداً كلمة المرور أو رمز التحقق.'}
            </Text>
            <Text dir="ltr" style={{ margin: '0 0 10px', fontSize: '12px', lineHeight: '1.7', color: BRAND.muted, fontFamily: EN_FONT }}>
              {footer?.en ?? 'Automated message from Insight — please do not reply. We will never ask for your password or verification code.'}
            </Text>
            {demo && (
              <>
                <Text dir="rtl" style={{ margin: '0 0 2px', fontSize: '11px', lineHeight: '1.6', color: BRAND.muted, fontFamily: AR_FONT }}>
                  نسخة تجريبية: مزوّد الدفع محاكى ولا تتحرك أموال حقيقية.
                </Text>
                <Text dir="ltr" style={{ margin: '0 0 10px', fontSize: '11px', lineHeight: '1.6', color: BRAND.muted, fontFamily: EN_FONT }}>
                  Demo: the payment provider is simulated; no real money moves.
                </Text>
              </>
            )}
            <Text style={{ margin: 0, fontSize: '12px', fontFamily: EN_FONT }}>
              <Link href={BRAND.site} style={{ color: BRAND.green, fontWeight: 700, textDecoration: 'none' }}>insightsettle.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
