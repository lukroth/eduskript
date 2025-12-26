'use client'

import { AnimationState } from './types'

interface ControlPanelProps {
  animationState: AnimationState
  currentStepIndex: number
  totalSteps: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onSpeedChange: (speed: number) => void
  onReset: () => void
  stepDescription?: string
  disabled: boolean
}

export function ControlPanel({
  animationState,
  currentStepIndex,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  onReset,
  stepDescription,
  disabled
}: ControlPanelProps) {
  const isPlaying = animationState === AnimationState.PLAYING
  const canStepBack = currentStepIndex > 0
  const canStepForward = currentStepIndex < totalSteps - 1

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onStepBackward}
          disabled={disabled || !canStepBack}
          title="Schritt zurück"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={isPlaying ? onPause : onPlay}
          disabled={disabled}
          title={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onStepForward}
          disabled={disabled || !canStepForward}
          title="Schritt vorwärts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <button
          className="p-2 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={onReset}
          disabled={disabled || currentStepIndex < 0}
          title="Zurücksetzen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>

        <div className="flex items-center gap-2 ml-4">
          <label htmlFor="speed-slider" className="text-sm text-gray-600 dark:text-gray-400">Geschwindigkeit:</label>
          <input
            id="speed-slider"
            type="range"
            min="100"
            max="2000"
            step="100"
            value={2100 - speed}
            onChange={e => onSpeedChange(2100 - Number(e.target.value))}
            className="w-24"
          />
        </div>

        <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
          {totalSteps > 0 ? (
            <span>
              Schritt {Math.max(0, currentStepIndex + 1)} / {totalSteps}
            </span>
          ) : (
            <span>Klicke auf einen Knoten als Startpunkt</span>
          )}
        </div>
      </div>

      {stepDescription && (
        <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 rounded px-3 py-2">
          {stepDescription}
        </div>
      )}
    </div>
  )
}
