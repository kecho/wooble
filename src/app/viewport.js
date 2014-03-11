function ViewportErrorListener()
{
}

ViewportErrorListener.prototype = {
    OnCanvasError : function (msg) { Debug.LogError ("no canvas created :" + msg);},
    OnWebGlContextError  : function (msg) { Debug.LogError ("No webgl context: " + msg);},
}


function ViewportMouseCmd(dims)
{
    this.mCommandState = ViewportMouseCmd.NONE;
    this.mIsDown = false;
    this.mIsSelect = false;
    this.mClickCoords = {};
    this.mArgs = {};
    this.mDims = dims; //viewport dims
    this.mCameraUpdateFinish = false;
    this.mMouseUpdating = false;
}

ViewportMouseCmd.prototype = {
    
    ClearArgs : function ()
    {
        this.mIsSelect = false;
        this.mCommandState = ViewportMouseCmd.NONE;
        this.mCameraUpdateFinish = false;
        this.mMouseUpdating = false;
    },

    GetState : function ()
    {
        return this.mCommandState;
    },

    OnMouseMove : function (e)
    {
        this.mMouseUpdating = true;
        this.mArgs.mouseHoverUpdateCoords = { x: e.layerX, y: e.layerY};

        if (this.mIsDown)
        {
            var diffX = (e.pageX - this.mClickCoords.x) / this.mDims.width;
            var diffY = (e.pageY - this.mClickCoords.y) / this.mDims.height;
            this.mArgs.diffX = diffX;
            this.mArgs.diffY = diffY;
            //update the new click coords
            this.mCommandState = ViewportMouseCmd.MOVE_CAMERA;
        }
        this.mClickCoords.x = e.pageX;
        this.mClickCoords.y = e.pageY;
    },

    OnMouseDown : function (e)
    {
        if (e.button == 0)
        {
            this.mIsDown = true;
            this.mCommandState = ViewportMouseCmd.CLICK_SIGNAL;
            this.mIsSelect = false;
            this.mClickCoords.x = e.pageX;
            this.mClickCoords.y = e.pageY;
        }
        else if (e.button == 2)
        {
            this.mIsSelect = true;
            this.mIsDown = false;
            this.mCommandState = ViewportMouseCmd.SELECT_SIGNAL;
            this.mArgs.x = e.layerX ;
            this.mArgs.y = e.layerY ;
        }
    },

    OnKeyDown : function (e)
    {
        if (String.fromCharCode(e.which) == "E")
        {
            this.mCommandState = ViewportMouseCmd.EDIT_VERTEX_SIGNAL;
        }
        else if (String.fromCharCode(e.which) == "G")
        {
            this.mCommandState = ViewportMouseCmd.MOVE_SIGNAL;
        }
    },

    OnMouseLeave : function (e)
    {
        if (this.mIsDown)
        {
            this.mCameraUpdateFinish = e.button == 0;
        }
        this.mIsDown = false;
        this.mIsSelect = false;
    },

    OnMouseUp : function (e)
    {
        this.mIsDown = false;
        this.mCommandState = ViewportMouseCmd.NONE;
        this.mCameraUpdateFinish = e.button == 0;
    },

    IsCameraUpdateDone : function()
    {
        return this.mCameraUpdateFinish;
    },

    IsMouseUpdating : function()
    {
        return this.mMouseUpdating;
    }
}

ViewportMouseCmd.NONE = 0;
ViewportMouseCmd.MOVE_CAMERA = 1;
ViewportMouseCmd.SELECT_SIGNAL = 3;
ViewportMouseCmd.EDIT_VERTEX_SIGNAL = 4;
ViewportMouseCmd.MOVE_SIGNAL = 5;
ViewportMouseCmd.CLICK_SIGNA = 6;

