import { webRtcPlayer } from "./webRtcPlayer";

const WS_OPEN_STATE = 1
const ToClientMessageType = {
	QualityControlOwnership: 0,
	Response: 1,
	Command: 2,
	FreezeFrame: 3,
	UnfreezeFrame: 4,
	VideoEncoderAvgQP: 5
};
export class VideoStream{
    streamUrl = "ws://127.0.0.1:9999"
    webRtcPlayerObj:any
    ws:WebSocket|undefined
    onCanPlay=()=>{};
    freezeFrame = {
        receiving: false,
        size: 0,
        jpeg: new Uint8Array(),
        height: 0,
        width: 0,
        valid: false
    };
    constructor(url:string){
        this.streamUrl = url
    }
    connect(){
        "use strict";
        window.WebSocket = window.WebSocket;
        if (!window.WebSocket) {
            alert('Your browser doesn\'t support WebSocket');
            return;
        }
        this.ws = new WebSocket(this.streamUrl);
        this.ws.onmessage =  (event) =>{
            // console.log(`<- SS: ${event.data}`);
            var msg = JSON.parse(event.data);
            if (msg.type === 'config') {
                this.onConfig(msg);
            } else if (msg.type === 'playerCount') {
                
            } else if (msg.type === 'answer') {
                this.onWebRtcAnswer(msg);
            } else if (msg.type === 'iceCandidate') {
                this.onWebRtcIce(msg.candidate);
            } else {
                console.log(`invalid SS message type: ${msg.type}`);
            }
        };

        this.ws.onerror = function (event) {
            console.log(`WS error: ${JSON.stringify(event)}`);
        };

        this.ws.onclose = function (event) {
            console.log(`WS closed: ${JSON.stringify(event.code)} - ${event.reason}`);
            // this.ws = undefined;
        };
    }
    onWebRtcAnswer(webRTCData:any) {
        this.webRtcPlayerObj?.receiveAnswer(webRTCData);
    
        // this.webRtcPlayerObj.onAggregatedStats = (aggregatedStats:any) => {
            
        // };
    
        this.webRtcPlayerObj?.aggregateStats(1 * 1000 /*Check every 1 second*/);
    
    }
    
