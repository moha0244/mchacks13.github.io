"use client";

import { useState, useEffect } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
} from "./hooks";

// Define study content structure
interface StudyContent {
  id: string;
  title: string;
  content: string; // Markdown content
  revisionTime: string; // e.g., "30 minutes", "2 hours"
  complexity: "easy" | "medium" | "hard";
  createdAt: string;
  chapters?: Array<{
    title: string;
    revisionTime: string;
    complexity: "easy" | "medium" | "hard";
    keyPoints: string[];
  }>;
}

interface WidgetData extends Record<string, unknown> {
  // Different possible structures for study content
  studyContent?: StudyContent;
  content?: string;
  title?: string;
  revisionTime?: string;
  complexity?: string;
  chapters?: any[];
  
  // Add the missing properties
  summary?: string;
  text?: string;
  markdown?: string;
  message?: string;
  filename?: string;
  studyTime?: string;
  duration?: string;
  difficulty?: string;
  sections?: any[];
  
  // Structured content variations
  structuredContent?: {
    studyContent?: StudyContent;
    content?: string;
    title?: string;
    revisionTime?: string;
    complexity?: string;
    chapters?: any[];
    summary?: string;
    text?: string;
    markdown?: string;
    message?: string;
    filename?: string;
    studyTime?: string;
    duration?: string;
    difficulty?: string;
    sections?: any[];
  };
  result?: {
    structuredContent?: {
      studyContent?: StudyContent;
      content?: string;
      title?: string;
      revisionTime?: string;
      complexity?: string;
      chapters?: any[];
      summary?: string;
      text?: string;
      markdown?: string;
      message?: string;
      filename?: string;
      studyTime?: string;
      duration?: string;
      difficulty?: string;
      sections?: any[];
    };
    studyContent?: StudyContent;
    content?: string;
    title?: string;
    revisionTime?: string;
    complexity?: string;
    chapters?: any[];
    summary?: string;
    text?: string;
    markdown?: string;
    message?: string;
    filename?: string;
    studyTime?: string;
    duration?: string;
    difficulty?: string;
    sections?: any[];
  };
}

