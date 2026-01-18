"use client";

import { useState, useEffect } from "react";
import {
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
} from "./hooks";

interface RevisionNote {
  id: string;
  title: string;
  subject: string;
  content: string;
  importantPoints: string[];
  estimatedTime: number;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed" | "review_needed";
  tags: string[];
  createdAt: string;
  lastReviewed: string | null;
  resources: Resource[];
}

interface Resource {
  id: string;
  title: string;
  url: string;
  type: "video" | "article" | "book" | "exercise" | "other";
}

interface RevisionStats {
  totalNotes: number;
  totalTime: number;
  completed: number;
  pending: number;
  highPriority: number;
  completionRate: number;
}

interface WidgetData extends Record<string, unknown> {
  notes?: RevisionNote[];
  stats?: RevisionStats;
  action?: string;
  currentNote?: RevisionNote;
  structuredContent?: {
    notes?: RevisionNote[];
    stats?: RevisionStats;
    action?: string;
    currentNote?: RevisionNote;
  };
  result?: {
    structuredContent?: {
      notes?: RevisionNote[];
      stats?: RevisionStats;
      action?: string;
      currentNote?: RevisionNote;
    };
  };
}

const EMPTY_STATS: RevisionStats = {
  totalNotes: 0,
  totalTime: 0,
  completed: 0,
  pending: 0,
  highPriority: 0,
  completionRate: 0,
};

