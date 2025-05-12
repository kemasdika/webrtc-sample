// import React, { Component } from "react";
// import SIP from "sip.js";
// import alertVideo from "./alert.mp4";
// import { detect } from "detect-browser";

// interface WebRTCClientProps {
//     sipUser: string;
//     sipDomain: string;
//     sipServer?: string;
//     metaData?: object;
//     sipPassword: string;
//     video?: boolean;
//     autoRegister?: boolean;
//     destination: string;
//     alertVideoUrl?: string;
//     ringbackVideoUrl?: string;
//     localVideoTagId: string;
//     remoteVideoTagId: string;
//     enableSound: boolean;
//     enableVideo: boolean;
//     webSocketPort?: string;
//     skipStunServer?: boolean;
//     stunServerList?: RTCIceServer[];
//     traceSip?: boolean;
//     eventHandler: {
//         on: (event: string, callback: () => void) => void;
//         emit: (event: string, ...args: any[]) => void;
//     };
//     updateCallState: (state: string) => void;
//     updateConnectionState: (state: string) => void;
// }

// interface WebRTCClientState {
//     userid: string;
//     audio: boolean;
//     video: boolean;
//     domain: string;
//     sipServer: string;
//     webSocketPort: string;
//     password: string;
//     destination: string;
//     metaData?: object;
//     autoRegister?: boolean;
//     callState: string;
//     enableButtons: boolean;
//     ringbackVideoUrl?: string;
//     alertVideoUrl?: string;
//     localVideoTagId: string;
//     remoteVideoTagId: string;
//     stunServer: RTCIceServer[];
//     connectionState?: string;
//     mediaTested?: boolean;
//     mediaSupported?: boolean;
//     usingHttps?: boolean;
//     browser?: string;
//     os?: string;
//     error?: string;
//     receivedMeta?: any;
// }

// class WebRTCClient extends Component<WebRTCClientProps, WebRTCClientState> {
//     private sipUa?: UA;
//     private currentSession?: Session;
//     private remoteStream?: MediaStream;

//     constructor(props: WebRTCClientProps) {
//         super(props);

//         let sipServer = props.sipDomain;
//         if (props.sipServer) {
//             sipServer = props.sipServer;
//         }

//         let webSocketPort = "8089";
//         if (props.webSocketPort) {
//             webSocketPort = props.webSocketPort;
//         }

//         let stunServerList: RTCIceServer[];
//         if (props.skipStunServer) {
//             stunServerList = [];
//         } else {
//             if (props.stunServerList) {
//                 stunServerList = props.stunServerList;
//             } else {
//                 stunServerList = [{ urls: "stun:stun.l.google.com:19302" }];
//             }
//         }

//         this.state = {
//             userid: props.sipUser,
//             audio: props.enableSound,
//             video: props.enableVideo,
//             domain: props.sipDomain,
//             sipServer: sipServer,
//             webSocketPort: webSocketPort,
//             password: props.sipPassword,
//             destination: props.destination,
//             metaData: props.metaData,
//             autoRegister: props.autoRegister,
//             callState: "Idle",
//             enableButtons: true,
//             ringbackVideoUrl: props.ringbackVideoUrl,
//             alertVideoUrl: props.alertVideoUrl,
//             localVideoTagId: props.localVideoTagId,
//             remoteVideoTagId: props.remoteVideoTagId,
//             stunServer: stunServerList,
//         };
//     }

//     componentDidMount() {
//         // region eventhandler
//         this.props.eventHandler.on("hangupCall", () => {
//             this.hangupCall();
//         });

//         this.props.eventHandler.on("answerCall", () => {
//             this.answerCall();
//         });

//         this.props.eventHandler.on("placeCall", () => {
//             this.placeCall();
//         });

//         this.props.eventHandler.on("toggleMicrophone", () => {
//             this.toggleMedia("audio");
//         });

//         this.props.eventHandler.on("toggleVideo", () => {
//             this.toggleMedia("video");
//         });
//         // endregion eventhandler

//         this.testMedia();

//         const options = {
//             uri: `${this.state.userid}@${this.state.domain}`,
//             transportOptions: {
//                 wsServers: [`wss://${this.state.sipServer}:${this.state.webSocketPort}/ws`],
//                 traceSip: this.props.traceSip,
//             },
//             sessionDescriptionHandlerFactoryOptions: {
//                 peerConnectionOptions: {
//                     iceCheckingTimeout: 500,
//                     rtcConfiguration: {
//                         iceServers: this.state.stunServer,
//                     },
//                 },
//                 constraints: {
//                     audio: this.props.enableSound,
//                     video: this.props.enableVideo,
//                 },
//             },
//             authorizationUser: this.state.userid,
//             password: this.state.password,
//             register: this.state.autoRegister,
//             autostart: false,
//             hackWssInTransport: true,
//         };

