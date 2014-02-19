
function ScreenPass(pixelShader)
{
    this.mScreenProgram = new Program();
    this.mScreenProgram.Load(["screen.vs", pixelShader]);
    if (ScreenPass._GlobalQuad == null)
    {
        ScreenPass._GlobalQuad = PrimitiveFactory.CreateQuad();
    }
    this.mReady = false;
}

ScreenPass._GlobalQuad = null;

ScreenPass.prototype = {
    GetProgram : function() { return this.mScreenProgram;},
    UpdateState: function(gl)
    {
        this.mScreenProgram.UpdateState(gl);
        if (!ScreenPass._GlobalQuad.StateReady()) ScreenPass._GlobalQuad.UpdateState(gl);
        if (!this.mReady && this.mScreenProgram.StateReady())
        {
            Mesh.RegisterVertexLayout(gl, this.mScreenProgram);
            this.mReady = true;
        }
    },

    RenderQuad : function (gl)
    {
        if (this.mReady)
        {
            Render.UseProgram(gl, this.mScreenProgram);
            ScreenPass._GlobalQuad.Draw(gl, this.mScreenProgram, Mesh.DRAW_SOLID);
        }
    }
}

function BlurPass ()
{
    var blurProgram = new Program("gaussian-blur");  
    blurProgram.Load([ "screen.vs", "blurHorizontal.ps" ]);
    ScreenPass.call(this, blurProgram);
}

BlurPass.prototype = {
    __proto__ : ScreenPass.prototype
}
