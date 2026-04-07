"use client";

import * as React from "react";
import { Bot, MessageCircle, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/ui-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const NIRA_GREETING =
  "Hello there! I'm Nira, your personal library assistant. Need help with books, your account, or anything else in the GTTC LMS? I'm always here for you.";

const SUGGESTED_QUESTIONS = [
  "How do I borrow a book from GTTC LMS?",
  "How can I donate books and track approval?",
  "Where can I find notes, question papers, and topic videos?",
  "How do student verification and face verification work?",
];

function createMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
  };
}

export function NiraChatbot() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const initializedRef = React.useRef(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    setMessages([createMessage("assistant", NIRA_GREETING)]);
  }, [open]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isSending) {
        return;
      }

      setIsSending(true);
      setDraft("");

      const userMessage = createMessage("user", content);
      setMessages((current) => [...current, userMessage]);

      try {
        const response = await api.sendChatbotMessage({ message: content });
        const reply =
          response.reply?.trim() ||
          "I could not find an answer right now. Please try again.";

        setMessages((current) => [
          ...current,
          createMessage("assistant", reply),
        ]);
      } catch (error) {
        const fallback =
          "I am having trouble connecting right now. Please try again in a moment.";
        setMessages((current) => [
          ...current,
          createMessage("assistant", fallback),
        ]);
        toast.error(getErrorMessage(error, "Unable to reach Nira"));
      } finally {
        setIsSending(false);
      }
    },
    [isSending],
  );

  const showSuggestions = messages.length <= 1;

  return (
    <div className="fixed bottom-20 right-4 z-[80] sm:bottom-24 sm:right-6">
      {open ? (
        <Card className="mb-3 flex h-[min(520px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] flex-col overflow-hidden border-border/60 shadow-2xl shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 bg-primary/5 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-primary" />
              Nira Assistant
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                </div>
              ))}

              {showSuggestions ? (
                <div className="space-y-2 pt-1">
                  <p className="px-1 text-xs font-medium text-muted-foreground">
                    Suggested questions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((question) => (
                      <button
                        key={question}
                        type="button"
                        className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                        onClick={() => {
                          void sendMessage(question);
                        }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isSending ? (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Nira is typing...
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(draft);
              }}
              className="flex items-center gap-2 border-t border-border/50 p-3"
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask Nira anything about GTTC LMS..."
                className="h-10"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSending || !draft.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-14 rounded-full px-5 shadow-xl shadow-primary/20"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="mr-2 h-5 w-5" />
        Chat with Nira
      </Button>
    </div>
  );
}
