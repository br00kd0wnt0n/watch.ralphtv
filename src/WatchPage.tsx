import { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { CONFIG } from './config';

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error' | 'offline'>('loading');

  const streamUrl = `${CONFIG.RELAY_BASE_URL}/hls/stream.m3u8`;

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !CONFIG.RELAY_BASE_URL) {
      setStatus('offline');
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        liveSyncDurationCount: 3,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('playing');
        video.play().catch(() => setStatus('loading'));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setStatus('error');
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setStatus('playing');
        video.play().catch(() => setStatus('loading'));
      });
    } else {
      setStatus('error');
    }
  }, [streamUrl]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        padding: '12px 16px',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img src="/logo.png" alt="RalphTV" style={{ height: '32px' }} />
        <div>
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>RalphTV</div>
          <div style={{ color: '#ff0066', fontSize: '12px' }}>● LIVE</div>
        </div>
      </div>

      {/* Video Player */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={false}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={toggleFullscreen}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />

      {/* Status Overlay */}
      {status !== 'playing' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#fff',
          fontSize: '18px',
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: '8px'
        }}>
          {status === 'loading' && '⏳ Loading stream...'}
          {status === 'error' && '❌ Stream unavailable'}
          {status === 'offline' && '📡 Stream offline'}
        </div>
      )}

      {/* Controls */}
      <div style={{
        background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
        padding: '16px',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Play/Pause */}
        <button
          onClick={() => {
            if (videoRef.current) {
              if (isPlaying) {
                videoRef.current.pause();
              } else {
                videoRef.current.play();
              }
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        {/* Volume */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#fff', fontSize: '20px' }}>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#ff0066'
            }}
          />
        </div>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px'
          }}
        >
          {isFullscreen ? '⊡' : '⛶'}
        </button>
      </div>
    </div>
  );
}
