import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Cube extends Drawable
{
    indices: Uint32Array;
    positions: Float32Array;
    normals: Float32Array;
    center: vec4;

    constructor(center: vec3)
    {
        super();
        this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    }

    create(): void 
    {
        this.positions = new Float32Array([// Front face
                                           -1, -1, -1, 1,
                                           1, -1, -1, 1,
                                           1, 1, -1, 1,
                                           -1, 1, -1, 1,
                                           // Right face
                                           1, -1, -1, 1,
                                           1, -1, 1, 1,
                                           1, 1, 1, 1,
                                           1, 1, -1 ,1,
                                           // Back face
                                           1, -1, 1, 1,
                                           -1, -1, 1, 1,
                                           -1, 1, 1, 1,
                                           1, 1, 1, 1,
                                           // Left face
                                           -1, -1, 1, 1,
                                           -1, -1, -1, 1,
                                           -1, 1, -1, 1,
                                           -1, 1, 1, 1,
                                           // Top face
                                           -1, 1, -1, 1,
                                           1, 1, -1, 1,
                                           1, 1, 1, 1,
                                           -1, 1, 1, 1,
                                           // Bottom face
                                           -1, -1, 1, 1,
                                           1, -1, 1, 1,
                                           1, -1, -1, 1,
                                           -1, -1, -1, 1]);
        
        this.normals = new Float32Array(// Front face
                                        [0, 0, 1, 0,
                                         0, 0, 1, 0,
                                         0, 0, 1, 0,
                                         0, 0, 1, 0,
                                        // Right face
                                         1, 0, 0, 0,
                                         1, 0, 0, 0,
                                         1, 0, 0, 0,
                                         1, 0, 0, 0,
                                        // Back face
                                         0, 0, -1, 0,
                                         0, 0, -1, 0,
                                         0, 0, -1, 0,
                                         0, 0, -1, 0,
                                        // Left face
                                         -1, 0, 0, 0,
                                         -1, 0, 0, 0,
                                         -1, 0, 0, 0,
                                         -1, 0, 0, 0,
                                        // Top face
                                         0, 1, 0, 0,
                                         0, 1, 0, 0,
                                         0, 1, 0, 0,
                                         0, 1, 0, 0,
                                        // Bottom face
                                         0, -1, 0, 0,
                                         0, -1, 0, 0,
                                         0, -1, 0, 0,
                                         0, -1, 0, 0]);

        this.indices = new Uint32Array(36);
        let idx: number = 0;
        for (let faceIdx = 0; faceIdx<6; faceIdx++)
        {
            this.indices[idx++] = faceIdx*4;
            this.indices[idx++] = faceIdx*4 + 1;
            this.indices[idx++] = faceIdx*4 + 2;
            this.indices[idx++] = faceIdx*4;
            this.indices[idx++] = faceIdx*4 + 2;
            this.indices[idx++] = faceIdx*4 + 3;

        }

        console.log(this.indices);

        this.generateIdx();
        this.generatePos();
        this.generateNor();

        this.count = 36;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

        console.log("Created cube");
    }
};

export default Cube;