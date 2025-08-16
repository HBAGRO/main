import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// OpenAI client - API key'i environment variable'dan al
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, chatId } = await req.json()

    if (!message || !chatId) {
      return NextResponse.json(
        { error: 'Message and chatId are required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          message: 'OpenAI API anahtarı henüz ayarlanmamış. Bu bir demo mesajıdır. Gerçek AI yanıtları için OpenAI API anahtarınızı environment variables\'a ekleyin.',
          type: 'demo'
        },
        { status: 200 }
      )
    }

    // OpenAI API çağrısı
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Sen yardımcı bir AI asistanısın. Türkçe yanıt ver ve kullanıcıya dostane bir şekilde yardım et. 
          Kısa ve öz yanıtlar vermeye çalış, gereksiz uzun açıklamalar yapma.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    })

    const aiMessage = completion.choices[0]?.message?.content || 'Üzgünüm, bir yanıt oluşturamadım.'

    return NextResponse.json({ 
      message: aiMessage,
      type: 'ai'
    })

  } catch (error: any) {
    console.error('OpenAI API error:', error)
    
    // Farklı hata türlerine göre uygun mesajlar
    let errorMessage = 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.'
    
    if (error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI API kotası dolmuş. Lütfen daha sonra tekrar deneyin.'
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'OpenAI API anahtarı geçersiz. Lütfen ayarları kontrol edin.'
    } else if (error.code === 'rate_limit_exceeded') {
      errorMessage = 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.'
    }

    return NextResponse.json(
      { 
        message: errorMessage,
        type: 'error'
      },
      { status: 500 }
    )
  }
}
