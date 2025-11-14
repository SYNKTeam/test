import { useState, useEffect, useRef } from 'react';
import {
  IconSend,
  IconUser,
  IconCheck,
  IconChecks,
  IconSparkles,
} from '@tabler/icons-react';
import axios from 'axios';

const API_URL = '/api';

export default function ChatWindow({ chat, staffName, wsUrl }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ws, setWs] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isDev = import.meta.env.DEV;
  const WS_URL = wsUrl || (isDev ? 'ws://localhost:5173/ws' : `ws://${window.location.host}/ws`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadMessages();
  }, [chat.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const websocket = new WebSocket(WS_URL);

    websocket.onopen = () => {
      console.log('[ChatWindow] WebSocket connected');
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'message' && data.record.chatParentID === chat.id) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === data.record.id);
            if (exists) {
              return prev.map(m => m.id === data.record.id ? { ...data.record } : m);
            }
            return [...prev, data.record];
          });

          if (data.record.author !== 'staff' && !data.record.read && document.hasFocus()) {
            markAsRead(data.record.id);
          }
        }

        if (data.type === 'typing' && data.chatId === chat.id) {
          if (data.author !== 'staff') {
            setIsTyping(data.isTyping);
          }
        }
      } catch (error) {
        console.error('[ChatWindow] Message parse error:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[ChatWindow] WebSocket error:', error);
      setError('Connection error');
    };

    websocket.onclose = () => {
      console.log('[ChatWindow] WebSocket closed');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [chat.id]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/${chat.id}`);
      setMessages(response.data);

      response.data.forEach(message => {
        if (message.author !== 'staff' && !message.read) {
          markAsRead(message.id);
        }
      });
    } catch (error) {
      console.error('[ChatWindow] Failed to load messages:', error);
      setError('Failed to load messages');
    }
  };

  const markAsRead = async (messageId) => {
    if (!document.hasFocus()) return;

    try {
      await axios.patch(`${API_URL}/messages/${messageId}/read`);
    } catch (error) {
      console.error('[ChatWindow] Failed to mark message as read:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API_URL}/messages`, {
        message: newMessage.trim(),
        author: 'staff',
        chatParentID: chat.id
      });

      setNewMessage('');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chat.id,
          author: 'staff',
          isTyping: false
        }));
      }
    } catch (error) {
      console.error('[ChatWindow] Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    sendTypingIndicator(true);
  };

  const sendTypingIndicator = (isTyping) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    ws.send(JSON.stringify({
      type: 'typing',
      chatId: chat.id,
      author: 'staff',
      isTyping: isTyping
    }));

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chat.id,
          author: 'staff',
          isTyping: false
        }));
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold">
            {chat.author?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {chat.author || 'Anonymous User'}
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-600">Active</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-600">{error}</div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isStaff = message.author === 'staff';
          const isAI = message.author === 'ai';

          if (isAI) {
            return (
              <div key={message.id} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <IconSparkles className="text-white" size={14} />
                </div>
                <div className="flex-1">
                  <div className="bg-white border border-gray-200 rounded-lg rounded-tl-sm p-3">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {message.message}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-2">
                    {new Date(message.created).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          }

          if (isStaff) {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[75%]">
                  <div className="bg-gray-900 text-white rounded-lg rounded-br-sm p-3">
                    <p className="text-sm leading-relaxed">
                      {message.message}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1 mr-2">
                    <p className="text-xs text-gray-500">
                      {new Date(message.created).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {message.read ? (
                      <IconChecks className="text-green-600" size={14} />
                    ) : message.sent ? (
                      <IconCheck className="text-gray-400" size={14} />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                {chat.author?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <div className="bg-white border border-gray-200 rounded-lg rounded-tl-sm p-3">
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {message.message}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-2">
                  {new Date(message.created).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold">
              {chat.author?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-[60px]">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            <IconSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
