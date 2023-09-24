#version 300 es
precision highp float;

in vec2 fs_UV;

uniform float u_Time;
uniform float u_Speed;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

/* =============== NOISE FUNCTIONS ================= */
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

void main()
{
    vec2 coord = gl_FragCoord.xy;
    coord.y -= u_Time * 10.0 * u_Speed;  // move based on speed

    vec2 scale = vec2(50.0, 10000.0); // big scale
    scale = mix(vec2(1000.0, 1000.0), scale, u_Speed);
    
    float worl = WorleyNoise(coord / scale);

    float dots = smoothstep(0.05, 0.000, worl);
    float glow = smoothstep(0.1, 0.05, worl);

    float which = mix(dots, glow, worl);

    vec3 col = vec3(1.0,0.0,0.0) * dots;
    col = mix(vec3(0.0,1.0,0.0) * glow, col, which);
    col = mix(vec3(0.0), col, u_Speed);

    // Compute final shaded color
    out_Col = vec4(col,1.0);
}
