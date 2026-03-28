import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import { useParams } from "react-router-dom";
import "./VideoMeet.css";

const server_url = "http://localhost:8000";
let connections = {};
const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function VideoMeet() {
  const { roomId } = useParams();

  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const localStreamRef = useRef(null);
  const userNamesRef = useRef({});
  const screenStreamRef = useRef(null);

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  // Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // ================= PERMISSIONS =================
  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setTimeout(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }, 100);
      return true;
    } catch {
      return false;
    }
  };

  const connectToSocket = (uname) => {
    socketRef.current = io(server_url); // ✅ create socket first

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;

      socketRef.current.emit("set-username", socketRef.current.id, uname);
      socketRef.current.emit("join-call", roomId);

      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.socketId !== id));
        delete connections[id];
      });

      socketRef.current.on("user-joined", async (id, clients, userNameMap) => {
        if (userNameMap) Object.assign(userNamesRef.current, userNameMap);

        clients.forEach(async (socketListId) => {
          if (socketListId === socketIdRef.current) return; // skip self
          if (connections[socketListId]) return; // skip existing

          const peer = new RTCPeerConnection(peerConfigConnections);
          connections[socketListId] = peer;

          peer.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("signal", socketListId, { ice: event.candidate });
            }
          };

          peer.ontrack = (event) => {
            const remoteStream = event.streams[0];
            setVideos((prev) => {
              const exists = prev.find((v) => v.socketId === socketListId);
              if (exists) {
                return prev.map((v) =>
                  v.socketId === socketListId ? { ...v, stream: remoteStream } : v
                );
              }
              return [...prev, { socketId: socketListId, stream: remoteStream }];
            });
          };

          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
              peer.addTrack(track, localStreamRef.current);
            });
          }

          if (socketListId === id) {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socketRef.current.emit("signal", socketListId, { sdp: peer.localDescription });
          }
        });
      });

      socketRef.current.on("signal", gotMessageFromServer);

      socketRef.current.on("chat-message", (data, sender) => {
        setMessages((prev) => [...prev, { sender, text: data }]);
      });
    });
  };

  const gotMessageFromServer = async (fromId, message) => {
    const peer = connections[fromId];
    if (!peer) return;

    if (message.sdp) {
      await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
      if (message.sdp.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socketRef.current.emit("signal", fromId, { sdp: peer.localDescription });
      }
    }
    if (message.ice) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(message.ice));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsCameraOff((prev) => !prev);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ cursor: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        Object.values(connections).forEach((peer) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = stopScreenShare;
        setIsScreenSharing(true);
      } catch (err) {
        console.error(err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      Object.values(connections).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
  };

  const sendMessage = () => {
    if (newMessage.trim() !== "") {
      socketRef.current.emit("chat-message", newMessage, username);
      setMessages((prev) => [...prev, { sender: "You", text: newMessage }]);
      setNewMessage("");
    }
  };

  const leaveCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.disconnect();
    window.location.href = "/";
  };

  
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoAvailable(devices.some((d) => d.kind === "videoinput"));
      setAudioAvailable(devices.some((d) => d.kind === "audioinput"));
    });
  }, []);

  return (
    <div className="video-meet-container">
      {askForUsername ? (
        <div className="username-box">
          <h2>Welcome to Lobby</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && document.getElementById("join-btn").click()}
          />
          <p>Camera: {videoAvailable ? "✅ Available" : "❌ Not Available"}</p>
          <p>Mic: {audioAvailable ? "✅ Available" : "❌ Not Available"}</p>
          <button
            id="join-btn"
            onClick={async () => {
              if (username.trim() !== "") {
                const granted = await getPermissions();
                if (granted) {
                  connectToSocket(username); // ✅ pass username
                  setAskForUsername(false);
                } else {
                  alert("Please allow camera and mic access");
                }
              }
            }}
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="meet-layout">

          {/* VIDEO GRID */}
          <div className={`video-container ${chatOpen ? "with-chat" : ""}`}>

            {/* LOCAL */}
            <div className="video-box">
              <video ref={localVideoRef} autoPlay muted playsInline />
              <div className="video-username">{username} (You)</div>
              {isCameraOff && <div className="camera-off-overlay">📷</div>}
            </div>

            {/* REMOTE */}
            {videos.map((video) => (
              <div className="video-box" key={video.socketId}>
                <video
                  ref={(ref) => {
                    if (ref && video.stream && ref.srcObject !== video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                />
                {/*  show real username */}
                <div className="video-username">
                  {userNamesRef.current[video.socketId] || video.socketId.slice(0, 6)}
                </div>
              </div>
            ))}
          </div>

          {/* CHAT PANEL */}
          {chatOpen && (
            <div className="chat-panel">
              <div className="chat-header">
                <span>Chat</span>
                <button onClick={() => setChatOpen(false)}>✕</button>
              </div>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.sender === "You" ? "mine" : ""}`}>
                    <span className="chat-sender">{msg.sender}</span>
                    <span className="chat-text">{msg.text}</span>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>
          )}

          {/* CONTROLS */}
          <div className="controls">
            <button className={`control-btn ${isMuted ? "active" : ""}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? "🔇" : "🎙️"}
            </button>
            <button className={`control-btn ${isCameraOff ? "active" : ""}`} onClick={toggleCamera} title="Toggle Camera">
              {isCameraOff ? "📷" : "📹"}
            </button>
            <button className={`control-btn ${isScreenSharing ? "active" : ""}`} onClick={toggleScreenShare} title="Screen Share">
              🖥️
            </button>
            <button className="control-btn" onClick={() => setChatOpen((p) => !p)} title="Chat">
              💬
            </button>
            <button className="control-btn leave-btn" onClick={leaveCall} title="Leave">
              📞
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default VideoMeet;