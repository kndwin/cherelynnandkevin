import { ConfirmationEmail } from "../src/confirmation.tsx";
export default function AttendingPreview() {
  return <ConfirmationEmail displayName="Alex Guest" email="alex@example.com" attending="Yes" dietaryRequirements="Vegetarian" />;
}
