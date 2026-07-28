import { cn } from "@/lib/design-system/cn";
import type { FhisClassNameProps } from "@/lib/design-system/types";

interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiConversationProps extends FhisClassNameProps {
  messages: AiMessage[];
}

export function AiConversation({ messages, className }: AiConversationProps) {
  return (
    <div className={cn("fhis-ai-conversation", className)}>
      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "fhis-ai-message",
            msg.role === "user" ? "fhis-ai-message-user" : "fhis-ai-message-assistant"
          )}
        >
          <div>
            <div className="fhis-ai-message-role">{msg.role === "user" ? "Tú" : "IA"}</div>
            <div className="fhis-ai-message-text">{msg.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
