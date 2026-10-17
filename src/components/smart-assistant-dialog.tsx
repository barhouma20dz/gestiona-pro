"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
import { assistantApi } from "@/lib/api";
import type { AssistantResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
  metrics?: AssistantResponse["metrics"];
}

const DEFAULT_SUGGESTIONS = [
  "📊 ملخص أداء ومبيعات اليوم",
  "⚠️ ما هي المنتجات التي أوشكت على النفاد؟",
  "⏳ ما هي الدفعات المعرضة لانتهاء الصلاحية؟",
  "🚚 ما هي فواتير الموردين المستحقة؟",
  "👥 من هم الزبائن الذين لديهم ديون؟",
  "💼 ما هو وضع صندوق الكاشير والوردية الحالية؟",
];

export function SmartAssistantDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "مرحباً بك! أنا **المساعد الذكي لنظام Gestiona Pro**.\n\nأنا مرتبط بقاعدة بيانات متجرك وأجيبك بدقة 100% وبأرقام حقيقية ومحدثة لحظة بلحظة عن المبيعات، الأرباح، المخزون، الصلاحيات، وفواتير الموردين والزبائن.\n\nكيف يمكنني مساعدتك الآن؟",
      time: new Date().toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) => assistantApi.ask(q),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "assistant",
          text: data.answer,
          time: new Date().toLocaleTimeString("ar-DZ", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          metrics: data.metrics,
        },
      ]);
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: "assistant",
          text: `عذراً، حدث خطأ أثناء معالجة الاستفسار: ${err?.message || "خطأ غير معروف"}`,
          time: new Date().toLocaleTimeString("ar-DZ", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || askMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "user",
        text,
        time: new Date().toLocaleTimeString("ar-DZ", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setInput("");
    askMutation.mutate(text);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  // Simple Markdown renderer helper
  const renderFormattedText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-sm text-primary mt-2 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <div
            key={idx}
            className="p-2.5 my-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200"
          >
            {line.replace("> ", "")}
          </div>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <div key={idx} className="flex items-start gap-1.5 text-xs my-0.5">
            <span className="text-primary font-bold">•</span>
            <span
              dangerouslySetInnerHTML={{
                __html: line
                  .replace("- ", "")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/`(.*?)`/g, "<code class='px-1 py-0.5 bg-muted rounded font-mono text-[11px]'>$1</code>"),
              }}
            />
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p
          key={idx}
          className="text-xs leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
              .replace(/`(.*?)`/g, "<code class='px-1 py-0.5 bg-muted rounded font-mono text-[11px]'>$1</code>"),
          }}
        />
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 px-6 border-b bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>مساعد متجر Gestiona Pro الذكي</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    مرتبط بقاعدة البيانات
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إجابات موثقة 100% مستندة إلى بيانات متجرك اللحظية دون تخمين
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Quick Suggestion Chips */}
        <div className="px-6 py-2.5 border-b bg-muted/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 shrink-0">
            <Lightbulb className="h-3 w-3 text-amber-500" />
            اسأل سريعاً:
          </span>
          {DEFAULT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              disabled={askMutation.isPending}
              className="text-[11px] bg-background hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 border rounded-full px-2.5 py-1 transition shrink-0"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-[88%]",
                msg.sender === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
              )}
            >
              <div
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                )}
              >
                {msg.sender === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div
                className={cn(
                  "rounded-2xl p-4 shadow-sm",
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none text-sm"
                    : "bg-card border rounded-tl-none space-y-1 text-card-foreground"
                )}
              >
                {msg.sender === "user" ? (
                  <p>{msg.text}</p>
                ) : (
                  renderFormattedText(msg.text)
                )}
                <span
                  className={cn(
                    "text-[10px] block mt-1",
                    msg.sender === "user"
                      ? "text-primary-foreground/70 text-left"
                      : "text-muted-foreground text-left"
                  )}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {askMutation.isPending && (
            <div className="flex gap-3 max-w-[85%] ml-auto">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none p-3.5 bg-card border flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                <span>جاري قراءة وتحليل بيانات المتجر...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب استفسارك هنا (مثلاً: كم مبيعات وأرباح اليوم؟)"
              className="flex-1"
              disabled={askMutation.isPending}
              autoFocus
            />
            <Button
              type="submit"
              disabled={!input.trim() || askMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0 px-4"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">إرسال</span>
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
