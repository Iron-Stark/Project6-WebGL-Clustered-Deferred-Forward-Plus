import TextureBuffer from './textureBuffer';
import { vec3, vec4 } from "gl-matrix"

export const MAX_LIGHTS_PER_CLUSTER = 100;

export default class BaseRenderer {
  constructor(xSlices, ySlices, zSlices) {
    // Create a texture to store cluster data. Each cluster stores the number of lights followed by the light indices
    this._clusterTexture = new TextureBuffer(xSlices * ySlices * zSlices, MAX_LIGHTS_PER_CLUSTER + 1);
    this._xSlices = xSlices;
    this._ySlices = ySlices;
    this._zSlices = zSlices;
    
    this.nearWidth = 0;
    this.nearHeight = 0;
    this.farWidth = 0;
    this.farHeight = 0;

  }

  updateClusters(camera, viewMatrix, scene) {
    // TODO: Update the cluster texture with the count and indices of the lights in each cluster
      // This will take some time. The math is nontrivial...


      this.nearHeight = 2.0 *  Math.tan(camera.fov * 0.5 * (Math.PI / 180.0)) * camera.near;
      this.nearWidth = 2.0 * camera.aspect *  Math.tan(camera.fov * 0.5 * (Math.PI / 180.0)) * camera.near;

      this.farHeight = 2.0 *  Math.tan(camera.fov * 0.5 * (Math.PI / 180.0)) * camera.far;
      this.farWidth = 2.0 * camera.aspect *  Math.tan(camera.fov * 0.5 * (Math.PI / 180.0)) * camera.far;

    for (let z = 0; z < this._zSlices; ++z) {
      for (let y = 0; y < this._ySlices; ++y) {
        for (let x = 0; x < this._xSlices; ++x) {
          let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
          // Reset the light count to 0 for every cluster
          this._clusterTexture.buffer[this._clusterTexture.bufferIndex(i, 0)] = 0;
        }
      }
    }
    for(let lightIndex = 0; lightIndex < scene.lights.length; lightIndex++) {

        let slicesbounds = { 'left': 0, 'right': 0, 'top': 0, 'bottom': 0, 'close': 0, 'far': 0 };

        let lightPositionArray = scene.lights[lightIndex].position;
        let lightPosVec4 = vec4.fromValues(lightPositionArray[0], lightPositionArray[1], lightPositionArray[2], 1);
        vec4.transformMat4(lightPosVec4, lightPosVec4, viewMatrix);

        let lightPos = vec3.fromValues(lightPosVec4[0], lightPosVec4[1], lightPosVec4[2]);
        let lightRadius = scene.lights[lightIndex].radius;

        let proportion = ( (Math.abs(lightPos[2]) - 1.0 * nearClip)/(1.0 * farClip - 1.0 * nearClip) );

        // Get the slicebounds of the slice of the frustrum that this light lies in
        let sliceWidth = nearWidth * (1-proportion) + farWidth * proportion;
        let sliceHeight = nearHeight * (1-proportion) + farHeight * proportion;

        slicebounds.left  = Math.floor((lightPos[0] - lightRadius + 0.5 * sliceWidth) / (sliceWidth / this._xSlices));
        slicebounds.right = Math.floor((lightPos[0] + lightRadius + 0.5 * sliceWidth) / (sliceWidth / this._xSlices));

        slicebounds.bottom = Math.floor((lightPos[1] - lightRadius + 0.5 * sliceHeight) / (sliceHeight / this._ySlices));
        slicebounds.top    = Math.floor((lightPos[1] + lightRadius + 0.5 * sliceHeight) / (sliceHeight / this._ySlices));

        slicebounds.close = Math.floor((Math.abs(lightPos[2]) - lightRadius - nearClip) / ((farClip - nearClip) / this._zSlices));
        slicebounds.far = Math.floor((Math.abs(lightPos[2]) + lightRadius - nearClip) / ((farClip - nearClip) / this._zSlices));

        slicebounds.left = Math.max(0, Math.min(this._xSlices - 1, slicebounds.left));
        slicebounds.right = Math.max(0, Math.min(this._xSlices - 1, slicebounds.right));

        slicebounds.bottom = Math.max(0, Math.min(this._ySlices - 1, slicebounds.bottom));
        slicebounds.top = Math.max(0, Math.min(this._ySlices - 1, slicebounds.top));

        slicebounds.close = Math.max(0, Math.min(this._zSlices - 1, slicebounds.close));
        slicebounds.far = Math.max(0, Math.min(this._zSlices - 1, slicebounds.far));

        for(let x = slicebounds.left; x <= slicebounds.right; x++) {
            for(let y = slicebounds.bottom; y <= slicebounds.top; y++) {
                for(let z = slicebounds.close; z <= slicebounds.far; z++) {
                    let i = x + y * this._xSlices + z * this._xSlices * this._ySlices;
                    let countIndex = this._clusterTexture.bufferIndex(i, 0);
                    let c = this._clusterTexture.buffer[countIndex] + 1;
                    if (c < MAX_LIGHTS_PER_CLUSTER)
                    {
                        this._clusterTexture.buffer[countIndex] = c;
                        let nextLightIndex = this._clusterTexture.bufferIndex(i, Math.floor(c / 4)) + (c % 4);
                        this._clusterTexture.buffer[nextLightIndex] = lightIndex;
                    }
                }
            }
        }
    }

    this._clusterTexture.update();  
  }
}