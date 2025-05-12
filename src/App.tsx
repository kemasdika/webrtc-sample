import { useEffect, useRef, useState } from 'react';
import JsSIP from 'jssip'; // Make sure to install @types/jssip or declare types if needed
// Define the shape of a message
interface Message {
  is_remote: boolean;
  body: string;
}

const defaultUris = [
  'sip:1001@sip.local',
  'sip:1002@sip.local',
  'sip:4001@sip2.local',
];

// Helper to get URL params
const getUrlParam = (param: string): string | null => {
  return new URLSearchParams(window.location.search).get(param);
};

const defaultLocal = !window.location.search ? 'sip:1001@sip.local' : 'sip:1002@sip.local';
const defaultRemote = !window.location.search ? 'sip:1002@sip.local' : 'sip:1001@sip.local';

const App = () => {
  // State variables
  const [localUri, setLocalUri] = useState<string>(getUrlParam('local_uri') || defaultLocal);
  const [remoteUri, setRemoteUri] = useState<string>(getUrlParam('remote_uri') || defaultRemote);

  const [isUaConnected, setIsUaConnected] = useState(false);
  const [isUaConnecting, setIsUaConnecting] = useState(false);
  const [isUaRegistered, setIsUaRegistered] = useState(false);
  console.log("🚀 ~ App ~ isUaRegistered:", isUaRegistered)

  const [isRinging, setIsRinging] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [isEstablished, setIsEstablished] = useState(false);

  const [remoteAudio, setRemoteAudio] = useState(true);
  console.log("🚀 ~ App ~ remoteAudio:", remoteAudio, setRemoteAudio)
  const [remoteVideo, setRemoteVideo] = useState(true);
  console.log("🚀 ~ App ~ remoteVideo:", remoteVideo, setRemoteVideo)
  const [localAudio, setLocalAudio] = useState(true);
  const [localVideo, setLocalVideo] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  console.log("🚀 ~ App ~ messages:", messages)
  const [messageBody, setMessageBody] = useState('');

  // Refs for video elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // JsSIP UA and session references
  const uaRef = useRef<JsSIP.UA | null>(null);
  const sessionRef = useRef<any>(null);

  // Media streams
  const localStreamRef = useRef<MediaStream>(new MediaStream());
  console.log("🚀 ~ App ~ localAudio:", localAudio, localVideo, localStreamRef.current.getVideoTracks()[0])
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Refresh local video element srcObject
  const refreshLocalVideo = () => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current.getTracks().length ? localStreamRef.current : null;
      // Force refresh controls to update video element properly
      localVideoRef.current.controls = !localVideoRef.current.controls;
      localVideoRef.current.controls = !localVideoRef.current.controls;
    }
  };

  // Sync local stream tracks with current session's RTCPeerConnection senders
  const syncTracks = async () => {
    const session = sessionRef.current;
    if (!session || !session.connection) return;

    let hasChanges = false;

    // Add tracks that are in localStream but not in senders
    localStreamRef.current.getTracks().forEach((track) => {
      if (!session.connection.getSenders().find((sender: any) => sender.track && sender.track.id === track.id)) {
        hasChanges = true;
        session.connection.addTrack(track, localStreamRef.current);
      }
    });

    // Remove senders whose tracks are not in localStream
    session.connection.getSenders().forEach((sender: any) => {
      if (sender.track && !localStreamRef.current.getTracks().find((track) => track.id === sender.track!.id)) {
        hasChanges = true;
        session.connection.removeTrack(sender);
      }
    });

    if (hasChanges) {
      await new Promise<void>((resolve, reject) => {
        if (!session.renegotiate({}, resolve)) {
          reject(new Error('session.renegotiate returned false'));
        }
      });
    }
  };

  // Clean up current session and reset UI state
  const cleanSession = () => {
    const session = sessionRef.current;
    if (session) {
      if (!session.isEnded()) {
        session.terminate();
      }
      sessionRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setIsRinging(false);
    setIsIncoming(false);
    setIsEstablished(false);
  };

  // Call remote URI
  const clickUaCall = () => {
    if (!uaRef.current) return;
    uaRef.current.call(remoteUri, {
      mediaStream: localStreamRef.current,
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    });
  };

  // Send message to remote URI
  const clickUaSendMessage = () => {
    if (!uaRef.current) return;
    uaRef.current.sendMessage(remoteUri, messageBody);
    setMessageBody('');
  };

  // Cancel ringing call
  const clickRingingCancel = () => {
    cleanSession();
  };

  // Accept incoming call
  const clickIncomingAccept = () => {
    const session = sessionRef.current;
    if (!session) return;
    session.answer({
      mediaStream: localStreamRef.current,
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    });
  };

  // Reject incoming call
  const clickIncomingReject = () => {
    cleanSession();
  };

  // Close established call
  const clickEstablishedClose = () => {
    cleanSession();
  };

  // Initialize or re-initialize UA when localUri changes
  const initSession = async () => {
    // Clean up previous UA if any
    if (uaRef.current) {
      uaRef.current.removeAllListeners();
      uaRef.current.stop();
      uaRef.current = null;
    }

    // Create new WebSocket interface and UA
    const socket = new JsSIP.WebSocketInterface('ws://localhost:3001/sip');
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: localUri,
      password: '1234',
    });

    uaRef.current = ua;

    // Event handlers
    ua.on('connecting', () => {
      setIsUaConnected(false);
      setIsUaConnecting(true);
    });

    const refresh = () => {
      if (!uaRef.current) return;
      setIsUaConnected(uaRef.current.isConnected());
      setIsUaConnecting(false);
      setIsUaRegistered(uaRef.current.isRegistered());

      const session = sessionRef.current;
      setIsRinging(!!(session && session.isInProgress() && session.direction === 'outgoing'));
      setIsIncoming(!!(session && session.isInProgress() && session.direction === 'incoming'));
      setIsEstablished(!!(session && session.isEstablished()));
    };

    ua.on('connected', refresh);
    ua.on('disconnected', refresh);
    ua.on('registered', refresh);
    ua.on('unregistered', refresh);

    ua.on('newMessage', (event: any) => {
      if (event.originator === 'remote') {
        event.message.accept();
        setMessages((prev) => [...prev, { is_remote: true, body: event.request.body }]);
      } else {
        setMessages((prev) => [...prev, { is_remote: false, body: event.request.body }]);
      }
      refresh();
    });

    ua.on('newRTCSession', (event: any) => {
      cleanSession();

      // Refresh local video to keep playing local stream
      refreshLocalVideo();

      const newSession = event.session;
      sessionRef.current = newSession;

      // Attach session event listeners
      newSession.on('connecting', refresh);
      newSession.on('ended', cleanSession);
      newSession.on('failed', cleanSession);
      newSession.on('accepted', refresh);
      newSession.on('confirmed', refresh);

      if (newSession.connection) {
        newSession.connection.addEventListener('track', peerConnectionTrack);
      } else {
        newSession.on('peerconnection', ({ peerconnection }: any) => {
          peerconnection.addEventListener('track', peerConnectionTrack);
        });
      }

      refresh();

      function peerConnectionTrack(event2: RTCTrackEvent) {
        const { track, streams } = event2;
        console.log("🚀 ~ peerConnectionTrack ~ track:", track)
        if (remoteStreamRef.current !== streams[0]) {
          remoteStreamRef.current = streams[0];
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;

            // Listen for addtrack and removetrack to update video element
            remoteStreamRef.current.addEventListener('addtrack', () => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
                remoteVideoRef.current.srcObject = remoteStreamRef.current;
              }
            });
            remoteStreamRef.current.addEventListener('removetrack', () => {
              if (remoteStreamRef.current && remoteStreamRef.current.getTracks().length !== 0) {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
              } else {
                remoteStreamRef.current = null;
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
              }
              // Refresh controls to force update
              if (remoteVideoRef.current) {
                remoteVideoRef.current.controls = !remoteVideoRef.current.controls;
                remoteVideoRef.current.controls = !remoteVideoRef.current.controls;
              }
            });
          }
        }
      }
    });

    ua.start();

    // Cleanup on unmount or localUri change
    return () => {
      if (uaRef.current) {
        uaRef.current.removeAllListeners();
        uaRef.current.stop();
        uaRef.current = null;
      }
      cleanSession();
    };
  }



  // Effect to handle local audio toggle
  const handleLoclAudioToggle = async () => {
    if (localAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getAudioTracks().forEach((track) => {
          if (!localStreamRef.current.getAudioTracks().find((t) => t.id === track.id)) {
            localStreamRef.current.addTrack(track);
          }
        });
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    } else {
      const tracks = localStreamRef.current
      if (tracks) {
        tracks.getAudioTracks().forEach((track) => {
          if (localStreamRef.current.getAudioTracks().find((t) => t.id === track.id)) {
            track.stop();
            localStreamRef.current.removeTrack(track);

          }
        });
      }
    }
    refreshLocalVideo();
    syncTracks();
  }



  // Effect to handle local video toggle
  const handleLocalVideoToogle = async () => {
    if (localVideo) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getVideoTracks().forEach((track) => {
          if (!localStreamRef.current.getVideoTracks().find((t) => t.id === track.id)) {
            localStreamRef.current.addTrack(track);
          }
        });
      } catch (err) {
        console.error('Error accessing video devices:', err);
      }
    } else {
      const tracks = localStreamRef.current
      if (tracks) {
        tracks.getVideoTracks().forEach((track) => {
          if (localStreamRef.current.getVideoTracks().find((t) => t.id === track.id)) {
            track.stop();
            localStreamRef.current.removeTrack(track);

          }
        });
      }
    }
    refreshLocalVideo();
    syncTracks();
  }

  // On mount, get initial media stream if audio or video enabled
  const initMediaStream = async () => {
    if (localAudio || localVideo) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: localAudio, video: localVideo });
        stream.getTracks().forEach((track) => localStreamRef.current.addTrack(track));
        refreshLocalVideo();
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    }
  }

  useEffect(() => {
    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUri]);

  useEffect(() => {
    initMediaStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleLoclAudioToggle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localAudio]);

  useEffect(() => {
    handleLocalVideoToogle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideo]);



  return (
    <div className="bg-gray-900 text-gray-300 font-sans h-screen flex flex-col">

      <div className='p-10'></div>

      {/* Local URI input and select */}
      <div>
        <label className="px-10">
          My Account:
          <input
            type="text"
            value={localUri}
            onChange={(e) => setLocalUri(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>

      <div className='w-full fixed h-[7vh] bg-gray-700 px-10'>
        <div className='flex justify-between items-center p-3'>
          {/* Connection status */}
          <div>
            {isUaConnecting && <div className="yellow">Connecting...</div>}
            {isUaConnected && <div className="green">Connected</div>}
          </div>
          {/* Call state buttons */}
          {isRinging && (
            <div className='flex items-center'>
              <p>Ringing...</p>
              <div className='px-2 py-2 bg-red-700 mx-5 rounded-md' onClick={clickRingingCancel}>cancel</div>
            </div>
          )}

          {isIncoming && (
            <div className='flex items-center'>
              <p>Incoming...</p>
              <div className='px-2 py-2 bg-green-700 mx-5 rounded-md' onClick={clickIncomingAccept}>accept</div>
              <div className='px-2 py-2 bg-red-700 mx-5 rounded-md' onClick={clickIncomingReject}>reject</div>
            </div>
          )}

          {isEstablished && (
            <div className='flex items-center'>
              <p>Talking...</p>
              <div className='px-2 py-2 bg-red-700 mx-5 rounded-md' onClick={clickEstablishedClose}>close</div>
            </div>
          )}

          {/* call target input and select */}
          {!isRinging && !isIncoming && !isEstablished && (
            <div>
              <label>
                call target :
                <input
                  type="text"
                  value={remoteUri}
                  onChange={(e) => setRemoteUri(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
                <select
                  value={remoteUri}
                  onChange={(e) => setRemoteUri(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  {defaultUris.map((uri) => (
                    <option key={uri} value={uri}>
                      {uri}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {/* call*/}
          {!isRinging && !isIncoming && !isEstablished && (
            <div>
              <div className='cursor-pointer' onClick={clickUaCall}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="icon icon-tabler icons-tabler-outline icon-tabler-phone"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" /></svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video sections */}
      <div className='w-full grid grid-cols-2 gap-4 h-full px-10'>
        {/* Local video */}
        <div>
          <h2>My Video & Audio</h2>
          <div>
            <video
              ref={localVideoRef}
              className=""
              muted
              autoPlay
              controls
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={localAudio}
              onChange={(e) => setLocalAudio(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            audio
          </label>
          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={localVideo}
              onChange={(e) => setLocalVideo(e.target.checked)}
              style={{ marginRight: 4 }}
            />
            video
          </label>

        </div>

        {/* Remote video */}
        <div>
          <h2>Target Video & Audio</h2>
          <div>
            <video
              ref={remoteVideoRef}
              autoPlay
              controls

            />
          </div>
          {/* Uncomment if you want to add remote audio/video toggles */}
          {/* <label><input type="checkbox" checked={remoteAudio} onChange={e => setRemoteAudio(e.target.checked)} /> audio</label> */}
          {/* <label><input type="checkbox" checked={remoteVideo} onChange={e => setRemoteVideo(e.target.checked)} /> video</label> */}
        </div>
      </div>

      {/* Messages section */}
      <div className='mb-15 overflow-y-scroll h-[400px]'>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {messages.map((message, idx) => (
            <li
              key={idx}
              className={message.is_remote ?
                "w-full flex justify-end"
                :
                "w-full flex justify-start"
              }

            >
              <div className={message.is_remote ?
                "bg-white w-[400px] text-black items-right my-2 mx-1 p-2 rounded-md"
                :
                "bg-blue-400 w-[400px] text-black text-left my-2 mx-1 p-2 rounded-md"
              }>
                <div>{message.is_remote ? "Target : " : "Me : "}</div>
                {message.body}

              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center w-full p-3 bg-gray-800 border-t border-gray-700 fixed bottom-0">
        <input
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          type="text"
          placeholder="Message"
          className="flex-1 bg-gray-700 rounded-md text-gray-200 text-sm px-3 py-2 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex space-x-3 text-gray-400 cursor-pointer">
          <button onClick={clickUaSendMessage}>
            send
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;