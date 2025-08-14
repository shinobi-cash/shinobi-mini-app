/**
 * Key Generation Step
 * Generates cryptographic keys from the signed message
 */

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSetupStore } from '@/stores/setupStore'
import { toast } from 'sonner'
import { generateKeysFromRandomSeed } from '@/utils/crypto'

export function GenerateKeysStep() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [currentTask, setCurrentTask] = useState('');
  const { setKeys, setCurrentStep } = useSetupStore();

  useEffect(() => {
    if (!isGenerating && !isComplete) {
      handleGenerateKeys();
    }
    // eslint-disable-next-line
  }, [isGenerating, isComplete]);

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setProgress(0);
    try {
      // Simulate progress for better UX
      const tasks = [
        { name: 'Generating entropy...', duration: 600 },
        { name: 'Creating mnemonic...', duration: 700 },
        { name: 'Deriving keys...', duration: 500 },
        { name: 'Validating security...', duration: 400 },
      ];
      let completedProgress = 0;
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setCurrentTask(task.name);
        const taskProgress = 100 / tasks.length;
        const startProgress = completedProgress;
        await new Promise(resolve => {
          const interval = setInterval(() => {
            completedProgress += taskProgress / 20;
            setProgress(Math.min(completedProgress, startProgress + taskProgress));
            if (completedProgress >= startProgress + taskProgress) {
              clearInterval(interval);
              resolve(void 0);
            }
          }, task.duration / 20);
        });
      }
      setCurrentTask('Finalizing keys...');
      const randomSeed = Math.random().toString(36).slice(2);
      const keys = await generateKeysFromRandomSeed(randomSeed);
      setKeys(keys);
      setProgress(100);
      setCurrentTask('Keys generated successfully!');
      setIsComplete(true);
      toast.success('Account created successfully!');
      setTimeout(() => {
        setCurrentStep('backup-mnemonic');
      }, 2000);
    } catch (error) {
      console.error('Failed to generate keys:', error);
      let errorMessage = 'Failed to generate keys. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('invalid mnemonic')) {
          errorMessage = 'Invalid cryptographic data generated. Please restart setup.';
        } else if (error.message.includes('entropy')) {
          errorMessage = 'Insufficient entropy for key generation. Please try again.';
        } else if (error.message.includes('random')) {
          errorMessage = 'Failed to generate secure random data. Please try again.';
        }
      }
      toast.error(errorMessage, {
        duration: 6000,
        action: {
          label: 'Go Back',
          onClick: () => {
            setCurrentStep('generate-keys');
          }
        }
      });
      setProgress(0);
      setCurrentTask('Key generation failed');
      setIsComplete(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-8">
      <div className="w-full max-w-xs mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-4">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-base-app font-medium text-center mb-2">
              {currentTask || 'Preparing key generation...'}
            </p>
            {currentTask.includes('failed') && (
              <div className="space-y-4">
                <p className="text-sm-app text-red-600 font-medium">
                  Setup failed
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setCurrentStep('generate-keys');
                  }}
                  className="h-10 px-4 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}