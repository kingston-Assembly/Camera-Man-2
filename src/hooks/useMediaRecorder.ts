/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// Detect best supported MIME type for video recording
function getBestVideoMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'video/webm';
  }

  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function useMediaRecorder() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [estimatedSizeBytes, setEstimatedSizeBytes] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Clear timer
  const clearTimer = () => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Start video recording
  const startRecording = useCallback(
    async (videoStream: MediaStream, recordAudio = true): Promise<boolean> => {
      if (typeof window === 'undefined' || !window.MediaRecorder) {
        setError('MediaRecorder is not supported in this browser.');
        return false;
      }

      setError(null);
      recordedChunksRef.current = [];
      setElapsedSeconds(0);
      setEstimatedSizeBytes(0);

      try {
        let combinedStream = videoStream;

        // Request microphone if recordAudio is true
        if (recordAudio) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = micStream;

            const tracks = [...videoStream.getVideoTracks(), ...micStream.getAudioTracks()];
            combinedStream = new MediaStream(tracks);
          } catch (micErr) {
            console.warn('Microphone permission denied or unavailable, recording without audio:', micErr);
          }
        }

        const mimeType = getBestVideoMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

        const recorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            setEstimatedSizeBytes((prev) => prev + event.data.size);
          }
        };

        // Record chunks every 1000ms
        recorder.start(1000);
        setIsRecording(true);
        setIsPaused(false);

        // Start timer
        const startTime = Date.now();
        timerIntervalRef.current = window.setInterval(() => {
          const secs = Math.floor((Date.now() - startTime) / 1000);
          setElapsedSeconds(secs);
        }, 1000);

        return true;
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('Failed to initiate video recording.');
        return false;
      }
    },
    []
  );

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  // Stop recording and return complete video Blob
  const stopRecording = useCallback((): Promise<{
    blob: Blob;
    duration: number;
    mimeType: string;
  } | null> => {
    return new Promise((resolve) => {
      clearTimer();
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        setIsPaused(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });

        // Clean up audio tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }

        setIsRecording(false);
        setIsPaused(false);
        mediaRecorderRef.current = null;

        resolve({
          blob: finalBlob,
          duration: elapsedSeconds,
          mimeType,
        });
      };

      recorder.stop();
    });
  }, [elapsedSeconds]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Format seconds to MM:SS
  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    isPaused,
    elapsedSeconds,
    formattedTime: formatTimer(elapsedSeconds),
    estimatedSizeBytes,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
