// @flow
import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';

import * as THREE from 'three';
import { Scene } from 'three';

/**
 * Represents a modified MediaStream that adds effects to video background.
 * <tt>JitsiStreamBackgroundEffect</tt> does the processing of the original
 * video stream.
 */
export default class JitsiStreamBackgroundEffect {
    _model: Object;
    _options: Object;
    _segmentationPixelCount: number;
    _inputVideoElement: HTMLVideoElement;
    _onMaskFrameTimer: Function;
    _maskFrameTimerWorker: Worker;
    _outputCanvasElement: HTMLCanvasElement;
    _outputCanvasCtx: Object;
    _segmentationMaskCtx: Object;
    _segmentationMask: Object;
    _segmentationMaskCanvas: Object;
    _renderMask: Function;
    _virtualImage: HTMLImageElement;
    isEnabled: Function;
    startEffect: Function;
    stopEffect: Function;
    _threeScene: THREE.Scene;
    _threeCamera: THREE.Camera;
    _threeRenderer: THREE.WebGLRenderer;
    _threeGeometry: THREE.Mesh;

    /**
     * Represents a modified video MediaStream track.
     *
     * @class
     * @param {Object} model - Meet model.
     * @param {Object} options - Segmentation dimensions.
     */
    constructor(model: Object, options: Object) {
        this._options = options;

        if (this._options.virtualBackground.backgroundType === 'image') {
            this._virtualImage = document.createElement('img');
            this._virtualImage.crossOrigin = 'anonymous';
            this._virtualImage.src = this._options.virtualBackground.virtualSource;
        }
        this._model = model;
        this._options = options;
        this._segmentationPixelCount = this._options.width * this._options.height;

        // Bind event handler so it is only bound once for every instance.
        this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

        // Workaround for FF issue https://bugzilla.mozilla.org/show_bug.cgi?id=1388974
        this._outputCanvasElement = document.createElement('canvas');
        // this._outputCanvasElement.getContext('2d');
        this._inputVideoElement = document.createElement('video');

        this._threeScene = new THREE.Scene();
        this._threeScene.background = new THREE.Color( 0xff0000 );
        this._threeCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._threeRenderer = new THREE.WebGLRenderer({ canvas: this._outputCanvasElement});

        this._threeRenderer.setSize( window.innerWidth, window.innerHeight);
        
         
        // const geometry = new THREE.PlaneGeometry(10,5);
        const geometry = new THREE.BoxGeometry(2,2,2);
        // const videoTexture = new THREE.VideoTexture(this._inputVideoElement);
        // const videoMeterial = new THREE.MeshBasicMaterial( {map: videoTexture, transparent: false, side: THREE.FrontSide});
        const meterial = new THREE.MeshBasicMaterial( {color: 0x00ff00});
        // this._threeGeometry = new THREE.Mesh( geometry, videoMeterial);
        this._threeGeometry = new THREE.Mesh( geometry, meterial);
        const axesHelper = new THREE.AxesHelper( 2 );
        this._threeScene.add(this._threeGeometry);
        this._threeScene.add(axesHelper);
        this._threeCamera.position.z = 5;


    }

    /**
     * EventHandler onmessage for the maskFrameTimerWorker WebWorker.
     *
     * @private
     * @param {EventHandler} response - The onmessage EventHandler parameter.
     * @returns {void}
     */
    _onMaskFrameTimer(response: Object) {
        if (response.data.id === TIMEOUT_TICK) {
            // this._renderMask();
            this._renderCircle();
        }
    }

