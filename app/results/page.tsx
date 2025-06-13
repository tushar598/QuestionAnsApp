"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, Share2, Edit, ArrowLeft, Loader2, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import AnswerDisplay from "@/components/answer-display"

interface ResultData {
  answer: string
  visualization: string
  topic: string
  units: string[]
}

export default function ResultsPage() {
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Get the result from localStorage
    const storedResult = localStorage.getItem("answerResult")

    if (storedResult) {
      try {
        const parsedResult = JSON.parse(storedResult)
        console.log("Loaded result:", parsedResult) // Debug log
        setResultData(parsedResult)
      } catch (error) {
        console.error("Error parsing result data:", error)
        toast({
          title: "Error",
          description: "Failed to load results. Please try again.",
          variant: "destructive",
        })
        router.push("/")
      }
    } else {
      console.log("No stored result found") // Debug log
      toast({
        title: "No Results",
        description: "No results found. Please submit a question first.",
        variant: "destructive",
      })
      router.push("/")
    }

    setIsLoading(false)
  }, [router, toast])

  const handleDownload = () => {
    if (!resultData) return

    // Create a canvas to combine text and image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = 800
    canvas.height = 600

    // Draw background
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw title
    ctx.fillStyle = "#0f172a"
    ctx.font = "bold 24px Arial"
    ctx.fillText(resultData.topic, 40, 60)

    // Draw answer text
    ctx.font = "16px Arial"
    ctx.fillStyle = "#334155"

    // Simple word wrap for the answer text
    const words = resultData.answer.split(" ")
    let line = ""
    let y = 100
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " "
      const metrics = ctx.measureText(testLine)
      if (metrics.width > canvas.width - 80) {
        ctx.fillText(line, 40, y)
        line = words[i] + " "
        y += 25
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, 40, y)

    // Load and draw the visualization
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Calculate aspect ratio to fit within canvas
      const maxHeight = 300
      const maxWidth = canvas.width - 80
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }

      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }

      // Center the image horizontally
      const x = (canvas.width - width) / 2

      // Draw the image below the text
      ctx.drawImage(img, x, y + 40, width, height)

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return

        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${resultData.topic.replace(/\s+/g, "-").toLowerCase()}-answer.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
    }
    img.src = resultData.visualization
  }

  const handleShare = async () => {
    if (!resultData) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: resultData.topic,
          text: resultData.answer,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(`${resultData.topic}\n\n${resultData.answer}\n\n${window.location.href}`)
      toast({
        title: "Copied to clipboard",
        description: "Share link has been copied to your clipboard",
      })
    }
  }

  const handleEditPrompt = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!resultData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">No results found</p>
        <Button onClick={() => router.push("/")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Form
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => router.push("/")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Form
        </Button>

        <AnswerDisplay resultData={resultData} />

        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleShare} variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button onClick={handleEditPrompt} variant="outline" className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Prompt
          </Button>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mr-2">Was this answer helpful?</p>
          <Button variant="ghost" size="sm" className="gap-2">
            <ThumbsUp className="h-4 w-4" />
            Yes
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <ThumbsDown className="h-4 w-4" />
            No
          </Button>
        </div>
      </div>
    </div>
  )
}
