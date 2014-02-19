function MeshManager ()
{
    this.mNextMeshGuid = 1; //guid 0 reserved for none
    this.mState = MeshManager.STATE_NONE;
    this.mMeshSet = {};
    this.mGrid = new XYZGrid();
    this.mMeshPrograms = new MeshPrograms();
    this.mSelectionState = 
    {
        meshId : 0,
        vertexIndex : 0,
        isVertex : false
    };

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

    SetSelectionFromPixel : function (p)
    {
        var id = p[0] + 256 * p[1] + 65536 * p[2] + 16777216 * p[3];
        this.HighlightMesh(id);
    },

    HighlightMesh : function (id)
    {
        this.mSelectionState.meshId = id;
    },

    SetUniforms : function (gl, program,  programId)
    {
        switch (programId)
        {
        case MeshPrograms.SELECTION_HIGHLIGHTS:
            program.SetFloat4(gl, "color", [0.0,1.0,0.0,1.0]);
            gl.lineWidth(10.0);
            break;
        case MeshPrograms.DEFAULT_LAMBERT:
            break;
        }
    },

    SetUniformsPerMesh : function (gl, program,  programId, mesh)
    {
        switch (programId)
        {
        case MeshPrograms.SELECTION:
            program.SetInt(gl, "meshId", mesh.__guid);
            break;
        }
    },
    
    GetDrawType : function ( programId)
    {
        switch (programId)
        {
        case MeshPrograms.SELECTION_HIGHLIGHTS:
            return Mesh.DRAW_LINES;
            break;
        case MeshPrograms.DEFAULT_LAMBERT:
            return Mesh.DRAW_SOLID;
            break;
        }
        return Mesh.DRAW_SOLID;
    },

    Render : function(gl, camera, programId)
    {
        if (this.StateReady())
        {
            var program = this.mMeshPrograms.Get(programId);
            Render.UseProgram(gl, program);
            camera.Dispatch(gl,program);

            this.SetUniforms(gl, program, programId);
            var drawType = this.GetDrawType(programId);

            for (var guid in this.mMeshSet)
            {
                if (
                    (programId == MeshPrograms.SELECTION_HIGHLIGHTS && guid == this.mSelectionState.meshId) ||
                     programId != MeshPrograms.SELECTION_HIGHLIGHTS
                   )
                {
                    var mesh = this.mMeshSet[guid];
                    this.SetUniformsPerMesh(gl, program, programId, mesh);
                    mesh.Draw(gl, program, drawType);
                    if (programId == MeshPrograms.SELECTION_HIGHLIGHTS)
                    {
                        mesh.Draw(gl, program, Mesh.DRAW_VERTEX);
                    }
                }
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
    },

    GetProgram : function(id)
    {
        return this.mMeshPrograms.Get(id);
    }
}

function MeshPrograms()
{
    this.mProgramsInfo = 
    [
        {name: "Default-Lambert", stages: ["stdvertex.vs", "lambert.ps"]},
        {name: "Selection",       stages: ["stdvertex.vs", "selection.ps"]},    
        {name: "SelectionHighlight",       stages: ["stdvertex.vs", "colorsolid.ps"]}    
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
MeshPrograms.SELECTION_HIGHLIGHTS = 2;

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
