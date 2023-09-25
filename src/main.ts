import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// consts
const FIREBALL_BASE_SCALE = 1.0;
const OUTER_RIM_SCALE = 1.3;
const OUTER_VORTEX_SCALE = 1.32;

const CAMERA_SLOW_POS = vec3.fromValues(0,0,3);
const CAMERA_FAST_POS = vec3.fromValues(0,0,7);
const AUTO_SPEEDUP_TIMER = 1000.0;
const AUTO_SPEEDUP_DURATION = 2000.0;
const AUTO_SPEEDDOWN_TIMER = 1000.0;
const AUTO_SPEEDDOWN_DURATION = 100.0;

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  speed: 0.0,
  baseTesselations: 5,
  showOuterRim: true,
  outerRimTesselations: 4,
  showOuterVortex: true,
  'Load Scene': loadScene, // A function pointer, essentially
  primaryColor: [255,0,0,1],  // default Red color
  secondaryColor: [255,255,0,1], // default Yellow color
  cameraShakeIntensity: 0.2
};

function setupGui()
{
  const gui = new DAT.GUI();
  gui.add(controls, 'speed', 0.0, 1.0).name("Fireball Speed").onChange(resetTimer);
  gui.add(controls, 'baseTesselations', 0, 8).step(1).name("Base Fireball Detail").onChange(resetTimer);
  gui.add(controls, 'showOuterRim', "Show Outer Trail").onChange(resetTimer);
  gui.add(controls, 'outerRimTesselations', 0, 5).step(1).name("Outer Rim Detail").onChange(resetTimer);
  gui.add(controls, 'showOuterVortex', "Show Outer Vortex").onChange(resetTimer);
  gui.add(controls, 'cameraShakeIntensity', 0.0, 1.0).name("Camera Shake Intensity").onChange(resetTimer);
  gui.addColor(controls, 'primaryColor').name("Primary Color").onChange(resetTimer);
  gui.addColor(controls, 'secondaryColor').name("Secondary Color").onChange(resetTimer);
  gui.add(controls, 'Load Scene').onChange(resetTimer);
}

let fireballBase: Icosphere;
let outerRim: Icosphere;
let outerVortex: Icosphere;

let square: Square;
let cube: Cube;
let prevBaseTesselations: number = 5;
let prevOuterRimTesselations: number = 4;
let time = 0;
let timeSinceUserChangedSpeed = 0;
let timeSinceSpeedLerpStarted = 0;
let speedingUp = true;

/* ============= MAIN CODE ============= */


function mix(a: vec3, b: vec3, t: number)
{
  return vec3.fromValues(a[0]*t + (1.0 - t) * b[0], a[1]*t + (1.0-t)*b[1], a[2]*t + (1.0-t)*b[2]);
}

function smoothstep (edge0: number, edge1: number, t: number) {
  t = Math.min(Math.max((t - edge0) / (edge1 - edge0), 0.0), 1.0);
    return t * t * (3.0 - 2.0 * t);
};

function loadScene() {
  fireballBase = new Icosphere(vec3.fromValues(0, 0, 0), FIREBALL_BASE_SCALE, controls.baseTesselations);
  fireballBase.create();

  outerRim = new Icosphere(vec3.fromValues(0,0,0), OUTER_RIM_SCALE, controls.outerRimTesselations);
  outerRim.create();

  outerVortex = new Icosphere(vec3.fromValues(0,0,0), OUTER_VORTEX_SCALE, 5);
  outerVortex.create();

  square = new Square(vec3.fromValues(0, 0, -5));
  square.create();
  // cube = new Cube(vec3.fromValues(0, 5, 0));
  // cube.create();
  time = 0;
  timeSinceUserChangedSpeed = 0;
}

function resetTimer()
{
  timeSinceUserChangedSpeed = 0;
  timeSinceSpeedLerpStarted = 0;

  speedingUp = controls.speed > 0.5? false : true;
}

function setupShaders(gl: WebGL2RenderingContext)
{
  return {
    lambert: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
    ]),

    customShader: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/custom-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/custom-frag.glsl')),
    ]),

    fireballShader: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/fireball-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/fireball-frag.glsl')),
    ]),

    rimShader: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/rim-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/rim-frag.glsl')),
    ]),

    vortexShader: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/vortex-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/vortex-frag.glsl')),
    ]),

    backgroundShader: new ShaderProgram([
      new Shader(gl.VERTEX_SHADER, require('./shaders/background-vert.glsl')),
      new Shader(gl.FRAGMENT_SHADER, require('./shaders/background-frag.glsl')),
    ]),
  };
}

