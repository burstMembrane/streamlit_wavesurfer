import { useTimeFormatter } from "@waveformviewer/hooks";
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
export interface AudioControlsProps {
    skipBackward: () => void;
    isPlaying: boolean;
    pause: () => void;
    play: () => void;
    skipForward: () => void;
    currentTime: number;
    duration: number;
}

export const AudioControls = ({ skipBackward, isPlaying, pause, play, skipForward, currentTime, duration }: AudioControlsProps) => {
    const formatTime = useTimeFormatter();
    return (
        <div className="flex justify-center items-center gap-2">
            <div className="flex items-center gap-2">
                <button
                    onClick={skipBackward}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    <SkipBack size={20} />
                </button>

                <button
                    onClick={isPlaying ? pause : play}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    {!isPlaying ? <Play size={24} /> : <Pause size={24} />}
                </button>

                <button
                    onClick={skipForward}
                    className="bg-transparent border-none cursor-pointer p-2 flex items-center justify-center text-white"
                >
                    <SkipForward size={20} />
                </button>

                <div className="flex items-center gap-4 text-white">
                    <span>{formatTime(currentTime)}</span>
                    <span>/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

        </div>
    )
}