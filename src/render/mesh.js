AttribType = {
    POS :    {id:0, glType: "FLOAT", size:3, name:"aPosition", bytes:4},
    NORMAL : {id:1, glType: "FLOAT", size:3, name: "aNormal",  bytes:4} ,
    VERTEX_DYNAMIC_COLOR : {id:2, glType: "FLOAT", size:4, name: "aPrivateColor", bytes:4},
    VERTEX_ID : {id:3, glType: "UNSIGNED_SHORT", size:1, name: "aVertexId", bytes:2},
}
function VertexFormat (typeList)
{
    this.mTypes = typeList;
    this.mStrideSize = 0;
    this.mStrideElementCount = 0;
    this.UpdateFormatMetaData();
}

VertexFormat.prototype = {
    SetFormat : function (typeList)
    {
        this.mTypes = typeList;
        this.UpdateFormatMetaData();
    },

    GetFormat : function () { return this.mTypes; },

    GetElementCount : function() { return this.mStrideElSize; },

    GetByteStride : function () { return this.mStrideSize; },

    UpdateFormatMetaData : function()
    {
        this.mStrideSize = 0;
        this.mStrideElSize = 0;
        for (var i in this.mTypes)
        {
            var attribEl = this.mTypes[i];
            this.mStrideSize += attribEl.size * attribEl.bytes;
            this.mStrideElSize += attribEl.size;
        }
    }
}


function Mesh()
{
    this.mIndices = null;
    this.mVertexes = null;
    this.mVertexBuffer = null;
    this.mIndexBuffer = null;
    this.mWireframeIndexBuffer = null;
    this.mState = Mesh.STATE_INIT;
    this.mDirtyIndexBuffer = true;

    this.mStreams = {
        userStream : {
             format: new VertexFormat([]), 
             glBufferHandle : null,
             dirty: true
         },
        internalStream : {
            format: new VertexFormat([AttribType.VERTEX_DYNAMIC_COLOR]),
            glBufferHandle : null,
            dirty: true
        },
        vertexIdStream : {
            format: new VertexFormat([AttribType.VERTEX_ID]),
            glBufferHandle : null,
            dirty: true
        }
    }

}

Mesh.STATE_INIT = 0;
Mesh.STATE_READY = 1;

Mesh.DRAW_SOLID = 0;
Mesh.DRAW_LINES = 1;
Mesh.DRAW_VERTEX = 2;

Mesh.RegisterVertexLayout = function (gl, program)
{
    for (var i in AttribType)
    {
        var attrib = AttribType[i];
        var attribLocation = gl.getAttribLocation(program.GetHandle(), attrib.name);
        program.RegisterVertexAttribute(attrib.id, attribLocation);
    }
}

