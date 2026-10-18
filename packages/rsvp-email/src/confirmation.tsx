import { Body, Button, Container, Font, Head, Heading, Html, Link, Preview, Text } from "@react-email/components";

// Match the website's paper/ink/primary tokens. Web fonts are progressive
// enhancement only: every text style also has a safe serif fallback.
const bodyText = { fontFamily: '"Quattrocento", Georgia, serif', fontWeight: 400, fontSize: "16px", lineHeight: "28px", color: "#37430f", margin: "0 0 20px" };
const headingFont = '"Fraunces Variable", Georgia, serif';
const venueMapUrl = "https://maps.google.com/maps?q=Ravensthorpe+Estate+Albion+Park+NSW+Australia";

export interface ConfirmationSnapshot {
  readonly displayName: string;
  readonly email: string;
  readonly attending: "Yes";
  readonly dietaryRequirements: string;
}

export function ConfirmationEmail({ displayName, dietaryRequirements }: ConfirmationSnapshot) {
  return <Html lang="en"><Head>
    <Font fontFamily="Fraunces Variable" fallbackFontFamily="Georgia" webFont={{ url: "https://cherelynnandkevin.com/assets/fraunces-latin-wght-normal-ukD16Tqj.woff2", format: "woff2" }} fontWeight="100 900" fontStyle="normal" />
    <Font fontFamily="Quattrocento" fallbackFontFamily="Georgia" webFont={{ url: "https://cherelynnandkevin.com/assets/quattrocento-latin-400-normal-Da3aNouX.woff2", format: "woff2" }} fontWeight={400} fontStyle="normal" />
    <Font fontFamily="Quattrocento" fallbackFontFamily="Georgia" webFont={{ url: "https://cherelynnandkevin.com/assets/quattrocento-latin-700-normal-BdsJF-a_.woff2", format: "woff2" }} fontWeight={700} fontStyle="normal" />
  </Head><Preview>Your RSVP for Cherelynn &amp; Kevin’s wedding has been saved.</Preview>
    <Body style={{ ...bodyText, backgroundColor: "#fffef9", margin: "0", padding: "32px 12px" }}>
      <Container style={{ width: "100%", maxWidth: "560px", padding: "24px 20px", boxSizing: "border-box", backgroundColor: "#fffef9", overflowWrap: "anywhere" }}>
        <Text style={{ ...bodyText, color: "#56651f", fontSize: "12px", lineHeight: "20px", letterSpacing: "2px", textAlign: "center", marginBottom: "32px" }}>CHERELYNN &amp; KEVIN</Text>
        <Heading style={{ fontFamily: headingFont, fontWeight: 200, fontSize: "28px", lineHeight: "42px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#37430f", textAlign: "center", margin: "0 0 40px" }}>We can’t wait to celebrate with you</Heading>
        <Text style={bodyText}>Hi {displayName},</Text>
        <Text style={bodyText}>We’ve received your RSVP, thanks for joining us!</Text>
        <Text style={{ ...bodyText, padding: "0 0" }}>Saturday, 4 September 2027<br /><Link href={venueMapUrl} style={{ ...bodyText, textDecoration: "underline" }}>Ravensthorpe Estate</Link><br />Ceremony at 1:30 pm (Sydney Time)
        {dietaryRequirements && <><br />Dietary requirements: {dietaryRequirements}</>}
        </Text>
        <Text style={bodyText}>You can revisit our website to view the details or update your RSVP.</Text>
        <Button href="https://cherelynnandkevin.com" style={{ ...bodyText, display: "block", fontSize: "13px", fontWeight: 700, lineHeight: "22px", letterSpacing: "0.2em", textTransform: "uppercase", textAlign: "center", backgroundColor: "#56651f", color: "#fffef9", padding: "20px 12px", borderRadius: "0", margin: "4px 0 28px" }}>Visit our wedding website</Button>
        <Text style={{ ...bodyText, marginBottom: "0" }}>With love,<br />Cherelynn &amp; Kevin</Text>
      </Container>
    </Body>
  </Html>;
}
