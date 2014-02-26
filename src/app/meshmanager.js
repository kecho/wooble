function MeshManager ()
{
    this.mNextMeshGuid = 1; //guid 0 reserved for none
    this.mState = MeshManager.STATE_NONE;
    this.mMeshSet = {};
    this.mGrid = new XYZGrid();
    this.mMeshPrograms = new MeshPrograms();
    this.mMode = MeshManager.MODE_MESH;
    this.mSelectionState = 
    {
        meshId : 0,
        vertexHoverIndex : 0,
        vertexIndex : 0,
        isVertex : false
    };

    //this.PushMesh(PrimitiveFactory.CreateCube(1.0));
    this.PushMesh(PrimitiveFactory.CreateQuadSphere(12));
}

MeshManager.STATE_NONE = 0;
MeshManager.STATE_LOADING_SHADERS = 1;
MeshManager.STATE_ERROR = 2;
MeshManager.STATE_READY = 3;

MeshManager.MODE_MESH = 0;
MeshManager.MODE_VERTEX = 1;

MeshManager.PASS_LAMBERT = 0;
MeshManager.PASS_MESH_HIGHLIGHT = 1;
MeshManager.PASS_MESH_HIGHLIGHT_VERTICES = 2;
MeshManager.PASS_SELECTION = 3;
MeshManager.PASS_SELECTION_VERTEX = 4;

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

    GetIdFromPixel : function (p)
    {
        return p[0] + 256 * p[1] + 65536 * p[2] + 16777216 * p[3];
    },

    SetVertexHover : function (p)
    {
        var id = this.GetIdFromPixel(p);
        if (
            this.mSelectionState.meshId != 0 &&
            id != this.mSelectionState.vertexHoverIndex
         )
        {
            this.mSelectionState.vertexHoverIndex = id;
        } 
    },

    SetSelectionFromPixel : function (p)
    {
        this.HighlightMesh(this.GetIdFromPixel(p));
    },

    HighlightMesh : function (id)
    {
        this.mSelectionState.meshId = id;
        if (id == 0)
        {
            this.OpenMeshMode();
        }
    },

    GetProgramId : function (pass)
    {
        switch (pass)
        {
        case MeshManager.PASS_MESH_HIGHLIGHT:
            return MeshPrograms.SELECTION_HIGHLIGHTS;
            break;
        case MeshManager.PASS_MESH_HIGHLIGHT_VERTICES:
            return MeshPrograms.SELECTION_HIGHLIGHTS;
            break;
        case MeshManager.PASS_SELECTION_VERTEX:
        case MeshManager.PASS_SELECTION:
            return MeshPrograms.SELECTION;
            break;
        case MeshManager.PASS_LAMBERT:
        default:
            return MeshPrograms.DEFAULT_LAMBERT;
            break;
        }
    },

    HasSelectedMesh : function ()
    {
        return this.mSelectionState.meshId != 0;
    },

    OpenEditMode : function ()
    {
        this.mMode = MeshManager.MODE_VERTEX;
    },

    OpenMeshMode : function ()
    {
        this.mMode = MeshManager.MODE_MESH;
    },

    GetMode : function ()
    {
        return this.mMode;
    },

    SetUniforms : function (gl, program,  pass)
    {
        var depthBias = 0;
        switch (pass)
        {
        case MeshManager.PASS_MESH_HIGHLIGHT:
            program.SetFloat4(gl, "color", Config.Colors.MeshSelected);
            program.SetFloat (gl, "privateColorBlend", 0.0);
            gl.lineWidth(1.0);
            break;
        case MeshManager.PASS_MESH_HIGHLIGHT_VERTICES:
            program.SetFloat4(gl, "color", Config.Colors.VertexUnselected);
            program.SetFloat (gl, "privateColorBlend", 1.0);
            depthBias = 0.01;
            gl.lineWidth(1.0); break;
        case MeshManager.PASS_SELECTION:
            program.SetFloat(gl, "isVertexSelection", 0.0);
            break;
        case MeshManager.PASS_SELECTION_VERTEX:
            program.SetFloat(gl, "isVertexSelection", 1.0);
            break;
        case MeshManager.PASS_LAMBERT:
        default:
            break;
        }
        program.SetFloat(gl, "depthBias", depthBias);
    },

    SetUniformsPerMesh : function (gl, program,  programId, mesh)
    {
        switch (programId)
        {
        case MeshPrograms.SELECTION:
            program.SetInt(gl, "meshId", mesh.__guid);
        default:
            break;
        }
    },
    
    GetDrawType : function (pass)
    {
        switch (pass)
        {
        case MeshManager.PASS_MESH_HIGHLIGHT:
            return Mesh.DRAW_LINES;
            break;
        case MeshManager.PASS_MESH_HIGHLIGHT_VERTICES:
            return Mesh.DRAW_VERTEX;
            break;
        case MeshManager.PASS_DEFAULT_LAMBERT:
            return Mesh.DRAW_SOLID;
        case MeshManager.PASS_SELECTION_VERTEX:
            return Mesh.DRAW_VERTEX;
            break;
        }
        return Mesh.DRAW_SOLID;
    },

    SetRenderState : function (gl, pass)
    {
        switch (pass)
        {
        case MeshManager.PASS_MESH_HIGHLIGHT_VERTICES:
            gl.cullFace(gl.FRONT);
            gl.depthFunc(gl.LEQUAL);
            break;
        case MeshManager.PASS_MESH_HIGHLIGHT:
            gl.depthFunc(gl.LESS);
            gl.cullFace(gl.FRONT);
            gl.depthFunc(gl.LEQUAL);
            break;
        case MeshManager.PASS_SELECTION:
        case MeshManager.PASS_SELECTION_VERTEX:
        default:
            gl.cullFace(gl.BACK);
            gl.depthFunc(gl.LESS);
            break;
        }
        return Mesh.DRAW_SOLID;
    },

    Render : function(gl, camera, pass)
    {
        if (this.StateReady())
        {
            if (
                (pass == MeshManager.PASS_MESH_HIGHLIGHT_VERTICES && this.mMode != MeshManager.MODE_VERTEX)
               )
            {
                return;
            }
            var programId = this.GetProgramId(pass);
            var program = this.mMeshPrograms.Get(programId);
            Render.UseProgram(gl, program);
            camera.Dispatch(gl,program);

            this.SetUniforms(gl, program, pass);
            this.SetRenderState(gl, programId);
            for (var guid in this.mMeshSet)
            {
                if (
                    ((pass == MeshManager.PASS_MESH_HIGHLIGHT || pass == MeshManager.PASS_MESH_HIGHLIGHT_VERTICES ) && guid == this.mSelectionState.meshId) ||
                     (pass != MeshManager.PASS_MESH_HIGHLIGHT && pass != MeshManager.PASS_MESH_HIGHLIGHT_VERTICES)
                   )
                {
                    var drawType = this.GetDrawType(pass);
                    var mesh = this.mMeshSet[guid];
                    this.SetUniformsPerMesh(gl, program, programId, mesh);
                    mesh.Draw(gl, program, drawType);
                }
            }
            if (pass == MeshManager.PASS_LAMBERT)
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
