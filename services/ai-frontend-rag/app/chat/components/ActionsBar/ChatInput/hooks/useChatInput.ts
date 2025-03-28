import { useCallback, useState } from "react";

import { useChat } from "@/app/chat/hooks/useChat";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useChatInput = () => {
  const [message, setMessage] = useState<string>("");
  const { addQuestion, generatingAnswer } = useChat();

  const submitQuestion = useCallback(() => {
    if (!generatingAnswer) {
      void addQuestion(message, () => setMessage(""));
    }
  }, [addQuestion, generatingAnswer, message]);

  return {
    message,
    setMessage,
    submitQuestion,
    generatingAnswer,
  };
};
