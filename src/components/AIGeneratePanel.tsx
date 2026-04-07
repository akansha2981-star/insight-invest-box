import { useState } from "react";
import { Sparkles, Loader2, Zap, Calendar } from "lucide-react";

function getTodayIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
}

interface AIGeneratePanelProps {
  label?: string;
  topicPlaceholder?: string;
  generating: boolean;
  onGenerate: (topic: string, targetDate: string) => void;
  onGenerateAndPublish: (topic: string, targetDate: string) => void;
  generateLabel?: string;
  publishLabel?: string;
  hideTopic?: boolean;
}

export function AIGeneratePanel({
  label = "AI Auto-Generate",
  topicPlaceholder = "Enter topic or keyword…",
  generating,
  onGenerate,
  onGenerateAndPublish,
  generateLabel = "Generate & Edit",
  publishLabel = "Generate & Publish",
  hideTopic = false,
}: AIGeneratePanelProps) {
  const [topic, setTopic] = useState("");
  const [targetDate, setTargetDate] = useState(getTodayIST());

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-bold text-purple-900">{label}</span>
      </div>

      <div className="flex flex-col gap-3 mb-3">
        {!hideTopic && (
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={topicPlaceholder}
            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-400"
          />
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-purple-500 shrink-0" />
          <input
            type="date"
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
            className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white text-foreground focus:outline-none focus:border-purple-400"
          />
          <span className="text-[10px] text-purple-500">Content date</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onGenerate(topic, targetDate)}
          disabled={generating}
          className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors flex-1"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generateLabel}
        </button>
        <button
          onClick={() => onGenerateAndPublish(topic, targetDate)}
          disabled={generating}
          className="flex items-center justify-center gap-2 bg-purple-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-900 disabled:opacity-50 transition-colors flex-1"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {publishLabel}
        </button>
      </div>
      <p className="text-[10px] text-purple-600 mt-2">AI generates latest data for the selected date and fills all fields</p>
    </div>
  );
}
