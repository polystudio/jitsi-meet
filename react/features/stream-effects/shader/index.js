// @flow

import { showWarningNotification } from '../../notifications/actions';
import { timeout } from '../../virtual-background/functions';
import logger from '../../virtual-background/logger';
import ShaderEffect from './ShaderEffect';


/**
 * Creates a new instance of JitsiStreamBackgroundEffect. This loads the Meet background model that is used to
 * extract person segmentation.
 *
 * @param {Object} virtualBackground - The virtual object that contains the background image source and
 * the isVirtualBackground flag that indicates if virtual image is activated.
 * @param {Function} dispatch - The Redux dispatch function.
 * @returns {Promise<JitsiStreamBackgroundEffect>}
 */
export async function createShaderEffect(virtualBackground: Object, dispatch: Function) {
    if (!MediaStreamTrack.prototype.getSettings && !MediaStreamTrack.prototype.getConstraints) {
        throw new Error('Shader Effect not supported!');
    }
    const options = {
        virtualBackground
    };
    return  new ShaderEffect(options);
}
