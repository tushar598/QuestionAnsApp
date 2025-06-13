import { type NextRequest, NextResponse } from "next/server"

// Demo API route that works without external API keys
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const question = formData.get("question") as string
    const imageFile = formData.get("image") as File

    if (!question || !imageFile) {
      return NextResponse.json({ error: "Question and image are required" }, { status: 400 })
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate demo response based on question keywords
    const questionLower = question.toLowerCase()
    let topic = "General Knowledge"
    let units = ["Fundamentals", "Concepts", "Applications"]
    let answer = "This is a demo response. "

    if (questionLower.includes("math") || questionLower.includes("algebra") || questionLower.includes("equation")) {
      topic = "Mathematics"
      units = ["Algebra", "Equations", "Problem Solving"]
      answer =
        "In mathematics, this concept involves understanding the relationship between variables and constants. The key is to identify the pattern and apply the appropriate mathematical principles to solve the problem systematically."
    } else if (
      questionLower.includes("physics") ||
      questionLower.includes("force") ||
      questionLower.includes("energy")
    ) {
      topic = "Physics"
      units = ["Mechanics", "Energy", "Forces"]
      answer =
        "In physics, this phenomenon can be explained through the fundamental laws of motion and energy conservation. Understanding the underlying principles helps us predict and analyze the behavior of physical systems."
    } else if (
      questionLower.includes("chemistry") ||
      questionLower.includes("reaction") ||
      questionLower.includes("element")
    ) {
      topic = "Chemistry"
      units = ["Elements", "Reactions", "Compounds"]
      answer =
        "In chemistry, this process involves the interaction between different elements or compounds. The reaction follows specific patterns based on the properties of the substances involved and the conditions under which they interact."
    } else if (
      questionLower.includes("biology") ||
      questionLower.includes("cell") ||
      questionLower.includes("organism")
    ) {
      topic = "Biology"
      units = ["Cell Biology", "Organisms", "Life Processes"]
      answer =
        "In biology, this concept relates to the fundamental processes of life. Living organisms have evolved complex systems to maintain homeostasis and respond to their environment through various biological mechanisms."
    } else {
      answer = `This is an interesting question about ${topic}. The answer involves understanding the core principles and applying logical reasoning to reach a comprehensive solution. Key factors to consider include the context, relevant theories, and practical applications.`
    }

    // Generate a colored placeholder image based on topic
    const colors = {
      Mathematics: "3b82f6", // blue
      Physics: "ef4444", // red
      Chemistry: "10b981", // green
      Biology: "f59e0b", // yellow
      "General Knowledge": "8b5cf6", // purple
    }

    const color = colors[topic as keyof typeof colors] || colors["General Knowledge"]
    const visualizationUrl = `https://via.placeholder.com/600x400/${color}/ffffff?text=${encodeURIComponent(topic + " Diagram")}`

    return NextResponse.json({
      answer,
      visualization: visualizationUrl,
      topic,
      units,
    })
  } catch (error) {
    console.error("Error generating demo answer:", error)
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 })
  }
}