function Viewport(viewportDiv)
{
    this.mDims = {width: 700, height: 400};
    this.mViewportDiv = viewportDiv;
    this.mErrorListener = new ViewportErrorListener();
    this.mCanvas = document.createElement("canvas");
    this.mViewportMouseCmd = new ViewportMouseCmd(this.mDims);
    this.InitMouseEventListeners();
    this.mSurfaces = {
        selection : new Surface(
            this.mDims.width, this.mDims.height
        )
    };
    this.mViewportDiv.appendChild(this.mCanvas);
    this.mCamera = new Camera( this.mDims.height / this.mDims.width, this.mDims);
    this.mMeshManager = new MeshManager();
    this.mRenderSelectionPassRequest = { 
        renderMeshSelection : false,
        renderVertexSelection : false, 
        mouseHoverUpdate : false,
        mouseHoverCoords : {x:0, y:0},
        selectionCoord : {x:0, y:0},
    };
    this.mEditManager = new EditManager(this.mMeshManager, this.mViewportMouseCmd);
    this.mScreenPass = new ScreenPass("screen.ps");
    this.mEnabledDebugPasses = 0;//none
    this.mRenderDebugPasses = 0;//none
    this.mSelectionPixels = new Uint8Array(4);

    if (this.mCanvas)
    {
        this.mCanvas.width = this.mDims.width;
        this.mCanvas.height = this.mDims.height;
        this.mGl = this.mCanvas.getContext("experimental-webgl");
        if (this.mGl == null)
        {
            this.mErrorListener.OnWebGlContextError("unable to create context");
        }
    }
    else
    {
        this.mErrorListener.OnCanvasError("unable to create canvas");
    }
}

Viewport.DebugPasses = {
    SELECTION : 0x1 
}

Viewport.DEACTIVATE = true;

