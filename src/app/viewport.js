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
        this.mArgs.x = 0;
        this.mArgs.y = 0;
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
        if (this.mIsDown)
        {
            var diffX = (e.x - this.mClickCoords.x) / this.mDims.width;
            var diffY = (e.y - this.mClickCoords.y) / this.mDims.height;

            //update the new click coords
            this.mClickCoords.x = e.x;
            this.mClickCoords.y = e.y;

            this.mCommandState = ViewportMouseCmd.MOVE_CAMERA;
            this.mArgs.x = diffX;
            this.mArgs.y = diffY;
        }
        this.mMouseUpdating = true;
        this.mArgs.mouseHoverUpdateCoords = { x: e.layerX, y: e.layerY};
    },

    OnMouseDown : function (e)
    {
        if (e.button == 0)
        {
            this.mIsDown = true;
            this.mCommandState = ViewportMouseCmd.NONE;
            this.mIsSelect = false;
            this.mClickCoords.x = e.x;
            this.mClickCoords.y = e.y;
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
    },

    OnMouseLeave : function (e)
    {
        if (this.mIsDown)
        {
            this.mCameraUpdateFinish = true;
        }
        this.mIsDown = false;
        this.mIsSelect = false;
    },

    OnMouseUp : function (e)
    {
        this.mIsDown = false;
        this.mCommandState = ViewportMouseCmd.NONE;
        this.mCameraUpdateFinish = true;
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
ViewportMouseCmd.MOVE_GEOMETRY = 5;

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
            this.mDims.width, this.mDims.height,
            {
                internalFormat: "RED",
                format: "R16UI",
                type: "UNSIGNED_SHORT"
            }
        )
    };
    this.mViewportDiv.appendChild(this.mCanvas);
    this.mCamera = new Camera( this.mDims.height / this.mDims.width);
    this.mMeshManager = new MeshManager();
    this.mRenderSelectionPassRequest = { 
        renderMeshSelection : false,
        renderVertexSelection : false, 
        mouseHoverUpdate : false,
        mouseHoverCoords : {x:0, y:0},
        selectionCoord : {x:0, y:0},
    };
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
        this.ProcessCameraCmds();
        this.mCamera.UpdateState(this.mGl);
        this.mMeshManager.UpdateState(this.mGl);
        this.mScreenPass.UpdateState(this.mGl);
    },

    RenderSelectionBuffer : function(gl)
    {
        if (this.mRenderSelectionPassRequest.mouseHoverUpdate)
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
                this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_SELECTION_VERTEX);
                this.mRenderSelectionPassRequest.renderVertexSelection = false;
            }
            else
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
            this.mSurfaces.selection.Unuse(gl);
            this.mRenderSelectionPassRequest.renderMeshSelection = false;
        }
    },

    Render : function()
    {
        var gl = this.mGl;
        gl.viewport(0,0,this.mCanvas.width,this.mCanvas.height);
        gl.enable(gl.DEPTH_TEST);
        this.RenderSelectionBuffer(gl);
        gl.clearColor(0.6,0.6,0.6,1.0);
        gl.enable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        if (this.mMeshManager.StateReady())
        {
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_LAMBERT);
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_MESH_HIGHLIGHT);
            this.mMeshManager.Render(gl, this.mCamera, MeshManager.PASS_MESH_HIGHLIGHT_VERTICES);
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
            this.mCamera.SetScreenViewRotation(this.mViewportMouseCmd.mArgs);
            this.mViewportMouseCmd.ClearArgs();
        }

        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.SELECT_SIGNAL)
        {
            this.mRenderSelectionPassRequest.renderMeshSelection = true;
            this.mRenderSelectionPassRequest.selectionCoord.x = this.mViewportMouseCmd.mArgs.x;
            this.mRenderSelectionPassRequest.selectionCoord.y = this.mViewportMouseCmd.mArgs.y;
            this.mViewportMouseCmd.ClearArgs();
        }

        if (this.mMeshManager.HasSelectedMesh() && this.mViewportMouseCmd.GetState() == ViewportMouseCmd.EDIT_VERTEX_SIGNAL)
        {
            this.mRenderSelectionPassRequest.renderMeshSelection = true;
            this.mRenderSelectionPassRequest.renderVertexSelection = true;
            this.mMeshManager.OpenEditMode();
            this.mViewportMouseCmd.ClearArgs();
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
