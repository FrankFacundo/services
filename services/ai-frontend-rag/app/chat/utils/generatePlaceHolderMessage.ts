import { ChatMessage } from "../types";

type GeneratePlaceHolderMessageProps = {
  user_message: string;
};

export const generatePlaceHolderMessage = ({
  user_message,
}: GeneratePlaceHolderMessageProps): ChatMessage => {
  return {
    message: user_message,
    message_id: new Date().getTime().toString(),
    role: "user",
    timestamp: new Date(
      new Date().setDate(new Date().getDate() + 1)
    ).toISOString(),
  };
};
