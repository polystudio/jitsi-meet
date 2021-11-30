// @flow

import { createShaderEffect } from '../../stream-effects/shader';
import { createVirtualBackgroundEffect } from '../../stream-effects/virtual-background';
import { Platform } from '../../base/react';
import logger from './logger';

/**
 * Loads the enabled stream effects.
 *
 * @param {Object} store - The Redux store.
 * @returns {Promsie} - A Promise which resolves when all effects are created.
 */
export default function loadEffects(store: Object): Promise<any> {
    const state = store.getState();
    const virtualBackground = state['features/virtual-background'];
    
    let effectPromise = null;
    console.log("loadEffects::");
    console.log(virtualBackground);
    if ( virtualBackground.selectedThumbnail=="cartoon-image" ) {
        effectPromise = createShaderEffect(virtualBackground)
            .catch(error => {
                logger.error('Failed to obtain the background effect instance with error: ', error);
                return Promise.resolve();
            });
    }else if ( Platform.OS == 'ios') {
        effectPromise = Promise.resolve();
    }else if (virtualBackground.backgroundEffectEnabled) {
        effectPromise =  createVirtualBackgroundEffect(virtualBackground)
            .catch(error => {
                logger.error('Failed to obtain the shader effect instance with error: ', error);

                return Promise.resolve();
            });
    } else { effectPromise = Promise.resolve();}
    return Promise.all([ effectPromise ]);
}
