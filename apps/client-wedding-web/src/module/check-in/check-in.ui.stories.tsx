import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentProps } from "react";
import { CheckInView, RsvpSectionView } from "./check-in.ui.tsx";

const noop = () => {
  void Date.now();
};

const preventSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
  event.preventDefault();
};

const loginMeta = {
  args: {
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

export default loginMeta;

type LoginStory = StoryObj<typeof loginMeta>;

export const Empty: LoginStory = {
  args: {
    firstName: "",
    lastName: "",
    sitePassword: "",
  },
};

export const Submitting: LoginStory = {
  args: {
    isSubmitting: true,
  },
};

export const Failure: LoginStory = {
  args: {
    isError: true,
    message: "That site password didn't match. Please try again.",
  },
};

const rsvpSectionMeta = {
  args: {
    attending: "",
    email: "",
    firstName: "Kevin",
    isError: false,
    isSubmitting: false,
    message: null,
    notes: "",
    onAttendingChange: noop,
    onFieldChange: noop,
    onFormSubmit: preventSubmit,
  },
  component: RsvpSectionView,
  title: "Wedding/RsvpSectionView",
} satisfies Meta<typeof RsvpSectionView>;

type RsvpSectionStory = StoryObj<typeof rsvpSectionMeta>;

export const RsvpEmpty: RsvpSectionStory = {
  args: {
    ...rsvpSectionMeta.args,
  },
};

export const RsvpSelected: RsvpSectionStory = {
  args: {
    ...rsvpSectionMeta.args,
    attending: "Yes",
    email: "kevin@example.com",
    notes: "Can't wait!",
  },
};

export const RsvpSubmitting: RsvpSectionStory = {
  args: {
    ...rsvpSectionMeta.args,
    attending: "No",
    email: "kevin@example.com",
    isSubmitting: true,
  },
};

export const RsvpFailure: RsvpSectionStory = {
  args: {
    ...rsvpSectionMeta.args,
    attending: "Yes",
    email: "kevin@example.com",
    isError: true,
    message: "We could not save your RSVP yet. Please try again.",
  },
};

export const RsvpSaved: RsvpSectionStory = {
  args: {
    ...rsvpSectionMeta.args,
    attending: "Yes",
    email: "kevin@example.com",
    message: "Thanks, Kevin. Your RSVP is saved.",
    notes: "See you there!",
  },
};
