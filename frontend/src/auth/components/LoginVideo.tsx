import { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

const LOGIN_VIDEO =
  "/assets/videos/AQN_KYITg03X87_c0GNbuqYXaaxtx0-kX7k-sfwncWO2xhSLcp_dxjET6c_EJvAoVDlqyfjxlSDIUmneIJDMFxu-oljNRIQ1TGHHI16n2w.mp4";

const controlClass =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function LoginVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  return (
    <div className="relative overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        src={LOGIN_VIDEO}
        autoPlay={autoPlay}
        muted={muted}
        loop
        playsInline
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="block aspect-video w-full"
      />
      <div className="absolute right-3 top-3 flex gap-2">
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
      </div>
    </div>
  );
}

export default LoginVideo;
