import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";
import { Howl } from "howler";

interface Props {
  audioUrl: string | null;
  songName?: string;
}

export default function MusicPlayer({ audioUrl, songName }: Props) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("amory_volume");
    return saved ? parseFloat(saved) : 0.5;
  });
  const howlRef = useRef<Howl | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const fadeOut = useCallback(() => {
    const howl = howlRef.current;
    if (howl && howl.playing()) {
      howl.fade(howl.volume(), 0, 1500);
      setTimeout(() => howl.stop(), 1500);
    }
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    if (audioUrl === prevUrlRef.current) return;

    fadeOut();

    const newHowl = new Howl({
      src: [audioUrl],
      volume: 0,
      loop: true,
    });

    howlRef.current = newHowl;
    prevUrlRef.current = audioUrl;

    if (playing) {
      newHowl.play();
      newHowl.fade(0, volume, 1500);
    }

    return () => { newHowl.unload(); };
  }, [audioUrl]);

  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(muted ? 0 : volume);
    localStorage.setItem("amory_volume", volume.toString());
  }, [volume, muted]);

  const togglePlay = () => {
    const howl = howlRef.current;
    if (!howl) return;
    if (playing) { howl.pause(); } else { howl.play(); howl.fade(0, volume, 500); }
    setPlaying(!playing);
  };

  if (!audioUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 md:bottom-6 right-4 glass rounded-2xl shadow-elevated px-4 py-2.5 flex items-center gap-3 z-40 border border-warm-200/50"
    >
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-burnt-300 text-white flex items-center justify-center hover:bg-burnt-400 transition-colors"
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex items-center gap-2">
        <Music size={12} className="text-warm-400" />
        <span className="text-xs text-charcoal-500 max-w-[100px] truncate font-medium">
          {songName || "Reproducing..."}
        </span>
      </div>

      <button onClick={() => setMuted(!muted)} className="text-warm-400 hover:text-charcoal-400 transition-colors">
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="w-14 h-1 accent-burnt-300"
      />
    </motion.div>
  );
}