    /**
     * Represents the run Tensorflow Interference.
     *
     * @returns {void}
     */
    _renderCircle(){

        this._threeGeometry.rotation.x += 0.03;
        // this._threeGeometry.rotation.y += 0.03;
        this._threeRenderer.render(this._threeScene, this._threeCamera);

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 30
        });
    }


    /**
     * Represents the run post processing.
     *
     * @returns {void}
     */
    runPostProcessing() {
        this._outputCanvasCtx.globalCompositeOperation = 'copy';

        // Draw segmentation mask.
        //

        // Smooth out the edges.
        if (this._options.virtualBackground.backgroundType === 'image') {
            this._outputCanvasCtx.filter = 'blur(4px)';
        } else {
            this._outputCanvasCtx.filter = 'blur(8px)';
        }


        this._outputCanvasCtx.drawImage(
            this._segmentationMaskCanvas,
            0,
            0,
            this._options.width,
            this._options.height,
            0,
            0,
            this._inputVideoElement.width,
            this._inputVideoElement.height
        );
	    /*
        this._outputCanvasCtx.globalCompositeOperation = 'source-in';
        this._outputCanvasCtx.filter = 'none';

        // Draw the foreground video.
        //

        this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);
*/
        // Draw the background.
        //

        this._outputCanvasCtx.globalCompositeOperation = 'destination-over';
        if (this._options.virtualBackground.backgroundType === 'image') {
            this._outputCanvasCtx.drawImage(
                this._virtualImage,
                0,
                0,
                this._inputVideoElement.width,
                this._inputVideoElement.height
            );
        } else {
            this._outputCanvasCtx.filter = `blur(${this._options.virtualBackground.blurValue}px)`;
            this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);
        }
    }

    /**
     * Represents the run Tensorflow Interference.
     *
     * @returns {void}
     */
    runInference() {
        this._model._runInference();
        const outputMemoryOffset = this._model._getOutputMemoryOffset() / 4;

        for (let i = 0; i < this._segmentationPixelCount; i++) {
            const background = this._model.HEAPF32[outputMemoryOffset + (i * 2)];
            const person = this._model.HEAPF32[outputMemoryOffset + (i * 2) + 1];
            const shift = Math.max(background, person);
            const backgroundExp = Math.exp(background - shift);
            const personExp = Math.exp(person - shift);

            // Sets only the alpha component of each pixel.
            this._segmentationMask.data[(i * 4) + 3] = (255 * personExp) / (backgroundExp + personExp);
        }
        this._segmentationMaskCtx.putImageData(this._segmentationMask, 0, 0);
    }

    /**
     * Loop function to render the background mask.
     *
     * @private
     * @returns {void}
     */
    _renderMask() {
        this.resizeSource();
        this.runInference();
        this.runPostProcessing();

        this._maskFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 30
        });
    }

    /**
     * Represents the resize source process.
     *
     * @returns {void}
     */
    resizeSource() {
        this._segmentationMaskCtx.drawImage(
            this._inputVideoElement,
            0,
            0,
            this._inputVideoElement.width,
            this._inputVideoElement.height,
            0,
            0,
            this._options.width,
            this._options.height
        );

        const imageData = this._segmentationMaskCtx.getImageData(
            0,
            0,
            this._options.width,
            this._options.height
        );
        const inputMemoryOffset = this._model._getInputMemoryOffset() / 4;

        for (let i = 0; i < this._segmentationPixelCount; i++) {
            this._model.HEAPF32[inputMemoryOffset + (i * 3)] = imageData.data[i * 4] / 255;
            this._model.HEAPF32[inputMemoryOffset + (i * 3) + 1] = imageData.data[(i * 4) + 1] / 255;
            this._model.HEAPF32[inputMemoryOffset + (i * 3) + 2] = imageData.data[(i * 4) + 2] / 255;
        }
    }

    /**
     * Checks if the local track supports this effect.
     *
     * @param {JitsiLocalTrack} jitsiLocalTrack - Track to apply effect.
     * @returns {boolean} - Returns true if this effect can run on the specified track
     * false otherwise.
     */
    isEnabled(jitsiLocalTrack: Object) {
        return jitsiLocalTrack.isVideoTrack() && jitsiLocalTrack.videoType === 'camera';
    }

    /**
     * Starts loop to capture video frame and render the segmentation mask.
     *
     * @param {MediaStream} stream - Stream to be used for processing.
     * @returns {MediaStream} - The stream with the applied effect.
     */
    startEffect(stream: MediaStream) {
        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;
        const firstVideoTrack = stream.getVideoTracks()[0];
        const { height, frameRate, width }
            = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();

        this._segmentationMask = new ImageData(this._options.width, this._options.height);
        this._segmentationMaskCanvas = document.createElement('canvas');
        this._segmentationMaskCanvas.width = this._options.width;
        this._segmentationMaskCanvas.height = this._options.height;
        this._segmentationMaskCtx = this._segmentationMaskCanvas.getContext('2d');

        this._outputCanvasElement.width = parseInt(width, 10);
        this._outputCanvasElement.height = parseInt(height, 10);
        // this._outputCanvasCtx = this._outputCanvasElement.getContext('2d');
        this._inputVideoElement.width = parseInt(width, 10);
        this._inputVideoElement.height = parseInt(height, 10);
        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = stream;
        this._inputVideoElement.onloadeddata = () => {
            this._maskFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 30
            });
        };

        return this._outputCanvasElement.captureStream(parseInt(frameRate, 10));
    }

    /**
     * Stops the capture and render loop.
     *
     * @returns {void}
     */
    stopEffect() {
        this._maskFrameTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });

        this._maskFrameTimerWorker.terminate();
    }
}
