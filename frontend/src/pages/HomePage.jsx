import { useChatStore } from '../store/useChatStore.js';
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from '../components/ChatWindow.jsx';

export default function HomePage() {
  const { selectedUser } = useChatStore();

  return (
    <div className="flex h-[calc(100vh-4rem)] supports-[height:100dvh]:h-[calc(100dvh-4rem)] min-h-0 overflow-hidden">
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
        } min-h-0 min-w-0 flex-1 flex-col`}
      >
        <ChatWindow />
      </div>
    </div>
  );
}
