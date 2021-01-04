import React, { useRef, useState, useEffect } from 'react'
import './Video.scss'

function genId() {
    return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase()
}

export default function Video() {

    let preview = useRef(null)
    let recording = useRef(null)
    let downloadButton = useRef(null)
    let logElement = useRef(null)

    const [isRecording, setIsRecording] = useState(false)
    const [tracks, setTracks] = useState([])
    const [playingMode, setPlayingMode] = useState(false)
    const [track, setTrack] = useState(null)
    const [previewToggle, setPreviewToggle] = useState(false)

    let recordingTimeMS = 5000;

    function log(msg) {
        logElement.current.innerHTML += msg + "\n";
    }

    function wait(delayInMS) {
        return new Promise(resolve => setTimeout(resolve, delayInMS));
    }

    function startRecording(stream, lengthInMS) {
        setPlayingMode(false)
        setTrack(null)
        let recorder = new MediaRecorder(stream);
        let data = [];

        recorder.ondataavailable = event => data.push(event.data);
        recorder.start();

        log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

        let stopped = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = event => reject(event.name);
        });

        let recorded = wait(lengthInMS).then(
            () => recorder.state == "recording" && recorder.stop()
        );

        return Promise.all([
            stopped,
            recorded
        ])
            .then(() => data);
    }

    function previewHandle() {
        setTrack(null)
        setPlayingMode(false)
        setPreviewToggle((prev) => {
            if (prev) {
                stopHandler()
                return false
            } else {
                doPreview()
                return true
            }
        })

    }

    function doPreview() {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
            .then(stream => {
                preview.current.srcObject = stream;
                if (downloadButton.current) {
                    downloadButton.current.href = stream;
                }
                preview.current.captureStream = preview.current.captureStream || preview.current.mozCaptureStream;
                return new Promise(resolve => {
                    return preview.current.onplaying = resolve
                });
            })
    }

    function startStopButton() {
        setPlayingMode(false)
        if (isRecording) {//When stop
            stopHandler()
            setIsRecording(false)
            return
        }

        //when start
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
            .then(stream => {
                preview.current.srcObject = stream;
                if (downloadButton.current) {
                    downloadButton.current.href = stream;
                }
                preview.current.captureStream = preview.current.captureStream || preview.current.mozCaptureStream;
                return new Promise(resolve => {
                    return preview.current.onplaying = resolve
                });
            })
            .then(() => {
                setIsRecording(true)
                return startRecording(preview.current.captureStream(), recordingTimeMS)
            })
            .then(recordedChunks => {
                let recordedBlob = new Blob(recordedChunks, { type: "video/webm" });

                const newObj = [...tracks]
                newObj.push({
                    id: genId(),
                    track: recordedBlob
                })
                setTracks(newObj)

                setIsRecording(false)

                log("Successfully recorded " + (recordedBlob.size / 1024).toFixed(2) + " KB of " +
                    recordedBlob.type + " media.");
            })
            .catch((err) => {
                log(err)
                setIsRecording(false)
            });
    }

    useEffect(() => {// triggered when we are going to play a recorded track
        if (track && playingMode && downloadButton.current) {
            recording.current.src = URL.createObjectURL(track.track);
            downloadButton.current.href = recording.current.src;
            downloadButton.current.download = "RecordedVideo.webm";
        }
    }, [track, playingMode])

    function playTrack(track) {
        setPreviewToggle(false)
        setPlayingMode(true)
        setTrack(track)
    }

    function stop(stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    function stopHandler() {
        setTrack(null)
        if (preview.current) {
            setPreviewToggle(false)
            setPlayingMode(false)
            stop(preview.current.srcObject);
        }
    }

    return (
        <div className="video-component">
            <p>
                Click the "Start" button to begin video recording for a few seconds. You can stop
                the video by clicking the creatively-named "Stop" button. The "Download"
                button will download the received data (although it's in a raw, unwrapped form
                that isn't very useful).
            </p>

            <section>
                <div className="container">
                    <div className="video-container">
                        <div className="video-control">
                            <h2>Preview</h2>
                            {!playingMode && <video ref={preview} id="preview" width="160" height="120" autoPlay muted></video>}
                            {playingMode && <video ref={recording} id="recording" width="160" height="120" controls></video>}
                        </div>
                        <div className="video-buttons">
                            <button className="button" onClick={previewHandle}>{previewToggle ? 'Stop preview' : 'Preview'}</button>
                            <div className="record-download-btn">
                                <button className="button" onClick={startStopButton}>{isRecording ? 'Stop' : 'Start Record'}</button>
                                {playingMode && (<a ref={downloadButton} id="downloadButton" className="button">
                                    Download
                                </a>)}
                            </div>
                        </div>
                    </div>
                    <nav>
                        <h2>Preview</h2>
                        <ul>
                            {tracks.map((item) => (<li className={track && track.id === item.id? 'active-item' : ''} 
                            key={item.id} onClick={() => { playTrack(item) }}>Play Track - {item.id}</li>))}

                        </ul>
                    </nav>
                </div>
            </section>


            <div className="bottom">
                <pre ref={logElement} id="log"></pre>
            </div>

        </div>
    )
}