function handleInput()
{
  if(controls.baseTesselations != prevBaseTesselations)
  {
    prevBaseTesselations = controls.baseTesselations;
    fireballBase = new Icosphere(vec3.fromValues(0, 0, 0), FIREBALL_BASE_SCALE, prevBaseTesselations);
    fireballBase.create();
  }

  if (controls.outerRimTesselations != prevOuterRimTesselations)
  {
    prevOuterRimTesselations = controls.outerRimTesselations;
    outerRim = new Icosphere(vec3.fromValues(0,0,0), OUTER_RIM_SCALE, prevOuterRimTesselations);
    outerRim.create();
  }
}

function getColor(colorArr: number[])
{
  return vec4.fromValues(colorArr[0] / 255.0, colorArr[1] / 255.0, colorArr[2] / 255.0, colorArr[3]);
}

function getShakePos(camPos: vec3)
{
  let shake: vec3 = vec3.fromValues(
    (Math.random() * controls.cameraShakeIntensity * controls.speed * 0.5),
    (Math.random() * controls.cameraShakeIntensity * controls.speed * 0.5),
    (Math.random() * controls.cameraShakeIntensity * controls.speed * 0.5)
  );

  camPos[0] += shake[0];
  camPos[1] += shake[1];
  camPos[2] += shake[2];

  return {camPos, shake};
}

// Sourced from www.easings.net
function easeInOutExpo(x: number): number {
  return x === 0
    ? 0
    : x === 1
    ? 1
    : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2
    : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

function checkAndLerpSpeed()
{
  let timer = speedingUp ? AUTO_SPEEDUP_TIMER : AUTO_SPEEDDOWN_TIMER;
  let duration = speedingUp ? AUTO_SPEEDUP_DURATION : AUTO_SPEEDDOWN_DURATION;

  if (timeSinceUserChangedSpeed > timer)
  {
    if (timeSinceSpeedLerpStarted <= duration)
    {
      timeSinceSpeedLerpStarted++;
      let percentageComplete = timeSinceSpeedLerpStarted / duration;
      percentageComplete = easeInOutExpo(percentageComplete);
      controls.speed = speedingUp ? percentageComplete : 1.0 - percentageComplete;

      if (percentageComplete >= 1.0)
      {
        speedingUp = !speedingUp;
        timeSinceSpeedLerpStarted = 0;
        timeSinceUserChangedSpeed = 0;
      }
    }
  }
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  setupGui();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(CAMERA_SLOW_POS, vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.frontFace(gl.CW);   // I think the faces in the icosphere are set with clockwise indices. Not sure, but this makes the inverted-hulling work for me
  gl.enable(gl.CULL_FACE);    // Optimization, but also needed for inverted-hull

  const {lambert, customShader, fireballShader, rimShader, vortexShader, backgroundShader} = setupShaders(gl);
  let primaryColor: vec4;
  let secondaryColor: vec4;

  // This function will be called every frame
  function tick() {
    // If the speed has changed, zoom the camera in / out
    const pos = mix(CAMERA_SLOW_POS, CAMERA_FAST_POS, 1.0 - controls.speed);
    let {camPos, shake} = getShakePos(pos);
    // camPos = mix(pos, camPos, controls.speed);
    camera.setPosition(camPos);

    camera.update(shake);

    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    handleInput();
    
    primaryColor = getColor(controls.primaryColor);
    secondaryColor = getColor(controls.secondaryColor);

    rimShader.setColor1(primaryColor);
    rimShader.setColor2(secondaryColor);
    fireballShader.setColor1(primaryColor);
    fireballShader.setColor2(secondaryColor);
    vortexShader.setColor1(primaryColor);
    vortexShader.setColor2(secondaryColor);
    backgroundShader.setColor1(primaryColor);
    backgroundShader.setColor2(secondaryColor);

    rimShader.setTime(time);
    fireballShader.setTime(time);
    vortexShader.setTime(time);
    backgroundShader.setTime(time);
    backgroundShader.setDimensions([window.innerWidth, window.innerHeight]);
    time++;
    timeSinceUserChangedSpeed++;
    checkAndLerpSpeed();
    rimShader.setSpeed(controls.speed);
    fireballShader.setSpeed(controls.speed);
    vortexShader.setSpeed(controls.speed);
    backgroundShader.setSpeed(controls.speed);
    
    // Render background quad
    gl.disable(gl.DEPTH_TEST);
    renderer.render(camera,
      [ square ],
      [ backgroundShader ]);
    gl.enable(gl.DEPTH_TEST);

    if (controls.showOuterRim)
    {
      // Enable frontface culling: for rim outlining
      gl.cullFace(gl.FRONT);

      renderer.render(camera,
        [ outerRim ],
        [ rimShader ]);
    }

    // Enable backface culling: for drawing base fireball
    gl.cullFace(gl.BACK);

    if (controls.showOuterVortex)
    {
      renderer.render(camera,
        [ outerVortex ],
        [ vortexShader ]);
    }

    renderer.render(camera,
      [ fireballBase ],
      [ fireballShader ]);

    stats.end();
    
    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