Viewport.prototype = {

    EnableDebugPasses : function (passesFlags)
    {
        this.mEnabledDebugPasses = passesFlags;
    },

    ToggleDebugPasses : function (passes)
    {
        this.mRenderDebugPasses ^= (passes & this.mEnabledDebugPasses);
    },
    
    InitMouseEventListeners : function()
    {
        this.mCanvas.mViewport = this;
        this.mCanvas.addEventListener("contextmenu", function(e){e.preventDefault();});
        this.mCanvas.addEventListener(
            "mousemove",
            function(e)
            {
                this.mViewport.mViewportMouseCmd.OnMouseMove(e);
            }
        );

        this.mCanvas.addEventListener(
            "mousedown",
            function(e)
            {
                this.mViewport.mViewportMouseCmd.OnMouseDown(e);
            }
        );

        this.mCanvas.addEventListener(
            "mouseup",
            function(e)
            {
                this.mViewport.mViewportMouseCmd.OnMouseUp(e);
            }
        );

        this.mCanvas.addEventListener(
            "mouseleave",
            function(e)
            {
                this.mViewport.mViewportMouseCmd.OnMouseLeave(e);
            }
        );

        var __self = this;

        document.addEventListener(
            "keydown",
            function(e)
            {
                __self.mViewportMouseCmd.OnKeyDown(e);
            }
        );
    },

    UpdateState : function()
    {
        for (var i in this.mSurfaces) this.mSurfaces[i].UpdateState(this.mGl);
        if (!this.mSurfaces.selection.HasDepthBuffer() && this.mSurfaces.selection.StateReady())
        {
            this.mSurfaces.selection.CreateDepthBuffer(this.mGl);
        }
        this.ProcessCameraCmds();
        this.mCamera.UpdateState(this.mGl);
        this.mMeshManager.UpdateState(this.mGl);
        this.mScreenPass.UpdateState(this.mGl);
        this.mEditManager.UpdateState(this.mGl, this.mCamera);
    },

    RenderSelectionBuffer : function(gl)
    {
        if (this.mEditManager.RequestLockSelections())
        {
            this.mMeshManager.ClearHovers(gl); 
        }
        if (!this.mEditManager.RequestLockSelections() && this.mRenderSelectionPassRequest.mouseHoverUpdate)
        {
            this.mSurfaces.selection.Use(gl);
            gl.readPixels(
                this.mRenderSelectionPassRequest.mouseHoverCoords.x,
                this.mCanvas.height-this.mRenderSelectionPassRequest.mouseHoverCoords.y,
                1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.mSelectionPixels
            );
            this.mMeshManager.SetVertexHover(gl, this.mSelectionPixels);
            this.mRenderSelectionPassRequest.mouseHoverUpdate = false;
            this.mSurfaces.selection.Unuse(gl);
        }
        if (this.mRenderSelectionPassRequest.renderMeshSelection)
        {
            this.mSurfaces.selection.Use(gl);
            gl.disable(gl.CULL_FACE);
            if (this.mRenderSelectionPassRequest.renderVertexSelection)
            {  
                gl.clearColor(0,0,0,0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_SELECTION);
                gl.clear(gl.COLOR_BUFFER_BIT);
                this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_SELECTION_VERTEX);
                this.mRenderSelectionPassRequest.renderVertexSelection = false;
            }
            else if (this.mMeshManager.GetMode() == MeshManager.MODE_MESH)
            {
                gl.clearColor(0,0,0,0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
                this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_SELECTION);
                gl.readPixels(
                    this.mRenderSelectionPassRequest.selectionCoord.x,
                    this.mCanvas.height-this.mRenderSelectionPassRequest.selectionCoord.y,
                    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.mSelectionPixels
                );
                this.mMeshManager.SetSelectionFromPixel(this.mSelectionPixels);
            }
            else if (!this.mEditManager.RequestLockSelections())
            {
                this.mMeshManager.RequestSelectVertex(gl);
            }
            this.mSurfaces.selection.Unuse(gl);
            this.mRenderSelectionPassRequest.renderMeshSelection = false;
        }
    },

    Render : function()
    {
        var gl = this.mGl;
        gl.viewport(0,0,this.mCanvas.width,this.mCanvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor(0.6,0.6,0.6,1.0);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        if (this.mMeshManager.StateReady())
        {
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_LAMBERT);
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_MESH_HIGHLIGHT);
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_MESH_HIGHLIGHT_VERTICES);
            this.RenderSelectionBuffer(gl);
        }

        if (this.mRenderDebugPasses & Viewport.DebugPasses.SELECTION)
        {
            Render.UseProgram(gl, this.mScreenPass.GetProgram());
            gl.disable(gl.DEPTH_TEST);
            this.mScreenPass.GetProgram().SetTexture( gl, "texture_0", 0, this.mSurfaces.selection.GetTextureView())
            this.mScreenPass.RenderQuad(gl);
        }
    },


    ProcessCameraCmds : function()
    {
        if (this.mViewportMouseCmd.IsCameraUpdateDone())
        {
            this.mRenderSelectionPassRequest.renderMeshSelection = true;
            this.mRenderSelectionPassRequest.renderVertexSelection = this.mMeshManager.HasSelectedMesh && this.mMeshManager.GetMode() == MeshManager.MODE_VERTEX;
            this.mViewportMouseCmd.ClearArgs();
        }
        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.MOVE_CAMERA)
        {
            this.mCamera.SetScreenViewRotation( this.mViewportMouseCmd.mArgs.diffX, this.mViewportMouseCmd.mArgs.diffY);
            this.mViewportMouseCmd.ClearArgs();
        }

        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.SELECT_SIGNAL)
        {
            this.mRenderSelectionPassRequest.renderMeshSelection = true;
            this.mRenderSelectionPassRequest.selectionCoord.x = this.mViewportMouseCmd.mArgs.x;
            this.mRenderSelectionPassRequest.selectionCoord.y = this.mViewportMouseCmd.mArgs.y;
            this.mViewportMouseCmd.ClearArgs();

            this.mEditManager.FinishCommand();
        }

        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.MOVE_SIGNAL)
        {
            if (this.mMeshManager.GetMode() == MeshManager.MODE_VERTEX && this.mMeshManager.HasSelectedVertex())
            {
                this.mEditManager.OpenEditVertex();
            }
            this.mViewportMouseCmd.ClearArgs();
        }

        if (this.mMeshManager.HasSelectedMesh() && this.mViewportMouseCmd.GetState() == ViewportMouseCmd.EDIT_VERTEX_SIGNAL)
        {
            if (this.mMeshManager.GetMode() == MeshManager.MODE_VERTEX)
            {
                this.mMeshManager.OpenMeshMode();
                this.mViewportMouseCmd.ClearArgs();
            }
            else
            {
                this.mRenderSelectionPassRequest.renderMeshSelection = true;
                this.mRenderSelectionPassRequest.renderVertexSelection = true;
                this.mMeshManager.OpenEditMode();
                this.mViewportMouseCmd.ClearArgs();
            }
        }

        if (this.mViewportMouseCmd.IsMouseUpdating())
        {
            this.mRenderSelectionPassRequest.mouseHoverUpdate = this.mMeshManager.GetMode() == MeshManager.MODE_VERTEX;
            this.mRenderSelectionPassRequest.mouseHoverCoords.x = this.mViewportMouseCmd.mArgs.mouseHoverUpdateCoords.x;
            this.mRenderSelectionPassRequest.mouseHoverCoords.y = this.mViewportMouseCmd.mArgs.mouseHoverUpdateCoords.y;
            this.mViewportMouseCmd.ClearArgs();
        }

    },

    SetErrorListener : function (errorListener)
    {
        this.mErrorListener = errorListener;
    }
};
