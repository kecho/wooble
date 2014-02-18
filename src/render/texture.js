function Texture()
{
    this.mState = Texture.STATE_INIT;
    this.mSrcImage = null;
    this.mDims = null;
    this.mTexureHandle = null;
    this.mCreateFormat = null;
    this.mAdvanced = null;
}

Texture.STATE_INIT = 0;
Texture.STATE_LOADING = 1;
Texture.STATE_LOADED = 2;
Texture.STATE_READY = 3;
Texture.STATE_CREATE_REQUEST = 4;

Texture.prototype = {

    Create : function (dims, advanced)
    {
        this.mDims = dims;
        this.mState = Texture.STATE_CREATE_REQUEST;
        this.mAdvanced = advanced;
    },

    Load : function (src)
    {
        this.mSrcImage = new Image(); 
        this.mState = Texture.STATE_LOADING;
        var __self = this;
        this.mSrcImage.onload = function ()
        {
            __self.mState = Texture.STATE_LOADED; 
        }
        this.mSrcImage.src = src;
    },

    BindFileTexture : function (gl)
    {
        if (this.mSrcImage != null)
        {
            this.mTextureHandle = Render.CreateTextureFromImage(gl, true, this.mSrcImage, this.mSrcImage);
        }
    },

    GetGlHandle : function () { return this.mTextureHandle; },

    CreateEmptyTexture : function (gl, dim)
    {
        this.mTextureHandle = Render.CreateTextureFromImage(gl, false, dim, null);
    },

    UpdateState : function (gl)
    {
        switch (this.mState)
        {
        case Texture.STATE_INIT:
        case Texture.STATE_LOADING:
        case Texture.STATE_READY:
            break;
        case Texture.STATE_LOADED:
            {
                this.BindFileTexture(gl); 
                this.mState = Texture.STATE_READY;
                break;
            }
        case Texture.STATE_CREATE_REQUEST:
            {
                this.CreateEmptyTexture(gl, this.mDims, this.mAdvanced);
                this.mState = Texture.STATE_READY;
                break;
            }
        }
    }
}

function Surface(width, height, advanced)
{
    this.mDim = {width: width, height: height};
    this.mFrameBufferHandle = null;
    this.mTextureView = new Texture();
    this.mTextureView.Create(this.mDim, advanced);
    this.mState = Surface.STATE_INIT;
}

Surface.STATE_INIT = 0;
Surface.STATE_READY = 1;

Surface.prototype = {
    UpdateState : function (gl)
    {
        this.mTextureView.UpdateState(gl);
        switch(this.mState)
        {
        case Surface.STATE_INIT:
            this.mState = Surface.STATE_READY; 
            this.mFrameBufferHandle = Render.CreateFrameBuffer(gl, this.mDim.width, this.mDim.height);
            //attach frame buffer to texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.mFrameBufferHandle);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.mTextureView.mTextureHandle, 0 /*level*/);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            break;
        case Surface.STATE_READY:
            break;
        }
    },

    Use : function (gl)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.mFrameBufferHandle);
    },

    Unuse : function (gl)
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    GetTextureView : function ()
    {
        return this.mTextureView;
    }

}
