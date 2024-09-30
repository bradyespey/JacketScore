import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request) {
  try {
    // Parse the incoming request body
    const body = await request.json();
    console.log('Received body:', body); // Log incoming body for debugging

    // Destructure the request body
    const { location, time, duration, temperature, wind, precipitation, venueType, gender } = body;

    // Validate that all required fields are present
    if (!location || !time || !duration || temperature === undefined || wind === undefined || !precipitation || !venueType) {
      console.error('Invalid request body:', body);
      return NextResponse.json({ error: 'Missing or invalid data in request body.' }, { status: 400 });
    }

    // Parse numerical values
    const parsedTemperature = parseFloat(temperature);
    const parsedWind = parseFloat(wind);
    const parsedDuration = parseInt(duration, 10);

    // Validate parsed values
    if (isNaN(parsedTemperature) || isNaN(parsedWind) || isNaN(parsedDuration)) {
      console.error('Invalid number format:', { temperature, wind, duration });
      return NextResponse.json({ error: 'Invalid number format for temperature, wind, or duration.' }, { status: 400 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Construct the prompt
    let prompt = `I'm going to a ${venueType} venue called ${location} at ${time} for ${parsedDuration} hours. The weather is ${parsedTemperature} degrees F with ${parsedWind} mph wind and ${precipitation}.`;

    // Add gender to prompt if provided
    if (gender) {
      prompt += ` The person is ${gender}.`;
    }

    prompt += ` Do I need a jacket? Provide a brief recommendation.`;

    // Log the prompt and payload for debugging
    console.log("Payload being sent to OpenAI:", {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    // Make the OpenAI API request
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',  // Or 'gpt-4' if you have access
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    // Extract recommendation from the response
    const recommendation = response.choices[0].message.content.trim();
    return NextResponse.json({ recommendation });

  } catch (error) {
    console.error('Error in getChatGPTRecommendation API route:', error);

    // Handle OpenAI-specific error
    if (error.response) {
      console.error('OpenAI error response:', JSON.stringify(error.response.data, null, 2));
      return NextResponse.json({ error: error.response.data.error.message }, { status: error.response.status });
    }

    // General error fallback
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
