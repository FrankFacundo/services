/* eslint-disable max-lines */
import { useState } from "react";
import { useQuestion } from "./useQuestion";

import { ChatQuestion } from "../types";

export const useChat = () => {
  const [generatingAnswer, setGeneratingAnswer] = useState(false);

  const { addStreamQuestion } = useQuestion();

  const addQuestion = async (question: string, callback?: () => void) => {
    const chatQuestion: ChatQuestion = {
      question,
    };

    callback?.();
    // Here question is added
    await addStreamQuestion(chatQuestion);
  };

  return {
    addQuestion,
    generatingAnswer,
  };
};
