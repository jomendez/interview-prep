import React, { useRef, useState } from 'react'
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

    let recordingTimeMS = 5000;

    function log(msg) {
        logElement.current.innerHTML += msg + "\n";
    }

    function wait(delayInMS) {
        return new Promise(resolve => setTimeout(resolve, delayInMS));
    }

    function startRecording(stream, lengthInMS) {
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
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
            .then(stream => {
                preview.current.srcObject = stream;
                downloadButton.current.href = stream;
                preview.current.captureStream = preview.current.captureStream || preview.current.mozCaptureStream;
                return new Promise(resolve => {
                    return preview.current.onplaying = resolve
                });
            })
    }

    function startStopButton() {
        if (isRecording) {
            stopHandler()
            setIsRecording(false)
            return
        }
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
            .then(stream => {
                preview.current.srcObject = stream;
                downloadButton.current.href = stream;
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

                //@@@

                setIsRecording(false)

                log("Successfully recorded " + (recordedBlob.size / 1024).toFixed(2) + " KB of " +
                    recordedBlob.type + " media.");
            })
            .catch((err) => {
                log(err)
                setIsRecording(false)
            });
    }

    function playTrack(track) {
        recording.current.src = URL.createObjectURL(track);
        downloadButton.current.href = recording.current.src;
        downloadButton.current.download = "RecordedVideo.webm";
    }

    function stop(stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    function stopHandler() {
        stop(preview.current.srcObject);
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
                            <video ref={preview} id="preview" width="160" height="120" autoPlay muted></video>
                        </div>
                        <div className="video-buttons">
                            <button className="button" onClick={previewHandle}>Preview</button>
                            <button className="button" onClick={startStopButton}>{isRecording ? 'Stop' : 'Start Record'}</button>
                        </div>
                    </div>
                    <nav>
                        <h2>Preview</h2>
                        <ul>
                            {tracks.map((item)=> (<li key={item.id} onClick={()=>{ playTrack(item.track)}}>Play Track - {item.id}</li>))}
                           
                        </ul>
                    </nav>
                </div>
            </section>

            <div className="left">
                {/* <button id="startButton" className="button" onClick={startButton}>
                    Start
            </button> */}
                {/* <h2>Preview</h2>
                <video ref={preview} id="preview" width="160" height="120" autoPlay muted></video> */}
            </div>

            <div className="right">
                {/* <button id="stopButton" className="button" onClick={stopButton}>
                    Stop
                </button> */}
                <h2>Recording</h2>
                <video ref={recording} id="recording" width="160" height="120" controls></video>
                <a ref={downloadButton} id="downloadButton" className="button">
                    Download
                </a>
            </div>

            <div className="bottom">
                <pre ref={logElement} id="log"></pre>
            </div>

        </div>
    )
}



