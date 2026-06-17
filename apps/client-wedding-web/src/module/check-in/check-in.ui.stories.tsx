import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CheckInView } from "./check-in.ui.tsx";

const noop = () => {
  void Date.now();
};

const preventSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
  event.preventDefault();
};

const meta = {
  args: {
    email: "kevin@example.com",
    firstName: "Kevin",
    isError: false,
    isSubmitting: false,
    lastName: "Sucasa",
    message: null,
    onFieldChange: noop,
    onFormSubmit: preventSubmit,
    onPasswordVisibilityToggle: noop,
    showPassword: false,
    sitePassword: "wedding",
  },
  component: CheckInView,
  title: "Wedding/CheckInView",
} satisfies Meta<typeof CheckInView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    email: "",
    firstName: "",
    lastName: "",
    sitePassword: "",
  },
};

export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

export const Success: Story = {
  args: {
    message: "Welcome, Cherelynn. Your check-in is saved.",
  },
};

export const Failure: Story = {
  args: {
    isError: true,
    message: "We could not check you in yet. Please try again.",
  },
};
