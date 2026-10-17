import { Body, Button, Container, Font, Head, Heading, Html, Preview, Text } from "@react-email/components";

// Match the website's paper/ink/primary tokens. Web fonts are progressive
// enhancement only: every text style also has a safe serif fallback.
const bodyText = { fontFamily: '"Quattrocento", Georgia, serif', fontWeight: 400, fontSize: "16px", lineHeight: "28px", color: "#37430f", margin: "0 0 20px" };
const headingFont = '"Fraunces", Georgia, serif';

export interface ConfirmationSnapshot {
  readonly displayName: string;
  readonly email: string;
  readonly attending: "Yes";
  readonly dietaryRequirements: string;
}

export function ConfirmationEmail({ displayName, dietaryRequirements }: ConfirmationSnapshot) {
  return <Html lang="en"><Head>
    <Font fontFamily="Fraunces" fallbackFontFamily="Georgia" webFont={{ url: "https://fonts.gstatic.com/s/fraunces/v38/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0K7iN7hzFUPJH58nib1603gg7S2nfgRYIctxujDg.ttf", format: "truetype" }} fontWeight={400} fontStyle="normal" />
    <Font fontFamily="Quattrocento" fallbackFontFamily="Georgia" webFont={{ url: "https://fonts.gstatic.com/s/quattrocento/v24/OZpEg_xvsDZQL_LKIF7q4jPHxA.ttf", format: "truetype" }} fontWeight={400} fontStyle="normal" />
  </Head><Preview>Your RSVP for Cherelynn &amp; Kevin’s wedding has been saved.</Preview>
    <Body style={{ ...bodyText, backgroundColor: "#fffef9", margin: "0", padding: "32px 12px" }}>
      <Container style={{ width: "100%", maxWidth: "560px", padding: "24px 20px", boxSizing: "border-box", backgroundColor: "#fffef9", overflowWrap: "anywhere" }}>
        <Text style={{ ...bodyText, color: "#56651f", fontSize: "12px", lineHeight: "20px", letterSpacing: "2px", textAlign: "center", marginBottom: "32px" }}>CHERELYNN &amp; KEVIN</Text>
        <Heading style={{ fontFamily: headingFont, fontWeight: 400, fontSize: "28px", lineHeight: "42px", letterSpacing: "4px", textTransform: "uppercase", color: "#37430f", textAlign: "center", margin: "0 0 40px" }}>We can’t wait to celebrate with you</Heading>
        <Text style={bodyText}>Hi {displayName},</Text>
        <Text style={bodyText}>Your RSVP is saved — you’re joining us!</Text>
        <Text style={{ ...bodyText, padding: "20px 0", borderTop: "1px solid #aeb89a", borderBottom: "1px solid #aeb89a" }}>Saturday, 4 September 2027<br />Ravensthorpe<br />Ceremony at 1:30 pm (Australia/Sydney)</Text>
        {dietaryRequirements && <Text style={bodyText}>Dietary requirements: {dietaryRequirements}</Text>}
        <Text style={bodyText}>You can revisit our website to view the details or update your RSVP.</Text>
        <Button href="https://cherelynnandkevin.com" style={{ ...bodyText, display: "block", fontSize: "13px", fontWeight: 700, lineHeight: "22px", letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", backgroundColor: "#56651f", color: "#fffef9", padding: "20px 12px", borderRadius: "0", margin: "4px 0 28px" }}>Visit our wedding website</Button>
        <Text style={{ ...bodyText, marginBottom: "0" }}>With love,<br />Cherelynn &amp; Kevin</Text>
      </Container>
    </Body>
  </Html>;
}
