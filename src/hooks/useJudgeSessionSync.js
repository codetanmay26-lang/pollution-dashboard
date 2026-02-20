import { useEffect, useState } from "react";

// Custom hook to listen for judge sessions and trigger ecosystem sync
export const useJudgeSessionSync = (callback) => {
  const [activeSession, setActiveSession] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);

  useEffect(() => {
    // Listen for judge phase changes from OmniQR/JudgeMode
    const handleMessage = (event) => {
      if (event.data?.type === "JUDGE_PHASE_CHANGE") {
        const { phase, sessionId } = event.data;
        setActiveSession(sessionId);
        setCurrentPhase(phase);

        // Trigger callback with sync info
        if (callback) {
          callback({ phase, sessionId });
        }

        // Local storage for persistence across tabs
        localStorage.setItem(
          "activeJudgeSession",
          JSON.stringify({ sessionId, phase, timestamp: Date.now() })
        );

        // Broadcast to other tabs
        const broadcastChannel = new BroadcastChannel("judge_sync");
        broadcastChannel.postMessage({ type: "JUDGE_SYNC", phase, sessionId });
        broadcastChannel.close();
      }
    };

    window.addEventListener("message", handleMessage);

    // Check for existing session in localStorage
    const stored = localStorage.getItem("activeJudgeSession");
    if (stored) {
      const { sessionId, phase } = JSON.parse(stored);
      setActiveSession(sessionId);
      setCurrentPhase(phase);
    }

    // Listen to broadcast from other tabs
    try {
      const broadcastChannel = new BroadcastChannel("judge_sync");
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "JUDGE_SYNC") {
          const { phase, sessionId } = event.data;
          setActiveSession(sessionId);
          setCurrentPhase(phase);
          if (callback) {
            callback({ phase, sessionId });
          }
        }
      };
      return () => {
        broadcastChannel.close();
        window.removeEventListener("message", handleMessage);
      };
    } catch (err) {
      // BroadcastChannel not supported
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [callback]);

  return { activeSession, currentPhase };
};

// Hook to poll judge session state for website sync
export const usePollJudgeSession = (sessionId, interval = 500) => {
  const [sessionState, setSessionState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const poll = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/judge-sessions/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSessionState(data);
        }
      } catch (err) {
        console.error("Failed to poll judge session:", err);
      } finally {
        setLoading(false);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [sessionId, interval]);

  return { sessionState, loading };
};

export default useJudgeSessionSync;
