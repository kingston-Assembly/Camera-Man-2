/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AspectRatioType } from '../types/media';
import { FILTER_PRESETS } from '../constants/filters';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check camera device enumeration
  const enumerateDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setPermissionStatus('unsupported');
      return;
    }
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (err) {
      console.warn('Enumerate devices error:', err);
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    setIsTorchOn(false);
  }, []);

  // Start or restart camera stream
  const startCamera = useCallback(
    async (targetFacing: 'user' | 'environment' = facingMode) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionStatus('unsupported');
        setError('Camera API is not supported in this browser.');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Stop existing tracks first
      stopCamera();

      try {
        // Preferred high-resolution constraints with fallback
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
          },
          audio: false,
        };

        let newStream: MediaStream;
        try {
          newStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (initialErr) {
          console.warn('Initial camera constraints failed, attempting fallback:', initialErr);
          // Fallback to basic video stream without resolution constraints
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        }

        streamRef.current = newStream;
        setStream(newStream);
        setFacingMode(targetFacing);
        setPermissionStatus('granted');

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play().catch(() => {});
        }

        // Check torch capability
        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as {
            torch?: boolean;
          };
          setTorchSupported(!!capabilities.torch);
        }

        await enumerateDevices();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.name : 'CameraError';
        console.error('Camera access error:', err);

        if (errorMsg === 'NotAllowedError' || errorMsg === 'PermissionDeniedError') {
          setPermissionStatus('denied');
          setError('Camera permission was denied. Please allow camera access in browser settings.');
        } else if (errorMsg === 'NotFoundError' || errorMsg === 'DevicesNotFoundError') {
          setError('No camera device found on this system.');
        } else if (errorMsg === 'NotReadableError' || errorMsg === 'TrackStartError') {
          setError('Camera is currently in use by another application.');
        } else {
          setError('Unable to access camera. Please check device permissions.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [facingMode, stopCamera, enumerateDevices]
  );

  // Switch between front and back camera
  const switchCamera = useCallback(async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    await startCamera(nextFacing);
  }, [facingMode, startCamera]);

  // Toggle hardware torch if supported
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as unknown as MediaTrackConstraintSet],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.warn('Failed to toggle torch:', err);
    }
  }, [torchSupported, isTorchOn]);

  // Capture frame from video element to offscreen canvas
  const capturePhoto = useCallback(
    async (
      filterId = 'none',
      quality = 0.9,
      aspectRatio: AspectRatioType = 'full'
    ): Promise<{ blob: Blob; width: number; height: number } | null> => {
      const video = videoRef.current;
      if (!video || !streamRef.current) return null;

      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;

      let cropX = 0;
      let cropY = 0;
      let cropWidth = videoWidth;
      let cropHeight = videoHeight;

      if (aspectRatio === '1:1') {
        const size = Math.min(videoWidth, videoHeight);
        cropX = (videoWidth - size) / 2;
        cropY = (videoHeight - size) / 2;
        cropWidth = size;
        cropHeight = size;
      } else if (aspectRatio === '4:3') {
        if (videoWidth / videoHeight > 4 / 3) {
          cropWidth = Math.round((videoHeight * 4) / 3);
          cropX = (videoWidth - cropWidth) / 2;
        } else {
          cropHeight = Math.round((videoWidth * 3) / 4);
          cropY = (videoHeight - cropHeight) / 2;
        }
      } else if (aspectRatio === '16:9') {
        if (videoWidth / videoHeight > 16 / 9) {
          cropWidth = Math.round((videoHeight * 16) / 9);
          cropX = (videoWidth - cropWidth) / 2;
        } else {
          cropHeight = Math.round((videoWidth * 9) / 16);
          cropY = (videoHeight - cropHeight) / 2;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Apply filter to canvas if selected
      const preset = FILTER_PRESETS.find((f) => f.id === filterId);
      if (preset && preset.id !== 'none') {
        ctx.filter = preset.cssFilter;
      }

      // If front camera, mirror image
      if (facingMode === 'user') {
        ctx.translate(cropWidth, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                width: cropWidth,
                height: cropHeight,
              });
            } else {
              resolve(null);
            }
          },
          'image/jpeg',
          quality
        );
      });
    },
    [facingMode]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream,
    videoRef,
    isLoading,
    error,
    permissionStatus,
    facingMode,
    devices,
    hasMultipleCameras,
    torchSupported,
    isTorchOn,
    startCamera,
    stopCamera,
    switchCamera,
    toggleTorch,
    capturePhoto,
  };
}
