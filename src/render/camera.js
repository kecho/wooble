function Camera (aspect, viewDims)
{
    //default projection
    var ratio = 0.3;
    this.mProjection = M4x4.makeFrustum(-1*ratio, 1*ratio, -aspect*ratio, aspect*ratio, 0.4, 200.0);
    this.mViewMatrix = M4x4.clone(M4x4.identity);
    this.mITXViewMatrix = M4x4.clone(M4x4.identity);
    this.mViewProj = M4x4.clone(M4x4.identity);
    this.mInverseViewProj = M4x4.clone(M4x4.identity);

    this.mViewDims = viewDims;

    this.mScreenRotationIn = new V3.$(0,0,0);
    this.mScreenRotationOut = new V3.$(0,0,0);
    M4x4.makeLookAt([0,0.2,-4], [0,0,0], [0,1,0], this.mViewMatrix);
}

Camera.SetupProgramUniforms = function (gl, program)
{
    var v = gl.getUniformLocation(program.GetHandle(), "uView");
    var p = gl.getUniformLocation(program.GetHandle(), "uProj");
    var vp = gl.getUniformLocation(program.GetHandle(), "uViewProj");
    program.viewUniform = v;
    program.projUniform = p;
    program.viewProjUniform = vp;
}

Camera.prototype = {
    GetProj : function ()
    {
        return this.mProjection;
    },

    GetView : function()
    {
        return this.mViewMatrix;
    },

    GetViewITX : function ()
    {
        return this.mITXViewMatrix;
    },

    GetViewProj : function ()
    {
        return this.mViewProj;
    },

    GetViewDims : function ()
    {
        return this.mViewDims;
    },

    SetScreenViewRotation : function (diffx, diffy)
    {
        if (Math.abs(diffx) > 0.001)
        {
            M4x4.rotate(4 * diffx, [0, 1, 0], this.mViewMatrix, this.mViewMatrix);
            M4x4.inverseOrthonormal(this.mViewMatrix, this.mITXViewMatrix);
        }
    
        if (Math.abs(diffy) > 0.0001)
        {
            var axis = V3.mulNoTrans(this.mITXViewMatrix, [1,0,0]);
            M4x4.rotate(4 * diffy, axis, this.mViewMatrix, this.mViewMatrix);
        }
    },
    
    UpdateState : function ()
    {
        M4x4.inverseOrthonormal(this.mViewMatrix, this.mITXViewMatrix);
        
        M4x4.mul(this.mProjection, this.mViewMatrix, this.mViewProj); 

    },

    Dispatch : function (gl, program)
    {
        if (program.viewUniform != null)
        {
            gl.uniformMatrix4fv(program.viewUniform, false,  this.mViewMatrix);
        }

        if (program.projUniform != null)
        {
            gl.uniformMatrix4fv(program.projUniform, false, this.mProj); 
        }

        if (program.viewProjUniform != null)
        {
            gl.uniformMatrix4fv(program.viewProjUniform, false, this.mViewProj);
        }
    }
};