    onWebRtcIce(iceCandidate:any) {
        if (this.webRtcPlayerObj)
        this.webRtcPlayerObj.handleCandidateFromServer(iceCandidate);
    }
    showFreezeFrameOverlay() {
        // if (this.freezeFrame.valid) {
        //     freezeFrameOverlay.style.display = 'block';
        // }
    }
    onConfig(config:any) {
        this.setupWebRtcPlayer(config);
    }
    setupWebRtcPlayer(config:any) {
        this.webRtcPlayerObj = new webRtcPlayer({ peerConnectionOptions: config.peerConnectionOptions });
        // console.log(this.webRtcPlayerObj)
        // console.log(this.el)
        // this.el.appendChild(this.webRtcPlayerObj.video);
    
        this.webRtcPlayerObj.onWebRtcOffer =  (offer:any)=> {
            if (this.ws && this.ws.readyState === WS_OPEN_STATE) {
                this.removeExtmapAllowMixed(offer);
                let offerStr = JSON.stringify(offer);
                // console.log(`-> SS: offer:\n${offerStr}`);
                this.ws.send(offerStr);
            }
        };
    
        this.webRtcPlayerObj.onWebRtcCandidate = (candidate:any) =>{
            if (this.ws && this.ws.readyState === WS_OPEN_STATE) {
                // console.log(`-> SS: iceCandidate\n${JSON.stringify(candidate, undefined, 4)}`);
                this.ws.send(JSON.stringify({ type: 'iceCandidate', candidate: candidate }));
            }
        };
    
        this.webRtcPlayerObj.onVideoInitialised =  ()=> {
            if (this.ws && this.ws.readyState === WS_OPEN_STATE) {
                this.onCanPlay?.()
                // console.log('WebRTC onVideoInitialised');
            }
        };
    
        this.webRtcPlayerObj.onDataChannelConnected =  ()=> {
            if (this.ws && this.ws.readyState === WS_OPEN_STATE) {
                console.log('WebRTC connected, waiting for video');
            }
        };
    
        function showFreezeFrame() {
            // let base64 = btoa(freezeFrame.jpeg.reduce((data, byte) => data + String.fromCharCode(byte), ''));
            // freezeFrameOverlay.src = 'data:image/jpeg;base64,' + base64;
            // freezeFrameOverlay.onload = function () {
            //     freezeFrame.height = freezeFrameOverlay.naturalHeight;
            //     freezeFrame.width = freezeFrameOverlay.naturalWidth;
            //     resizeFreezeFrameOverlay();
                
            //     showFreezeFrameOverlay();
            // };
        }
    
        this.webRtcPlayerObj.onDataChannelMessage =  (data:any)=>{
            var view = new Uint8Array(data);
            if (this.freezeFrame.receiving) {
                let jpeg = new Uint8Array(this.freezeFrame.jpeg.length + view.length);
                jpeg.set(this.freezeFrame.jpeg, 0);
                jpeg.set(view, this.freezeFrame.jpeg.length);
                this.freezeFrame.jpeg = jpeg;
                if (this.freezeFrame.jpeg.length === this.freezeFrame.size) {
                    this.freezeFrame.receiving = false;
                    this.freezeFrame.valid = true;
                    // console.log(`received complete freeze frame ${freezeFrame.size}`);
                    showFreezeFrame();
                } else if (this.freezeFrame.jpeg.length > this.freezeFrame.size) {
                    // console.error(`received bigger freeze frame than advertised: ${freezeFrame.jpeg.length}/${freezeFrame.size}`);
                    // this.freezeFrame.jpeg = undefined;
                    this.freezeFrame.receiving = false;
                } else {
                    // console.log(`received next chunk (${view.length} bytes) of freeze frame: ${freezeFrame.jpeg.length}/${freezeFrame.size}`);
                }
            } else if (view[0] === ToClientMessageType.QualityControlOwnership) {
                // let ownership = view[1] === 0 ? false : true;
                // If we own the quality control, we can't relenquish it. We only loose
                // quality control when another peer asks for it
                // if (qualityControlOwnershipCheckBox !== null) {
                // 	qualityControlOwnershipCheckBox.disabled = ownership;
                // 	qualityControlOwnershipCheckBox.checked = ownership;
                // }
            } else if (view[0] === ToClientMessageType.Response) {
                // let response = new TextDecoder("utf-16").decode(data.slice(1));
                // for (let listener of responseEventListeners.values()) {
                //     listener(response);
                // }
            } else if (view[0] === ToClientMessageType.Command) {
                // let commandAsString = new TextDecoder("utf-16").decode(data.slice(1));
                // console.log(commandAsString);
                // let command = JSON.parse(commandAsString);
                // if (command.command === 'onScreenKeyboard') {
                //     showOnScreenKeyboard(command);
                // }
            } else if (view[0] === ToClientMessageType.FreezeFrame) {
                this.freezeFrame.size = (new DataView(view.slice(1, 5).buffer)).getInt32(0, true);
                this.freezeFrame.jpeg = view.slice(1 + 4);
                if (this.freezeFrame.jpeg.length < this.freezeFrame.size) {
                    // console.log(`received first chunk of freeze frame: ${freezeFrame.jpeg.length}/${freezeFrame.size}`);
                    this.freezeFrame.receiving = true;
                } else {
                    // console.log(`received complete freeze frame: ${freezeFrame.jpeg.length}/${freezeFrame.size}`);
                    showFreezeFrame();
                }
            } else if (view[0] === ToClientMessageType.UnfreezeFrame) {
                // invalidateFreezeFrameOverlay();
            } else if (view[0] === ToClientMessageType.VideoEncoderAvgQP) {
                // VideoEncoderQP = new TextDecoder("utf-16").decode(data.slice(1));
                // console.log(`received VideoEncoderAvgQP ${VideoEncoderQP}`);
            } else {
                // console.error(`unrecognized data received, packet ID ${view[0]}`);
            }
        };
    
        // registerInputs(webRtcPlayerObj.video);
    
        // On a touch device we will need special ways to show the on-screen keyboard.
        // if ('ontouchstart' in document.documentElement) {
        //     createOnScreenKeyboardHelpers(htmlElement);
        // }
        this.webRtcPlayerObj.createOffer();
        // createWebRtcOffer();
    
        return this.webRtcPlayerObj.video;
    }
    removeExtmapAllowMixed(desc:any) {
        /* remove a=extmap-allow-mixed for webrtc.org 1 < M71 */
        if (!window.RTCPeerConnection) {
            return;
        }
    
        if (desc.sdp.indexOf(`\na=extmap-allow-mixed`) !== -1) {
            const sdp = desc.sdp.split(`\n`).filter((line:any) => {
                return line.trim() !== `a=extmap-allow-mixed`;
            }).join(`\n`);
            desc.sdp = sdp;
            return sdp;
        }
    }
    emitHMDInput(descriptor:any){
        let descriptorAsString = JSON.stringify(descriptor);
        // Add the UTF-16 JSON string to the array byte buffer, going two bytes at
        // a time.
        let data = new DataView(new ArrayBuffer(1 + 2 + 2 * descriptorAsString.length));
        let byteIdx = 0;
        const UIInteraction = 50
        data.setUint8(byteIdx, UIInteraction);
        byteIdx++;
        data.setUint16(byteIdx, descriptorAsString.length, true);
        byteIdx += 2;
        for (let i = 0; i < descriptorAsString.length; i++) {
            data.setUint16(byteIdx, descriptorAsString.charCodeAt(i), true);
            byteIdx += 2;
        }
        this.sendInputData(data.buffer);
    }
    sendInputData(data:any) {
        if (this.webRtcPlayerObj) {
            // resetAfkWarningTimer();
            this.webRtcPlayerObj.send(data);
        }
    
    }
}