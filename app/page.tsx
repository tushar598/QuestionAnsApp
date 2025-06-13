import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import QuestionForm from "@/components/question-form"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl mb-4">
            Smart<span className="text-emerald-600">Answer</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Generate concise answers with beautiful visualizations from your questions and topic images
          </p>
        </header>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          }
        >
          <QuestionForm />
        </Suspense>
      </div>
      <Toaster />
    </div>
  )
}
