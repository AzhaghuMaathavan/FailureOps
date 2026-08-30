import { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Chat } from './components/Chat';
import { IntelligenceView } from './components/IntelligenceView';
import { api } from './api';
import type { Document, Conversation } from './api';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'intelligence'>('intelligence');

  const fetchDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  };

  const fetchConversations = async () => {
    try {
      const convs = await api.getConversations();
      setConversations(convs);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchConversations();
    const interval = setInterval(() => {
      fetchDocuments();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setActiveView('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      if (activeConversationId === id) setActiveConversationId(null);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans">
      <Sidebar 
        documents={documents} 
        onRefresh={fetchDocuments}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        activeView={activeView}
        onSelectView={setActiveView}
      />
      {activeView === 'intelligence' ? (
        <IntelligenceView 
          documents={documents} 
          onRefreshDocuments={fetchDocuments} 
        />
      ) : (
        <Chat 
          documents={documents}
          activeConversationId={activeConversationId}
          setActiveConversationId={(id: string) => {
            setActiveConversationId(id);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}

export default App;
