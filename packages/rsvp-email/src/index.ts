import { createElement } from "react";
import { render, toPlainText } from "@react-email/render";
import { ConfirmationEmail, type ConfirmationSnapshot } from "./confirmation.tsx";

export { ConfirmationEmail, type ConfirmationSnapshot } from "./confirmation.tsx";
export const templateVersion = 1;
export async function renderConfirmation(snapshot: ConfirmationSnapshot) {
  const html = await render(createElement(ConfirmationEmail, snapshot));
  return {
    subject: "Your RSVP is saved — Cherelynn & Kevin",
    html,
    text: toPlainText(html),
  };
}
