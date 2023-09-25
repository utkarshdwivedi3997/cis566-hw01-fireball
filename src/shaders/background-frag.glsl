#version 300 es
precision highp float;

in vec2 fs_UV;

uniform float u_Time;
uniform float u_Speed;
uniform vec2 u_Dimensions;
uniform vec4 u_Color1;
uniform vec4 u_Color2;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

/* =============== NOISE FUNCTIONS ================= */
// FBM

float noise3D(vec3 p)
{
        return fract(sin(dot(p, vec3(127.1,269.5, 191.2))) *
                     43758.5453);
}

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

// Worley

vec2 random2(vec2 p)
{
    return fract(sin(vec2(dot(p, vec2(127.1f, 311.7f)),
                 dot(p, vec2(269.5f,183.3f))))
                 * 43758.5453f);
}

float WorleyNoise(vec2 uv)
{
    uv *= 10.0; // Now the space is 10x10 instead of 1x1. Change this to any number you want.
    vec2 uvInt = floor(uv);
    vec2 uvFract = fract(uv);
    float minDist = 1.0; // Minimum distance initialized to max.
    for(int y = -1; y <= 1; ++y) {
        for(int x = -1; x <= 1; ++x) {
            vec2 neighbor = vec2(float(x), float(y)); // Direction in which neighbor cell lies
            vec2 point = random2(uvInt + neighbor); // Get the Voronoi centerpoint for the neighboring cell
            vec2 diff = neighbor + point - uvFract; // Distance between fragment coord and neighbor’s Voronoi point
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }
    return minDist;
}

/* ================= EASING FUNCTIONS ================= */
float easeInOutQuad(float x)
{
    return x < 0.5 ? 2.0 * x * x : 1.0 - pow(-2.0 * x + 2.0, 2.0) * 0.5;
}

float easeInOutCubic(float x)
{
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) * 0.5;
}
/* ================= MAIN SHADER CODE ================= */

vec3 getMotionLinesColor(vec2 uv, float depth)
{
    vec2 coord = uv.xy;
    coord.y -= u_Time * 0.1 * (u_Speed + 0.001);  // move based on speed

    float yScale = mix(1.0, 50.0, easeInOutQuad(u_Speed));
    vec2 scale = vec2(1.0, yScale);

    float worl = WorleyNoise(coord / scale * depth * 0.3);

    return vec3(smoothstep(0.0, 0.7, 0.007 / worl));
}

vec3 getObscuringClouds(vec2 uv, float depth)
{
    float fbm = fbm(vec3(uv, depth), 1.0, 4.0);
    return vec3(fbm);
}

void main()
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_Dimensions.xy) / u_Dimensions.y;
    float MAX_ITERS = 4.0;
    vec3 motionLines = vec3(0.0);
    vec3 obscuringClouds = vec3(0.0);
    for (float i=0.0; i<MAX_ITERS; i++)
    {
        // fake parallaxing of motion lines from stars
        motionLines += getMotionLinesColor(uv * i, i) * i * 0.3;
        obscuringClouds += pow(getObscuringClouds(uv * 1.0,  u_Time * (u_Speed+ 0.001) * 0.005), vec3(7.0));
    }

    // obscuringClouds = getObscuringClouds(uv * 3.0, 2.0);
    motionLines = min(motionLines, vec3(1.0));
    // vec3 overallCol = min(motionLines / obscuringClouds, vec3(1.0));
    vec3 overallCol = mix(motionLines * 0.5, vec3(0.0), 1.0 - obscuringClouds);

    float t = smoothstep(-0.5,0.5,uv.y);
    overallCol *= mix(vec3(1.0) - vec3(u_Color1), vec3(1.0) - vec3(u_Color2), t);

    // Compute final shaded color
    out_Col = vec4(overallCol,1.0);
}