//         this.connectionStateChanged("Disconnected");

//         this.sipUa = new UA(options);

//         this.sipUa.once("transportCreated", (transport: Transport) => {
//             transport.on("transportError", (response: any, cause: any) => {
//                 this.props.eventHandler.emit("error", response, cause);
//             });

//             transport.on("connecting", () => {
//                 this.connectionStateChanged("Connecting...");
//             });

//             transport.on("connected", () => {
//                 this.connectionStateChanged("Connected");
//             });

//             transport.on("disconnecting", () => {
//                 this.connectionStateChanged("Disconnecting...");
//             });

//             transport.on("disconnected", () => {
//                 this.connectionStateChanged("Disconnected");
//             });
//         });

//         this.sipUa.on("invite", (session: Session) => {
//             this.incomingCall(session);
//         });

//         this.sipUa.start();
//     }

//     connectionStateChanged(newState: string) {
//         this.setState({ connectionState: newState });
//     }

//     testMedia() {
//         const usingHttps = window.location.protocol === "https:";

//         if (navigator.mediaDevices) {
//             navigator.mediaDevices
//                 .getUserMedia({ audio: true, video: this.state.video })
//                 .then(() => {
//                     this.setState({ mediaTested: true, mediaSupported: true, usingHttps });
//                 })
//                 .catch(() => {
//                     this.setState({ mediaTested: true, mediaSupported: false, usingHttps });
//                 });
//         } else {
//             const browser = detect();
//             this.setState({
//                 mediaTested: true,
//                 mediaSupported: false,
//                 usingHttps,
//                 browser: browser?.name,
//                 os: browser?.os,
//             });
//         }
//     }

//     hangupCall() {
//         try {
//             this.currentSession?.terminate();
//         } catch (e) {
//             // ignore
//         }
//     }

//     handleCall(session: Session) {
//         const localVideo = document.getElementById(this.props.localVideoTagId) as HTMLVideoElement;
//         this.currentSession = session;

//         this.currentSession.on("terminated", () => {
//             const localVideo = document.getElementById(this.props.localVideoTagId) as HTMLVideoElement;
//             const remoteVideo = document.getElementById(this.props.remoteVideoTagId) as HTMLVideoElement;

//             if (localVideo) {
//                 localVideo.src = "";
//                 localVideo.srcObject = null;
//             }
//             if (remoteVideo) {
//                 remoteVideo.pause();
//                 remoteVideo.src = "";
//                 remoteVideo.srcObject = null;
//                 remoteVideo.removeAttribute("src");
//                 remoteVideo.removeAttribute("loop");
//             }

//             this.setState({ callState: "Idle" });
//         });

//         this.currentSession.on("accepted", () => {
//             this.setState({ callState: "InCall" });
//             this.callConnected();
//         });

//         this.currentSession.on("cancel", () => {
//             this.setState({ callState: "Canceling" });
//         });

//         this.currentSession.on("rejected", (response: any, cause: any) => {
//             this.props.eventHandler.emit("error", response, cause);
//         });

//         this.currentSession.on("SessionDescriptionHandler-created", () => {
//             this.currentSession?.sessionDescriptionHandler?.on("userMediaFailed", () => { });
//         });

//         this.currentSession.on("trackAdded", () => {
//             if (this.currentSession?.sessionDescriptionHandler?.peerConnection) {
//                 const pc = this.currentSession.sessionDescriptionHandler.peerConnection;

//                 // Gets remote tracks
//                 const remoteStream = new MediaStream();
//                 pc.getReceivers().forEach((receiver) => {
//                     if (receiver.track) remoteStream.addTrack(receiver.track);
//                 });
//                 this.remoteStream = remoteStream;

//                 // Gets local tracks
//                 const localStream = new MediaStream();
//                 setTimeout(() => {
//                     pc.getSenders().forEach((sender) => {
//                         if (sender.track) {
//                             localStream.addTrack(sender.track);
//                         }
//                     });
//                     if (localVideo) {
//                         localVideo.srcObject = localStream;
//                         localVideo.play().catch(() => { });
//                     }
//                 }, 500);
//             }
//         });
//     }

//     toggleMedia(trackKindToToggle: "audio" | "video") {
//         if (this.currentSession?.sessionDescriptionHandler) {
//             this.currentSession.sessionDescriptionHandler.peerConnection.getSenders().forEach((stream) => {
//                 if (stream.track.kind === trackKindToToggle) {
//                     stream.track.enabled = !stream.track.enabled;
//                 }
//             });
//         }
//     }

//     answerCall() {
//         if (this.currentSession) {
//             try {
//                 this.currentSession.accept();
//             } catch (e) {
//                 // ignore
//             }
//         }
//     }

