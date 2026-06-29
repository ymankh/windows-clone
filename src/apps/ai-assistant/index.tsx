import { Bot } from "lucide-react";
import type { DesktopApp } from "../types";
import AIAssistantComponent from "./Component";

export const AIAssistantApp: DesktopApp = {
  id: "ai-assistant",
  title: "AI Assistant",
  icon: Bot,
  Component: AIAssistantComponent,
  defaultWindowBounds: {
    width: 1040,
    height: 680,
    x: 96,
    y: 48,
  },
};
