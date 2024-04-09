export class webRtcPlayer {

    constructor(parOptions){
        parOptions = parOptions || {};
    

        //**********************
        //Config setup
        //**********************;
        this.cfg = parOptions.peerConnectionOptions || {};
        this.cfg.sdpSemantics = 'unified-plan';
        this.pcClient = null;
        this.dcClient = null;
        this.tnClient = null;

        // Temporary hotfix for Chrome >=89
        const tempChromeInfo = navigator.userAgent.match( /Chrom(e|ium)\/([0-9]+)\./ );
        if ( tempChromeInfo )
        {
                const tempVersion = parseInt( tempChromeInfo[ 2 ], 10 );
                if ( tempVersion >= 89 )
                {
                    // console.log(this.cfg)
                    this.cfg.offerExtmapAllowMixed = false;
                }
        }
        
        this.sdpConstraints = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
        };

        // See https://www.w3.org/TR/webrtc/#dom-rtcdatachannelinit for values
        this.dataChannelOptions = {ordered: true};

        this.video = this.createWebRtcVideo();
    }
    

    //**********************
    //Functions
    //**********************

    //Create Video element and expose that as a parameter
    createWebRtcVideo () {
        console.log("createWebRtcVideo")
        var video = document.createElement('video');
        console.log("createWebRtcVideo",video)
        // video.id = "streamingVideo";
        video.playsInline = true;
        video.addEventListener('loadedmetadata', (e)=>{
            if(this.onVideoInitialised){
                this.onVideoInitialised();
            }
        }, true);
        return video;
    }

    

    onsignalingstatechange (state) {
        // console.info('signaling state change:', state)
    };

    oniceconnectionstatechange (state) {
        // console.info('ice connection state change:', state)
    };

    onicegatheringstatechange (state) {
        // console.info('ice gathering state change:', state)
    };

    handleOnTrack (e) {
        // console.log('handleOnTrack', e.streams);
        if (this.video.srcObject !== e.streams[0]) {
            // console.log('setting video stream from ontrack');
            this.video.srcObject = e.streams[0];
        }
    };

    setupDataChannel(pc, label, options) {
        try {
            var datachannel = pc.createDataChannel(label, options)
            // console.log(`Created datachannel (${label})`)
            
            datachannel.onopen =  (e) =>{
            //   console.log(`data channel (${label}) connect`)
              if(this.onDataChannelConnected){
                this.onDataChannelConnected();
              }
            }

            datachannel.onclose =  (e) =>{
            //   console.log(`data channel (${label}) closed`)
            }

            datachannel.onmessage =  (e) =>{
            //   console.log(`Got message (${label})`, e.data)
              if (this.onDataChannelMessage)
                this.onDataChannelMessage(e.data);
            }

            return datachannel;
        } catch (e) { 
            // console.warn('No data channel', e);
            return null;
        }
    }

    onicecandidate  (e) {
        // console.log('ICE candidate', e)
        if (e.candidate && e.candidate.candidate) {
            this.onWebRtcCandidate(e.candidate);
        }
    };

    handleCreateOffer (pc) {
        pc.createOffer(this.sdpConstraints).then( (offer)=> {
            offer.sdp = offer.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1;maxaveragebitrate=128000");
            pc.setLocalDescription(offer);
            if (this.onWebRtcOffer) {
                // (andriy): increase start bitrate from 300 kbps to 20 mbps and max bitrate from 2.5 mbps to 100 mbps
                // (100 mbps means we don't restrict encoder at all)
                // after we `setLocalDescription` because other browsers are not c happy to see google-specific config
                offer.sdp = offer.sdp.replace(/(a=fmtp:\d+ .*level-asymmetry-allowed=.*)\r\n/gm, "$1;x-google-start-bitrate=10000;x-google-max-bitrate=20000\r\n");
                this.onWebRtcOffer(offer);
            }
        },
        function () { console.warn("Couldn't create offer") });
    }
    
    setupPeerConnection (pc) {
        if (pc.SetBitrate)
            console.log("Hurray! there's RTCPeerConnection.SetBitrate function");

        //Setup peerConnection events
        pc.onsignalingstatechange = (s)=>this.onsignalingstatechange(s);
        pc.oniceconnectionstatechange = (s)=>this.oniceconnectionstatechange(s);
        pc.onicegatheringstatechange = (s)=>this.onicegatheringstatechange(s);

        pc.ontrack = (e)=>this.handleOnTrack(e);
        pc.onicecandidate = (e)=>this.onicecandidate(e);
    };

    generateAggregatedStatsFunction (){
        if(!this.aggregatedStats)
            this.aggregatedStats = {};

        return (stats)=>{
            //console.log('Printing Stats');

            let newStat = {};
            // console.log('----------------------------- Stats start -----------------------------');
            stats.forEach(stat => {
//                    console.log(JSON.stringify(stat, undefined, 4));
                if (stat.type == 'inbound-rtp' 
                    && !stat.isRemote 
                    && (stat.mediaType == 'video' || stat.id.toLowerCase().includes('video'))) {

                    newStat.timestamp = stat.timestamp;
                    newStat.bytesReceived = stat.bytesReceived;
                    newStat.framesDecoded = stat.framesDecoded;
                    newStat.packetsLost = stat.packetsLost;
                    newStat.bytesReceivedStart = this.aggregatedStats && this.aggregatedStats.bytesReceivedStart ? this.aggregatedStats.bytesReceivedStart : stat.bytesReceived;
                    newStat.framesDecodedStart = this.aggregatedStats && this.aggregatedStats.framesDecodedStart ? this.aggregatedStats.framesDecodedStart : stat.framesDecoded;
                    newStat.timestampStart = this.aggregatedStats && this.aggregatedStats.timestampStart ? this.aggregatedStats.timestampStart : stat.timestamp;

                    if(this.aggregatedStats && this.aggregatedStats.timestamp){
                        if(this.aggregatedStats.bytesReceived){
                            // bitrate = bits received since last time / number of ms since last time
                            //This is automatically in kbits (where k=1000) since time is in ms and stat we want is in seconds (so a '* 1000' then a '/ 1000' would negate each other)
                            newStat.bitrate = 8 * (newStat.bytesReceived - this.aggregatedStats.bytesReceived) / (newStat.timestamp - this.aggregatedStats.timestamp);
                            newStat.bitrate = Math.floor(newStat.bitrate);
                            newStat.lowBitrate = this.aggregatedStats.lowBitrate && this.aggregatedStats.lowBitrate < newStat.bitrate ? this.aggregatedStats.lowBitrate : newStat.bitrate
                            newStat.highBitrate = this.aggregatedStats.highBitrate && this.aggregatedStats.highBitrate > newStat.bitrate ? this.aggregatedStats.highBitrate : newStat.bitrate
                        }

                        if(this.aggregatedStats.bytesReceivedStart){
                            newStat.avgBitrate = 8 * (newStat.bytesReceived - this.aggregatedStats.bytesReceivedStart) / (newStat.timestamp - this.aggregatedStats.timestampStart);
                            newStat.avgBitrate = Math.floor(newStat.avgBitrate);
                        }

                        if(this.aggregatedStats.framesDecoded){
                            // framerate = frames decoded since last time / number of seconds since last time
                            newStat.framerate = (newStat.framesDecoded - this.aggregatedStats.framesDecoded) / ((newStat.timestamp - this.aggregatedStats.timestamp) / 1000);
                            newStat.framerate = Math.floor(newStat.framerate);
                            newStat.lowFramerate = this.aggregatedStats.lowFramerate && this.aggregatedStats.lowFramerate < newStat.framerate ? this.aggregatedStats.lowFramerate : newStat.framerate
                            newStat.highFramerate = this.aggregatedStats.highFramerate && this.aggregatedStats.highFramerate > newStat.framerate ? this.aggregatedStats.highFramerate : newStat.framerate
                        }

                        if(this.aggregatedStats.framesDecodedStart){
                            newStat.avgframerate = (newStat.framesDecoded - this.aggregatedStats.framesDecodedStart) / ((newStat.timestamp - this.aggregatedStats.timestampStart) / 1000);
                            newStat.avgframerate = Math.floor(newStat.avgframerate);
                        }
                    }
                }

                //Read video track stats
                if(stat.type == 'track' && (stat.trackIdentifier == 'video_label' || stat.kind == 'video')) {
                    newStat.framesDropped = stat.framesDropped;
                    newStat.framesReceived = stat.framesReceived;
                    newStat.framesDroppedPercentage = stat.framesDropped / stat.framesReceived * 100;
                    newStat.frameHeight = stat.frameHeight;
                    newStat.frameWidth = stat.frameWidth;
                    newStat.frameHeightStart = this.aggregatedStats && this.aggregatedStats.frameHeightStart ? this.aggregatedStats.frameHeightStart : stat.frameHeight;
                    newStat.frameWidthStart = this.aggregatedStats && this.aggregatedStats.frameWidthStart ? this.aggregatedStats.frameWidthStart : stat.frameWidth;
                }

                if(stat.type =='candidate-pair' && stat.hasOwnProperty('currentRoundTripTime') && stat.currentRoundTripTime != 0){
                    newStat.currentRoundTripTime = stat.currentRoundTripTime;
                }
            });

            //console.log(JSON.stringify(newStat));
            this.aggregatedStats = newStat;

            if(this.onAggregatedStats)
                this.onAggregatedStats(newStat)
        }
    };

    //**********************
    //Public functions
    //**********************

    //This is called when revceiving new ice candidates individually instead of part of the offer
    //This is currently not used but would be called externally from this class
    handleCandidateFromServer (iceCandidate) {
        // console.log("ICE candidate: ", iceCandidate);
        let candidate = new RTCIceCandidate(iceCandidate);
        this.pcClient.addIceCandidate(candidate).then(_=>{
            // console.log('ICE candidate successfully added');
        });
    };

    //Called externaly to create an offer for the server
    createOffer () {
        if(this.pcClient){
            console.log("Closing existing PeerConnection")
            this.pcClient.close();
            this.pcClient = null;
        }
        this.pcClient = new RTCPeerConnection(this.cfg);
        this.setupPeerConnection(this.pcClient);
        this.dcClient = this.setupDataChannel(this.pcClient, 'cirrus', this.dataChannelOptions);
        this.handleCreateOffer(this.pcClient);
    };

    //Called externaly when an answer is received from the server
    receiveAnswer (answer) {
        // console.log(`Received answer:\n${answer}`);
        var answerDesc = new RTCSessionDescription(answer);
        this.pcClient.setRemoteDescription(answerDesc);
    };

    close (){
        if(this.pcClient){
            console.log("Closing existing peerClient")
            this.pcClient.close();
            this.pcClient = null;
        }
        if(this.aggregateStatsIntervalId)
            clearInterval(this.aggregateStatsIntervalId);
    }

    //Sends data across the datachannel
    send (data){
        if(this.dcClient && this.dcClient.readyState == 'open'){
            //console.log('Sending data on dataconnection', this.dcClient)
            this.dcClient.send(data);
        }
    };

    getStats (onStats){
        if(this.pcClient && onStats){
            this.pcClient.getStats(null).then((stats) => { 
                onStats(stats); 
            });
        }
    }

    aggregateStats (checkInterval){
        let calcAggregatedStats = this.generateAggregatedStatsFunction();
        let printAggregatedStats = () => { this.getStats(calcAggregatedStats); }
        this.aggregateStatsIntervalId = setInterval(printAggregatedStats, checkInterval);
    }
    
}

// export class webRtcPlayer2{
//     constructor(parOptions){
//         return webRtcPlayer(parOptions)
//     }
// }