export default function StudyApp() {
  const toolOutput = useWidgetProps<WidgetData>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();

  // Extract study content from tool output - CAST TO ANY
  const serverContent: any = (
    toolOutput?.result?.structuredContent?.studyContent ??
    toolOutput?.result?.studyContent ??
    toolOutput?.structuredContent?.studyContent ??
    toolOutput?.studyContent ??
    toolOutput?.result?.structuredContent ??
    toolOutput?.structuredContent ??
    toolOutput?.result ??
    toolOutput
  );

  // Local state for UI
  const [studyData, setStudyData] = useState<StudyContent | null>(null);
  const [content, setContent] = useState<string>("");

  // Sync from server whenever tool output changes
  useEffect(() => {
    console.log("Received tool output:", serverContent); // Debug log
    
    if (serverContent) {
      if (typeof serverContent === 'object' && 'content' in serverContent) {
        // It's a StudyContent object
        setStudyData(serverContent as StudyContent);
        setContent(serverContent.content || "");
      } else if (typeof serverContent === 'string') {
        // It's just string content
        setContent(serverContent);
        setStudyData({
          id: "study-" + Math.abs(serverContent.length).toString(),
          title: "Study Material",
          content: serverContent,
          revisionTime: "Not specified",
          complexity: "medium",
          createdAt: "Today",
        });
      } else if (serverContent && typeof serverContent === 'object') {
        // Try to extract content from various fields
        let extractedContent = "";
        
        // Check for content in various fields - serverContent is now 'any'
        if (serverContent.content) {
          extractedContent = serverContent.content;
        } else if (serverContent.summary) {
          extractedContent = serverContent.summary;
        } else if (serverContent.text) {
          extractedContent = serverContent.text;
        } else if (serverContent.markdown) {
          extractedContent = serverContent.markdown;
        } else if (serverContent.message) {
          extractedContent = serverContent.message;
        } else {
          // If no content found, format object as readable text without JSON braces
          extractedContent = Object.entries(serverContent)
            .filter(([key]) => !key.startsWith('_') && key !== 'id' && key !== 'createdAt')
            .map(([key, value]) => {
              if (typeof value === 'string' && value.trim()) {
                return `**${key}:** ${value}`;
              } else if (Array.isArray(value) && value.length > 0) {
                return `**${key}:**\n${value.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n\n') || "Study content received. Format your response with 'content' or 'summary' field for better display.";
        }
        
        setContent(extractedContent);
        setStudyData({
          // Use extractedContent.length safely
          id: "study-" + Math.abs(extractedContent.length).toString(),
          title: serverContent.title || serverContent.filename || "Study Material",
          content: extractedContent,
          revisionTime: serverContent.revisionTime || serverContent.studyTime || serverContent.duration || "Not specified",
          complexity: (() => {
            const comp = serverContent.complexity || serverContent.difficulty;
            if (comp && ['easy', 'medium', 'hard'].includes(comp.toLowerCase())) {
              return comp.toLowerCase() as "easy" | "medium" | "hard";
            }
            return "medium";
          })(),
          createdAt: serverContent.createdAt || "Today",
          chapters: serverContent.chapters || serverContent.sections,
        });
      }
    }
  }, [serverContent]);

  // Helper function to render markdown-like content
  const renderContent = (text: string) => {
    // First escape any curly braces to prevent React from interpreting them
    const escapeBraces = (str: string) => {
      return str.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
    };
    
    return text.split('\n').map((line, index) => {
      const escapedLine = escapeBraces(line);
      
      // Check for bullet points (starting with -, *, •)
      if (line.match(/^[-*•]\s/)) {
        return (
          <div key={index} className="flex items-start gap-2 mb-1 ml-4">
            <span className="text-emerald-500 mt-1">•</span>
            <span 
              className="text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: escapedLine.substring(2) }}
            />
          </div>
        );
      }
      
      // Check for numbered lists
      if (line.match(/^\d+\.\s/)) {
        const number = line.split('.')[0];
        const content = line.substring(line.indexOf('.') + 2);
        return (
          <div key={index} className="flex items-start gap-2 mb-1 ml-4">
            <span className="text-emerald-500 font-medium mt-1">
              {number}.
            </span>
            <span 
              className="text-zinc-700 dark:text-zinc-300"
              dangerouslySetInnerHTML={{ __html: escapeBraces(content) }}
            />
          </div>
        );
      }
      
      // Check for headers
      if (line.startsWith('# ')) {
        return (
          <h2 key={index} className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mt-6 mb-3">
            <span dangerouslySetInnerHTML={{ __html: escapedLine.substring(2) }} />
          </h2>
        );
      }
      
      if (line.startsWith('## ')) {
        return (
          <h3 key={index} className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mt-5 mb-2">
            <span dangerouslySetInnerHTML={{ __html: escapedLine.substring(3) }} />
          </h3>
        );
      }
      
      if (line.startsWith('### ')) {
        return (
          <h4 key={index} className="font-medium text-zinc-800 dark:text-zinc-100 mt-4 mb-2">
            <span dangerouslySetInnerHTML={{ __html: escapedLine.substring(4) }} />
          </h4>
        );
      }
      
      // Check for bold text (handled by dangerouslySetInnerHTML)
      if (line.includes('**') && line.includes('**', line.indexOf('**') + 2)) {
        return (
          <p 
            key={index} 
            className="text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed font-medium"
            dangerouslySetInnerHTML={{ __html: escapedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        );
      }
      
      // Regular paragraph
      if (line.trim()) {
        return (
          <p 
            key={index} 
            className="text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: escapedLine }}
          />
        );
      }
      
      // Empty line (add spacing)
      return <div key={index} className="h-3" />;
    });
  };

  // Get complexity badge color
  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  // Calculate total revision time if chapters exist
  const calculateTotalRevisionTime = () => {
    if (!studyData?.chapters) return studyData?.revisionTime || "Not specified";
    
    // Simple calculation - in a real app you'd parse time strings
    return `${studyData.chapters.length * 30} minutes (estimated)`;
  };

  return (
    <div
      className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 p-4"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
        overflow: "auto",
      }}
    >
      {/* Fullscreen button */}
      {displayMode !== "fullscreen" && isChatGptApp && (
        <button
          aria-label="Enter fullscreen"
          className="fixed top-4 right-4 z-50 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
        </button>
      )}

      <main className="max-w-3xl mx-auto">
        {/* Not in ChatGPT warning */}
        {!isChatGptApp && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  This study widget works inside ChatGPT.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Ask ChatGPT to summarize study material for you
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Study Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📚</span>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white">
                  {studyData?.title || "Study Material"}
                </h1>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-white">
                      Revision: {calculateTotalRevisionTime()}
                    </span>
                  </div>
                  {studyData?.complexity && (
                    <div className={`rounded-full px-3 py-1 text-sm font-medium ${getComplexityColor(studyData.complexity)}`}>
                      {studyData.complexity.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {!content ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📖</div>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                  No study material yet
                </p>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
                  Ask ChatGPT to summarize content for you!
                </p>
                <div className="mt-6 max-w-md mx-auto">
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 text-left">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Try asking:
                    </p>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <li>• "Summarize this PDF with key points and revision time"</li>
                      <li>• "Create a study guide for this topic"</li>
                      <li>• "Break down this content into chapters with complexity ratings"</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chapters overview if available */}
                {studyData?.chapters && studyData.chapters.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Chapters Overview
                    </h3>
                    <div className="grid gap-3">
                      {studyData.chapters.map((chapter, index) => (
                        <div
                          key={index}
                          className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-zinc-800 dark:text-zinc-200">
                              {chapter.title}
                            </h4>
                            <div className="flex items-center gap-3">
                              <span className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded">
                                {chapter.revisionTime}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(chapter.complexity)}`}>
                                {chapter.complexity}
                              </span>
                            </div>
                          </div>
                          {chapter.keyPoints && chapter.keyPoints.length > 0 && (
                            <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                              {chapter.keyPoints.slice(0, 3).map((point, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                              {chapter.keyPoints.length > 3 && (
                                <li className="text-xs text-zinc-500">
                                  + {chapter.keyPoints.length - 3} more points
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                    Study Summary
                  </h3>
                  <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-5">
                    {renderContent(content)}
                  </div>
                </div>

                {/* Study Tips */}
                <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Study Tips
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Break down revision into {studyData?.chapters?.length || 3} sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Review difficult chapters first</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Use active recall by covering the content and trying to remember key points</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {content && (
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                Content generated by AI • Adjust revision time based on your pace
              </p>
            </div>
          )}
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Study Assistant
        </p>
      </main>
    </div>
  );
}