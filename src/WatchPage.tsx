import { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { CONFIG } from './config';
import NotificationPrompt from './components/NotificationPrompt';
import './watch-page.css';

export default function WatchPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bumperRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showBumper, setShowBumper] = useState(true);
  const [bumperEnded, setBumperEnded] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<'loading' | 'playing' | 'error' | 'offline'>('loading');
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  const streamUrl = `${CONFIG.RELAY_BASE_URL}/hls/stream.m3u8`;

  // Handle bumper video end
  useEffect(() => {
    const bumper = bumperRef.current;
    if (!bumper) return;

    const handleBumperEnd = () => {
      console.log('Bumper ended');
      setBumperEnded(true);
    };

    bumper.addEventListener('ended', handleBumperEnd);
    return () => bumper.removeEventListener('ended', handleBumperEnd);
  }, []);

  // Handle JOIN STREAM button click
  const handleJoinStream = () => {
    console.log('User clicked JOIN STREAM');
    setShowBumper(false);
    setStreamReady(true);
  };

  // Auto-hide controls after inactivity
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Initialize HLS player (only after user clicks JOIN STREAM)
  useEffect(() => {
    if (!streamReady) return; // Wait for user to click JOIN STREAM

    const video = videoRef.current;
    if (!video || !CONFIG.RELAY_BASE_URL) {
      setStatus('offline');
      return;
    }

    console.log('Initializing stream:', streamUrl);

    if (Hls.isSupported()) {
      console.log('Using HLS.js (Chrome/Firefox)');
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 10000,
        levelLoadingMaxRetry: 4,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 6,
        xhrSetup: function (xhr, _url) {
          xhr.withCredentials = false; // Disable CORS credentials
        },
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, starting playback');
        setStatus('playing');
        video.play().then(() => {
          console.log('Video playing successfully');
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Play failed:', err);
          // Try again with muted first, then unmute
          video.muted = true;
          video.play().then(() => {
            console.log('Playing muted, will unmute');
            video.muted = false;
            setIsPlaying(true);
          }).catch((err2) => {
            console.error('Play failed even muted:', err2);
            setStatus('error');
          });
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error:', data.type, data.details, data.fatal);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              setStatus('error');
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (status !== 'playing') {
          console.log('Fragment loaded, updating status to playing');
          setStatus('playing');
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      return () => {
        console.log('Cleaning up HLS');
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS (iPhone)
      console.log('Using native HLS (Safari)');
      video.src = streamUrl;

      const handleLoadedMetadata = () => {
        console.log('Native HLS metadata loaded');
        setStatus('playing');
        video.play().then(() => {
          console.log('Video playing');
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Play failed:', err);
          setStatus('loading');
        });
      };

      const handleError = (err: Event) => {
        console.error('Native HLS error:', err);
        setStatus('error');
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    } else {
      console.error('HLS not supported');
      setStatus('error');
    }
  }, [streamUrl, streamReady]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Update volume
  const handleVolumeChange = (newVolume: number) => {
    console.log('Volume change:', newVolume);
    setVolume(newVolume);

    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  // Apply volume to video when it loads
  useEffect(() => {
    if (videoRef.current && !showBumper) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
      console.log('Applied volume to video:', volume);
    }
  }, [showBumper, volume, isMuted]);

  return (
    <div
      className="watch-container"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onClick={() => {
        if (status === 'playing') {
          resetControlsTimeout();
        }
      }}
    >
      {/* Bumper Video */}
      {showBumper && (
        <>
          <video
            ref={bumperRef}
            src="/bumper.mp4"
            playsInline
            autoPlay
            muted
            className="watch-video watch-bumper"
            onError={() => {
              console.log('Bumper failed to load, showing JOIN button');
              setBumperEnded(true);
            }}
          />
          {/* Show JOIN STREAM button after bumper ends */}
          {bumperEnded && (
            <div className="watch-join-overlay">
              <button
                className="watch-join-btn"
                onClick={handleJoinStream}
              >
                JOIN STREAM
              </button>
            </div>
          )}
        </>
      )}

      {/* Header - only show after bumper */}
      {!showBumper && (
        <div className={`watch-header ${showControls || !isPlaying ? 'visible' : 'hidden'}`}>
          <img src="/icon-180.png" alt="RalphTV" className="watch-logo" />
          <div className="watch-info">
            <div className="watch-title">RalphTV</div>
            {status === 'playing' && <div className="watch-live">● LIVE</div>}
          </div>
        </div>
      )}

      {/* Stream Video Player - only show after bumper */}
      {!showBumper && (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted={false}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="watch-video"
        />
      )}

      {/* Status Overlay - only show when NOT playing and after bumper */}
      {!showBumper && status !== 'playing' && (
        <div className="watch-status-overlay">
          {status === 'loading' && (
            <div className="watch-status-content">
              <div className="watch-spinner"></div>
              <div>Connecting to stream...</div>
            </div>
          )}
          {status === 'error' && (
            <div className="watch-status-content">
              <div className="watch-error-icon">✕</div>
              <div>Stream unavailable</div>
              <div className="watch-error-hint">Check back later</div>
            </div>
          )}
          {status === 'offline' && (
            <div className="watch-status-content">
              <div className="watch-error-icon">○</div>
              <div>Stream offline</div>
              <div className="watch-error-hint">Stream not configured</div>
            </div>
          )}
        </div>
      )}

      {/* Controls - only show after bumper */}
      {!showBumper && (
        <div className={`watch-controls ${showControls || !isPlaying ? 'visible' : 'hidden'}`}>
        <div className="watch-controls-row">
          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="watch-control-btn watch-control-play"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Volume */}
          <div className="watch-volume-group">
            <button
              onClick={toggleMute}
              className="watch-control-btn"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : volume < 0.5 ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="watch-volume-slider"
              aria-label="Volume"
            />
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="watch-control-btn"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        </div>
      </div>
      )}

      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  );
}
