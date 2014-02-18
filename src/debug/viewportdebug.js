function ScreenPass()
{
    this.mScreenProgram = new Program("screen-space");
    this.mScreenProgram.Load(["screen.vs","screen.ps"]);
    this.mQuad = PrimitiveFactory.CreateQuad();
    this.mReady = false;
}

ScreenPass.prototype = {
    UpdateState: function(gl)
    {
        this.mScreenProgram.UpdateState(gl);
        this.mQuad.UpdateState(gl);
        if (!this.mReady && this.mScreenProgram.StateReady())
        {
            Mesh.RegisterVertexLayout(gl, this.mScreenProgram);
            this.mReady = true;
        }
    },

    SetTexture : function(gl, texId, texture)
    {
        var glId = gl.TEXTURE0 + texId; 
        gl.activeTexture(glId); 
        Render.UseProgram(gl, this.mScreenProgram);
        if (texture != null)
        {
            gl.bindTexture(gl.TEXTURE_2D, texture.GetGlHandle());
            var texName = "texture_"+texId;
            if (Core.IsUndefined(this.mScreenProgram[texName]))
            {
                this.mScreenProgram[texName] = gl.getUniformLocation(this.mScreenProgram.GetHandle(),texName);
            }

            if (this.mScreenProgram[texName] != null)
            {
                gl.uniform1i(this.mScreenProgram[texName], texId);
            }
        }
    },

    RenderQuad : function (gl)
    {
        if (this.mReady)
        {
            Render.UseProgram(gl, this.mScreenProgram);
            this.mQuad.Draw(gl, this.mScreenProgram, Mesh.DRAW_SOLID);
        }
    }
}
