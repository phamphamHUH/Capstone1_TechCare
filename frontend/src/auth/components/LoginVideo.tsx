import { useEffect, useRef, useState } from "react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

const LOGIN_VIDEO =
  "/assets/videos/AQN_KYITg03X87_c0GNbuqYXaaxtx0-kX7k-sfwncWO2xhSLcp_dxjET6c_EJvAoVDlqyfjxlSDIUmneIJDMFxu-oljNRIQ1TGHHI16n2w.mp4";

const controlClass =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// iPhone Safari can't put a <div> in full screen, only the <video> itself.
type IOSVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function LoginVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Track full screen however it was left (button, Esc, browser UI).
  useEffect(() => {
    const onChange = () =>
      setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    const player = playerRef.current;
    const video = videoRef.current as IOSVideo | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (player?.requestFullscreen) {
      // The whole player, so our controls stay on top of the video.
      void player.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    } else {
      video?.webkitEnterFullscreen?.();
    }
  }
  const [muted, setMuted] = useState(true);
  const [autoPlay] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [paused, setPaused] = useState(!autoPlay);

  function togglePaused() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  const muteLabel = muted ? "Unmute video" : "Mute video";
  const pauseLabel = paused ? "Play video" : "Pause video";
  const fullscreenLabel = fullscreen ? "Exit full screen" : "Full screen";

  return (
    <div
      ref={playerRef}
      className={`group relative overflow-hidden bg-black ${
        fullscreen ? "flex h-full w-full items-center justify-center" : "rounded-md"
      }`}
    >
      <video
        ref={videoRef}
        src={LOGIN_VIDEO}
        autoPlay={autoPlay}
        muted={muted}
        loop
        playsInline
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onDoubleClick={toggleFullscreen}
        className={
          fullscreen
            ? "block h-full w-full object-contain"
            : "block aspect-video w-full"
        }
      />
      {/* Controls show while hovering the video or tabbing to them; on touch
          screens (no hover) they are always visible. */}
      <div className="absolute right-3 top-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          type="button"
          onClick={togglePaused}
          aria-label={pauseLabel}
          title={pauseLabel}
          className={controlClass}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          aria-label={muteLabel}
          title={muteLabel}
          className={controlClass}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreenLabel}
          title={fullscreenLabel}
          className={controlClass}
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}

export default LoginVideo;
