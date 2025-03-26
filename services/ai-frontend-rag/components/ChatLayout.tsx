"use client";

import ReactMarkdown from "react-markdown";
import styles from "./ChatLayout.module.scss";
import Icon from "@/components/ui/Icon/Icon";
import { useChatInput } from "@/app/chat/components/ActionsBar/ChatInput/hooks/useChatInput";
import { ChatEditor } from "@/app/chat/components/ActionsBar/ChatInput/components/ChatEditor/ChatEditor";
import { useChatContext } from "@/lib/context";

import "./styles.css";

export default function ChatLayout() {
  const { messages } = useChatContext();

  const { setMessage, submitQuestion, generatingAnswer, message } =
    useChatInput();

  const handleSubmitQuestion = () => {
    if (message.trim() !== "") {
      submitQuestion();
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      <div className="flex flex-1 bg-gray-900 gap-9 overflow-hidden">
        <div className="w-64 bg-gray-900 text-white flex flex-col p-5 space-y-4">
          {[
            "Python Scraping Libraries Comparison",
            "Google uses BERT for Google Search",
          ].map((item, index) => (
            <div
              key={index}
              className="p-2 rounded-md hover:bg-gray-800 transition"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-gray-800 flex flex-col p-5">
          <div className="flex justify-between items-center text-white mb-8">
            <div className="text-2xl">BD Chat</div>
            <Icon name="user" size="big" color="primary" />
          </div>
          <div className="flex flex-col space-y-5 flex-1 overflow-auto">
            {messages.map((message, index) => (
              <div
                className={`
              ${styles.message_row_container} 
              ${message.role === "assistant" ? styles.brain : styles.user}
              `}
                key={index}
              >
                <div className={styles.message_row_content}>
                  <ReactMarkdown
                    className={`
                ${styles.markdown} 
                ${message.role === "assistant" ? styles.brain : styles.user}
                `}
                  >
                    {message.message}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
          <div>
            <form
              data-testid="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitQuestion();
              }}
            >
              <div className={styles.chat_container}>
                <div
                  className={`
                    ${styles.chat_wrapper}
                  `}
                >
                  <ChatEditor
                    message={message}
                    setMessage={setMessage}
                    onSubmit={handleSubmitQuestion}
                  />
                  <Icon
                    name="followUp"
                    size="large"
                    color="accent"
                    handleHover={true}
                    onClick={handleSubmitQuestion}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