export default function AthenaRevisionApp() {
  const toolOutput = useWidgetProps<WidgetData>();
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();

  const serverData: any =
    toolOutput?.result?.structuredContent ??
    toolOutput?.structuredContent ??
    toolOutput?.result ??
    toolOutput;

  const [notes, setNotes] = useState<RevisionNote[]>([]);
  const [stats, setStats] = useState<RevisionStats>(EMPTY_STATS);
  const [selectedNote, setSelectedNote] = useState<RevisionNote | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail" | "stats">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (serverData) {
      if (
        serverData.notes &&
        Array.isArray(serverData.notes) &&
        serverData.notes.length > 0
      ) {
        setNotes(serverData.notes);

        const newStats: RevisionStats = {
          totalNotes: serverData.notes.length,
          totalTime: serverData.notes.reduce(
            (sum: number, note: RevisionNote) => sum + note.estimatedTime,
            0,
          ),
          completed: serverData.notes.filter(
            (note: RevisionNote) => note.status === "completed",
          ).length,
          pending: serverData.notes.filter(
            (note: RevisionNote) => note.status !== "completed",
          ).length,
          highPriority: serverData.notes.filter(
            (note: RevisionNote) => note.priority === "high",
          ).length,
          completionRate:
            serverData.notes.length > 0
              ? Math.round(
                  (serverData.notes.filter(
                    (note: RevisionNote) => note.status === "completed",
                  ).length /
                    serverData.notes.length) *
                    100,
                )
              : 0,
        };
        setStats(newStats);
      }

      if (serverData.stats) {
        setStats(serverData.stats);
      }

      if (serverData.currentNote) {
        setSelectedNote(serverData.currentNote);
        setViewMode("detail");
      }

      if (serverData.action === "create_note") {
        setViewMode("list");
      }
    }
  }, [serverData]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
      case "medium":
        return "bg-amber-500/10 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
      case "low":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
      case "review_needed":
        return "bg-violet-500/10 text-violet-700 border border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "→";
      case "review_needed":
        return "↻";
      default:
        return "○";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "completed":
        return "Terminé";
      case "in_progress":
        return "En cours";
      case "review_needed":
        return "À réviser";
      case "not_started":
        return "Non commencé";
      default:
        return status;
    }
  };

  const translatePriority = (priority: string) => {
    switch (priority) {
      case "high":
        return "Haute";
      case "medium":
        return "Moyenne";
      case "low":
        return "Basse";
      default:
        return priority;
    }
  };

  const filteredNotes = notes.filter((note) => {
    if (filterStatus !== "all") {
      if (filterStatus === "pending" && note.status === "completed")
        return false;
      if (filterStatus === "high_priority" && note.priority !== "high")
        return false;
      if (
        filterStatus !== "pending" &&
        filterStatus !== "high_priority" &&
        note.status !== filterStatus
      )
        return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.subject.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        note.importantPoints.some((point) =>
          point.toLowerCase().includes(query),
        )
      );
    }

    return true;
  });

  const FullScreenButton = () => (
    <button
      onClick={() => requestDisplayMode("fullscreen")}
      className="fixed top-6 right-6 z-50 rounded-lg bg-white dark:bg-gray-800 p-2.5 shadow-lg border border-gray-300 dark:border-gray-700 hover:scale-105 transition-transform"
      aria-label="Plein écran"
    >
      <svg
        className="w-6 h-6 text-gray-600 dark:text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
    </button>
  );

  const ListView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Rechercher une fiche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-5 py-3.5 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-5 py-3.5 text-lg rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[180px] focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="all">Toutes les fiches</option>
              <option value="not_started">Non commencées</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminées</option>
              <option value="review_needed">À réviser</option>
              <option value="high_priority">Priorité haute</option>
            </select>
          </div>
        </div>
      </div>

      <div className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-4 px-2">
        {filteredNotes.length} fiches trouvées
      </div>

      {filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-8xl mb-6 text-gray-400">📚</div>
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">
            {notes.length === 0
              ? "Aucune fiche de révision"
              : "Aucune fiche ne correspond à votre recherche"}
          </h3>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
            {notes.length === 0
              ? "Demandez à Athena AI de créer des fiches pour vous"
              : "Essayez avec d'autres termes ou modifiez les filtres"}
          </p>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 max-w-xl mx-auto border border-gray-200 dark:border-gray-700">
            <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              Exemples de requêtes pour Athena :
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>• "Crée une fiche sur la révolution française"</li>
              <li>• "Résume les principes de la mécanique quantique"</li>
              <li>• "Organise mes notes d'algèbre linéaire"</li>
              <li>• "Génère une fiche de révision sur la photosynthèse"</li>
              <li>
                • "Crée un résumé du chapitre sur la Seconde Guerre mondiale"
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => {
                setSelectedNote(note);
                setViewMode("detail");
              }}
              className="group bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-600 dark:hover:border-blue-500 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2 mb-2">
                      {note.title}
                    </h3>
                    <p className="text-base text-gray-500 dark:text-gray-400">
                      {note.subject}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {formatTime(note.estimatedTime)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Durée
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  <span
                    className={`px-3 py-1.5 rounded text-sm font-medium ${getPriorityColor(note.priority)}`}
                  >
                    {translatePriority(note.priority)}
                  </span>
                  <span
                    className={`px-3 py-1.5 rounded text-sm font-medium ${getStatusColor(note.status)}`}
                  >
                    {translateStatus(note.status)}
                  </span>
                </div>

                {note.tags.length > 0 && (
                  <div className="mb-5">
                    <div className="flex flex-wrap gap-2">
                      {note.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg"
                        >
                          #{tag}
                        </span>
                      ))}
                      {note.tags.length > 3 && (
                        <span className="px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500">
                          +{note.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {note.importantPoints.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3">
                      POINTS CLÉS
                    </div>
                    <div className="space-y-2">
                      {note.importantPoints.slice(0, 2).map((point, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="text-blue-600 dark:text-blue-400 mt-1 text-lg">
                            •
                          </span>
                          <span className="text-base text-gray-700 dark:text-gray-300 line-clamp-2">
                            {point}
                          </span>
                        </div>
                      ))}
                      {note.importantPoints.length > 2 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                          +{note.importantPoints.length - 2} autres points
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const StatsView = () => (
    <div className="space-y-8">
      {notes.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4 text-blue-400">📊</div>
          <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-3">
            Aucune statistique disponible
          </h3>
          <p className="text-blue-600 dark:text-blue-400 mb-6">
            Les statistiques s'afficheront automatiquement quand Athena créera
            vos fiches de révision
          </p>
          <div className="bg-white dark:bg-blue-900/30 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Demandez à Athena :
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              "Crée des fiches de révision sur [votre sujet]"
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-2xl">📚</span>
                </div>
                <div>
                  <div className="text-base text-gray-500 dark:text-gray-400">
                    Fiches totales
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalNotes}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
                  <span className="text-white text-2xl">✅</span>
                </div>
                <div>
                  <div className="text-base text-gray-500 dark:text-gray-400">
                    Terminées
                  </div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.completed}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center">
                  <span className="text-white text-2xl">⏱️</span>
                </div>
                <div>
                  <div className="text-base text-gray-500 dark:text-gray-400">
                    Temps total
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {formatTime(stats.totalTime)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-2xl">📈</span>
                </div>
                <div>
                  <div className="text-base text-gray-500 dark:text-gray-400">
                    Progression
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.completionRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-7 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Progression par statut
              </h3>
              <div className="space-y-6">
                {[
                  "completed",
                  "in_progress",
                  "not_started",
                  "review_needed",
                ].map((status) => {
                  const count = notes.filter((n) => n.status === status).length;
                  const percentage =
                    notes.length > 0 ? (count / notes.length) * 100 : 0;
                  return (
                    <div key={status} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full ${
                              status === "completed"
                                ? "bg-emerald-500"
                                : status === "in_progress"
                                  ? "bg-blue-500"
                                  : status === "review_needed"
                                    ? "bg-violet-500"
                                    : "bg-gray-500"
                            }`}
                          ></div>
                          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {translateStatus(status)}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            status === "completed"
                              ? "bg-emerald-500"
                              : status === "in_progress"
                                ? "bg-blue-500"
                                : status === "review_needed"
                                  ? "bg-violet-500"
                                  : "bg-gray-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-7 hover:border-blue-600 dark:hover:border-blue-500 transition-colors">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Distribution par priorité
              </h3>
              <div className="space-y-6">
                {["high", "medium", "low"].map((priority) => {
                  const count = notes.filter(
                    (n) => n.priority === priority,
                  ).length;
                  const percentage =
                    notes.length > 0 ? (count / notes.length) * 100 : 0;
                  return (
                    <div key={priority} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full ${
                              priority === "high"
                                ? "bg-red-500"
                                : priority === "medium"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                          ></div>
                          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                            {translatePriority(priority)}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            priority === "high"
                              ? "bg-red-500"
                              : priority === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-7">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Détail par statut
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-lg">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Statut
                    </th>
                    <th className="pb-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Nombre
                    </th>
                    <th className="pb-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Pourcentage
                    </th>
                    <th className="pb-4 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Temps moyen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "completed",
                    "in_progress",
                    "not_started",
                    "review_needed",
                  ].map((status) => {
                    const count = notes.filter(
                      (n) => n.status === status,
                    ).length;
                    const percentage =
                      notes.length > 0 ? (count / notes.length) * 100 : 0;
                    const avgTime =
                      count > 0
                        ? Math.round(
                            notes
                              .filter((n) => n.status === status)
                              .reduce((sum, n) => sum + n.estimatedTime, 0) /
                              count,
                          )
                        : 0;

                    return (
                      <tr
                        key={status}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full ${
                                status === "completed"
                                  ? "bg-emerald-500"
                                  : status === "in_progress"
                                    ? "bg-blue-500"
                                    : status === "review_needed"
                                      ? "bg-violet-500"
                                      : "bg-gray-500"
                              }`}
                            ></div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {translateStatus(status)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 font-bold text-gray-900 dark:text-gray-100">
                          {count}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {percentage.toFixed(1)}%
                            </span>
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  status === "completed"
                                    ? "bg-emerald-500"
                                    : status === "in_progress"
                                      ? "bg-blue-500"
                                      : status === "review_needed"
                                        ? "bg-violet-500"
                                        : "bg-gray-500"
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 font-bold text-gray-900 dark:text-gray-100">
                          {formatTime(avgTime)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const DetailView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setViewMode("list")}
          className="flex items-center gap-3 text-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Retour à la liste
        </button>
        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-2 rounded-lg text-base font-medium ${getPriorityColor(selectedNote!.priority)}`}
          >
            {translatePriority(selectedNote!.priority)}
          </span>
          <span
            className={`px-4 py-2 rounded-lg text-base font-medium ${getStatusColor(selectedNote!.status)}`}
          >
            {translateStatus(selectedNote!.status)}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8">
          <h2 className="text-3xl font-bold text-white mb-3">
            {selectedNote!.title}
          </h2>
          <p className="text-xl text-blue-100 mb-6">{selectedNote!.subject}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-base text-blue-200">
              <div>
                <span className="font-semibold">Créé le: </span>
                {new Date(selectedNote!.createdAt).toLocaleDateString("fr-FR")}
              </div>
              {selectedNote!.lastReviewed && (
                <div>
                  <span className="font-semibold">Dernière révision: </span>
                  {new Date(selectedNote!.lastReviewed).toLocaleDateString(
                    "fr-FR",
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {formatTime(selectedNote!.estimatedTime)}
              </div>
              <div className="text-base text-blue-200">Durée estimée</div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {selectedNote!.tags.length > 0 && (
            <div className="mb-8">
              <div className="flex flex-wrap gap-3">
                {selectedNote!.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-base border-2 border-blue-200 dark:border-blue-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedNote!.importantPoints.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Points importants
              </h3>
              <div className="space-y-4">
                {selectedNote!.importantPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border-2 border-blue-100 dark:border-blue-800/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-lg font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Contenu
            </h3>
            <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
              {selectedNote!.content.split("\n").map((paragraph, idx) => (
                <p
                  key={idx}
                  className="text-lg text-gray-700 dark:text-gray-300 mb-6 last:mb-0"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {selectedNote!.resources.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                Ressources ({selectedNote!.resources.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedNote!.resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          resource.type === "video"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800"
                            : resource.type === "article"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800"
                              : resource.type === "book"
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-200 dark:border-emerald-800"
                                : resource.type === "exercise"
                                  ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-2 border-violet-200 dark:border-violet-800"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <span className="text-2xl">
                          {resource.type === "video"
                            ? "🎬"
                            : resource.type === "article"
                              ? "📰"
                              : resource.type === "book"
                                ? "📖"
                                : resource.type === "exercise"
                                  ? "📝"
                                  : "📎"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                          {resource.title}
                        </div>
                        <div className="text-base text-gray-500 dark:text-gray-400 capitalize">
                          {resource.type === "exercise"
                            ? "exercice"
                            : resource.type}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="font-sans min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
        overflow: "auto",
      }}
    >
      {displayMode !== "fullscreen" && isChatGptApp && <FullScreenButton />}

      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-7 mb-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">ATHENA REVISION</h1>
              <p className="text-xl text-blue-100">
                Assistant de révision intelligent
              </p>
            </div>

            <div className="flex gap-2 bg-white/10 rounded-xl p-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-white text-blue-700 shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/5"
                }`}
              >
                📋 Liste
              </button>
              <button
                onClick={() => setViewMode("stats")}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  viewMode === "stats"
                    ? "bg-white text-blue-700 shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/5"
                }`}
              >
                📊 Statistiques
              </button>
            </div>
          </div>

          {notes.length > 0 && viewMode === "list" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-white/80 mb-1">Total</div>
                <div className="text-2xl font-bold text-white">
                  {stats.totalNotes}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-white/80 mb-1">Terminées</div>
                <div className="text-2xl font-bold text-emerald-300">
                  {stats.completed}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-white/80 mb-1">En attente</div>
                <div className="text-2xl font-bold text-amber-300">
                  {stats.pending}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-sm text-white/80 mb-1">Progression</div>
                <div className="text-2xl font-bold text-white">
                  {stats.completionRate}%
                </div>
              </div>
            </div>
          )}

          {notes.length === 0 && viewMode === "list" && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="flex items-center gap-3 text-white/90">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">
                  Athena n'a pas encore créé de fiches. Demandez-lui d'en créer
                  !
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <main>
        {viewMode === "list" && <ListView />}
        {viewMode === "stats" && <StatsView />}
        {viewMode === "detail" && selectedNote && <DetailView />}
      </main>

      <footer className="mt-10 pt-8 border-t-2 border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-base text-gray-500 dark:text-gray-400">
            Athena Revision • Assistant intelligent pour étudiants
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Les fiches sont générées et organisées par Athena AI
          </p>
        </div>
      </footer>
    </div>
  );
}