//     incomingCall(session: Session) {
//         this.setState({ callState: "Alerting" });
//         const remoteVideo = document.getElementById(this.props.remoteVideoTagId) as HTMLVideoElement;

//         if (remoteVideo) {
//             if (this.state.alertVideoUrl) {
//                 remoteVideo.src = this.state.alertVideoUrl;
//             } else {
//                 remoteVideo.src = alertVideo;
//             }
//             remoteVideo.setAttribute("loop", "true");
//             remoteVideo.play();
//         }

//         this.handleCall(session);

//         const req = session.request;
//         const encodedMeta = req.getHeader("X-MetaData");

//         if (encodedMeta) {
//             try {
//                 this.setState({ receivedMeta: JSON.parse(decodeURIComponent(encodedMeta)) });
//             } catch {
//                 // ignore JSON parse errors
//             }
//         }
//     }

//     placeCall() {
//         this.setState({ callState: "Calling", error: "" });
//         const inviteOptions: any = {};
//         if (this.state.metaData) {
//             inviteOptions.extraHeaders = [];
//             const encodedMeta = encodeURIComponent(JSON.stringify(this.state.metaData));
//             inviteOptions.extraHeaders.push("X-MetaData:" + encodedMeta);
//         }
//         const session = this.sipUa?.invite(this.state.destination, inviteOptions);
//         if (session) {
//             this.handleCall(session);
//         }
//     }

//     callConnected() {
//         if (this.remoteStream) {
//             try {
//                 const remoteVideo = document.getElementById(this.props.remoteVideoTagId) as HTMLVideoElement;
//                 if (remoteVideo) {
//                     remoteVideo.srcObject = this.remoteStream;
//                     remoteVideo.play().catch(() => { });
//                 }
//             } catch (e) {
//                 // ignore
//             }
//         }
//     }

//     renderCallState() {
//         let stateDescription = "";
//         if (this.state.callState === "Calling") {
//             stateDescription = "Calling...";
//         } else if (this.state.callState === "InCall") {
//             stateDescription = "Call Connected";
//         } else if (this.state.callState === "Canceling") {
//             stateDescription = "Canceling call";
//         }
//         return <div>{stateDescription}</div>;
//     }

//     avoidDoubleTap() {
//         this.setState({ enableButtons: false });
//         setTimeout(() => {
//             this.setState({ enableButtons: true });
//         }, 1000);
//     }

//     renderCallButtons() {
//         if (this.state.callState !== "Canceling" && this.state.enableButtons) {
//             if (this.state.callState === "Idle") {
//                 this.props.eventHandler.emit("Idle");
//             }
//             if (this.state.callState === "Calling") {
//                 this.props.eventHandler.emit("Calling");
//             }
//             if (this.state.callState === "Alerting") {
//                 this.props.eventHandler.emit("Alerting");
//             }
//             if (this.state.callState === "InCall") {
//                 this.props.eventHandler.emit("InCall");
//             }
//         } else {
//             return null;
//         }
//     }

//     renderPermissionProblems() {
//         if (this.state.browser === "crios") {
//             return <div>You are using Chrome on iPhone. It does not support WebRTC. Please test again using Safari.</div>;
//         } else {
//             return [
//                 <div key="permissionNote1">
//                     You have not permitted use of camera and microphone, or your device is not WebRTC capable.
//                 </div>,
//                 <div key="permissionNote2">Please verify your settings.</div>,
//                 <button
//                     key="permissionButton1"
//                     onClick={() => {
//                         window.location.reload();
//                     }}
//                 >
//                     Try to reload page
//                 </button>,
//                 <div key="permissionNote3">
//                     {!this.state.usingHttps
//                         ? "Warning: Page is not loaded via HTTPS. It may cause permission problems accessing camera and microphone!"
//                         : null}
//                     {this.state.browser} {this.state.os}
//                 </div>,
//             ];
//         }
//     }

//     renderCallControl() {
//         if (this.state.mediaSupported) {
//             return (
//                 <div>
//                     {this.state.connectionState === "Connected" ? this.renderCallButtons() : null}
//                     {this.props.updateCallState(this.state.callState)}
//                     <div>{this.state.error}</div>
//                     {this.props.updateConnectionState(this.state.connectionState || "")}
//                     {this.state.receivedMeta ? <div>Received meta data: {JSON.stringify(this.state.receivedMeta)}</div> : null}
//                 </div>
//             );
//         } else {
//             return <div>{this.renderPermissionProblems()}</div>;
//         }
//     }

//     render() {
//         return (
//             <div>
//                 {this.state.mediaTested
//                     ? this.renderCallControl()
//                     : [
//                         <div key="requestPermissions1">Requesting camera and microphone permissions...</div>,
//                         <div key="requestPermissions2">Please allow the application to use microphone and camera.</div>,
//                     ]}
//             </div>
//         );
//     }
// }

// export default WebRTCClient;