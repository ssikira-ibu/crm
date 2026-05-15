"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  className?: string;
  autoFocus?: boolean;
  large?: boolean;
}

export function ChatInput({
  onSend,
  onStop,
  disabled,
  isStreaming,
  className,
  autoFocus,
  large,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <form
      className={cn(
        "flex items-center gap-3 rounded-full border border-border/60 bg-muted/50 pl-5 pr-3 shadow-xs backdrop-blur transition-colors focus-within:border-border focus-within:bg-muted/70 dark:bg-muted/40 dark:focus-within:bg-muted/60",
        large ? "min-h-14 py-2" : "min-h-13 py-2",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        readOnly={disabled}
        aria-disabled={disabled}
        autoFocus={autoFocus}
        className="max-h-40 min-h-8 flex-1 resize-none border-0 bg-transparent px-0 py-1 text-base shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-base dark:bg-transparent"
        rows={1}
      />
      <Button
        size="icon"
        type={isStreaming ? "button" : "submit"}
        disabled={isStreaming ? !onStop : !canSend}
        onClick={isStreaming ? onStop : undefined}
        className="size-9 shrink-0 rounded-full"
        aria-label={isStreaming ? "Stop response" : "Send message"}
      >
        {isStreaming ? <Square className="fill-current" /> : <ArrowUp />}
      </Button>
    </form>
  );
}
