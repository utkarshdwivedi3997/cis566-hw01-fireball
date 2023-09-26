# Procedural Asteroid

## [Live Demo Here](https://utkarshdwivedi3997.github.io/cis566-hw01-fireball/)

This project contains a stylized procedural asteroid created in Typescript and WebGL, using concepts like procedural modeling and texturing using noise functions.

>TODO: Insert GIF of fireball

Just like with any visual project, this asteroid consists of layers upon layers composited together to create the end result. Below is a step by step breakdown of how I achieved this look.

## Breakdown

### 1. Base Asteroid

**Base Shape**

The base shape is a simple icosphere that is deformed using multiple noise functions to make it look uneven and bumpy like an asteroid.

| <img src="img/img1.png" width = 200> |
|:-:|
| Simple Icosphere |

First, Fractal Brownian Motion (FBM) noise is sampled at each vertex location to displace that vertex along its normal, based on the FBM amount. A second layer of perlin noise based displacement is also sampled. They are both combined to get a 

| <img src="img/img2.png" width = 200> | **+** | <img src="img/img3.png" width = 180> |=| <img src="img/img4.png" width = 200>|
|:-:|:-:|:-:|:-:|:-:|
| FBM displaced verts | | Perlin noise displaced verts | | FBM + Perlin displaced verts |

**Adding dynamic motion**

The perlin noise sampling is changed to dynamically move with time, and then added on top of the static FBM noise.


| <img src="img/img2.png" width = 200> | **+** | <img src="img/img6.gif" width = 130> |=| <img src="img/img5.gif" width = 130> |
|:-:|:-:|:-:|:-:|:-:|
| Static FBM displaced verts | | Time perturbed perlin displaced verts | | FBM + dynamic perlin displaced verts |

**Moving magma and static rocks**

I wanted to get a look where it seemed like the asteroid had solid rock elements, and only certain parts would move that would be the "magma" on that asteroid. This was done by only displacing those verts using moving perlin noise that had a "low" sample for FBM.

```
float movingArea = 1.0 - fs_fbm;
float shouldMove = smoothstep(0.05, 0.15, movingArea);
fs_Pos -= fs_Nor * shouldMove * fs_perlin * 1.0;
```

This gave me something that looks like a planet with land and dynamic oceans!

| <img src="img/img7.gif" width=200> |
|:-:|
|FBM + (**NOT** FBM * Time displaced perlin) perturbed verts |


### 2. Outer Rim

### 3. Vortex

### 4. Background

## Objective

Get comfortable with using WebGL and its shaders to generate an interesting 3D, continuous surface using a multi-octave noise algorithm.

## Getting Started

1. Fork and clone [this repository](https://github.com/CIS700-Procedural-Graphics/Project1-Noise).

2. Copy your hw0 code into your local hw1 repository.

3. In the root directory of your project, run `npm install`. This will download all of those dependencies.

4. Do either of the following (but I highly recommend the first one for reasons I will explain later).

    a. Run `npm start` and then go to `localhost:7000` in your web browser

    b. Run `npm run build` and then go open `index.html` in your web browser

    You should hopefully see the framework code with a 3D cube at the center of the screen!


## Developing Your Code
All of the JavaScript code is living inside the `src` directory. The main file that gets executed when you load the page as you may have guessed is `main.js`. Here, you can make any changes you want, import functions from other files, etc. The reason that I highly suggest you build your project with `npm start` is that doing so will start a process that watches for any changes you make to your code. If it detects anything, it'll automagically rebuild your project and then refresh your browser window for you. Wow. That's cool. If you do it the other way, you'll need to run `npm build` and then refresh your page every time you want to test something.

## Publishing Your Code
We highly suggest that you put your code on GitHub. One of the reasons we chose to make this course using JavaScript is that the Web is highly accessible and making your awesome work public and visible can be a huge benefit when you're looking to score a job or internship. To aid you in this process, running `npm run deploy` will automatically build your project and push it to `gh-pages` where it will be visible at `username.github.io/repo-name`.

## Setting up `main.ts`

Alter `main.ts` so that it renders the icosphere provided, rather than the cube you built in hw0. You will be writing a WebGL shader to displace its surface to look like a fireball. You may either rewrite the shader you wrote in hw0, or make a new `ShaderProgram` instance that uses new GLSL files.

## Noise Generation

Across your vertex and fragment shaders, you must implement a variety of functions of the form `h = f(x,y,z)` to displace and color your fireball's surface, where `h` is some floating-point displacement amount.

- Your vertex shader should apply a low-frequency, high-amplitude displacement of your sphere so as to make it less uniformly sphere-like. You might consider using a combination of sinusoidal functions for this purpose.
- Your vertex shader should also apply a higher-frequency, lower-amplitude layer of fractal Brownian motion to apply a finer level of distortion on top of the high-amplitude displacement.
- Your fragment shader should apply a gradient of colors to your fireball's surface, where the fragment color is correlated in some way to the vertex shader's displacement.
- Both the vertex and fragment shaders should alter their output based on a uniform time variable (i.e. they should be animated). You might consider making a constant animation that causes the fireball's surface to roil, or you could make an animation loop in which the fireball repeatedly explodes.
- Across both shaders, you should make use of at least four of the functions discussed in the Toolbox Functions slides.


## Noise Application

View your noise in action by applying it as a displacement on the surface of your icosahedron, giving your icosahedron a bumpy, cloud-like appearance. Simply take the noise value as a height, and offset the vertices along the icosahedron's surface normals. You are, of course, free to alter the way your noise perturbs your icosahedron's surface as you see fit; we are simply recommending an easy way to visualize your noise. You could even apply a couple of different noise functions to perturb your surface to make it even less spherical.

In order to animate the vertex displacement, use time as the third dimension or as some offset to the (x, y, z) input to the noise function. Pass the current time since start of program as a uniform to the shaders.

For both visual impact and debugging help, also apply color to your geometry using the noise value at each point. There are several ways to do this. For example, you might use the noise value to create UV coordinates to read from a texture (say, a simple gradient image), or just compute the color by hand by lerping between values.

## Interactivity

Using dat.GUI, make at least THREE aspects of your demo interactive variables. For example, you could add a slider to adjust the strength or scale of the noise, change the number of noise octaves, etc. 

Add a button that will restore your fireball to some nice-looking (courtesy of your art direction) defaults. :)

## Extra Spice

Choose one of the following options: 

- Background (easy-hard depending on how fancy you get): Add an interesting background or a more complex scene to place your fireball in so it's not floating in a black void
- Custom mesh (easy): Figure out how to import a custom mesh rather than using an icosahedron for a fancy-shaped cloud.
- Mouse interactivity (medium): Find out how to get the current mouse position in your scene and use it to deform your cloud, such that users can deform the cloud with their cursor.
- Music (hard): Figure out a way to use music to drive your noise animation in some way, such that your noise cloud appears to dance.

## Submission

- Update README.md to contain a solid description of your project
- Publish your project to gh-pages. `npm run deploy`. It should now be visible at http://username.github.io/repo-name
- Create a [pull request](https://help.github.com/articles/creating-a-pull-request/) to this repository, and in the comment, include a link to your published project.
- Submit the link to your pull request on Canvas.
