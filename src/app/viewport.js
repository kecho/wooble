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
}

ViewportMouseCmd.prototype = {
    
    ClearArgs : function ()
    {
        this.mArgs.x = 0;
        this.mArgs.y = 0;
        this.mIsSelect = false;
        this.mCommandState = ViewportMouseCmd.NONE;
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

    OnMouseLeave : function (e)
    {
        this.mIsDown = false;
        this.mIsSelect = false;
    },

    OnMouseUp : function (e)
    {
        this.mIsDown = false;
        this.mCommandState = ViewportMouseCmd.NONE;
    }
}

ViewportMouseCmd.NONE = 0;
ViewportMouseCmd.MOVE_CAMERA = 1;
ViewportMouseCmd.SELECT_SIGNAL = 3;
ViewportMouseCmd.MOVE_GEOMETRY = 4;

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
    this.mRenderSelectionPassRequest = { doRender : false, selectionCoord : {x:0, y:0}};
    this.mScreenPass = new ScreenPass();
    this.mEnabledDebugPasses = 0;//none
    this.mRenderDebugPasses = 0;//none

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
    },

    UpdateState : function()
    {
        for (var i in this.mSurfaces) this.mSurfaces[i].UpdateState(this.mGl);
        this.ProcessCameraCmds();
        this.mCamera.UpdateState(this.mGl);
        this.mMeshManager.UpdateState(this.mGl);
        this.mScreenPass.UpdateState(this.mGl);
    },

    Render : function()
    {
        var gl = this.mGl;
        gl.viewport(0,0,this.mCanvas.width,this.mCanvas.height);
        if (this.mRenderSelectionPassRequest.doRender)
        {
            this.mRenderSelectionPassRequest.doRender = false;
        }
        if (this.mMeshManager.StateReady())
        {
            this.mMeshManager.Render(gl, this.mCamera, MeshPrograms.DEFAULT_LAMBERT);
        }

        if (this.mRenderDebugPasses & Viewport.DebugPasses.SELECTION)
        {
            this.mSurfaces.selection.Use(gl);
            this.mMeshManager.Render(gl, this.mCamera, MeshPrograms.SELECTION);
            this.mSurfaces.selection.Unuse(gl);
            this.mScreenPass.SetTexture( gl, 0, this.mSurfaces.selection.GetTextureView())
            gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
            this.mScreenPass.RenderQuad(gl);
        }
    },


    ProcessCameraCmds : function()
    {
        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.MOVE_CAMERA)
        {
            this.mCamera.SetScreenViewRotation(this.mViewportMouseCmd.mArgs);
            this.mViewportMouseCmd.ClearArgs();
        }

        if (this.mViewportMouseCmd.GetState() == ViewportMouseCmd.SELECT_SIGNAL)
        {
            this.mRenderSelectionPassRequest.doRender = true;
            this.mRenderSelectionPassRequest.selectionCoord.x = this.mViewportMouseCmd.mArgs.x;
            this.mRenderSelectionPassRequest.selectionCoord.y = this.mViewportMouseCmd.mArgs.y;
            this.mViewportMouseCmd.ClearArgs();
        }
    },

    SetErrorListener : function (errorListener)
    {
        this.mErrorListener = errorListener;
    }
};
