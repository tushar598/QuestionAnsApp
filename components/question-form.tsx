"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function QuestionForm() {
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        toast({
          title: "Error reading file",
          description: "Failed to read the selected image",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 10 + 5;
      });
    }, 500);
    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question to continue",
        variant: "destructive",
      });
      return;
    }

    if (!image) {
      toast({
        title: "Image required",
        description: "Please upload an image containing units and topic name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append("question", question);
      formData.append("image", image);

      const apiEndpoint = isDemoMode ? "/api/generate-demo" : "/api/generate";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Validate response data
      if (!data.answer || !data.topic) {
        throw new Error("Invalid response format from server");
      }

      // Store the result for the results page
      const resultData = {
        ...data,
        originalQuestion: question,
        timestamp: new Date().toISOString(),
      };

      // Only use localStorage if we're on the client side
      if (isClient && typeof window !== "undefined") {
        try {
          localStorage.setItem("answerResult", JSON.stringify(resultData));
        } catch (storageError) {
          console.warn("Failed to store result in localStorage:", storageError);
          // Continue anyway, we can pass data through URL or other means
        }
      }

      // Complete the progress bar
      setProgress(100);

      toast({
        title: "Success!",
        description: "Answer generated successfully",
      });

      // Navigate to results page after a short delay
      setTimeout(() => {
        router.push("/results");
      }, 1000);
    } catch (error) {
      console.error("Error generating answer:", error);

      let errorMessage = "Failed to generate answer. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("404")) {
          errorMessage =
            "API endpoint not found. Please check your configuration.";
        } else if (error.message.includes("401")) {
          errorMessage =
            "API key is invalid or missing. Please check your Gemini API key.";
        } else if (error.message.includes("403")) {
          errorMessage =
            "API access denied. Please check your API key permissions.";
        } else if (error.message.includes("429")) {
          errorMessage =
            "Rate limit exceeded. Please try again in a few moments.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    // Reset the file input
    const fileInput = document.getElementById("image") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="question" className="text-base">
              Your Question
            </Label>
            <Textarea
              id="question"
              placeholder="Enter your question here..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image" className="text-base">
              Upload Image (with units and topic name)
            </Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("image")?.click()}
                className="w-full"
                disabled={isLoading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {image ? "Change Image" : "Upload Image"}
              </Button>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading}
              />
            </div>

            {imagePreview && (
              <div className="mt-4 relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto max-h-[200px] object-contain bg-slate-100 dark:bg-slate-800"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                  disabled={isLoading}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Generating answer and visualization</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center space-x-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              id="demo-mode"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
              className="rounded"
              disabled={isLoading}
            />
            <Label htmlFor="demo-mode" className="text-sm">
              Demo Mode (works without API keys)
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading || !question.trim() || !image}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Generate Answer
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
