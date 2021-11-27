// @flow

import {
    CLEAR_TIMEOUT,
    TIMEOUT_TICK,
    SET_TIMEOUT,
    timerWorkerScript
} from '../virtual-background/TimerWorker';
import * as fShader from './shaders/frag'
import * as vShader from './shaders/vertex'

import * as THREE from 'three';
import { Scene } from 'three';

/**
 * Represents a modified MediaStream that adds effects to video background.
 * <tt>JitsiStreamBackgroundEffect</tt> does the processing of the original
 * video stream.
 */
export default class ShaderEffect {
    _options: Object;
    _stream: Object;
    _inputVideoElement: HTMLVideoElement;
    _onRenderFrameTimer: Function;
    _renderFrameTimerWorker: Worker;
    _outputCanvasElement: HTMLCanvasElement;
    _outputCanvasCtx: Object;
    isEnabled: Function;
    startEffect: Function;
    stopEffect: Function;
    _threeScene: THREE.Scene;
    _threeCamera: THREE.Camera;
    _threeRenderer: THREE.WebGLRenderer;
    _threeGeometry: THREE.Mesh;
    _material: THREE.ShaderMaterial;
    _videoTexture: THREE.VideoTexture;

    /**
     * Represents a modified video MediaStream track.
     *
     * @class
     * @param {Object} options - Shader Effect Options.
     */
    constructor(options: Object) {
        this._options = options;

        // Bind event handlefdr so it is only bound once for every instance.
        this._onRenderFrameTimer = this._onRenderFrameTimer.bind(this);

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
    _onRenderFrameTimer(response: Object) {
        if (response.data.id === TIMEOUT_TICK) {
            this._renderScene();
        }
    }

    _resizeElements(){
        const firstVideoTrack = this._stream.getVideoTracks()[0];
        const { height, frameRate, width }
            = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();
        let changed = false;
        if (parseInt(width, 10) != this._inputVideoElement.width || 
        parseInt(height, 10) != this._inputVideoElement.height ) {
            changed = true;
            console.log("changed???::" +changed)
            this._inputVideoElement.width = parseInt(width, 10);
            this._inputVideoElement.height = parseInt(height, 10);

            this._outputCanvasElement.width = parseInt(width, 10);
            this._outputCanvasElement.height = parseInt(height, 10);
        }
        return {height, frameRate, width, changed}
    }

    _resizeScene() {
        const {height, frameRate, width, changed} = this._resizeElements();

        if (changed) {
            console.log("SHADING_LANG_VER::" +this._threeRenderer.getContext().SHADING_LANGUAGE_VERSION)
            let rendererSize = {height: this._inputVideoElement.height/3, width: this._inputVideoElement.width/3}
            this._threeRenderer.setSize( rendererSize.width, rendererSize.height );
            this._threeRenderer.setClearColor( 0x0000ff, 0);
        
            // const uniforms = {
            //     u_texture   : {type: "t", value: this._videoTexture},
            //     u_resolution: {type: "v2", value: new THREE.Vector2(this._outputCanvasElement.width, this._outputCanvasElement.height)},
            //     u_texsize   : {type: "v2", value: new THREE.Vector2(this._inputVideoElement.width, this._inputVideoElement.height)}
            // };
            // this._meterial.setValues({uniforms: uniforms });
        }
    }

    /**
     * Render WebGL Scene
     *
     * @returns {void}
     */
    _renderScene(){
        // this._resizeScene();
        this._threeRenderer.render(this._threeScene, this._threeCamera);
        this._renderFrameTimerWorker.postMessage({
            id: SET_TIMEOUT,
            timeMs: 1000 / 30
        });
    }
    
    setupWebGLScene() {
        this._threeScene = new THREE.Scene();
        this._threeCamera = new THREE.OrthographicCamera();
        this._threeCamera.position.z = 1;
        
        this._threeRenderer = new THREE.WebGLRenderer( { canvas: this._outputCanvasElement } );
        this._videoTexture = new THREE.VideoTexture(this._inputVideoElement);
        this._resizeScene();
        const uniforms = {
            u_texture   : {type: "t", value: this._videoTexture},
            u_resolution: {type: "v2", value: new THREE.Vector2(this._outputCanvasElement.width, this._outputCanvasElement.height)},
            u_texsize   : {type: "v2", value: new THREE.Vector2(this._inputVideoElement.width, this._inputVideoElement.height)}
        }
        
        this._meterial = new THREE.ShaderMaterial({
            fragmentShader : fShader.glslCode,
            vertexShader : vShader.glslCode,
            uniforms: uniforms
        });
        const geometry = new THREE.PlaneGeometry(2.0,2.0);
        this._inputVideoElement.play();
        this._threeGeometry = new THREE.Mesh( geometry, this._meterial);
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
        this._renderFrameTimerWorker = new Worker(timerWorkerScript, { name: 'Blur effect worker' });
        this._renderFrameTimerWorker.onmessage = this._onRenderFrameTimer;

        const { height, frameRate, width, changed } = this._resizeElements();
        this._inputVideoElement.hidden = true;
        this._inputVideoElement.muted = true;
        this._inputVideoElement.playsInline = true;
        this._inputVideoElement.autoplay = true;
        this._inputVideoElement.srcObject = this._stream;
        this._inputVideoElement.onloadeddata = () => {
            this._renderFrameTimerWorker.postMessage({
                id: SET_TIMEOUT,
                timeMs: 1000 / 30
            });
        };

        this.setupWebGLScene()
        // console.log(new Error("StartEffect").stack);
        return this._outputCanvasElement.captureStream(parseInt(frameRate, 10));
    }

    
    /**
     * Stops the capture and render loop.
     *
     * @returns {void}
     */
    stopEffect() {
        this._renderFrameTimerWorker.postMessage({
            id: CLEAR_TIMEOUT
        });
        this._inputVideoElement.pause()
        this._inputVideoElement.remove()
        this._outputCanvasElement.remove()
        console.log(new Error("StopEffect").stack);
        this._renderFrameTimerWorker.terminate();
    }
}
