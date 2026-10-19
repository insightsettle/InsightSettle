import { Body, Container, Head, Heading, Html, Img, Preview, Text } from "@react-email/components";
import { CONTACT_RECIPIENT } from "../contact-request";
import type { TemplateEntry } from "./registry";

function ContactRequest({ email = "" }: { email?: string }) {
  return <Html lang="ar" dir="rtl"><Head /><Preview>مهتم جديد بالتواصل مع Insight</Preview>
    <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" }}>
      <Container style={{ padding: "32px 24px" }}>
        <Img src="https://insightsettle.com/brand/insight-logo.png" alt="Insight" width="140" />
        <Heading>طلب تواصل جديد</Heading>
        <Text>أرسل أحد زوّار الموقع بريده ووافق على التواصل معه بشأن اهتمامه بإنسايت.</Text>
        <Text dir="ltr">{email}</Text>
        <Text>يمكنك الرد على هذه الرسالة للتواصل معه مباشرة.</Text>
        <Text>New contact request from the Insight homepage. Reply to this email to contact the visitor.</Text>
      </Container>
    </Body>
  </Html>;
}

export const template = {
  component: ContactRequest,
  subject: "Insight — طلب تواصل جديد / New contact request",
  to: CONTACT_RECIPIENT,
  displayName: "Contact request",
  previewData: { email: "visitor@example.com" },
} satisfies TemplateEntry;