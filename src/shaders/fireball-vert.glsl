#version 300 es

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.
uniform float u_Time;

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.
out vec4 fs_Pos;
out float fs_fbm;
out float fs_perlin;

const vec4 lightPos = vec4(5, 5, 3, 1); //The position of our virtual light, which is used to compute the shading of
                                        //the geometry in the fragment shader.
out vec4 fs_LightVec;       // The direction in which our virtual light lies, relative to each vertex. This is implicitly passed to the fragment shader.

/* =============== NOISE FUNCTIONS ================= */

float noise3D(vec3 p)
{
        return fract(sin(dot(p, vec3(127.1,269.5, 191.2))) *
                     43758.5453);
}

vec3 random3(vec3 p)
{
    return fract(sin(vec3(dot(p,vec3(127.1f, 311.7f, 191.999f)),
                        dot(p, vec3(269.5f, 183.3f, 191.999f)),
                        dot(p, vec3(420.6f, 631.2f, 191.999f))))
                                * 43758.5453f);
}

float surflet3D(vec3 p, vec3 gridPoint)
{
    // Compute the distance between p and the grid point along each axis, and warp it with a
    // quintic function so we can smooth our cells
    vec3 t2 = abs(p - gridPoint);
    vec3 t = vec3(1.f) - 6.f * pow(t2, vec3(5.0f)) + 15.f * pow(t2, vec3(4.f)) - 10.f * pow(t2, vec3(3.f));
    // Get the random vector for the grid point (assume we wrote a function random2
    // that returns a vec2 in the range [0, 1])
    vec3 gradient = normalize(random3(gridPoint) * 2.f - vec3(1.f));
    // Get the vector from the grid point to P
    vec3 diff = p - gridPoint;
    // Get the value of our height field by dotting grid->P with our gradient
    float height = dot(diff, gradient);
    // Scale our height field (i.e. reduce it) by our polynomial falloff function
    return height * t.x * t.y * t.z;
}

float perlinNoise3D(vec3 p)
{
    float surfletSum = 0.f;
    // Iterate over the four integer corners surrounding uv
    for(int dx = 0; dx <= 1; ++dx) {
        for(int dy = 0; dy <= 1; ++dy) {
            for(int dz = 0; dz <= 1; ++dz) {
                surfletSum += surflet3D(p, floor(p) + vec3(dx, dy, dz));
            }
        }
    }
    return surfletSum;
}

// FBM

float interpNoise3D(float x, float y, float z)
{
    int intX = int(floor(x));
    float fractX = fract(x);
    int intY = int(floor(y));
    float fractY = fract(y);
    int intZ = int(floor(z));
    float fractZ = fract(z);

    // 4 points on Z1 depth
    float v1 = noise3D(vec3(intX, intY, intZ));
    float v2 = noise3D(vec3(intX + 1, intY, intZ));

    float v3 = noise3D(vec3(intX, intY + 1, intZ));
    float v4 = noise3D(vec3(intX + 1, intY + 1, intZ));

    // Bilinear on Z1 depth
    float i1 = mix(v1, v2, fractX);
    float i2 = mix(v3, v4, fractX);
    float iz1 = mix(i1, i2, fractY);

    // 4 points on Z2 depth
    float v5 = noise3D(vec3(intX, intY, intZ + 1));
    float v6 = noise3D(vec3(intX + 1, intY, intZ + 1));

    float v7 = noise3D(vec3(intX, intY + 1, intZ + 1));
    float v8 = noise3D(vec3(intX + 1, intY + 1, intZ + 1));

    // Bilinear on Z2 depth
    float i3 = mix(v5, v6, fractX);
    float i4 = mix(v7, v8, fractX);
    float iz2 = mix(i3, i4, fractY);

    // Final trilinear
    return mix(iz1, iz2, fractZ);
}

float fbm(vec3 pos, float amp, float freq)
{
    float total = 0.0;
    float persistence = 0.5;
    int octaves = 8;

    for(int i = 1; i <= octaves; i++) {
        total += interpNoise3D(pos.x * freq,
                               pos.y * freq,
                               pos.z * freq) * amp;

        freq *= 2.f;
        amp *= persistence;
    }
    return total;
}

/* ================= MAIN SHADER CODE ================= */

void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation
    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.

    fs_Pos = vs_Pos;
    // Perlin: large scale noise displacement with slow movement
    fs_perlin = perlinNoise3D(vec3(fs_Pos) * 5.0 + u_Time * 0.003) * 0.1;

    // fs_Pos += fs_Nor * perlinNoise3D(vec3(fs_Pos) * 2.0 + u_Time * 0.003) * 0.1;
    // FBM: static "rocks" area. This should never move
    fs_fbm = fbm(vec3(fs_Pos), 1.0, 4.0);
    fs_Pos += fs_Nor * fs_fbm * 0.2;

    float movingArea = 1.0 - fs_fbm;
    float shouldMove = smoothstep(0.05, 0.15, movingArea);      // where the lava should move, affected by fine fbm + bigger perlin
    fs_Pos -= fs_Nor * shouldMove * fs_perlin;

    vec4 modelposition = u_Model * fs_Pos;   // Temporarily store the transformed vertex positions for use below

    fs_LightVec = fs_Pos - lightPos;
    gl_Position = u_ViewProj * modelposition;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
}
