'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAlert } from '@/components/AlertDialog';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import styles from './AudioRecorderField.module.css';

type Status = 'idle' | 'recording' | 'processing' | 'ready' | 'error';

export interface AudioRecorderFieldValue {
  url: string;
  storageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
  duration?: number;
}

interface AudioRecorderFieldProps {
  value?: AudioRecorderFieldValue | null;
  onChange: (next: AudioRecorderFieldValue | null) => void;
  label?: string;
  hint?: string;
  maxMs?: number;
  disabled?: boolean;
}

const MAX_DEFAULT = 15_000;

export function AudioRecorderField({
  value,
  onChange,
  label = 'Audio',
  hint,
  maxMs = MAX_DEFAULT,
  disabled = false,
}: AudioRecorderFieldProps) {
  const { show } = useAlert();
  const [status, setStatus] = useState<Status>(value ? 'ready' : 'idle');
  const [durationMs, setDurationMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value?.url ?? null);
  const [uploadingPct, setUploadingPct] = useState(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const extensionRef = useRef<string>('webm');

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTicker();
  }, [stopTicker]);

  const stopRecording = useCallback(() => {
    stopTicker();
    try {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
  }, [stopTicker]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/mp4', 'audio/aac', 'audio/mpeg'].find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      ) ?? (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm');
      const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('aac') ? 'aac' : mimeType.includes('mpeg') ? 'mp3' : 'webm';
      extensionRef.current = extension;
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setStatus('ready');
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      const startedAt = Date.now();
      setDurationMs(0);
      setStatus('recording');
      tickerRef.current = setInterval(() => {
        const delta = Date.now() - startedAt;
        setDurationMs(delta);
        if (delta >= maxMs) {
          void stopRecording();
        }
      }, 80);
    } catch (err) {
      setStatus('error');
      show({
        title: 'Microphone unavailable',
        message: 'Please allow microphone access to record pronunciation audio.',
        variant: 'warning',
        buttons: [{ label: 'Got it', style: 'default' }],
      });
    }
  }, [maxMs, onChange, show, durationMs, stopRecording]);

  const discard = useCallback(() => {
    stopTicker();
    try {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setDurationMs(0);
    setUploadingPct(0);
    onChange(null);
    setStatus('idle');
  }, [onChange, previewUrl, stopTicker]);

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setStatus('processing');
      setUploadingPct(10);
      try {
        const form = new FormData();
        form.append('audio', blob, `audio-${Date.now()}.${extensionRef.current}`);
        form.append('duration', String(Math.max(0, Math.round(durationMs / 1000))));

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<{ url: string; storageKey?: string }>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadingPct(Math.max(10, Math.round((e.loaded / e.total) * 90)));
            }
          };
          xhr.onload = () => {
            setUploadingPct(100);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const body = JSON.parse(xhr.responseText);
                resolve({ url: body.data.url, storageKey: body.data.storageKey });
              } catch {
                reject(new Error('Invalid server response'));
              }
              return;
            }
            reject(new Error(xhr.statusText || 'Upload failed'));
          };
          xhr.onerror = () => {
            reject(new Error('Network error'));
          };
        });

        const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1/admin';
        xhr.open('POST', `${base}/audio/upload?duration=${Math.max(0, Math.round(durationMs / 1000))}`);
        const token = getAccessToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(form);

        const result = await uploadPromise;
        const next = {
          url: result.url,
          storageKey: result.storageKey,
          mimeType: blob.type,
          sizeBytes: blob.size,
          duration: Math.max(0, Math.round(durationMs / 1000)),
        };
        onChange(next);
        setPreviewUrl(result.url);
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        const message = err instanceof Error ? err.message : 'Upload failed';
        show({
          title: 'Upload failed',
          message,
          variant: 'error',
          buttons: [{ label: 'Retry', style: 'default' }],
        });
      }
    },
    [durationMs, onChange, show],
  );

  const saveRecording = useCallback(async () => {
    if (!previewUrl || !previewUrl.startsWith('blob:')) return;
    const resp = await fetch(previewUrl);
    const blob = await resp.blob();
    await uploadBlob(blob);
  }, [previewUrl, uploadBlob]);

  const remove = useCallback(() => {
    discard();
    onChange(null);
  }, [discard, onChange]);

  const canRecord = !disabled && status !== 'recording' && status !== 'processing';
  const canSave = status === 'ready' && !!previewUrl;
  const canDiscard = status === 'ready' || status === 'recording';

  return (
    <div className={styles.wrap}>
      {label && <label className={styles.label}>{label}</label>}

      <div className={styles.card}>
        {status === 'idle' && (
          <button
            type="button"
            className={styles.recordButton}
            onClick={() => void startRecording()}
            disabled={!canRecord}
            aria-label="Start recording"
          >
            <span aria-hidden>🎙</span>
            <span>Record</span>
          </button>
        )}

        {status === 'recording' && (
          <div className={styles.recordingRow}>
            <span className={styles.recDot} aria-hidden />
            <span className={styles.recLabel}>Recording… {formatDuration(durationMs)} / {formatDuration(maxMs)}</span>
            <button type="button" className={styles.stopButton} onClick={() => void stopRecording()} aria-label="Stop recording">
              ■ Stop
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className={styles.recordingRow}>
            <span className={styles.recLabel}>Uploading… {uploadingPct}%</span>
            <span className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${uploadingPct}%` }} />
            </span>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorRow}>
            <span>Something went wrong.</span>
            <button type="button" className={styles.retryButton} onClick={() => { setStatus('idle'); }}>
              Dismiss
            </button>
          </div>
        )}

        {status === 'ready' && previewUrl && (
          <div className={styles.readyRow}>
            <audio controls src={previewUrl} className={styles.audio} />
            <div className={styles.readyActions}>
              <button type="button" className={styles.uploadButton} onClick={() => void saveRecording()}>
                Save & upload
              </button>
              <button type="button" className={styles.discardButton} onClick={remove}>
                Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return mm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}.${tenths}` : `${ss}.${tenths}s`;
}
