function MeshManager ()
{
    this.mNextMeshGuid = 0;
    this.mState = MeshManager.STATE_NONE;
    this.mMeshSet = {};
    this.mGrid = new XYZGrid();
    /*this.mTestTex = new Texture();
    this.mTestTex.Load("img/UV.jpg");*/
    this.mMeshPrograms = new MeshPrograms();

    this.PushMesh(PrimitiveFactory.CreateCube(1.0));
}

MeshManager.STATE_NONE = 0;
MeshManager.STATE_LOADING_SHADERS = 1;
MeshManager.STATE_ERROR = 2;
MeshManager.STATE_READY = 3;

MeshManager.prototype = {

    PushMesh : function (mesh)
    {
        this.mMeshSet[this.mNextMeshGuid] = mesh;
        mesh.__guid = this.mNextMeshGuid;
        this.mNextMeshGuid++;
    },

    DeleteMesh : function (id)
    {
        delete this.mMeshSet[id];
    },

    Render : function(gl, camera, programId)
    {
        if (this.StateReady())
        {
            gl.clearColor(0.6,0.6,0.6,1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            var program = this.mMeshPrograms.Get(programId);
            Render.UseProgram(gl, program);
            camera.Dispatch(gl,program);
            /*gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.mTestTex.mTextureHandle);
            gl.uniform1i(gl.getUniformLocation(program.mProgramHandle, "uSampler"),0);*/

            for (var guid in this.mMeshSet)
            {
                var mesh = this.mMeshSet[guid];
                mesh.Draw(gl, program, Mesh.DRAW_SOLID);

            }
            
            if (programId != MeshPrograms.SELECTION)
                this.mGrid.Render(gl, camera);
            
        }
    },

    StateReady : function() { return this.mState == MeshManager.STATE_READY; },

    UpdateState : function (gl)
    {
        //this.mTestTex.UpdateState(gl);
        this.mGrid.UpdateState(gl);
        this.mMeshPrograms.UpdateState(gl);
        for (var guid in this.mMeshSet) {this.mMeshSet[guid].UpdateState(gl);}
        switch(this.mState)
        {
        case MeshManager.STATE_NONE:
            {
                this.mState = MeshManager.STATE_LOADING_SHADERS;
            }
             
            break;
        case MeshManager.STATE_LOADING_SHADERS:
            if (this.mGrid.StateReady() && this.mMeshPrograms.IsReady())
            {
                this.mState = MeshManager.STATE_READY;
            }
            break;
        case MeshManager.STATE_ERROR:
            break;
        case MeshManager.STATE_READY:
            break;
        }
    }
}

function MeshPrograms()
{
    this.mProgramsInfo = 
    [
        {name: "Default-Lambert", stages: ["stdvertex.vs", "lambert.ps"]},
        {name: "Selection",       stages: ["stdvertex.vs", "selection.ps"]}    
    ];

    this.mPrograms = [];

    for (var i = 0; i < this.mProgramsInfo.length; ++i)
    {
        this.mPrograms.push ( new Program( this.mProgramsInfo[i].name));
        this.mPrograms[i].Load(this.mProgramsInfo[i].stages);
    }
    this.mReady = false;
}

MeshPrograms.DEFAULT_LAMBERT = 0;
MeshPrograms.SELECTION = 1;

MeshPrograms.prototype = {
    UpdateState : function (gl)
    {
        if (this.mReady == false)
        {
            this.mReady = true;
            for (var i = 0; i < this.mPrograms.length; ++i)
            {
                var program = this.mPrograms[i];
                if (!program.StateReady() && !program.StateError())
                {
                    program.UpdateState(gl);
                    if (program.StateReady())
                    {
                        Mesh.RegisterVertexLayout(gl, program);
                        Camera.SetupProgramUniforms(gl, program);
                    }
                    this.mReady = this.mReady && (program.StateReady() || program.StateError());
                }
                else
                {
                    this.mReady = false;
                }
            }
        }
    },

    UseProgram : function (gl, programId)
    {
        var program = this.mPrograms[programId];
        if (program.StateReady())
        {
            Render.UseProgram(gl, program);
        }
    },

    Get : function(id) { return this.mPrograms[id];},

    IsReady : function () { return this.mReady;}
}
