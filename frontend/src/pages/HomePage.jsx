import { useEffect } from 'react';
import { useChatStore } from '../store/useChatStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from '../components/ChatWindow.jsx';

export default function HomePage() {
  const { selectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const socket = useAuthStore((state) => state.socket);

  useEffect(() => {
    if (!socket) return;
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  return (
    <div className="app-chat-layout flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar: always visible on md+, hidden on mobile when chat open */}
      <div
        className={`${
          selectedUser ? 'hidden md:flex' : 'flex'
        } min-h-0 w-full flex-shrink-0 border-r border-base-300 md:w-80 lg:w-96`}
      >
        <Sidebar />
      </div>

      {/* Chat Window: always visible on md+, hidden on mobile when no user selected */}
      <div
        className={`${
          selectedUser ? 'flex' : 'hidden md:flex'
        } min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
      >
        <ChatWindow />
      </div>
    </div>
  );
}
