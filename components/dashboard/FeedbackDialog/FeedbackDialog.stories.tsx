import type { Meta, StoryObj } from "@storybook/react";
import { FeedbackDialog } from "./FeedbackDialog";

const meta = {
  title: "dashboard/FeedbackDialog",
  component: FeedbackDialog,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof FeedbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onDataChange: (data) => console.log("Feedback submitted:", data),
  },
};
