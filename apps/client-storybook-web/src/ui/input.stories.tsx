import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@/components/ui/input.tsx";

const meta = {
  component: Input,
  title: "Wedding/Input",
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    placeholder: "Enter your name",
  },
};

export const Filled: Story = {
  args: {
    value: "Cherelynn",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Locked",
  },
};
