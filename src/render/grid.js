function XYZGridErrorListener()
{
}

XYZGridErrorListener.prototype = {
    OnShaderError : function(msg) { Debug.LogError("shader error");}
}

function XYZGrid()
{
    this.mErrorListener = new XYZGridErrorListener();
    this.mState = XYZGrid.STATE_NONE;
    this.mProgram = new Program("grid");
}

XYZGrid.VertexShader = "grid.vs";
XYZGrid.PixelShader = "grid.ps";
XYZGrid.STATE_NONE = 0;
XYZGrid.STATE_LOADING = 1;
XYZGrid.STATE_ERROR = 2;
XYZGrid.STATE_READY = 3;

XYZGrid.prototype = {

    GetState : function () { return this.mState; },

    StateReady : function () {return this.mState == XYZGrid.STATE_READY;},

    SetErrorListener : function (listener) { this.mErrorListener = listener; },

    OnVertexShaderLoaded : function(name, src)
    {
        this.mGridVertexShaderDesc = {"name": name, "src" : src};
    },

    OnPixelShaderLoaded : function (name, src)
    {
        this.mGridPixelShaderDesc = {"name" : name, "src" : src}; 
    },

    OnPrepareVertexBuffer : function (gl)
    {
        var gridDivision = 30;
        var gridDim = 2.0;
        var gridMesh = [];
        for (var i = 0; i <= gridDivision; ++i) { 
            var factor = gridDim * (i * (1/ gridDivision) * 2.0 - 1);
            gridMesh.push(-gridDim, 0, factor,
                           gridDim, 0, factor,
                           factor,  0,-gridDim,
                           factor,  0,gridDim);
        }
        //horizontal
        this.mXZPlaneVerts = new Float32Array(gridMesh); 
        this.mXZPlaneAttribute = Render.CreateSimpleVertexAttribute(
            gl, "aPosition", this.mProgram, this.mXZPlaneVerts
        );
        Camera.SetupProgramUniforms(gl, this.mProgram);
    },

    UpdateState : function (gl)
    {
        this.mProgram.UpdateState(gl);

        if (this.mState == XYZGrid.STATE_NONE)
        {
            this.mProgram.Load( ["grid.vs", "grid.ps"] );
            this.mState = XYZGrid.STATE_LOADING;
        }

        if (this.mState == XYZGrid.STATE_LOADING)
        {
            if (this.mProgram.StateReady())
            {
                this.OnPrepareVertexBuffer(gl);
                this.mState = XYZGrid.STATE_READY;
            }
            else if (this.mProgram.StateError())
            {
                this.mState = XYZGrid.STATE_ERROR;
            }
        }
    },

    Render : function (gl, camera)
    {
        if (this.mState == XYZGrid.STATE_READY)
        {
            Render.UseSimpleAttribute(gl, this.mXZPlaneAttribute, 3, gl.FLOAT);
            Render.UseProgram(gl, this.mProgram);
            camera.Dispatch(gl, this.mProgram);
            gl.lineWidth(1.0);
            gl.drawArrays(gl.LINES, 0, this.mXZPlaneVerts.length / 3);
        }
    }
}

