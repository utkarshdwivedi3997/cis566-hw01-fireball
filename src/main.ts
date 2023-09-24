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

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  baseTesselations: 5,
  outerRimTesselations: 4,
  'Load Scene': loadScene, // A function pointer, essentially
  Color: [255,255,255,1]  // default Red color
};

function setupGui()
{
  const gui = new DAT.GUI();
  gui.add(controls, 'baseTesselations', 0, 8).step(1);
  gui.add(controls, 'outerRimTesselations', 0, 7).step(1);
  gui.add(controls, 'Load Scene');
  gui.addColor(controls, 'Color');
}

let fireballBase: Icosphere;
let outerRim: Icosphere;

let square: Square;
let cube: Cube;
let prevBaseTesselations: number = 7;
let prevOuterRimTesselations: number = 5;
let time = 0;

/* ============= SHADERS ============= */


function loadScene() {
  fireballBase = new Icosphere(vec3.fromValues(0, 0, 0), FIREBALL_BASE_SCALE, controls.baseTesselations);
  fireballBase.create();

  outerRim = new Icosphere(vec3.fromValues(0,0,0), OUTER_RIM_SCALE, controls.outerRimTesselations);
  outerRim.create();
  
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  cube = new Cube(vec3.fromValues(0, 5, 0));
  cube.create();
  time = 0;
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

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.frontFace(gl.CW);   // I think the faces in the icosphere are set with clockwise indices. Not sure, but this makes the inverted-hulling work for me
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);    // Optimization, but also needed for inverted-hull
  
  // Enable transparency
  // Better to use "dithered" transparency instead. Simply discard unwanted pixels in the shader
  // Discarding will need depth testing
  // gl.enable(gl.BLEND);
  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const {lambert, customShader, fireballShader, rimShader} = setupShaders(gl);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    handleInput();

    let color = vec4.fromValues(controls.Color[0] / 255.0, controls.Color[1] / 255.0, controls.Color[2] / 255.0, controls.Color[3])
    
    rimShader.setTime(time);
    fireballShader.setTime(time);
    time++;

    // Enable frontface culling: for rim outlining
    gl.cullFace(gl.FRONT);

    renderer.render(camera,
      [ outerRim ],
      [ rimShader ], 
      color = color);

    // Enable backface culling: for drawing base fireball
    gl.cullFace(gl.BACK);

    renderer.render(camera,
      [ fireballBase ],
      [ fireballShader ], 
      color = color);

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
