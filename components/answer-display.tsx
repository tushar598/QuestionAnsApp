"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Image as ImageIcon,
  BarChart3,
  Lightbulb,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultData {
  answer: string;
  visualization: string;
  topic: string;
  units: string[];
}

interface AnswerDisplayProps {
  resultData: ResultData;
}

type PanelType = "answer" | "visualization" | "summary" | "insights";

export default function AnswerDisplay({ resultData }: AnswerDisplayProps) {
  const [activePanel, setActivePanel] = useState<PanelType>("answer");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllPanels, setShowAllPanels] = useState(false);

  // Calculate a random progress level between 70-100%
  const progressLevel = Math.floor(Math.random() * 31) + 70;

  const panels = [
    {
      id: "answer" as PanelType,
      title: "Answer",
      icon: BookOpen,
      content: (
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-800/50">
              <div className="space-y-4">
                {resultData.answer.split("\n\n").map((paragraph, index) => (
                  <div key={index} className="space-y-2">
                    {paragraph.split("\n").map((line, lineIndex) => {
                      // Check if line is a header (starts with # or is all caps with fewer than 50 chars)
                      const isHeader =
                        line.startsWith("#") ||
                        (line === line.toUpperCase() &&
                          line.length < 50 &&
                          line.length > 5);

                      // Check if line is a bullet point
                      const isBulletPoint =
                        line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/);

                      // Check if line contains key terms (bold formatting)
                      const hasKeyTerms =
                        line.includes("**") || line.includes("*");

                      if (isHeader) {
                        return (
                          <h4
                            key={lineIndex}
                            className="text-lg font-semibold text-blue-900 dark:text-blue-100 mt-4 first:mt-0 border-b border-blue-200 dark:border-blue-700 pb-2"
                          >
                            {line.replace(/^#+\s*/, "")}
                          </h4>
                        );
                      } else if (isBulletPoint) {
                        return (
                          <div
                            key={lineIndex}
                            className="flex items-start gap-3 ml-4"
                          >
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                              {line.replace(/^[-•*]\s*|\d+\.\s*/, "")}
                            </p>
                          </div>
                        );
                      } else if (hasKeyTerms) {
                        // Parse bold text
                        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/);
                        return (
                          <p
                            key={lineIndex}
                            className="text-slate-700 dark:text-slate-300 leading-relaxed"
                          >
                            {parts.map((part, partIndex) => {
                              if (
                                part.startsWith("**") &&
                                part.endsWith("**")
                              ) {
                                return (
                                  <strong
                                    key={partIndex}
                                    className="font-semibold text-slate-900 dark:text-slate-100 bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded"
                                  >
                                    {part.slice(2, -2)}
                                  </strong>
                                );
                              } else if (
                                part.startsWith("*") &&
                                part.endsWith("*")
                              ) {
                                return (
                                  <em
                                    key={partIndex}
                                    className="italic text-slate-800 dark:text-slate-200"
                                  >
                                    {part.slice(1, -1)}
                                  </em>
                                );
                              }
                              return part;
                            })}
                          </p>
                        );
                      } else if (line.trim()) {
                        return (
                          <p
                            key={lineIndex}
                            className="text-slate-700 dark:text-slate-300 leading-relaxed text-base"
                          >
                            {line}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Answer metadata */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Comprehensive Answer</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Based on {resultData.topic}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>{resultData.answer.split(" ").length} words</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "visualization" as PanelType,
      title: "Visual Explanation",
      icon: ImageIcon,
      content: (
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <img
              src={resultData.visualization || "/placeholder.svg"}
              alt={`Visualization for ${resultData.topic}`}
              className="w-full h-auto max-h-[400px] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(
                  resultData.topic
                )}`;
              }}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Visual representation of {resultData.topic}
          </p>
        </div>
      ),
    },
    {
      id: "summary" as PanelType,
      title: "Key Points",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <div className="grid gap-3">
            {resultData.units.map((unit, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                <span className="text-slate-700 dark:text-slate-300">
                  {unit}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Comprehension Level
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {progressLevel}%
              </span>
            </div>
            <Progress value={progressLevel} className="h-2" />
          </div>
        </div>
      ),
    },
    {
      id: "insights" as PanelType,
      title: "Insights",
      icon: Lightbulb,
      content: (
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Quick Tip
              </h4>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Understanding {resultData.topic} requires grasping the
                relationship between its core concepts.
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                Related Topics
              </h4>
              <div className="flex flex-wrap gap-2">
                {resultData.units.slice(0, 3).map((unit, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-green-300 text-green-700 dark:text-green-300"
                  >
                    {unit}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                Study Focus
              </h4>
              <p className="text-purple-800 dark:text-purple-200 text-sm">
                Focus on the fundamentals before moving to advanced applications
                in {resultData.topic}.
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentPanelIndex = panels.findIndex(
    (panel) => panel.id === activePanel
  );
  const currentPanel = panels[currentPanelIndex];

  const navigatePanel = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? (currentPanelIndex - 1 + panels.length) % panels.length
        : (currentPanelIndex + 1) % panels.length;
    setActivePanel(panels[newIndex].id);
  };

  return (
    <div
      className={cn(
        "mx-auto shadow-lg transition-all duration-300",
        isExpanded ? "max-w-7xl" : "max-w-4xl"
      )}
    >
      {/* Header */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex flex-wrap justify-between items-center">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl font-bold">
                {resultData.topic}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-white hover:bg-white/20"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
              {resultData.units.map((unit, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30"
                >
                  {unit}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>

        {/* Panel Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPanels(!showAllPanels)}
                className="text-slate-600 dark:text-slate-400"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {showAllPanels ? "Single View" : "All Panels"}
              </Button>
            </div>

            {!showAllPanels && (
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigatePanel("prev")}
                  disabled={panels.length <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-2">
                  {panels.map((panel) => {
                    const Icon = panel.icon;
                    return (
                      <Button
                        key={panel.id}
                        variant={activePanel === panel.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActivePanel(panel.id)}
                        className={cn(
                          "flex items-center gap-2",
                          activePanel === panel.id
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{panel.title}</span>
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigatePanel("next")}
                  disabled={panels.length <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          {showAllPanels ? (
            // All panels view
            <div
              className={cn(
                "grid gap-6",
                isExpanded
                  ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-2"
                  : "grid-cols-1"
              )}
            >
              {panels.map((panel) => {
                const Icon = panel.icon;
                return (
                  <Card
                    key={panel.id}
                    className="border border-slate-200 dark:border-slate-700"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5 text-emerald-600" />
                        {panel.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>{panel.content}</CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Single panel view
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <currentPanel.icon className="h-6 w-6 text-emerald-600" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  {currentPanel.title}
                </h3>
              </div>

              <div className="min-h-[300px]">{currentPanel.content}</div>

              {/* Panel indicators */}
              <div className="flex justify-center gap-2 mt-6">
                {panels.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActivePanel(panels[index].id)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentPanelIndex
                        ? "bg-emerald-600"
                        : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
