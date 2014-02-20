AttribType = {
    POS :    {id:0, size:3, name:"aPosition", bytes:4},
    NORMAL : {id:1, size:3, name: "aNormal",  bytes:4} ,
    VERTEX_ID : {id:2, size:1, name: "aVertexId", bytes:2}
}


function Mesh()
{
    this.mIndices = null;
    this.mVertexes = null;
    this.mVertexBuffer = null;
    this.mVertexIdBuffer = null;
    this.mIndexBuffer = null;
    this.mWireframeIndexBuffer = null;
    this.mFormat = [];
    this.mStrideSize = 0;
    this.mState = Mesh.STATE_INIT;
    this.mDirtyIndexBuffer = true;
    this.mDirtyVertexBuffer = true;
    this.mDirtyVertexFormat = true;

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

    StateReady : function () {return this.mState == Mesh.STATE_READY;},

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

    HandleDirtyFlag : function(gl)
    {
        if (this.mDirtyIndexBuffer == true && this.mIndices != null)
        {
            if (this.mIndexBuffer == null)
            {
                this.mIndexBuffer = gl.createBuffer();
                this.mWireframeIndexBuffer = gl.createBuffer();
                this.mVertexIdBuffer = gl.createBuffer();
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
            var vertexId_internal = [];
            for (var i = 0; i < this.mIndices.length; ++i) vertexId_internal[i] = i;
            var vertexIds = new Uint16Array(vertexId_internal);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexIdBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexIds, gl.STATIC_DRAW);
        }

        if (this.mDirtyVertexBuffer == true && this.mVertexes != null)
        {
            if (this.mVertexBuffer == null)
            {
                this.mVertexBuffer = gl.createBuffer();
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.mVertexes, gl.DYNAMIC_DRAW);
            this.mDirtyVertexBuffer = false;

            this.mStrideSize = 0;
            for (var i in this.mFormat)
            {
                var attribEl = this.mFormat[i];
                this.mStrideSize += attribEl.size * attribEl.bytes;
            }
            
        }

    },

    UpdateState : function (gl)
    {
        this.HandleDirtyFlag(gl);
    },

    DispatchVertexFormat : function(gl, program)
    {
        var curOffset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexBuffer);
        for (var i in this.mFormat)
        {
            var attribEl = this.mFormat[i];
            var attribLoc = program.GetVertexAttributeLocation(attribEl.id);
            if (attribLoc != -1)
            {
                gl.enableVertexAttribArray(attribLoc);
                gl.vertexAttribPointer(attribLoc, attribEl.size, gl.FLOAT/*HACK*/, false/*normalized*/, this.mStrideSize, curOffset);
                curOffset += attribEl.size * attribEl.bytes;
            }
        }

        var vertexIdLoc = program.GetVertexAttributeLocation(AttribType.VERTEX_ID.id);

        if (vertexIdLoc != -1)
        {
            gl.enableVertexAttribArray(vertexIdLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.mVertexIdBuffer);
            gl.vertexAttribPointer(vertexIdLoc, AttribType.VERTEX_ID.size, gl.UNSIGNED_SHORT, false, 0, 0);
        }
         
    },
     
    Draw : function (gl, program, type)
    {
        this.DispatchVertexFormat(gl, program);
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

        cube.mFormat = [AttribType.POS, AttribType.NORMAL];

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

        quad.mFormat = [AttribType.POS];

        quad.mIndices = new Uint16Array(
            [
                0,2,1,
                3,1,2
            ]
        );

        return quad;
    },


    CreateQuadSphere : function (divisions)
    {
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

        sphere.mFormat = [AttribType.POS, AttribType.NORMAL];

        var ind = [];
        // for (var i = 0; i < sphere.mVertexes.length / 6; ++i) ind.push(i);
        //push the upper and lower caps
        for (var i = 0; i < divisions; ++i)
        {
            var initialElement = i*divisions*2;
            var nextElement = ((i+1)*divisions*2 + 1);
            if (nextElement >= totalVertexes)
            {
                nextElement  = 2*divisions - 1; 
            }
            ind.push(initialElement); //always start with the first division element  
            ind.push(initialElement + 1);
            ind.push(nextElement);

            //oposite side
            ind.push(initialElement);
            ind.push(initialElement - 1 < 0 ? 2*divisions - 1 : initialElement - 1);
            nextElement = (i + 1)*2*divisions + 2*divisions - 1;
            if (nextElement  >= totalVertexes)
            {
                nextElement = 1;
            }
            ind.push(nextElement);
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
