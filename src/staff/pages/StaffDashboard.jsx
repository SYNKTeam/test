import { useState, useEffect } from 'react';
import {
  IconMessage,
  IconLogout,
  IconUser,
  IconSparkles,
} from '@tabler/icons-react';
import ChatWindow from '../components/ChatWindow';
import axios from 'axios';

const API_URL = '/api';

export default function StaffDashboard({ staffUser, onLogout, wsUrl }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);
  const staffName = staffUser?.name || staffUser?.email || 'Staff';

  const isDev = import.meta.env.DEV;
  const WS_URL = wsUrl || (isDev ? 'ws://localhost:5173/ws' : `ws://${window.location.host}/ws`);

  useEffect(() => {
    loadChats();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const websocket = new WebSocket(WS_URL);

      websocket.onopen = () => {
        console.log('[StaffDashboard] WebSocket connected');
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'chat') {
            loadChats();
          }

          if (data.type === 'message') {
            setSelectedChat(prev => {
              if (prev && data.record.chatParentID === prev.id) {
                return { ...prev, needsRefresh: true };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('[StaffDashboard] Message parse error:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('[StaffDashboard] WebSocket error:', error);
        setError('Connection error. Retrying...');
      };

      websocket.onclose = () => {
        console.log('[StaffDashboard] WebSocket closed, reconnecting in 3s...');
        setTimeout(connectWebSocket, 3000);
      };

      setWs(websocket);
    } catch (error) {
      console.error('[StaffDashboard] WebSocket connection error:', error);
      setError('Failed to connect to server');
    }
  };

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`);
      setChats(response.data);
    } catch (error) {
      console.error('[StaffDashboard] Failed to load chats:', error);
      setError('Failed to load chats');
    }
  };

  const handleSelectChat = async (chat) => {
    // Auto-assign staff if chat is unassigned or assigned to AI
    if (!chat.assignedStaff || chat.assignedStaff === 'ai' || chat.assignedStaff === '') {
      try {
        console.log('[StaffDashboard] Auto-assigning staff to chat:', chat.id);
        const response = await axios.post(`${API_URL}/chats/${chat.id}/assign`, {
          staffName: staffName
        });
        console.log('[StaffDashboard] Assignment response:', response.data);

        const updatedChat = { ...chat, assignedStaff: staffName };
        setSelectedChat(updatedChat);

        setChats(prevChats =>
          prevChats.map(c => c.id === chat.id ? updatedChat : c)
        );
      } catch (error) {
        console.error('[StaffDashboard] Failed to assign staff:', error);
        setSelectedChat(chat);
      }
    } else {
      setSelectedChat(chat);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Escalated Chats</h2>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-900 text-white">
              {chats.length}
            </span>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <IconMessage className="text-gray-400" size={24} />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                No escalated chats
              </p>
              <p className="text-xs text-gray-400">
                AI is handling all conversations
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                const isAssignedToMe = chat.assignedStaff === staffName;
                const isUnassigned = !chat.assignedStaff || chat.assignedStaff === 'ai' || chat.assignedStaff === '';

                return (
                  <button
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {chat.author?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          isSelected ? 'text-white' : 'text-gray-900'
                        }`}>
                          {chat.author || 'Anonymous User'}
                        </p>
                        {isUnassigned ? (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            Unassigned
                          </span>
                        ) : isAssignedToMe ? (
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            You
                          </span>
                        ) : (
                          <p className={`text-xs mt-1 ${
                            isSelected ? 'text-white/70' : 'text-gray-500'
                          }`}>
                            {chat.assignedStaff}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center">
              <IconMessage className="text-white" size={20} />
            </div>
            <h1 className="text-base font-semibold text-gray-900">
              Support Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {error && (
              <span className="text-sm text-red-600">{error}</span>
            )}
            <span className="text-sm text-gray-600">{staffName}</span>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Logout"
            >
              <IconLogout size={20} />
            </button>
          </div>
        </div>

        {/* Chat Window or Empty State */}
        <div className="flex-1 overflow-hidden">
          {selectedChat ? (
            <ChatWindow chat={selectedChat} staffName={staffName} wsUrl={WS_URL} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconMessage className="text-gray-400" size={40} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-sm text-gray-600 max-w-xs text-center">
                Choose a chat from the sidebar to start helping
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
