import ChatLayout from "@/components/ChatLayout";
import { ChatProvider } from "@/lib/context";

export default function Home() {
  return (
    <div>
      <ChatProvider>
        <ChatLayout />
      </ChatProvider>
    </div>
  );
}
