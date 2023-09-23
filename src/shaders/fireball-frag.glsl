#version 300 es

precision highp float;

uniform vec4 u_Color; // The color with which to render this instance of geometry.

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_Col;
in vec4 fs_Pos;

uniform float u_Time;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

in float fs_fbm;
in float fs_perlin;

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
    // Material base color (before shading)
    vec3 yellow = vec3(1.0,1.0,0.0);
    vec3 red = vec3(1.0,0.0,0.0);
    vec3 black = vec3(0.0);

    float noise2 = abs(perlinNoise3D(vec3(fs_Pos) * 5.0));
    float noise3 = perlinNoise3D(vec3(fs_Pos * 5.0) * 1.0);
    float lavaNoise = fbm(vec3(fs_Pos * 4.0), 1.0, 2.0) * 0.5;
    lavaNoise = smoothstep(0.2, 0.7, (perlinNoise3D(vec3(fs_Pos + lavaNoise + u_Time * 0.001) * 3.0) + 1.0) * 0.5);
    float fbm = 1.0 - abs(fbm(vec3(fs_Pos + noise2) * 3.0, 2.0, 1.0) * 0.3);

    vec4 rockCol = vec4(mix(red, black, fbm), 1.0);
    vec4 lavaCol = vec4(mix(red, yellow, lavaNoise), 1.0); //vec4(u_Color.r * noise, u_Color.g * noise2, u_Color.b * noise3, 1.0);

    float rock = smoothstep(0.9, 0.99, fs_fbm);
    float lava = 1.0 - rock;    // whatever is not rock is lava

    out_Col = rock * rockCol;

    out_Col += lava * lavaCol; 
    // out_Col = vec4(vec3(1.0), step((fract(u_Time * 0.01)) * 0.5,perlinNoise3D(vec3(fs_Pos))));
}