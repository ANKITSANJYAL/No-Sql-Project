import React, { useState, useRef, useEffect } from 'react';
import '../styles/ChatAssistant.css';

function ChatAssistant({ onClose, onNavigate }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: "Hi! I'm your campus navigation assistant. Ask me anything like 'Take me to Quinn Library' or 'I need to find Room LL817 but want to grab coffee first'."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue
    };
    setMessages([...messages, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // TODO: Replace with actual API call to your RAG backend
    try {
      // Simulate API delay
      setTimeout(() => {
        const botResponse = {
          id: messages.length + 2,
          type: 'bot',
          text: "I found the location you're looking for! Let me create a route for you. You can also navigate to 'Coffee Shop' first if you'd like to grab coffee on the way.",
          actions: [
            { type: 'navigate', label: 'Navigate Directly', from: 'current', to: 'quinn_library' },
            { type: 'navigate', label: 'Stop at Coffee Shop', from: 'current', to: 'coffee_shop' }
          ]
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1000);

      // const response = await fetch('http://localhost:3001/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: inputValue })
      // });
      // const data = await response.json();
      
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: "Sorry, I'm having trouble connecting. Please try again."
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleActionClick = (action) => {
    if (action.type === 'navigate') {
      onNavigate(action.from, action.to);
      onClose();
    }
  };

  return (
    <div className="chat-assistant">
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="chat-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
              <path d="M8 15s1.5 2 4 2 4-2 4-2" />
            </svg>
          </div>
          <div>
            <h3 className="chat-title">AI Navigation Assistant</h3>
            <p className="chat-status">Online</p>
          </div>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            {message.type === 'bot' && (
              <div className="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
            )}
            <div className="message-content">
              <p className="message-text">{message.text}</p>
              {message.actions && (
                <div className="message-actions">
                  {message.actions.map((action, index) => (
                    <button
                      key={index}
                      className="action-button"
                      onClick={() => handleActionClick(action)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="message bot">
            <div className="message-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Ask me anything... 'Find Room 817' or 'Coffee shop near library'"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="chat-send-btn" disabled={!inputValue.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatAssistant;

