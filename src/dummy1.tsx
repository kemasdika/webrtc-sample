// import { useEffect, useState, useRef } from 'react';
// import { UserAgent, Invitation, Inviter, Registerer, SessionState, Web } from 'sip.js';

// // SIP over WebSocket Server URL
// // The URL of a SIP over WebSocket server which will complete the call.
// // FreeSwitch is an example of a server which supports SIP over WebSocket.
// // SIP over WebSocket is an internet standard the details of which are
// // outside the scope of this documentation, but there are many resources
// // available. See: https://tools.ietf.org/html/rfc7118 for the specification.
// const SIP_SERVER = 'wss://sip.example.com'; // Ganti dengan alamat WebSocket SIP server kamu
// const SIP_URI = 'sip:admin@example.com'; // Ganti dengan SIP URI admin kamu
// const SIP_PASSWORD = 'your_password'; // Ganti dengan password SIP admin kamu

// const AppReal = () => {
//     const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
//     const [registerer, setRegisterer] = useState<Registerer | null>(null);
//     const [session, setSession] = useState<Invitation | Inviter | null>(null);
//     const [callState, setCallState] = useState<string>('Idle');
//     const remoteAudioRef = useRef<HTMLAudioElement>(null);

//     useEffect(() => {
//         // Inisialisasi UserAgent SIP.js
//         const sipUri = UserAgent.makeURI(SIP_URI);
//         if (!sipUri) {
//             throw new Error("Failed to create URI");
//         }
//         const ua = new UserAgent({
//             uri: sipUri,
//             transportOptions: {
//                 server: SIP_SERVER,
//             },
//             authorizationUsername: SIP_URI.split(':')[1].split('@')[0],
//             authorizationPassword: SIP_PASSWORD,
//         });

//         setUserAgent(ua);

//         ua.start().then(() => {
//             // Register ke SIP server
//             const reg = new Registerer(ua);
//             setRegisterer(reg);
//             reg.register();

//             // Event handler untuk panggilan masuk
//             ua.delegate = {
//                 onInvite: (invitation: Invitation) => {
//                     setSession(invitation);
//                     setCallState('Incoming call');
//                     invitation.stateChange.addListener((newState: SessionState) => {
//                         switch (newState) {
//                             case SessionState.Initial:
//                                 break;
//                             case SessionState.Establishing:
//                                 break;
//                             case SessionState.Established:
//                                 setCallState('Call established');
//                                 const sessionDescriptionHandler = invitation.sessionDescriptionHandler;
//                                 if (!sessionDescriptionHandler || !(sessionDescriptionHandler instanceof Web.SessionDescriptionHandler)) {
//                                     throw new Error("Invalid session description handler.");
//                                 }
//                                 if (remoteAudioRef) {
//                                     assignStream(sessionDescriptionHandler.localMediaStream, remoteAudioRef);
//                                 }
//                                 break;
//                             case SessionState.Terminating:
//                                 break;
//                             case SessionState.Terminated:
//                                 setCallState('Call ended');
//                                 setSession(null);
//                                 break;
//                             default:
//                                 throw new Error("Unknown session state.");
//                         }

//                     });
//                 },
//             };
//         });

//         return () => {
//             registerer?.unregister();
//             userAgent?.stop();
//         };
//     }, []);

//     const handleAcceptCall = () => {
//         if (session && session instanceof Invitation) {
//             session.accept();
//         }
//     };

//     const handleRejectCall = () => {
//         if (session && session instanceof Invitation) {
//             session.reject();
//             setSession(null);
//             setCallState('Idle');
//         }
//     };

//     const handleHangup = () => {
//         if (session) {
//             session.bye();
//             setSession(null);
//             setCallState('Idle');
//         }
//     };

//     const handleCall = () => {
//         if (!userAgent) return;
//         const sipUri = UserAgent.makeURI(SIP_URI);
//         if (!sipUri) {
//             throw new Error("Failed to create URI");
//         }
//         const inviter = new Inviter(userAgent, sipUri);
//         setSession(inviter);
//         setCallState('Calling');

//         inviter.stateChange.addListener((newState: SessionState) => {
//             switch (newState) {
//                 case SessionState.Initial:
//                     break;
//                 case SessionState.Establishing:
//                     break;
//                 case SessionState.Established:
//                     setCallState('Call established');
//                     const sessionDescriptionHandler = inviter.sessionDescriptionHandler;
//                     if (!sessionDescriptionHandler || !(sessionDescriptionHandler instanceof Web.SessionDescriptionHandler)) {
//                         throw new Error("Invalid session description handler.");
//                     }
//                     if (remoteAudioRef) {
//                         assignStream(sessionDescriptionHandler.localMediaStream, remoteAudioRef);
//                     }
//                     break;
//                 case SessionState.Terminating:
//                     break;
//                 case SessionState.Terminated:
//                     setCallState('Call ended');
//                     setSession(null);
//                     break;
//                 default:
//                     throw new Error("Unknown session state.");
//             }
//         });

//         inviter.invite().catch(() => {
//             setCallState('Call failed');
//             setSession(null);
//         });
//     };

//     function assignStream(stream: MediaStream, element?: any): void {
//         // Set element source.
//         if (element) {

//             element.autoplay = true; // Safari does not allow calling .play() from a non user action
//             element.srcObject = stream;

//             // Load and start playback of media.
//             element.play().catch((error: Error) => {
//                 console.error("Failed to play media");
//                 console.error(error);
//             });

//             // If a track is added, load and restart playback of media.
//             stream.onaddtrack = (): void => {
//                 element.load(); // Safari does not work otheriwse
//                 element.play().catch((error: Error) => {
//                     console.error("Failed to play remote media on add track");
//                     console.error(error);
//                 });
//             };

//             // If a track is removed, load and restart playback of media.
//             stream.onremovetrack = (): void => {
//                 element.load(); // Safari does not work otheriwse
//                 element.play().catch((error: Error) => {
//                     console.error("Failed to play remote media on remove track");
//                     console.error(error);
//                 });
//             };
//         }
//     }
//     return (
//         <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
//             <h2>Aplikasi Call Center - Admin</h2>
//             <p>Status: <b>{callState}</b></p>

//             {!session && (
//                 <button onClick={handleCall} style={{ padding: '10px 20px', marginBottom: 10 }}>
//                     Panggil Nomor
//                 </button>
//             )}

//             {session && callState === 'Incoming call' && (
//                 <>
//                     <button onClick={handleAcceptCall} style={{ padding: '10px 20px', marginRight: 10 }}>
//                         Angkat
//                     </button>
//                     <button onClick={handleRejectCall} style={{ padding: '10px 20px' }}>
//                         Tolak
//                     </button>
//                 </>
//             )}

//             {session && callState === 'Call established' && (
//                 <button onClick={handleHangup} style={{ padding: '10px 20px' }}>
//                     Akhiri Panggilan
//                 </button>
//             )}

//             <audio ref={remoteAudioRef} autoPlay />
//         </div>
//     );
// };

// export default AppReal;