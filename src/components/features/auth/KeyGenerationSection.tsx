import { useBanner } from "@/contexts/BannerContext";
import { type KeyGenerationResult, generateKeysFromRandomSeed } from "@/utils/crypto";
import { Key } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";

interface KeyGenerationSectionProps {
  onKeyGenerationComplete: (keys: KeyGenerationResult) => void;
}

export function KeyGenerationSection({ onKeyGenerationComplete }: KeyGenerationSectionProps) {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { banner } = useBanner();

  const handleGenerateKeys = async () => {
    setProgress(0);
    setIsGenerating(true);
    try {
      // Simulate progress for better UX
      const tasks = [
        { name: "Generating entropy...", duration: 600 },
        { name: "Creating mnemonic...", duration: 700 },
        { name: "Deriving keys...", duration: 500 },
        { name: "Validating security...", duration: 400 },
      ];

      let completedProgress = 0;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setCurrentTask(task.name);
        const taskProgress = 100 / tasks.length;
        const startProgress = completedProgress;

        // Animate progress within this task
        const steps = 10;
        for (let step = 0; step <= steps; step++) {
          const stepProgress = (step / steps) * taskProgress;
          setProgress(startProgress + stepProgress);
          await new Promise((resolve) => setTimeout(resolve, task.duration / steps));
        }

        completedProgress += taskProgress;
      }

      setCurrentTask("Finalizing...");

      // Generate secure random seed
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const randomSeed = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const keys = generateKeysFromRandomSeed(randomSeed);
      setProgress(100);

      setTimeout(() => {
        setIsGenerating(false);
        onKeyGenerationComplete(keys);
      }, 500);
    } catch (error) {
      console.error("Key generation failed:", error);
      setIsGenerating(false);
      banner.error("Key generation failed. Please try again.");
    }
  };

  if (isGenerating) {
    return (
      <div className="space-y-4">
        <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
          <div className="text-center">
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm font-medium text-app-primary text-center mb-2">
              {currentTask || "Preparing key generation..."}
            </p>
            <p className="text-xs text-app-secondary">Please wait while we generate your secure keys...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto">
          <Key className="w-8 h-8 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-app-primary">Generate Keys</h3>
          <p className="text-sm text-app-secondary max-w-sm mx-auto mt-2">
            Create your secure cryptographic keys and recovery phrase to get started with Shinobi.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">What happens next?</p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Generate cryptographically secure keys</li>
              <li>• Create a 12-word recovery phrase</li>
              <li>• Set up convenient authentication</li>
            </ul>
          </div>
        </div>
      </div>

      <Button onClick={handleGenerateKeys} className="w-full" size="lg">
        Generate My Keys
      </Button>
    </div>
  );
}
