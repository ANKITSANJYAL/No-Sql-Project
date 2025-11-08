import React, { useState, useRef, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api';
import '../styles/ChatAssistant.css';

function ChatAssistant({ embedded = false, onClose, onNavigate, onNavigationResult, onUserMessage, onBotMessage }) {
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
    setMessages(prev => [...prev, userMessage]);
    if (embedded && onUserMessage) {
      onUserMessage(userMessage);
    }
    const currentQuery = inputValue;
    setInputValue('');
    setIsTyping(true);

    try {
      // Call the real backend API
      const response = await fetch(`${API_ENDPOINTS.chatNavigate}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: currentQuery })
      });

      const text = await response.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        // Non-JSON response (likely HTML error page)
        const botError = {
          id: messages.length + 2,
          type: 'bot',
          text: 'Navigation service returned an unexpected response. Please try again later.'
        };
        setMessages(prev => [...prev, botError]);
        if (embedded && onBotMessage) onBotMessage(botError);
        setIsTyping(false);
        return;
      }

      if (!response.ok) {
        // Handle rate limiting / service unavailable
        if (response.status === 503 && data.error && data.error.includes('rate limit')) {
          const botResponse = {
            id: messages.length + 2,
            type: 'bot',
            text: data.message || "The AI assistant is temporarily unavailable. Please use the Manual Entry page for navigation, or try again in a few moments.",
            suggestion: data.suggestion
          };
          setMessages(prev => [...prev, botResponse]);
          if (embedded && onBotMessage) onBotMessage(botResponse);
          setIsTyping(false);
          return;
        }
        
        // Handle partial success (intent parsed but no navigation)
        if (data.parsedIntent) {
          const botResponse = {
            id: messages.length + 2,
            type: 'bot',
            text: data.message || "I understood your request, but I need more information.",
            parsedIntent: data.parsedIntent
          };

          // If we have start but not end, suggest the user be more specific
          if (data.parsedIntent.start?.id && !data.parsedIntent.end?.id) {
            botResponse.text = `I see you're at "${data.parsedIntent.start.name}". Where would you like to go? You can say things like "take me to room 817" or "I want to borrow books".`;
          } 
          // If we have end but not start
          else if (!data.parsedIntent.start?.id && data.parsedIntent.end?.id) {
            botResponse.text = `I found "${data.parsedIntent.end.name}" for you! Where are you starting from?`;
          }
          // Neither found
          else {
            botResponse.text = `I couldn't quite understand. Try saying something like "I'm at the main entrance, take me to room 817" or "I want to borrow books from the library".`;
          }

          setMessages(prev => [...prev, botResponse]);
          if (embedded && onBotMessage) onBotMessage(botResponse);
        } else {
          throw new Error(data.message || 'Failed to process request');
        }
        setIsTyping(false);
        return;
      }

  // Success - we have navigation data
  const { parsedIntent, navigation } = data;

      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        text: `Perfect! I'll navigate you from "${parsedIntent.start.name}" to "${parsedIntent.end.name}". This will take approximately ${navigation.estimatedTime} (${Math.round(navigation.totalDistance)}m).`,
        actions: [
          { 
            type: 'navigate', 
            label: 'Start Navigation', 
            startId: parsedIntent.start.id,
            endId: parsedIntent.end.id,
            startName: parsedIntent.start.name,
            endName: parsedIntent.end.name
          }
        ],
        parsedIntent,
        navigation
      };

      // Add context about what the user wanted to do
      if (parsedIntent.intent) {
        botResponse.text = `Got it! ${parsedIntent.intent}. I'll navigate you from "${parsedIntent.start.name}" to "${parsedIntent.end.name}". This will take approximately ${navigation.estimatedTime} (${Math.round(navigation.totalDistance)}m).`;
      }

      setMessages(prev => [...prev, botResponse]);
      if (embedded && onBotMessage) onBotMessage(botResponse);
      // Notify parent with raw navigation data if provided
      if (onNavigationResult && navigation) {
        onNavigationResult({ parsedIntent, navigation });
      }
      setIsTyping(false);

    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      const errorMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: "Sorry, I'm having trouble connecting to the navigation service. Please make sure the backend server is running and try again."
      };
      setMessages(prev => [...prev, errorMessage]);
      if (embedded && onBotMessage) onBotMessage(errorMessage);
    }
  };

  const handleActionClick = (action) => {
    if (action.type === 'navigate') {
      // Call parent's onNavigate with proper IDs
      onNavigate(action.startId, action.endId, action.startName, action.endName);
      onClose();
    }
  };

  return (
    <div className={"chat-assistant" + (embedded ? ' embedded' : '')}>
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




