import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini client with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const question = formData.get("question") as string | null;
    const imageFile = formData.get("image") as File | null;

    if (!question || !imageFile) {
      return NextResponse.json(
        { error: "Both question and image are required." },
        { status: 400 }
      );
    }

    // Read and process the image
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // Get the correct Gemini model (updated model name)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Step 1: Generate Answer using both text and image
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: imageFile.type,
      },
    };

    const answerPrompt = `Please analyze the uploaded image and answer this question: "${question}"

    If the image contains relevant information (like diagrams, text, charts, etc.), use it to provide a more accurate answer. 
   Give it a detailed answer of the all the topic mentioned in the image.`;

    const answerResult = await model.generateContent([answerPrompt, imagePart]);

    const answer =
      answerResult.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "No answer generated.";

    // Step 2: Extract Topic & Units from the question and image
    const topicPrompt = `Analyze this question and the uploaded image to extract the main topic and related units/subtopics.
    Return ONLY a valid JSON format like this:
    {
      "topic": "Main topic name",
      "units": ["Unit 1", "Unit 2", "Unit 3"]
    }

    Question: "${question}"
    
    Based on the image content and question, identify the main subject area and 3-4 related units or subtopics.`;

    const topicResult = await model.generateContent([topicPrompt, imagePart]);

    let topicInfo;
    try {
      const rawText =
        topicResult.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      // Clean up the response to extract JSON
      const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawText;

      topicInfo = JSON.parse(jsonString || "{}");

      // Validate the structure
      if (!topicInfo.topic || !Array.isArray(topicInfo.units)) {
        throw new Error("Invalid topic format");
      }
    } catch (parseError) {
      console.log("Topic parsing error:", parseError);
      // Fallback topic info
      topicInfo = {
        topic: "General Knowledge",
        units: ["Fundamentals", "Key Concepts", "Applications", "Practice"],
      };
    }

    // Step 3: Generate a better placeholder visualization URL
    const visualizationUrl = `https://via.placeholder.com/600x400/10b981/ffffff?text=${encodeURIComponent(
      topicInfo.topic.replace(/\s+/g, "+")
    )}`;

    // Return JSON response
    return NextResponse.json({
      answer,
      visualization: visualizationUrl,
      topic: topicInfo.topic,
      units: topicInfo.units,
    });
  } catch (err: any) {
    console.error("Gemini API Error:", err);

    // Provide more detailed error information
    const errorMessage =
      err?.status === 404
        ? "Gemini model not found. Please check if your API key is valid and has access to Gemini models."
        : err?.message || "Something went wrong while generating the answer.";

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: err?.status || 500 }
    );
  }
}