Mesh.prototype = {
    
    SetFormat : function (varList) 
    {
        this.mFormat = varList;
        this.mStreams.userStream.format.SetFormat(varList);
    },

    StateReady : function () {return this.mState == Mesh.STATE_READY;},

    SetDynamicVertexColor : function (gl, vertexId, color)
    {
        var stream = this.mStreams.internalStream;
        var glHandle = stream.glBufferHandle;
        var format = stream.format;
        gl.bindBuffer(gl.ARRAY_BUFFER, glHandle);
        gl.bufferSubData(
            gl.ARRAY_BUFFER,
            vertexId * format.GetByteStride(),
            color
        );
    },

    UpdateState : function(gl)
    {
        if (this.mState == Mesh.STATE_INIT)
        {
            this.mVertexBuffer = gl.createBuffer();
            this.mState = Mesh.STATE_READY;
        }
    },

    LoadMesh : function ()
    {
        //unimplemented
    },

    SerializeMesh : function ()
    {
        //unimplemented
    },

    GetIndices : function ()
    {
        return this.mIndices;
    },

    GetVertices : function ()
    {
        return this.mVertexes;
    },

    GetVertexCount : function ()
    {
        var vertexSize = 0;
        for (var i = 0; i < this.mFormat.length; ++i) vertexSize += this.mFormat[i].size;
        return this.mVertexes.length / vertexSize;
    },

    HandleDirtyIndexBuffer : function (gl)
    {
        if (this.mDirtyIndexBuffer == true && this.mIndices != null)
        {
            if (this.mIndexBuffer == null)
            {
                this.mIndexBuffer = gl.createBuffer();
                this.mWireframeIndexBuffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mIndices, gl.DYNAMIC_DRAW);

            var wireframeIndices = [];
            for (var i = 0; i < this.mIndices.length; i += 3)
            {
                wireframeIndices.push(this.mIndices[i + 1], this.mIndices[i]);
                wireframeIndices.push(this.mIndices[i + 2], this.mIndices[i + 1]);
                wireframeIndices.push(this.mIndices[i], this.mIndices[i + 2]);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mWireframeIndexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireframeIndices), gl.DYNAMIC_DRAW);
            this.mWireframeIndexBuffer.length = wireframeIndices.length;

            this.mDirtyIndexBuffer = false;
        }

    },

    HandleDirtyStreamFlag : function (gl, stream, vertexData)
    {
        if (stream.dirty && vertexData)
        {
            if (stream.glBufferHandle == null)
            {
                stream.glBufferHandle = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, stream.glBufferHandle);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
            stream.dirty = false;
        }
    },

    HandleDirtyFlag : function(gl)
    {
        this.HandleDirtyIndexBuffer(gl);
        this.HandleDirtyStreamFlag(gl, this.mStreams.userStream, this.mVertexes);
        var vertexId_internal = [];

        for (var i = 0; i < this.mVertexes.length / this.mStreams.userStream.format.GetElementCount(); ++i) vertexId_internal[i] = i;
        var vertexIds = new Uint16Array(vertexId_internal);
        this.HandleDirtyStreamFlag(gl, this.mStreams.vertexIdStream, vertexIds);
        var vertex_internalColors = [];
        for (var i = 0; i < this.mVertexes.length / this.mStreams.userStream.format.GetElementCount(); ++i)
             vertex_internalColors.push(
                    Config.Colors.VertexUnselectedCol[0],
                    Config.Colors.VertexUnselectedCol[1],
                    Config.Colors.VertexUnselectedCol[2],
                    Config.Colors.VertexUnselectedCol[3]);

        var vertexColorBuff = new Float32Array(vertex_internalColors);
        this.HandleDirtyStreamFlag(gl, this.mStreams.internalStream, vertexColorBuff);

        this.HandleDirtyStreamFlag(gl, this.mStreams.userStream, this.mVertexBuffer);
    },

    UpdateState : function (gl)
    {
        this.HandleDirtyFlag(gl);
    },

    DispatchStream : function (gl, stream, program)
    {
        var typeList = stream.format.GetFormat();
        var offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, stream.glBufferHandle);
        for (var i = 0; i < typeList.length; ++i)
        {
            var el = typeList[i];
            var attribLoc = program.GetVertexAttributeLocation(el.id);
            if (attribLoc != -1)
            {
            
                gl.enableVertexAttribArray(attribLoc);
                gl.vertexAttribPointer(
                         attribLoc,
                         el.size,
                         gl[el.glType], 
                         false /*normalized*/,
                         stream.format.GetByteStride(),
                         offset);
                offset += el.size * el.bytes;
            }
        }
    },
     
    Draw : function (gl, program, type)
    {
        this.DispatchStream(gl, this.mStreams.userStream, program);
        this.DispatchStream(gl, this.mStreams.internalStream, program);
        this.DispatchStream(gl, this.mStreams.vertexIdStream, program);
        switch(type)
        {
        case (Mesh.DRAW_SOLID):
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mIndexBuffer);
            gl.drawElements(gl.TRIANGLES, this.mIndices.length, gl.UNSIGNED_SHORT, 0);
            break;
        case (Mesh.DRAW_LINES):
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mWireframeIndexBuffer);
            gl.drawElements(gl.LINES, this.mWireframeIndexBuffer.length, gl.UNSIGNED_SHORT, 0);
            break;
        case (Mesh.DRAW_VERTEX):
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mWireframeIndexBuffer);
            gl.drawElements(gl.POINTS, this.mWireframeIndexBuffer.length, gl.UNSIGNED_SHORT, 0);
            break;
        }
    }
}


