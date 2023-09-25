var CameraControls = require('3d-view-controls');
import {vec3, mat4} from 'gl-matrix';

class Camera {
  controls: any;
  projectionMatrix: mat4 = mat4.create();
  viewMatrix: mat4 = mat4.create();
  fovy: number = 45;
  aspectRatio: number = 1;
  near: number = 0.1;
  far: number = 1000;
  position: vec3 = vec3.create();
  direction: vec3 = vec3.create();
  target: vec3 = vec3.create();
  up: vec3 = vec3.create();

  constructor(position: vec3, target: vec3) {
    this.controls = CameraControls(document.getElementById('canvas'), {
      eye: position,
      center: target,
    });
    this.position = position;
  }

  setAspectRatio(aspectRatio: number) {
    this.aspectRatio = aspectRatio;
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fovy, this.aspectRatio, this.near, this.far);
  }

  setPosition(position: vec3)
  {
    // Calculate the offset between the new camera position and the current camera position.
    const offset = vec3.fromValues(position[0] - this.position[0], position[1] - this.position[1],  position[2] - this.position[2]);

    this.controls.pan(offset[0], offset[1], offset[2]);
    this.position = position;
  }

  update(shakeNoise: vec3) {
    this.controls.tick();
    vec3.add(this.target, this.position, this.direction);
    const actualEye = vec3.create();
    vec3.subtract(actualEye, this.controls.eye, shakeNoise);
    mat4.lookAt(this.viewMatrix, actualEye , this.controls.center, this.controls.up);
  }
};

export default Camera;
