// @flow

import { VIRTUAL_BACKGROUND_TYPE } from '../../virtual-background/constants';

import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from './TimerWorker';
import * as fShader from './shaders/frag'
import * as vShader from './shaders/vertex'

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
    _stream: Object;
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
    _virtualVideo: HTMLVideoElement;
    isEnabled: Function;
    startEffect: Function;
    stopEffect: Function;
    _hue: Number;
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
        this._hue =0
        if (this._options.virtualBackground.backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE) {
            this._virtualImage = document.createElement('img');
            this._virtualImage.crossOrigin = 'anonymous';
            this._virtualImage.src = this._options.virtualBackground.virtualSource;
        }
        if (this._options.virtualBackground.backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            this._virtualVideo = document.createElement('video');
            this._virtualVideo.autoplay = true;
            this._virtualVideo.srcObject = this._options?.virtualBackground?.virtualSource?.stream;
        }
        this._model = model;
        this._options = options;
        this._segmentationPixelCount = this._options.width * this._options.height;

        // Bind event handlefdr so it is only bound once for every instance.
        this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

        // Workaround for FF issue https://bugzilla.mozilla.org/show_bug.cgi?id=1388974
        this._outputCanvasElement = document.createElement('canvas');
        
        // this._outputCanvasElement.getContext('2d');
        this._inputVideoElement = document.createElement('video');
        
        
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
            this._renderCube();
        }
    }

    /**
     * Represents the run post processing.
     *
     * @returns {void}
     */
    runPostProcessing() {
        const track = this._stream.getVideoTracks()[0];
        const { height, width } = track.getSettings() ?? track.getConstraints();
        const { backgroundType } = this._options.virtualBackground;

        // this._outputCanvasElement.height = height;
        // this._outputCanvasElement.width = width;
        this._outputCanvasCtx.globalCompositeOperation = 'copy';

        // Draw segmentation mask.

        // Smooth out the edges.
        // this._outputCanvasCtx.filter = backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE ? 'blur(4px)' : 'blur(8px)';
        if (backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            // Save current context before applying transformations.
            this._outputCanvasCtx.save();

            // Flip the canvas and prevent mirror behaviour.
            this._outputCanvasCtx.scale(-1, 1);
            this._outputCanvasCtx.translate(-this._outputCanvasElement.width, 0);
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
        if (backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            this._outputCanvasCtx.restore();
        }
        this._outputCanvasCtx.globalCompositeOperation = 'source-in';
        // this._outputCanvasCtx.filter = 'none';

        // Draw the foreground video.
        if (backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            // Save current context before applying transformations.
            this._outputCanvasCtx.save();

            // Flip the canvas and prevent mirror behaviour.
            this._outputCanvasCtx.scale(-1, 1);
            this._outputCanvasCtx.translate(-this._outputCanvasElement.width, 0);
        }
        this._hue += 0.1;
        this._hue %= 360;
        this._outputCanvasCtx.fillStyle = `hsl(${this._hue} 98% 50%)`;
        this._outputCanvasCtx.fillRect(0, 0, this._outputCanvasElement.width, this._outputCanvasElement.height);
        // this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);
        if (backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            this._outputCanvasCtx.restore();
        }

        // Draw the background.

        this._outputCanvasCtx.globalCompositeOperation = 'destination-over';
        // this._outputCanvasCtx.filter = null;
        if (backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE
            || backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
            this._outputCanvasCtx.drawImage(
                backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE
                    ? this._virtualImage : this._virtualVideo,
                0,
                0,
                this._outputCanvasElement.width,
                this._outputCanvasElement.height
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
    _renderCube(){
        this._threeRenderer.render(this._threeScene, this._threeCamera);
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
o
        for (let i = 0; i < this._segmentationPixelCount; i++) {
            this._model.HEAPF32[inputMemoryOffset + (i * 3)] = imageData.data[i * 4] / 255;
            this._model.HEAPF32[inputMemoryOffset + (i * 3) + 1] = imageData.data[(i * 4) + 1] / 255;
            this._model.HEAPF32[inputMemoryOffset + (i * 3) + 2] = imageData.data[(i * 4) + 2] / 255;
        }
    }

    setupWebGLScene(inputVideoElement, outputCanvasElement) {
        this._threeScene = new THREE.Scene();
        const ratio = this._inputVideoElement.width / this._inputVideoElement.height;
        this._threeCamera = new THREE.OrthographicCamera();
        this._threeCamera.position.z = 1;
        this._threeRenderer = new THREE.WebGLRenderer( { canvas: this._outputCanvasElement } );
        console.log("SHADING_LANG_VER::" +this._threeRenderer.getContext().SHADING_LANGUAGE_VERSION)
        
        this._threeRenderer.setSize( ratio*this._inputVideoElement.height/8, this._inputVideoElement.width/8);
        this._threeRenderer.setClearColor( 0x0000ff, 0);
        
        const geometry = new THREE.PlaneGeometry(2.0,2.0);
        const videoTexture = new THREE.VideoTexture(this._inputVideoElement);
        console.log(fShader)
        this._inputVideoElement.play();
        const uniforms = {
            u_texture   : {type: "t", value: videoTexture},
            u_resolution: {type: "v2", value: new THREE.Vector2(this._outputCanvasElement.width, this._outputCanvasElement.height)},
            u_texsize   : {type: "v2", value: new THREE.Vector2(this._inputVideoElement.width, this._inputVideoElement.height)}
        }
        const meterial = new THREE.ShaderMaterial({
            fragmentShader : fShader.glslCode,
            vertexShader : vShader.glslCode,
            uniforms: uniforms

        });
    
        this._threeGeometry = new THREE.Mesh( geometry, meterial);

        this._threeScene.background = new THREE.Color( 0x0000ff );
        this._threeScene.add(this._threeGeometry);
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
        this._stream = stream;
        this._maskFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;
        const firstVideoTrack = this._stream.getVideoTracks()[0];
        const { height, frameRate, width }
            = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();

        this._inputVideoElement.width = parseInt(width, 10);
        this._inputVideoElement.height = parseInt(height, 10);
        this._inputVideoElement.hidden = true;
        this._inputVideoElement.muted = true;
        this._inputVideoElement.playsInline = true;
        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = this._stream;
        this._inputVideoElement.onloadeddata = () => {
            this._maskFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 30
            });
        };

        this.setupWebGLScene(this._inputVideoElement, this._outputCanvasElement)
        
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
