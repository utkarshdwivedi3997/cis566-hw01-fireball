#version 300 es
precision highp float;

in vec2 fs_Pos;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

void main()
{
        // Compute final shaded color
        out_Col = vec4(1.0,0.0,0.0,1.0);
}