PrimitiveFactory = {
    CreateCube : function (dim)
    {
        if (Math.abs(dim) < 0.001) dim = 0.001;
        var cube = new Mesh();
        cube.mVertexes = new Float32Array(
            [
                0.5, 0.5, 0.5,
                0.5773502588272095, 0.5773502588272095, 0.5773502588272095,
                0.5, 0.5, -0.5,
                0.5773502588272095, 0.5773502588272095, -0.5773502588272095,
                0.5, -0.5, 0.5,
                0.5773502588272095, -0.5773502588272095, 0.5773502588272095,
                0.5, -0.5, -0.5,
                0.5773502588272095, -0.5773502588272095, -0.5773502588272095,
               -0.5, 0.5, 0.5,
                -0.5773502588272095, 0.5773502588272095, 0.5773502588272095,
               -0.5, 0.5, -0.5,
                -0.5773502588272095, 0.5773502588272095, -0.5773502588272095,
               -0.5, -0.5, 0.5, 
                -0.5773502588272095, -0.5773502588272095, 0.5773502588272095,
               -0.5, -0.5, -0.5,
                -0.5773502588272095, -0.5773502588272095, -0.5773502588272095
            ]
        );

        cube.SetFormat( [AttribType.POS, AttribType.NORMAL] );

        for (var i = 0; i < cube.mVertexes.length; ++i) cube.mVertexes[i] *= dim;

        cube.mIndices = new Uint16Array(
            [
                0,2,1, 1,2,3,
                0,4,2, 4,6,2,
                5,7,4, 4,7,6,
                5,1,3, 5,3,7, 
                1,5,4, 4,0,1,
                7,3,6, 6,3,2
            ]
        );

        return cube;
    },

    CreateQuad : function ()
    {
        var quad = new Mesh();
        quad.mVertexes = new Float32Array(
            [
                -1, 1, 0,
                1, 1, 0,
                -1, -1, 0,
                1, -1, 0
            ]
        );

        quad.SetFormat( [AttribType.POS] );

        quad.mIndices = new Uint16Array(
            [
                0,1,2,
                3,2,1
            ]
        );

        return quad;
    },


    CreateQuadSphere : function (divisions)
    {
        divisions = Math.max(divisions, 2);//minimum 2 divisions
        var sphere = new Mesh();
        function GenerateRing(d, xzRotation, outlist)
        {
            var angle = Math.PI / d;
            var vector = V3.$(0,0,0);
            var rotVector = V3.$(0,0,0);
            var xzSin = Math.sin(xzRotation);
            var xzCos = Math.cos(xzRotation);
            var xzRotVectorX = V3.$(xzCos, 0, xzSin);
            var xzRotVectorY = V3.$(-xzSin, 0, xzCos);

            for (var i = 0; i < 2*d; ++i) { 
                //pos
                vector[0]= Math.sin(angle * i);
                vector[1] = Math.cos(angle * i);
                vector[2] = 0;
                rotVector[0] = V3.dot(vector, xzRotVectorX);
                rotVector[1] = vector[1];
                rotVector[2] = V3.dot(vector, xzRotVectorY);
                outlist.push(rotVector[0], rotVector[1], rotVector[2]);
                //normal
                outlist.push(rotVector[0], rotVector[1], rotVector[2]);
            }
        };
        var vertexList = [];
        for (var i = 0; i < divisions; ++i) GenerateRing(divisions,Math.PI * (i / divisions), vertexList);
        sphere.mVertexes = new Float32Array(
            vertexList
        );
        var totalVertexes = (vertexList.length/6);

        sphere.SetFormat ( [AttribType.POS, AttribType.NORMAL] );

        var ind = [];
        // for (var i = 0; i < sphere.mVertexes.length / 6; ++i) ind.push(i);
        //push the upper and lower caps
        var loopSize = divisions * 2;
        function pushSphereQuad(ind, upperLeft, lowerLeft, upperRight, lowerRight)
        {
            ind.push(upperLeft);
            ind.push(lowerLeft);
            ind.push(upperRight);
            ind.push(upperRight);
            ind.push(lowerLeft);
            ind.push(lowerRight);
        }
        for (var i = 0; i < divisions; ++i)
        {
            var leftLoop = i * loopSize;
            var rightLoop = (((i + 1) % divisions) * loopSize);
            if (i + 1 < divisions)
            {
                for (var j = 0; j < loopSize; ++j)
                {
                    var next = (j + 1) % loopSize;
                    var upperLeft = leftLoop + j;
                    var lowerLeft = leftLoop + next;
                    var upperRight = rightLoop + j;
                    var lowerRight = rightLoop + next;
                    //TODO: make quads equal horizontally
                    if (j < divisions)
                        pushSphereQuad(ind, upperLeft, lowerLeft, upperRight, lowerRight);
                    else
                        pushSphereQuad(ind, upperLeft, upperRight,  lowerLeft, lowerRight );

                }
            }
            else
            {
                for (var j = 0; j < loopSize; ++j)
                {
                    var upperLeft = leftLoop + j;
                    var lowerLeft = leftLoop + ((j + 1) % loopSize);
                    var upperRight = (loopSize - j) % loopSize;
                    var lowerRight = loopSize - (j + 1);
                    if (j < divisions)
                        pushSphereQuad(ind, upperLeft, lowerLeft, upperRight, lowerRight);
                    else
                        pushSphereQuad(ind, upperLeft, upperRight,  lowerLeft, lowerRight );
                }
            }
        }

        sphere.mIndices = new Uint16Array(
            ind
        );

        return sphere;
    },

    CreateTorus : function (dim)
    {
        return null;
    }

}
