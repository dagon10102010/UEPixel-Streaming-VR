
export class webRtcPlayer{
    constructor(parOptions)
    video:HTMLVideoElement
    createWebRtcVideo()
    onsignalingstatechange(state)
    oniceconnectionstatechange(state)
    onicegatheringstatechange(state)
    handleOnTrack(e)
    setupDataChannel(pc, label, options)
    onicecandidate(e)
    handleCreateOffer(pc)
    setupPeerConnection(pc)
    generateAggregatedStatsFunction()
    handleCandidateFromServer(iceCandidate)
    createOffer()
    receiveAnswer(answer)
    close()
    send(data)
    getStats(onStats)
    aggregateStats(checkInterval)
    onWebRtcOffer(offer)
    onAggregatedStats(newStat)
    onWebRtcCandidate(candidate)
    onVideoInitialised()
    onDataChannelConnected()
    onDataChannelMessage(data)

}
