#version 300 es

precision highp float;

uniform vec4 u_Color; // The color with which to render this instance of geometry.

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_Col;
in vec4 fs_Pos;
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
    // This has to be UV based because we "twist" the vertices in the vert shader
    // So doing this on world space positions wouldn't twist the texture
    float worl = WorleyNoise(fs_UV / vec2(1.0, 20.0));

    float alpha = smoothstep(0.6, 0.99, worl);

    float cutoff = smoothstep(1.0, 0.9, fs_UV.y); 
    alpha = mix(0.0, alpha, cutoff);    // remove the buggy top and bottom areas that are all white

    vec3 red = vec3(1.0,0.5,0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.0);
    vec3 white = vec3(1.0);

    float alphaCutoff = easeInOutQuad(1.0 - u_Speed);
    if (alpha <= alphaCutoff)
    {
        discard;
    }

    vec3 outCol1 = mix(red, white, alpha);  // gradient between red and white for slower speeds
    vec3 outCol2 = mix(yellow, red, smoothstep(1.0, -1.0, fs_Pos.y));  // gradient between yellow and red based on y pos
    vec3 outCol3 = mix(outCol2, white, alpha);  // gradient between the above gradient and white for higher speeds

    out_Col = vec4(mix(outCol1, outCol3, u_Speed), 1.0);
}