import { useState, useEffect, useRef } from 'react';
import { IconMessage, IconX, IconSend, IconCheck, IconChecks, IconSparkles } from '@tabler/icons-react';
import axios from 'axios';

export default function ChatWidget({ apiUrl, wsUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ws, setWs] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !hasJoined) return;

    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('[Widget] WebSocket connected');
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'message' && chatId) {
          if (data.record.chatParentID === chatId) {
            setMessages(prev => {
              const exists = prev.some(m => m.id === data.record.id);
              if (exists) {
                return prev.map(m => m.id === data.record.id ? { ...data.record } : m);
              }
              return [...prev, data.record];
            });

            if (data.record.author === 'staff' && !data.record.read && document.hasFocus()) {
              markAsRead(data.record.id);
            }
          }
        }

        if (data.type === 'typing' && data.chatId === chatId) {
          if (data.author === 'staff') {
            setIsTyping(data.isTyping);
          }
        }
      } catch (error) {
        console.error('[Widget] WebSocket message error:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('[Widget] WebSocket error:', error);
      setError('Connection error. Retrying...');
    };

    websocket.onclose = () => {
      console.log('[Widget] WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isOpen, hasJoined, chatId, wsUrl]);

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      messages.forEach(message => {
        if (message.author === 'staff' && !message.read) {
          markAsRead(message.id);
        }
      });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleFocus = () => {
      if (isOpen && messages.length > 0) {
        messages.forEach(message => {
          if (message.author === 'staff' && !message.read) {
            markAsRead(message.id);
          }
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [messages, isOpen]);

  const markAsRead = async (messageId) => {
    if (!document.hasFocus()) return;

    try {
      await axios.patch(`${apiUrl}/messages/${messageId}/read`);
    } catch (error) {
      console.error('[Widget] Failed to mark message as read:', error);
    }
  };

  const handleJoin = async () => {
    if (!username.trim()) return;

    try {
      setError(null);

      const userResponse = await axios.post(`${apiUrl}/users`, {
        username: username.trim(),
        role: 'customer'
      });
      setUserId(userResponse.data.id);

      const chatResponse = await axios.post(`${apiUrl}/chats`, {
        author: username.trim(),
        userId: userResponse.data.id,
      });
      setChatId(chatResponse.data.id);
      setHasJoined(true);

      const messagesResponse = await axios.get(`${apiUrl}/messages/${chatResponse.data.id}`);
      setMessages(messagesResponse.data);
    } catch (error) {
      console.error('[Widget] Failed to join chat:', error);
      setError('Failed to start chat. Please try again.');
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      setError(null);

      await axios.post(`${apiUrl}/messages`, {
        message: newMessage.trim(),
        author: username,
        chatParentID: chatId
      });

      setNewMessage('');

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chatId,
          author: 'customer',
          isTyping: false
        }));
      }
    } catch (error) {
      console.error('[Widget] Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    sendTypingIndicator(true);
  };

  const sendTypingIndicator = (isTyping) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    ws.send(JSON.stringify({
      type: 'typing',
      chatId: chatId,
      author: 'customer',
      isTyping: isTyping
    }));

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'typing',
          chatId: chatId,
          author: 'customer',
          isTyping: false
        }));
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!hasJoined) {
        handleJoin();
      } else {
        handleSend();
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
      {isOpen && (
        <div className="w-[380px] h-[600px] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-white px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-semibold text-gray-900">SYNK Support</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <IconX size={20} />
              </button>
            </div>
          </div>

          {!hasJoined ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 bg-gray-50">
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center">
                <IconMessage size={32} className="text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-sm text-gray-600">We're here to help</p>
              </div>
              <div className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Your name"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleJoin}
                    disabled={!username.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-gray-900 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
                  >
                    <IconSend size={16} />
                  </button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {messages.map((message) => {
                  const isStaff = message.author === 'staff';
                  const isAI = message.author === 'ai';

                  if (isAI) {
                    return (
                      <div key={message.id} className="mb-4">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                            <IconSparkles size={14} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white border border-gray-200 rounded-lg rounded-tl-sm p-3">
                              <p className="text-sm text-gray-800 leading-relaxed">{message.message}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-2">
                              {new Date(message.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isStaff) {
                    return (
                      <div key={message.id} className="mb-4">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-white font-semibold">S</span>
                          </div>
                          <div className="flex-1">
                            <div className="bg-white border border-gray-200 rounded-lg rounded-tl-sm p-3">
                              <p className="text-sm text-gray-800 leading-relaxed">{message.message}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-2">
                              {new Date(message.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className="mb-4 flex justify-end">
                      <div className="max-w-[75%]">
                        <div className="bg-gray-900 text-white rounded-lg rounded-br-sm p-3">
                          <p className="text-sm leading-relaxed">{message.message}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-1 mr-2">
                          <p className="text-xs text-gray-500">
                            {new Date(message.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {message.read ? (
                            <IconChecks size={14} className="text-green-500" />
                          ) : message.sent ? (
                            <IconCheck size={14} className="text-gray-400" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="mb-4">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-white font-semibold">S</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-3 min-w-[60px]">
                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-gray-200">
                {error && (
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                )}
                <div className="relative">
                  <textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="absolute right-2 bottom-2 w-8 h-8 rounded-md bg-gray-900 disabled:bg-gray-300 text-white flex items-center justify-center transition-colors"
                  >
                    <IconSend size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gray-900 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
      >
        {isOpen ? <IconX size={24} /> : <IconMessage size={24} />}
      </button>
    </div>
  );
}
