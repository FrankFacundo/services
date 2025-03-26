import { useChatContext } from "@/lib/context";
import { useFetch } from "@/lib/hooks";

import { useHandleStream } from "./useHandleStream";

import { ChatQuestion } from "../types";
import { generatePlaceHolderMessage } from "../utils/generatePlaceHolderMessage";

interface UseChatService {
  addStreamQuestion: (chatQuestion: ChatQuestion) => Promise<void>;
}

export const useQuestion = (): UseChatService => {
  const { fetchInstance } = useFetch();
  const { handleStream } = useHandleStream();
  const { removeMessage, updateStreamingHistory } = useChatContext();

  const handleFetchError = async (response: Response) => {
    if (response.status === 429) {
      console.error("ERROR 429");
      return;
    }

    const errorMessage = (await response.json()) as { detail: string };
    console.error(errorMessage);
  };

  // Here question is added
  const addStreamQuestion = async (
    chatQuestion: ChatQuestion
  ): Promise<void> => {
    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    const placeHolderMessage = generatePlaceHolderMessage({
      user_message: chatQuestion.question ?? "",
    });
    // here message is added to the chat history
    updateStreamingHistory(placeHolderMessage);

    const body = JSON.stringify(chatQuestion);

    try {
      let url = `/generate`;
      const response = await fetchInstance.post(url, body, headers);
      console.log(response);
      if (!response.ok) {
        void handleFetchError(response);

        return;
      }

      if (response.body === null) {
        throw new Error();
      }

      await handleStream(response.body.getReader(), () => {});
    } catch (error) {
      console.error(error);
    }
  };

  return {
    addStreamQuestion,
  };
};
