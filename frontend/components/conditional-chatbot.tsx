"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NiraChatbot } from "@/components/nira-chatbot";

export function ConditionalChatbot() {
  const path = usePathname() || "/";

  // Hide chatbot on Departments pages
  if (path.startsWith("/departments")) {
    return null;
  }

  return <NiraChatbot />;
}

export default ConditionalChatbot;
