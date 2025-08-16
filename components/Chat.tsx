'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Send, User as UserIcon, Bot } from 'lucide-react'
import clsx from 'clsx'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  created_at: string
}

interface Chat {
  id: string
  title: string
  created_at: string
}

interface ChatProps {
  user: User | null
}

export default function Chat({ user }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      loadChats()
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading chats:', error)
      return
    }

    setChats(data || [])
    
    if (data && data.length > 0 && !currentChatId) {
      setCurrentChatId(data[0].id)
      loadMessages(data[0].id)
    }
  }

  const loadMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
      return
    }

    setMessages(data || [])
  }

  const createNewChat = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('chats')
      .insert([{
        user_id: user.id,
        title: 'New Chat'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating chat:', error)
      return
    }

    setChats(prev => [data, ...prev])
    setCurrentChatId(data.id)
    setMessages([])
  }

  const sendMessage = async () => {
    if (!input.trim() || !currentChatId || isLoading) return

    const userMessage = {
      chat_id: currentChatId,
      content: input,
      role: 'user' as const
    }

    // Add user message to database
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert([userMessage])
      .select()
      .single()

    if (messageError) {
      console.error('Error saving message:', messageError)
      return
    }

    // Update local state
    setMessages(prev => [...prev, messageData])
    setInput('')
    setIsLoading(true)

    try {
      // Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          chatId: currentChatId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const aiResponse = await response.json()

      // Add AI response to database
      const { data: aiMessageData, error: aiMessageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: currentChatId,
          content: aiResponse.message,
          role: 'assistant'
        }])
        .select()
        .single()

      if (aiMessageError) {
        console.error('Error saving AI message:', aiMessageError)
        return
      }

      // Update local state
      setMessages(prev => [...prev, aiMessageData])

    } catch (error) {
      console.error('Error getting AI response:', error)
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        chat_id: currentChatId,
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        role: 'assistant',
        created_at: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">AI Chatbot</h1>
          <p className="text-gray-600">Giriş yapmanız gerekiyor</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <button
            onClick={createNewChat}
            className="w-full bg-blue-500 text-white rounded-lg py-2 px-4 hover:bg-blue-600 transition-colors"
          >
            Yeni Sohbet
          </button>
        </div>
        
        <div className="sidebar-content">
          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setCurrentChatId(chat.id)
                  loadMessages(chat.id)
                }}
                className={clsx(
                  'w-full text-left p-3 rounded-lg transition-colors',
                  currentChatId === chat.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'hover:bg-gray-100'
                )}
              >
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-sm text-gray-500">
                  {new Date(chat.created_at).toLocaleDateString('tr-TR')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="chat-header">
          <h1 className="text-xl font-semibold">AI Chatbot</h1>
          <div className="text-sm text-gray-500">
            {user.email}
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Merhaba! Size nasıl yardımcı olabilirim?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={clsx(
                  'flex items-start space-x-2 max-w-xs lg:max-w-md',
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                )}>
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  )}>
                    {message.role === 'user' ? (
                      <UserIcon className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className={clsx(
                    'rounded-lg p-3',
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200'
                  )}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className={clsx(
                      'text-xs mt-1',
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    )}>
                      {new Date(message.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
