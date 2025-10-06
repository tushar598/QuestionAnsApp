import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client with your API key
let genAI: GoogleGenerativeAI;

export async function POST(request: NextRequest) {
  try {
    // Validate API key first
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    // Initialize Gemini client
    if (!genAI) {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error("FormData parsing error:", formError);
      return NextResponse.json(
        { error: "Invalid form data format" },
        { status: 400 }
      );
    }

    const question = formData.get("question") as string | null;
    const imageFile = formData.get("image") as File | null;

    // Validate required fields
    if (!question || !imageFile) {
      return NextResponse.json(
        { error: "Both question and image are required." },
        { status: 400 }
      );
    }

    // Validate question length
    if (question.trim().length < 3) {
      return NextResponse.json(
        { error: "Question must be at least 3 characters long." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload an image file (JPEG, PNG, GIF, WebP).",
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        {
          error: `Image file too large. Maximum size is ${
            maxSize / (1024 * 1024)
          }MB.`,
        },
        { status: 413 }
      );
    }

    // Process the image with better error handling
    let base64Image: string;
    try {
      const arrayBuffer = await imageFile.arrayBuffer();

      // Validate array buffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error("Empty or invalid image file");
      }

      base64Image = Buffer.from(arrayBuffer).toString("base64");

      // Validate base64 conversion
      if (!base64Image || base64Image.length === 0) {
        throw new Error("Failed to convert image to base64");
      }
    } catch (conversionError) {
      console.error("Image conversion error:", conversionError);
      return NextResponse.json(
        {
          error:
            "Failed to process image file. Please try with a different image.",
        },
        { status: 400 }
      );
    }

    // Initialize Gemini model with fallback
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      });
    } catch (modelError) {
      console.error("Model initialization error:", modelError);
      try {
        // Fallback to pro model if flash is unavailable
        model = genAI.getGenerativeModel({
          model: "gemini-1.5-pro",
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        });
      } catch (fallbackError) {
        console.error("Fallback model error:", fallbackError);
        return NextResponse.json(
          {
            error:
              "Gemini models are currently unavailable. Please try again later.",
          },
          { status: 503 }
        );
      }
    }

    // Prepare image part
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageFile.type,
      },
    };

    // Enhanced answer prompt
    const answerPrompt = `Please analyze the uploaded image carefully and answer this question: "${question}"

Instructions:
- If the image contains relevant information (diagrams, text, charts, formulas, etc.), use it to provide an accurate answer
- Provide a detailed explanation covering all relevant topics mentioned in the image
- If the image is not relevant to the question, explain what you see and why it may not relate to the question
- Be thorough and educational in your response
- If you cannot see the image clearly, mention this limitation

Question: "${question}"`;

    // Step 1: Generate Answer with timeout and retry logic
    let answer: string;
    try {
      const answerResult = await Promise.race([
        model.generateContent([answerPrompt, imagePart]),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout after 30 seconds")),
            30000
          )
        ),
      ]);

      // Extract answer with better error handling
      const candidates = answerResult?.response?.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No response candidates received from Gemini");
      }

      const content = candidates[0]?.content?.parts;
      if (!content || content.length === 0) {
        throw new Error("No content parts in response");
      }

      answer = content[0]?.text?.trim() || "No answer generated.";

      if (answer === "No answer generated." || answer.length < 10) {
        answer =
          "I was unable to generate a detailed answer for your question. Please try rephrasing your question or using a different image.";
      }
    } catch (geminiError: any) {
      console.error("Gemini Answer API Error:", geminiError);

      // Handle specific Gemini API errors
      if (geminiError.message?.includes("404") || geminiError.status === 404) {
        return NextResponse.json(
          {
            error:
              "The AI model is temporarily unavailable. Please try again later.",
          },
          { status: 503 }
        );
      }

      if (
        geminiError.message?.includes("quota") ||
        geminiError.status === 429
      ) {
        return NextResponse.json(
          { error: "API usage limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (geminiError.message?.includes("timeout")) {
        return NextResponse.json(
          {
            error:
              "Request timed out. The image might be too complex or large. Please try with a smaller image.",
          },
          { status: 408 }
        );
      }

      if (
        geminiError.message?.includes("SAFETY") ||
        geminiError.message?.includes("blocked")
      ) {
        return NextResponse.json(
          {
            error:
              "Content was blocked due to safety policies. Please try with a different image or question.",
          },
          { status: 400 }
        );
      }

      // Generic fallback for answer generation
      answer =
        "I encountered an issue while analyzing your image. Please try again with a different image or rephrase your question.";
    }

    // Step 2: Extract Topic & Units with improved prompt
    const topicPrompt = `Analyze this question and the uploaded image to identify the main academic subject and related subtopics.

Question: "${question}"

Return ONLY a valid JSON object in this exact format:
{
  "topic": "Main Subject Name",
  "units": ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4"]
}

Guidelines:
- Identify the primary academic subject (e.g., Mathematics, Physics, Chemistry, Biology, History, etc.)
- List 3-4 relevant subtopics or units related to the subject
- Keep topic names concise but descriptive
- Ensure the JSON is properly formatted with no additional text`;

    let topicInfo;
    try {
      const topicResult = await Promise.race([
        model.generateContent([topicPrompt, imagePart]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Topic extraction timeout")), 15000)
        ),
      ]);

      const rawText =
        topicResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!rawText) {
        throw new Error("No topic response received");
      }

      // Clean up the response to extract JSON
      let jsonString = rawText;

      // Try to extract JSON from response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      // Remove any markdown formatting
      jsonString = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      topicInfo = JSON.parse(jsonString);

      // Validate the structure
      if (!topicInfo || typeof topicInfo !== "object") {
        throw new Error("Invalid topic object structure");
      }

      if (!topicInfo.topic || typeof topicInfo.topic !== "string") {
        throw new Error("Missing or invalid topic field");
      }

      if (!Array.isArray(topicInfo.units) || topicInfo.units.length === 0) {
        throw new Error("Missing or invalid units array");
      }

      // Ensure units are strings
      topicInfo.units = topicInfo.units.map((unit) => String(unit)).slice(0, 6); // Limit to 6 units max
    } catch (parseError) {
      console.log("Topic parsing error:", parseError);

      // Create fallback topic info based on question keywords
      const questionLower = question.toLowerCase();
      let fallbackTopic = "General Knowledge";
      let fallbackUnits = [
        "Fundamentals",
        "Key Concepts",
        "Applications",
        "Practice",
      ];

      // Basic subject detection
      if (
        questionLower.includes("math") ||
        questionLower.includes("equation") ||
        questionLower.includes("formula")
      ) {
        fallbackTopic = "Mathematics";
        fallbackUnits = ["Algebra", "Geometry", "Calculus", "Statistics"];
      } else if (
        questionLower.includes("physics") ||
        questionLower.includes("force") ||
        questionLower.includes("energy")
      ) {
        fallbackTopic = "Physics";
        fallbackUnits = [
          "Mechanics",
          "Thermodynamics",
          "Electromagnetism",
          "Modern Physics",
        ];
      } else if (
        questionLower.includes("chemistry") ||
        questionLower.includes("chemical") ||
        questionLower.includes("molecule")
      ) {
        fallbackTopic = "Chemistry";
        fallbackUnits = [
          "Atomic Structure",
          "Chemical Bonds",
          "Reactions",
          "Organic Chemistry",
        ];
      } else if (
        questionLower.includes("biology") ||
        questionLower.includes("cell") ||
        questionLower.includes("organism")
      ) {
        fallbackTopic = "Biology";
        fallbackUnits = ["Cell Biology", "Genetics", "Ecology", "Evolution"];
      }

      topicInfo = {
        topic: fallbackTopic,
        units: fallbackUnits,
      };
    }

    // Step 3: Generate visualization URL
    const visualizationUrl = `https://via.placeholder.com/600x400/10b981/ffffff?text=${encodeURIComponent(
      topicInfo.topic.replace(/\s+/g, "+")
    )}`;

    // Prepare successful response
    const response = NextResponse.json({
      success: true,
      answer,
      visualization: visualizationUrl,
      topic: topicInfo.topic,
      units: topicInfo.units,
      metadata: {
        imageSize: imageFile.size,
        imageType: imageFile.type,
        questionLength: question.length,
        timestamp: new Date().toISOString(),
      },
    });

    // Add CORS headers if needed
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return response;
  } catch (err: any) {
    console.error("Unexpected API Route Error:", err);

    // Determine appropriate error response
    let errorMessage =
      "An unexpected error occurred while processing your request.";
    let statusCode = 500;

    // Handle different error types
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      errorMessage =
        "Network error occurred. Please check your internet connection.";
      statusCode = 503;
    } else if (err.message?.includes("JSON")) {
      errorMessage = "Invalid data format received.";
      statusCode = 400;
    } else if (err.message?.includes("timeout")) {
      errorMessage =
        "Request timed out. Please try again with a smaller image.";
      statusCode = 408;
    } else if (err.status && typeof err.status === "number") {
      statusCode = err.status;
      errorMessage = err.message || errorMessage;
    }

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: statusCode,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === "development" && {
          details: {
            message: err.message,
            stack: err.stack,
            name: err.name,
          },
        }),
      },
      { status: statusCode }
    );

    // Add CORS headers to error responses too
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");

    return errorResponse;
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
