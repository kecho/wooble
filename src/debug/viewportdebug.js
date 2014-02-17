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

    SetTexture : function(gl, gl_id, texture)
    {
         
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
