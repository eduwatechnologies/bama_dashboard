'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import styles from './PlayButton.module.css';

let activeStop: (() => void) | null = null;

export interface PlayButtonProps {
  src: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function PlayButton({
  src,
  label = 'audio',
  compact = true,
  className,
}: PlayButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const release = useCallback(() => {
    if (activeStop === stopRef.current) {
      activeStop = null;
    }
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    release();
    setPlaying(false);
  }, [release]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audioRef.current = null;
      }
      release();
    };
  }, [release]);

  useEffect(() => {
    setFailed(false);
    stop();
  }, [src, stop]);

  const handleFailure = useCallback(() => {
    release();
    setPlaying(false);
    setFailed(true);
  }, [release]);

  const play = useCallback(() => {
    if (!src) return;
    let audio = audioRef.current;
    if (!audio || audio.dataset.src !== src) {
      audio = new Audio();
      audio.dataset.src = src;
      audio.preload = 'auto';
      audio.src = src;
      audio.onended = stop;
      audio.onpause = () => setPlaying(false);
      audio.onerror = handleFailure;
      audioRef.current = audio;
    }
    if (activeStop && activeStop !== stopRef.current) {
      activeStop();
    }
    activeStop = stopRef.current;
    audio.play().then(() => {
      setFailed(false);
      setPlaying(true);
    }).catch(handleFailure);
  }, [src, stop, handleFailure]);

  const toggle = useCallback(() => {
    if (playing) {
      stop();
      return;
    }
    play();
  }, [play, playing, stop]);

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <Button
        type="button"
        size={compact ? 'sm' : 'md'}
        variant={playing ? 'primary' : 'secondary'}
        onClick={toggle}
        aria-label={`${playing ? 'Stop' : 'Play'} ${label}`}
        aria-pressed={playing}
        leadingIcon={<span aria-hidden>{playing ? '❚❚' : '▶'}</span>}
      >
        {failed ? 'Retry' : playing ? 'Playing' : 'Play'}
      </Button>
    </div>
  );
}
